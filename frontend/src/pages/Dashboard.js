import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, ArrowRight, Microphone, ListChecks, Target, Sparkle, Compass } from '@phosphor-icons/react';

const Stat = ({ label, value }) => (
  <div className="card">
    <div className="label">{label}</div>
    <div className="text-4xl font-semibold" style={{ fontFamily: 'Outfit', color: 'var(--brand)' }}>
      {value}
    </div>
  </div>
);

function OnboardingCta({ name, onClick }) {
  return (
    <div className="card fade-in" style={{ background: 'linear-gradient(135deg, #F0EFEA 0%, #FFFFFF 100%)' }}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'var(--brand)' }}>
          <Sparkle size={26} color="white" weight="fill" />
        </div>
        <div className="flex-1">
          <div className="label">Welcome, {name || 'mentee'}</div>
          <h2 className="text-2xl font-semibold mt-1 mb-2" style={{ fontFamily: 'Outfit' }}>
            Let's design your career path
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Three quick questions (under 60 seconds). We'll generate your personalized roadmap, daily tasks, and unlock everything you see below.
          </p>
          <button onClick={onClick} className="btn btn-primary" data-testid="dashboard-start-onboarding-btn">
            <Compass size={16} weight="bold" /> Start onboarding <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => setData({ profile: null, streak: { count: 0, best: 0 },
                              stats: { readiness_score: 0, tasks_done: 0, tasks_total: 0, completion_pct: 0, quiz_avg: 0, quiz_count: 0, interview_count: 0 },
                              recent_quizzes: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout><div className="fade-in" style={{ color: 'var(--text-muted)' }}>Loading your dashboard…</div></AppLayout>;
  if (!data) return null;

  const { stats, streak, profile } = data;
  const isOnboarded = !!profile;

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="label">Good day, {user?.name?.split(' ')[0] || 'there'}</div>
        <h1 className="text-4xl font-semibold mt-1">
          {isOnboarded ? 'Your career, one focused day at a time.' : 'Welcome to your mentor.'}
        </h1>
        {isOnboarded && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Target size={14} className="inline mr-1" /> Targeting <strong>{profile.target_role}</strong> in {profile.timeline_months} months.
          </p>
        )}
      </div>

      {!isOnboarded && (
        <div className="mb-10">
          <OnboardingCta name={user?.name?.split(' ')[0]} onClick={() => navigate('/onboarding')} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 stagger"
           style={{ opacity: isOnboarded ? 1 : 0.55, pointerEvents: isOnboarded ? 'auto' : 'none' }}>
        <div className="card" data-testid={APP.readinessCard}>
          <div className="label">Readiness Score</div>
          <div className="text-5xl font-semibold" style={{ fontFamily: 'Outfit', color: 'var(--brand)' }}>
            {stats.readiness_score}<span className="text-xl" style={{ color: 'var(--text-muted)' }}>/100</span>
          </div>
          <div className="mt-3 h-2 rounded-full" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${stats.readiness_score}%`, background: 'var(--brand)' }} />
          </div>
        </div>

        <div className="card" data-testid={APP.streakCard}>
          <div className="label">Streak</div>
          <div className="flex items-baseline gap-2">
            <Flame size={28} color="var(--terracotta)" weight="fill" />
            <span className="text-5xl font-semibold" style={{ fontFamily: 'Outfit' }}>{streak.count}</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>days</span>
          </div>
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Best: {streak.best} days</div>
        </div>

        <Stat label="Tasks done" value={`${stats.tasks_done}/${stats.tasks_total || 0}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
           style={{ opacity: isOnboarded ? 1 : 0.55, pointerEvents: isOnboarded ? 'auto' : 'none' }}>
        <div className="card card-hover cursor-pointer" onClick={() => isOnboarded && navigate('/tasks')}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="label">Today</div>
              <div className="text-xl font-medium mt-1" style={{ fontFamily: 'Outfit' }}>Daily tasks</div>
            </div>
            <ListChecks size={28} color="var(--brand)" weight="duotone" />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Small, concrete steps generated each morning based on your roadmap and progress.
          </p>
          <button className="btn btn-primary" data-testid={APP.startTasksBtn}>
            Open today's tasks <ArrowRight size={14} weight="bold" />
          </button>
        </div>

        <div className="card card-hover cursor-pointer" onClick={() => isOnboarded && navigate('/interview')}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="label">Practice</div>
              <div className="text-xl font-medium mt-1" style={{ fontFamily: 'Outfit' }}>Mock interview</div>
            </div>
            <Microphone size={28} color="var(--terracotta)" weight="duotone" />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Calm, 4-question text interview with structured feedback at the end.
          </p>
          <button className="btn btn-terracotta" data-testid={APP.startInterviewBtn}>
            Start interview <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>

      <div className="card" style={{ opacity: isOnboarded ? 1 : 0.55 }}>
        <div className="label mb-2">Recent quizzes</div>
        {data.recent_quizzes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isOnboarded
              ? 'No quizzes yet. Try one from the Quiz tab to test a topic.'
              : 'Complete onboarding to unlock quizzes.'}
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {data.recent_quizzes.map((q) => (
              <li key={q.quiz_id} className="py-3 flex justify-between items-center">
                <span className="font-medium">{q.topic}</span>
                <span className="chip">
                  {q.correct}/{q.total} · {q.score}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
