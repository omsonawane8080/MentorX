import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Circle,
  ClipboardList,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2
} from 'lucide-react';
import { generateMentorReviewWithAI, generateQuizWithAI } from './lib/ai';
import { addDaysIso, prettyDate, toIsoDate } from './lib/dates';
import { projectSeed, roadmapSeed, starterTasks } from './lib/roadmap';
import { requireSupabase, supabase, supabaseConfigured } from './lib/supabase';
import type {
  AppData,
  DailyLog,
  DailyTask,
  MentorReview,
  PrepProject,
  Profile,
  Quiz,
  QuizAttempt,
  RoadmapItem,
  RoadmapStatus,
  TaskStatus
} from './lib/types';

type TabId = 'dashboard' | 'daily' | 'roadmap' | 'quiz' | 'mentor' | 'projects' | 'reports' | 'settings';

const emptyData: AppData = {
  roadmap: [],
  tasks: [],
  logs: [],
  quizzes: [],
  attempts: [],
  reviews: [],
  projects: []
};

const tabs: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'daily', label: 'Daily', icon: ListChecks },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'quiz', label: 'Quiz', icon: ClipboardList },
  { id: 'mentor', label: 'Mentor', icon: Brain },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

function App() {
  const today = toIsoDate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [keyStatus, setKeyStatus] = useState<MentorKeyStatus | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [onboarding, setOnboarding] = useState({ name: '', dailyHours: '7' });
  const [logForm, setLogForm] = useState({
    study_minutes: '0',
    notes: '',
    blockers: '',
    completion_summary: ''
  });
  const [manualTask, setManualTask] = useState({
    title: '',
    topic: '',
    skill_area: 'DSA',
    estimated_minutes: '60'
  });
  const [quizTopic, setQuizTopic] = useState('Python fundamentals');
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');

  const todayTasks = useMemo(
    () => data.tasks.filter((task) => task.task_date === today).sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority)),
    [data.tasks, today]
  );
  const latestReview = data.reviews[0] ?? null;
  const latestAttempt = data.attempts[0] ?? null;
  const metrics = useMemo(() => buildMetrics(data, today), [data, today]);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setData(emptyData);
      return;
    }

    void loadData(session.user.id);
  }, [session?.user.id]);

  useEffect(() => {
    const todayLog = data.logs.find((log) => log.log_date === today);
    setLogForm({
      study_minutes: String(todayLog?.study_minutes ?? 0),
      notes: todayLog?.notes ?? '',
      blockers: todayLog?.blockers ?? '',
      completion_summary: todayLog?.completion_summary ?? ''
    });
  }, [data.logs, today]);

  useEffect(() => {
    if (!window.mentorAI) {
      return;
    }

    window.mentorAI.getKeyStatus().then(setKeyStatus).catch(() => setKeyStatus(null));
  }, []);

  async function loadData(userId: string) {
    const client = requireSupabase();
    setBusy(true);

    try {
      const [profileRes, roadmapRes, tasksRes, logsRes, quizzesRes, attemptsRes, reviewsRes, projectsRes] =
        await Promise.all([
          client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
          client.from('roadmap_items').select('*').eq('user_id', userId).order('month_number').order('week_number'),
          client.from('daily_tasks').select('*').eq('user_id', userId).order('task_date', { ascending: false }),
          client.from('daily_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false }),
          client.from('quizzes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          client.from('quiz_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          client.from('mentor_reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          client.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: true })
        ]);

      const error =
        profileRes.error ||
        roadmapRes.error ||
        tasksRes.error ||
        logsRes.error ||
        quizzesRes.error ||
        attemptsRes.error ||
        reviewsRes.error ||
        projectsRes.error;

      if (error) {
        throw error;
      }

      const nextProfile = profileRes.data as Profile | null;
      let nextTasks = (tasksRes.data ?? []) as DailyTask[];
      const nextRoadmap = (roadmapRes.data ?? []) as RoadmapItem[];

      if (nextProfile && nextTasks.every((task) => task.task_date !== today)) {
        const generated = buildDailyDefaults(userId, today, nextRoadmap);
        const insertRes = await client.from('daily_tasks').insert(generated).select('*');
        if (insertRes.error) {
          throw insertRes.error;
        }
        nextTasks = [...((insertRes.data ?? []) as DailyTask[]), ...nextTasks];
      }

      setProfile(nextProfile);
      setData({
        roadmap: nextRoadmap,
        tasks: nextTasks,
        logs: (logsRes.data ?? []) as DailyLog[],
        quizzes: (quizzesRes.data ?? []) as Quiz[],
        attempts: (attemptsRes.data ?? []) as QuizAttempt[],
        reviews: (reviewsRes.data ?? []) as MentorReview[],
        projects: (projectsRes.data ?? []) as PrepProject[]
      });
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleAuth() {
    const client = requireSupabase();
    setBusy(true);
    setNotice('');

    try {
      const result =
        authMode === 'login'
          ? await client.auth.signInWithPassword(authForm)
          : await client.auth.signUp(authForm);

      if (result.error) {
        throw result.error;
      }

      if (authMode === 'signup' && !result.data.session) {
        setNotice('Signup ho gaya. Agar email confirmation on hai, inbox check karo, phir login karo.');
      }
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function completeOnboarding() {
    if (!session?.user) {
      return;
    }

    const client = requireSupabase();
    const fullName = onboarding.name.trim() || 'Student';
    const dailyHours = Number(onboarding.dailyHours) || 7;
    const userId = session.user.id;

    setBusy(true);
    setNotice('');

    try {
      const profileRes = await client
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          daily_hours: dailyHours,
          timeline_months: 4,
          mentor_language: 'hinglish',
          target_role: 'AI/ML + GenAI Engineer with DSA backup',
          onboarding_complete: true
        })
        .select('*')
        .single();

      if (profileRes.error) {
        throw profileRes.error;
      }

      const roadmapRes = await client.from('roadmap_items').insert(
        roadmapSeed.map((item) => ({
          ...item,
          user_id: userId
        }))
      );
      if (roadmapRes.error) {
        throw roadmapRes.error;
      }

      const projectsRes = await client.from('projects').insert(
        projectSeed.map((project) => ({
          ...project,
          user_id: userId
        }))
      );
      if (projectsRes.error) {
        throw projectsRes.error;
      }

      const tasksRes = await client.from('daily_tasks').insert(
        starterTasks(today).map((task) => ({
          ...task,
          user_id: userId
        }))
      );
      if (tasksRes.error) {
        throw tasksRes.error;
      }

      setProfile(profileRes.data as Profile);
      await loadData(userId);
      setActiveTab('dashboard');
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function updateTask(taskId: string, status: TaskStatus) {
    const client = requireSupabase();
    const { error } = await client.from('daily_tasks').update({ status }).eq('id', taskId);
    if (error) {
      setNotice(error.message);
      return;
    }
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
    }));
  }

  async function addManualTask() {
    if (!session?.user || !manualTask.title.trim()) {
      return;
    }

    const client = requireSupabase();
    const row = {
      user_id: session.user.id,
      task_date: today,
      title: manualTask.title.trim(),
      topic: manualTask.topic.trim() || manualTask.skill_area,
      skill_area: manualTask.skill_area.trim() || 'Study',
      estimated_minutes: Number(manualTask.estimated_minutes) || 60,
      priority: 'medium',
      status: 'planned',
      source: 'manual'
    };
    const { data: inserted, error } = await client.from('daily_tasks').insert(row).select('*').single();
    if (error) {
      setNotice(error.message);
      return;
    }

    setData((current) => ({ ...current, tasks: [inserted as DailyTask, ...current.tasks] }));
    setManualTask({ title: '', topic: '', skill_area: 'DSA', estimated_minutes: '60' });
  }

  async function saveDailyLog() {
    if (!session?.user) {
      return;
    }

    const client = requireSupabase();
    const payload = {
      user_id: session.user.id,
      log_date: today,
      study_minutes: Number(logForm.study_minutes) || 0,
      notes: logForm.notes,
      blockers: logForm.blockers,
      completion_summary: logForm.completion_summary
    };
    const { data: saved, error } = await client
      .from('daily_logs')
      .upsert(payload, { onConflict: 'user_id,log_date' })
      .select('*')
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      logs: [saved as DailyLog, ...current.logs.filter((log) => log.log_date !== today)]
    }));
    setNotice('Daily log save ho gaya.');
  }

  async function updateRoadmapStatus(itemId: string, status: RoadmapStatus) {
    const client = requireSupabase();
    const { error } = await client.from('roadmap_items').update({ status }).eq('id', itemId);
    if (error) {
      setNotice(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      roadmap: current.roadmap.map((item) => (item.id === itemId ? { ...item, status } : item))
    }));
  }

  async function createQuiz() {
    if (!session?.user) {
      return;
    }

    const client = requireSupabase();
    setBusy(true);
    setNotice('');

    try {
      const context = `Readiness ${metrics.readinessScore}/100, weak topics ${metrics.weakTopics.join(', ') || 'none yet'}`;
      const generated = await generateQuizWithAI(quizTopic, quizDifficulty, context);
      const { data: inserted, error } = await client
        .from('quizzes')
        .insert({
          user_id: session.user.id,
          title: generated.title,
          topic: generated.topic,
          difficulty: generated.difficulty,
          questions: generated.questions
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const quiz = inserted as Quiz;
      setActiveQuiz(quiz);
      setQuizAnswers({});
      setData((current) => ({ ...current, quizzes: [quiz, ...current.quizzes] }));
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz() {
    if (!session?.user || !activeQuiz) {
      return;
    }

    const score = activeQuiz.questions.reduce(
      (total, question, index) => total + (quizAnswers[String(index)] === question.correctIndex ? 1 : 0),
      0
    );
    const wrongTopics = activeQuiz.questions
      .filter((question, index) => quizAnswers[String(index)] !== question.correctIndex)
      .map((question) => question.topic || activeQuiz.topic);
    const explanations = activeQuiz.questions.map((question) => question.explanation);
    const client = requireSupabase();
    const { data: inserted, error } = await client
      .from('quiz_attempts')
      .insert({
        user_id: session.user.id,
        quiz_id: activeQuiz.id,
        selected_answers: quizAnswers,
        wrong_topics: wrongTopics,
        score,
        total: activeQuiz.questions.length,
        explanations
      })
      .select('*')
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }

    setData((current) => ({ ...current, attempts: [inserted as QuizAttempt, ...current.attempts] }));
    setNotice(`Quiz submitted: ${score}/${activeQuiz.questions.length}`);
  }

  async function createMentorReview() {
    if (!session?.user) {
      return;
    }

    const client = requireSupabase();
    setBusy(true);
    setNotice('');

    try {
      const todayLog = data.logs.find((log) => log.log_date === today) ?? {
        log_date: today,
        study_minutes: Number(logForm.study_minutes) || 0,
        notes: logForm.notes,
        blockers: logForm.blockers,
        completion_summary: logForm.completion_summary
      };
      const generated = await generateMentorReviewWithAI(data, todayLog, today);
      const { data: insertedReview, error: reviewError } = await client
        .from('mentor_reviews')
        .insert({
          user_id: session.user.id,
          review_date: today,
          feedback: generated.feedback,
          weak_areas: generated.weak_areas,
          next_day_suggestions: generated.next_day_suggestions,
          readiness_score: generated.readiness_score
        })
        .select('*')
        .single();

      if (reviewError) {
        throw reviewError;
      }

      const tomorrow = addDaysIso(1);
      await client
        .from('daily_tasks')
        .delete()
        .eq('user_id', session.user.id)
        .eq('task_date', tomorrow)
        .eq('source', 'mentor')
        .neq('status', 'done');

      const tasksRes = await client.from('daily_tasks').insert(
        generated.next_day_suggestions.map((suggestion) => ({
          user_id: session.user.id,
          task_date: tomorrow,
          title: suggestion.title,
          topic: suggestion.topic,
          skill_area: suggestion.skill_area,
          estimated_minutes: suggestion.estimated_minutes,
          priority: suggestion.priority,
          status: 'planned',
          source: 'mentor'
        }))
      ).select('*');

      if (tasksRes.error) {
        throw tasksRes.error;
      }

      setData((current) => ({
        ...current,
        reviews: [insertedReview as MentorReview, ...current.reviews],
        tasks: [...((tasksRes.data ?? []) as DailyTask[]), ...current.tasks]
      }));
      setNotice('Mentor review ready hai. Kal ke tasks bhi add ho gaye.');
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function updateProject(project: PrepProject, patch: Partial<PrepProject>) {
    const client = requireSupabase();
    const next = { ...project, ...patch };
    const { error } = await client
      .from('projects')
      .update({
        milestones: next.milestones,
        status: next.status,
        github_url: next.github_url,
        deploy_url: next.deploy_url
      })
      .eq('id', project.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      projects: current.projects.map((item) => (item.id === project.id ? next : item))
    }));
  }

  async function saveOpenAIKey() {
    if (!openaiKeyInput.trim()) {
      return;
    }

    try {
      const status = await window.mentorAI.saveKey(openaiKeyInput);
      setKeyStatus(status);
      setOpenaiKeyInput('');
      setNotice(status.encrypted ? 'OpenAI key encrypted storage me save ho gayi.' : 'OpenAI key save ho gayi. Encryption unavailable tha.');
    } catch (error) {
      setNotice(getErrorMessage(error));
    }
  }

  async function deleteOpenAIKey() {
    await window.mentorAI.deleteKey();
    setKeyStatus({ hasKey: false, encrypted: false, storageMode: null });
    setNotice('OpenAI key remove ho gayi.');
  }

  async function signOut() {
    const client = requireSupabase();
    await client.auth.signOut();
    setSession(null);
    setProfile(null);
    setData(emptyData);
  }

  if (!supabaseConfigured) {
    return <SetupScreen />;
  }

  if (loading) {
    return <CenteredMessage title="Loading mentor..." text="Workspace prepare ho raha hai." />;
  }

  if (!session) {
    return (
      <AuthScreen
        mode={authMode}
        form={authForm}
        busy={busy}
        notice={notice}
        setMode={setAuthMode}
        setForm={setAuthForm}
        onSubmit={handleAuth}
      />
    );
  }

  if (!profile) {
    return (
      <OnboardingScreen
        values={onboarding}
        busy={busy}
        notice={notice}
        setValues={setOnboarding}
        onSubmit={completeOnboarding}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">AI</div>
          <div>
            <strong>Interview Mentor</strong>
            <span>{profile.full_name}</span>
          </div>
        </div>

        <nav className="nav-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.id ? 'nav-item active' : 'nav-item'}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-stat">
            <span>Readiness</span>
            <strong>{metrics.readinessScore}%</strong>
          </div>
          <button className="ghost-button" onClick={signOut}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{prettyDate(today)}</p>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
          </div>
          <div className="topbar-actions">
            {busy ? <span className="sync-pill">Syncing</span> : <span className="sync-pill ready">Cloud ready</span>}
            <span className={keyStatus?.hasKey ? 'key-pill ready' : 'key-pill'}>
              <KeyRound size={14} />
              {keyStatus?.hasKey ? 'AI key set' : 'AI key missing'}
            </span>
          </div>
        </header>

        {notice ? (
          <div className="notice">
            <span>{notice}</span>
            <button onClick={() => setNotice('')}>Dismiss</button>
          </div>
        ) : null}

        {activeTab === 'dashboard' ? (
          <Dashboard
            metrics={metrics}
            todayTasks={todayTasks}
            latestReview={latestReview}
            latestAttempt={latestAttempt}
            onTaskStatus={updateTask}
            onReview={createMentorReview}
            onQuiz={() => setActiveTab('quiz')}
            busy={busy}
          />
        ) : null}

        {activeTab === 'daily' ? (
          <DailyTracker
            today={today}
            tasks={todayTasks}
            logForm={logForm}
            manualTask={manualTask}
            setLogForm={setLogForm}
            setManualTask={setManualTask}
            onTaskStatus={updateTask}
            onSaveLog={saveDailyLog}
            onAddTask={addManualTask}
          />
        ) : null}

        {activeTab === 'roadmap' ? (
          <Roadmap items={data.roadmap} onStatus={updateRoadmapStatus} />
        ) : null}

        {activeTab === 'quiz' ? (
          <QuizCenter
            quizzes={data.quizzes}
            attempts={data.attempts}
            activeQuiz={activeQuiz}
            quizTopic={quizTopic}
            quizDifficulty={quizDifficulty}
            quizAnswers={quizAnswers}
            busy={busy}
            setQuizTopic={setQuizTopic}
            setQuizDifficulty={setQuizDifficulty}
            setActiveQuiz={setActiveQuiz}
            setQuizAnswers={setQuizAnswers}
            onGenerate={createQuiz}
            onSubmit={submitQuiz}
          />
        ) : null}

        {activeTab === 'mentor' ? (
          <MentorPanel
            reviews={data.reviews}
            todayTasks={todayTasks}
            metrics={metrics}
            busy={busy}
            onReview={createMentorReview}
          />
        ) : null}

        {activeTab === 'projects' ? (
          <ProjectsPanel projects={data.projects} onUpdate={updateProject} />
        ) : null}

        {activeTab === 'reports' ? <Reports metrics={metrics} data={data} /> : null}

        {activeTab === 'settings' ? (
          <SettingsPanel
            profile={profile}
            keyStatus={keyStatus}
            openaiKeyInput={openaiKeyInput}
            setOpenaiKeyInput={setOpenaiKeyInput}
            onSaveKey={saveOpenAIKey}
            onDeleteKey={deleteOpenAIKey}
          />
        ) : null}
      </main>
    </div>
  );
}

function SetupScreen() {
  return (
    <CenteredMessage
      title="Supabase setup required"
      text="Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then run the migration SQL in Supabase."
    />
  );
}

function CenteredMessage({ title, text }: { title: string; text: string }) {
  return (
    <main className="center-screen">
      <section className="auth-panel">
        <div className="brand-mark large">AI</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </section>
    </main>
  );
}

function AuthScreen({
  mode,
  form,
  busy,
  notice,
  setMode,
  setForm,
  onSubmit
}: {
  mode: 'login' | 'signup';
  form: { email: string; password: string };
  busy: boolean;
  notice: string;
  setMode: (mode: 'login' | 'signup') => void;
  setForm: (form: { email: string; password: string }) => void;
  onSubmit: () => void;
}) {
  return (
    <main className="center-screen">
      <section className="auth-panel">
        <div className="brand-mark large">AI</div>
        <p className="eyebrow">AI/ML + DSA</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <label>
          Email
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        {notice ? <p className="inline-notice">{notice}</p> : null}
        <button className="primary-button" onClick={onSubmit} disabled={busy}>
          <CheckCircle2 size={17} />
          {mode === 'login' ? 'Login' : 'Signup'}
        </button>
        <button className="text-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Need account? Signup' : 'Already have account? Login'}
        </button>
      </section>
    </main>
  );
}

function OnboardingScreen({
  values,
  busy,
  notice,
  setValues,
  onSubmit
}: {
  values: { name: string; dailyHours: string };
  busy: boolean;
  notice: string;
  setValues: (values: { name: string; dailyHours: string }) => void;
  onSubmit: () => void;
}) {
  return (
    <main className="center-screen">
      <section className="auth-panel wide">
        <p className="eyebrow">4 month track</p>
        <h1>Mentor setup</h1>
        <div className="form-grid">
          <label>
            Name
            <input value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
          </label>
          <label>
            Daily study hours
            <input
              type="number"
              min="1"
              max="14"
              value={values.dailyHours}
              onChange={(event) => setValues({ ...values, dailyHours: event.target.value })}
            />
          </label>
        </div>
        <div className="track-summary">
          <span>Target role</span>
          <strong>AI/ML + GenAI Engineer with DSA backup</strong>
        </div>
        {notice ? <p className="inline-notice">{notice}</p> : null}
        <button className="primary-button" onClick={onSubmit} disabled={busy}>
          <Sparkles size={17} />
          Start roadmap
        </button>
      </section>
    </main>
  );
}

function Dashboard({
  metrics,
  todayTasks,
  latestReview,
  latestAttempt,
  busy,
  onTaskStatus,
  onReview,
  onQuiz
}: {
  metrics: ReturnType<typeof buildMetrics>;
  todayTasks: DailyTask[];
  latestReview: MentorReview | null;
  latestAttempt: QuizAttempt | null;
  busy: boolean;
  onTaskStatus: (taskId: string, status: TaskStatus) => void;
  onReview: () => void;
  onQuiz: () => void;
}) {
  return (
    <section className="content-grid">
      <div className="metric-row">
        <Metric label="Today done" value={`${metrics.todayDone}/${metrics.todayTotal}`} />
        <Metric label="Study time" value={`${Math.round(metrics.totalStudyMinutes / 60)}h`} />
        <Metric label="Quiz avg" value={`${metrics.quizAverage}%`} />
        <Metric label="Roadmap" value={`${metrics.roadmapDone}%`} />
      </div>

      <section className="panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Task focus</h2>
          </div>
          <button className="secondary-button" onClick={onReview} disabled={busy}>
            <Brain size={16} />
            Mentor review
          </button>
        </div>
        <div className="task-list">
          {todayTasks.map((task) => (
            <TaskRow key={task.id} task={task} onTaskStatus={onTaskStatus} />
          ))}
          {todayTasks.length === 0 ? <p className="muted">No tasks for today.</p> : null}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <h2>Mentor note</h2>
        </div>
        <p className="mentor-copy">
          {latestReview?.feedback ??
            'Aaj ka kaam complete karo, daily log save karo, phir mentor review generate karo. App tumhare next tasks adjust karega.'}
        </p>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <h2>Weak topics</h2>
          <button className="icon-button" onClick={onQuiz} aria-label="Open quiz">
            <ClipboardList size={17} />
          </button>
        </div>
        <div className="tag-cloud">
          {metrics.weakTopics.length > 0
            ? metrics.weakTopics.map((topic) => <span key={topic}>{topic}</span>)
            : ['Python', 'DSA', 'ML basics'].map((topic) => <span key={topic}>{topic}</span>)}
        </div>
        {latestAttempt ? <p className="muted">Last quiz: {latestAttempt.score}/{latestAttempt.total}</p> : null}
      </section>
    </section>
  );
}

function DailyTracker({
  today,
  tasks,
  logForm,
  manualTask,
  setLogForm,
  setManualTask,
  onTaskStatus,
  onSaveLog,
  onAddTask
}: {
  today: string;
  tasks: DailyTask[];
  logForm: { study_minutes: string; notes: string; blockers: string; completion_summary: string };
  manualTask: { title: string; topic: string; skill_area: string; estimated_minutes: string };
  setLogForm: (form: { study_minutes: string; notes: string; blockers: string; completion_summary: string }) => void;
  setManualTask: (task: { title: string; topic: string; skill_area: string; estimated_minutes: string }) => void;
  onTaskStatus: (taskId: string, status: TaskStatus) => void;
  onSaveLog: () => void;
  onAddTask: () => void;
}) {
  return (
    <section className="two-column">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{prettyDate(today)}</p>
            <h2>Daily tasks</h2>
          </div>
        </div>
        <div className="task-list">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onTaskStatus={onTaskStatus} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <h2>Add task</h2>
        </div>
        <label>
          Task
          <input value={manualTask.title} onChange={(event) => setManualTask({ ...manualTask, title: event.target.value })} />
        </label>
        <div className="form-grid">
          <label>
            Topic
            <input value={manualTask.topic} onChange={(event) => setManualTask({ ...manualTask, topic: event.target.value })} />
          </label>
          <label>
            Minutes
            <input
              type="number"
              value={manualTask.estimated_minutes}
              onChange={(event) => setManualTask({ ...manualTask, estimated_minutes: event.target.value })}
            />
          </label>
        </div>
        <button className="secondary-button" onClick={onAddTask}>
          <Plus size={16} />
          Add
        </button>
      </section>

      <section className="panel wide-panel">
        <div className="section-heading compact">
          <h2>Daily log</h2>
        </div>
        <div className="form-grid">
          <label>
            Study minutes
            <input
              type="number"
              value={logForm.study_minutes}
              onChange={(event) => setLogForm({ ...logForm, study_minutes: event.target.value })}
            />
          </label>
          <label>
            Completion summary
            <input
              value={logForm.completion_summary}
              onChange={(event) => setLogForm({ ...logForm, completion_summary: event.target.value })}
            />
          </label>
        </div>
        <label>
          Notes
          <textarea value={logForm.notes} onChange={(event) => setLogForm({ ...logForm, notes: event.target.value })} />
        </label>
        <label>
          Blockers
          <textarea value={logForm.blockers} onChange={(event) => setLogForm({ ...logForm, blockers: event.target.value })} />
        </label>
        <button className="primary-button" onClick={onSaveLog}>
          <Save size={16} />
          Save log
        </button>
      </section>
    </section>
  );
}

function Roadmap({ items, onStatus }: { items: RoadmapItem[]; onStatus: (itemId: string, status: RoadmapStatus) => void }) {
  const months = [1, 2, 3, 4];
  return (
    <section className="roadmap-grid">
      {months.map((month) => (
        <section className="panel" key={month}>
          <p className="eyebrow">Month {month}</p>
          <h2>{monthTitle(month)}</h2>
          <div className="roadmap-list">
            {items
              .filter((item) => item.month_number === month)
              .map((item) => (
                <div className="roadmap-item" key={item.id}>
                  <div>
                    <strong>Week {item.week_number}: {item.title}</strong>
                    <p>{item.description}</p>
                    <span className={`status-chip ${item.status}`}>{item.status.replace('_', ' ')}</span>
                  </div>
                  <select value={item.status} onChange={(event) => onStatus(item.id, event.target.value as RoadmapStatus)}>
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
              ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function QuizCenter({
  quizzes,
  attempts,
  activeQuiz,
  quizTopic,
  quizDifficulty,
  quizAnswers,
  busy,
  setQuizTopic,
  setQuizDifficulty,
  setActiveQuiz,
  setQuizAnswers,
  onGenerate,
  onSubmit
}: {
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  activeQuiz: Quiz | null;
  quizTopic: string;
  quizDifficulty: 'easy' | 'medium' | 'hard';
  quizAnswers: Record<string, number>;
  busy: boolean;
  setQuizTopic: (topic: string) => void;
  setQuizDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  setActiveQuiz: (quiz: Quiz) => void;
  setQuizAnswers: (answers: Record<string, number>) => void;
  onGenerate: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="two-column">
      <section className="panel">
        <div className="section-heading compact">
          <h2>Generate quiz</h2>
        </div>
        <label>
          Topic
          <input value={quizTopic} onChange={(event) => setQuizTopic(event.target.value)} />
        </label>
        <label>
          Difficulty
          <select value={quizDifficulty} onChange={(event) => setQuizDifficulty(event.target.value as 'easy' | 'medium' | 'hard')}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <button className="primary-button" onClick={onGenerate} disabled={busy}>
          <Sparkles size={16} />
          Generate
        </button>
        <div className="history-list">
          {quizzes.slice(0, 6).map((quiz) => (
            <button className="history-item" key={quiz.id} onClick={() => setActiveQuiz(quiz)}>
              <strong>{quiz.title}</strong>
              <span>{quiz.topic} - {quiz.difficulty}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel wide-panel">
        <div className="section-heading compact">
          <h2>{activeQuiz?.title ?? 'Quiz workspace'}</h2>
        </div>
        {activeQuiz ? (
          <div className="quiz-list">
            {activeQuiz.questions.map((question, index) => (
              <div className="quiz-question" key={`${activeQuiz.id}-${index}`}>
                <strong>{index + 1}. {question.question}</strong>
                <div className="option-grid">
                  {question.options.map((option, optionIndex) => (
                    <button
                      className={quizAnswers[String(index)] === optionIndex ? 'option selected' : 'option'}
                      key={option}
                      onClick={() => setQuizAnswers({ ...quizAnswers, [String(index)]: optionIndex })}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="primary-button" onClick={onSubmit}>
              <CheckCircle2 size={16} />
              Submit quiz
            </button>
          </div>
        ) : (
          <p className="muted">Generate or open a quiz.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <h2>Attempts</h2>
        </div>
        <div className="history-list">
          {attempts.slice(0, 8).map((attempt) => (
            <div className="history-card" key={attempt.id}>
              <strong>{attempt.score}/{attempt.total}</strong>
              <span>{new Date(attempt.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function MentorPanel({
  reviews,
  todayTasks,
  metrics,
  busy,
  onReview
}: {
  reviews: MentorReview[];
  todayTasks: DailyTask[];
  metrics: ReturnType<typeof buildMetrics>;
  busy: boolean;
  onReview: () => void;
}) {
  return (
    <section className="content-grid">
      <section className="panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Adaptive coach</p>
            <h2>Daily mentor review</h2>
          </div>
          <button className="primary-button" onClick={onReview} disabled={busy}>
            <Brain size={16} />
            Generate
          </button>
        </div>
        <p className="mentor-copy">
          {reviews[0]?.feedback ??
            'Daily log aur tasks update karne ke baad review generate karo. Mentor tumhare weak areas aur kal ka plan decide karega.'}
        </p>
        <div className="tag-cloud">
          {metrics.weakTopics.map((topic) => <span key={topic}>{topic}</span>)}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <h2>Today signal</h2>
        </div>
        <Metric label="Tasks planned" value={String(todayTasks.length)} />
        <Metric label="Completed" value={String(todayTasks.filter((task) => task.status === 'done').length)} />
        <Metric label="Readiness" value={`${metrics.readinessScore}%`} />
      </section>

      <section className="panel wide-panel">
        <div className="section-heading compact">
          <h2>Review history</h2>
        </div>
        <div className="history-list">
          {reviews.map((review) => (
            <div className="history-card" key={review.id}>
              <strong>{prettyDate(review.review_date)} - {review.readiness_score}%</strong>
              <p>{review.feedback}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ProjectsPanel({ projects, onUpdate }: { projects: PrepProject[]; onUpdate: (project: PrepProject, patch: Partial<PrepProject>) => void }) {
  return (
    <section className="project-grid">
      {projects.map((project) => (
        <section className="panel" key={project.id}>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">{project.project_type}</p>
              <h2>{project.name}</h2>
            </div>
          </div>
          <p className="muted">{project.description}</p>
          <div className="milestone-list">
            {project.milestones.map((milestone, index) => (
              <button
                className="milestone"
                key={milestone.title}
                onClick={() => {
                  const milestones = project.milestones.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, done: !item.done } : item
                  );
                  const status = milestones.every((item) => item.done)
                    ? 'done'
                    : milestones.some((item) => item.done)
                      ? 'in_progress'
                      : 'not_started';
                  onUpdate(project, { milestones, status });
                }}
              >
                {milestone.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                {milestone.title}
              </button>
            ))}
          </div>
          <label>
            GitHub URL
            <input
              value={project.github_url ?? ''}
              onChange={(event) => onUpdate(project, { github_url: event.target.value })}
            />
          </label>
          <label>
            Deploy URL
            <input
              value={project.deploy_url ?? ''}
              onChange={(event) => onUpdate(project, { deploy_url: event.target.value })}
            />
          </label>
        </section>
      ))}
    </section>
  );
}

function Reports({ metrics, data }: { metrics: ReturnType<typeof buildMetrics>; data: AppData }) {
  return (
    <section className="content-grid">
      <div className="metric-row">
        <Metric label="Readiness" value={`${metrics.readinessScore}%`} />
        <Metric label="Streak" value={`${metrics.streak} days`} />
        <Metric label="DSA tasks" value={String(metrics.dsaDone)} />
        <Metric label="Projects done" value={`${metrics.projectsDone}/${data.projects.length}`} />
      </div>
      <section className="panel wide-panel">
        <div className="section-heading compact">
          <h2>Progress by area</h2>
        </div>
        <div className="bar-list">
          {Object.entries(metrics.areaProgress).map(([area, value]) => (
            <div className="bar-row" key={area}>
              <span>{area}</span>
              <div><i style={{ width: `${value}%` }} /></div>
              <strong>{value}%</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading compact">
          <h2>Interview focus</h2>
        </div>
        <div className="tag-cloud">
          {metrics.weakTopics.length ? metrics.weakTopics.map((topic) => <span key={topic}>{topic}</span>) : <span>No weak topic yet</span>}
        </div>
      </section>
    </section>
  );
}

function SettingsPanel({
  profile,
  keyStatus,
  openaiKeyInput,
  setOpenaiKeyInput,
  onSaveKey,
  onDeleteKey
}: {
  profile: Profile;
  keyStatus: MentorKeyStatus | null;
  openaiKeyInput: string;
  setOpenaiKeyInput: (key: string) => void;
  onSaveKey: () => void;
  onDeleteKey: () => void;
}) {
  return (
    <section className="two-column">
      <section className="panel">
        <div className="section-heading compact">
          <h2>Profile</h2>
        </div>
        <div className="detail-list">
          <span>Name</span>
          <strong>{profile.full_name}</strong>
          <span>Target</span>
          <strong>{profile.target_role}</strong>
          <span>Daily hours</span>
          <strong>{profile.daily_hours}</strong>
          <span>Timeline</span>
          <strong>{profile.timeline_months} months</strong>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading compact">
          <h2>OpenAI key</h2>
        </div>
        <p className="muted">
          Status: {keyStatus?.hasKey ? (keyStatus.encrypted ? 'encrypted and saved' : 'saved') : 'not saved'}
        </p>
        <label>
          API key
          <input
            type="password"
            value={openaiKeyInput}
            onChange={(event) => setOpenaiKeyInput(event.target.value)}
            placeholder="sk-..."
          />
        </label>
        <div className="button-row">
          <button className="primary-button" onClick={onSaveKey}>
            <KeyRound size={16} />
            Save key
          </button>
          <button className="danger-button" onClick={onDeleteKey}>
            <Trash2 size={16} />
            Remove
          </button>
        </div>
      </section>
    </section>
  );
}

function TaskRow({ task, onTaskStatus }: { task: DailyTask; onTaskStatus: (taskId: string, status: TaskStatus) => void }) {
  return (
    <div className={`task-row ${task.status}`}>
      <button
        className="icon-button"
        onClick={() => onTaskStatus(task.id, task.status === 'done' ? 'planned' : 'done')}
        aria-label="Toggle task"
      >
        {task.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <div>
        <strong>{task.title}</strong>
        <span>{task.skill_area} - {task.topic} - {task.estimated_minutes} min</span>
      </div>
      <button className="ghost-button compact" onClick={() => onTaskStatus(task.id, 'skipped')}>
        Skip
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildDailyDefaults(userId: string, taskDate: string, roadmap: RoadmapItem[]): Omit<DailyTask, 'id' | 'created_at' | 'updated_at'>[] {
  const current = roadmap.find((item) => item.status !== 'done' && item.status !== 'skipped');
  const base = starterTasks(taskDate).slice(0, 2);
  const adaptive = current
    ? [
        {
          task_date: taskDate,
          title: `Study ${current.title}`,
          topic: current.title,
          skill_area: current.skill_area,
          estimated_minutes: 120,
          priority: current.priority,
          status: 'planned' as const,
          source: 'system' as const
        },
        {
          task_date: taskDate,
          title: 'Write 8 interview notes from today topic',
          topic: current.skill_area,
          skill_area: 'Interview',
          estimated_minutes: 35,
          priority: 'medium' as const,
          status: 'planned' as const,
          source: 'system' as const
        }
      ]
    : starterTasks(taskDate);

  return [...base, ...adaptive].map((task) => ({ ...task, user_id: userId }));
}

function buildMetrics(data: AppData, today: string) {
  const todayTasks = data.tasks.filter((task) => task.task_date === today);
  const todayDone = todayTasks.filter((task) => task.status === 'done').length;
  const totalTasks = data.tasks.length;
  const doneTasks = data.tasks.filter((task) => task.status === 'done').length;
  const totalStudyMinutes = data.logs.reduce((total, log) => total + (log.study_minutes || 0), 0);
  const quizScores = data.attempts.map((attempt) => (attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0));
  const quizAverage = quizScores.length ? Math.round(quizScores.reduce((total, score) => total + score, 0) / quizScores.length) : 0;
  const roadmapDone = data.roadmap.length
    ? Math.round((data.roadmap.filter((item) => item.status === 'done').length / data.roadmap.length) * 100)
    : 0;
  const weakTopics = Array.from(new Set(data.attempts.flatMap((attempt) => attempt.wrong_topics))).slice(0, 6);
  const latestReviewScore = data.reviews[0]?.readiness_score ?? 0;
  const readinessScore = Math.max(
    latestReviewScore,
    Math.round(roadmapDone * 0.4 + quizAverage * 0.3 + Math.min(100, doneTasks * 3) * 0.3)
  );
  const dsaDone = data.tasks.filter((task) => task.skill_area.toLowerCase().includes('dsa') && task.status === 'done').length;
  const projectsDone = data.projects.filter((project) => project.status === 'done').length;
  const areaProgress = data.roadmap.reduce<Record<string, number>>((acc, item) => {
    const areaItems = data.roadmap.filter((entry) => entry.skill_area === item.skill_area);
    const doneAreaItems = areaItems.filter((entry) => entry.status === 'done');
    acc[item.skill_area] = areaItems.length ? Math.round((doneAreaItems.length / areaItems.length) * 100) : 0;
    return acc;
  }, {});

  return {
    todayDone,
    todayTotal: todayTasks.length,
    totalTasks,
    doneTasks,
    totalStudyMinutes,
    quizAverage,
    roadmapDone,
    weakTopics,
    readinessScore,
    dsaDone,
    projectsDone,
    streak: buildStreak(data, today),
    areaProgress
  };
}

function buildStreak(data: AppData, today: string) {
  let streak = 0;
  const datesWithProgress = new Set([
    ...data.tasks.filter((task) => task.status === 'done').map((task) => task.task_date),
    ...data.logs.filter((log) => log.study_minutes > 0).map((log) => log.log_date)
  ]);
  const cursor = new Date(`${today}T00:00:00`);

  while (datesWithProgress.has(toIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function priorityRank(priority: string) {
  return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
}

function monthTitle(month: number) {
  return ['Foundation', 'Machine Learning', 'Deep Learning', 'GenAI + Jobs'][month - 1] ?? 'Roadmap';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

export default App;
