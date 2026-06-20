import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, ArrowRight, Microphone, ListChecks, Target } from '@phosphor-icons/react';

const Stat = ({ label, value, suffix }) => (
  <div className="card">
    <div className="label">{label}</div>
    <div className="text-4xl font-semibold" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
      {value}{suffix && <span className="text-lg" style={{ color: 'var(--muted)' }}>{suffix}</span>}
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => setData(data))
       .catch(() => navigate('/onboarding'))
       .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <AppLayout><div className="fade-in" style={{ color: 'var(--muted)' }}>Loading…</div></AppLayout>;
  if (!data) return null;

  const { stats, streak, profile } = data;

  return (
    <AppLayout>
      <div className="mb-10">
        <div className="label">Good day, {user?.name?.split(' ')[0] || 'there'}</div>
        <h1 className="text-4xl font-semibold mt-1">Your career, one focused day at a time.</h1>
        {profile && (
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            <Target size={14} className="inline mr-1" /> Targeting <strong>{profile.target_role}</strong> in {profile.timeline_months} months.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 stagger">
        <div className="card" data-testid={APP.readinessCard}>
          <div className="label">Readiness Score</div>
          <div className="text-5xl font-semibold" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {stats.readiness_score}<span className="text-xl" style={{ color: 'var(--muted)' }}>/100</span>
          </div>
          <div className="mt-3 h-2 rounded-full" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${stats.readiness_score}%`, background: 'var(--primary)' }} />
          </div>
        </div>

        <div className="card" data-testid={APP.streakCard}>
          <div className="label">Streak</div>
          <div className="flex items-baseline gap-2">
            <Flame size={28} color="var(--terracotta)" weight="fill" />
            <span className="text-5xl font-semibold" style={{ fontFamily: 'Outfit' }}>{streak.count}</span>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>days</span>
          </div>
          <div className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>Best: {streak.best} days</div>
        </div>

        <Stat label="Tasks done" value={`${stats.tasks_done}/${stats.tasks_total || 0}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="card card-hover cursor-pointer" onClick={() => navigate('/tasks')}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="label">Today</div>
              <div className="text-xl font-medium mt-1" style={{ fontFamily: 'Outfit' }}>Daily tasks</div>
            </div>
            <ListChecks size={28} color="var(--primary)" weight="duotone" />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Small, concrete steps generated each morning based on your roadmap and progress.
          </p>
          <button className="btn btn-primary" data-testid={APP.startTasksBtn}>
            Open today's tasks <ArrowRight size={14} weight="bold" />
          </button>
        </div>

        <div className="card card-hover cursor-pointer" onClick={() => navigate('/interview')}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="label">Practice</div>
              <div className="text-xl font-medium mt-1" style={{ fontFamily: 'Outfit' }}>Mock interview</div>
            </div>
            <Microphone size={28} color="var(--terracotta)" weight="duotone" />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Calm, 4-question text interview with structured feedback at the end.
          </p>
          <button className="btn btn-terracotta" data-testid={APP.startInterviewBtn}>
            Start interview <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="label mb-2">Recent quizzes</div>
        {data.recent_quizzes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No quizzes yet. Try one from the Quiz tab to test a topic.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
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
