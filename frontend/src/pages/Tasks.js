import { useEffect, useState } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { CheckCircle, Circle, Clock } from '@phosphor-icons/react';

export default function Tasks() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks/today');
      setDoc(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const complete = async (task_id) => {
    setBusyId(task_id);
    try {
      const { data } = await api.post('/tasks/complete', { task_id });
      setDoc(data);
    } catch (e) {
      // ignore
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <AppLayout><div style={{ color: 'var(--muted)' }}>Generating today's plan…</div></AppLayout>;
  if (error) return <AppLayout><div className="card" style={{ color: 'var(--terracotta)' }}>{error}</div></AppLayout>;

  const done = doc.tasks.filter((t) => t.done).length;
  const total = doc.tasks.length;
  const pct = Math.round((100 * done) / Math.max(total, 1));

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="label">Today · {doc.phase_title}</div>
        <h1 className="text-4xl font-semibold mt-1">Your daily tasks</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          {done} of {total} done · {pct}% — keep the streak alive.
        </p>
        <div className="mt-3 h-2 rounded-full" style={{ background: 'var(--surface-2)', maxWidth: 360 }}>
          <div className="h-full rounded-full transition-all"
               style={{ width: `${pct}%`, background: 'var(--terracotta)' }} />
        </div>
      </div>

      <div className="grid gap-4 stagger">
        {doc.tasks.map((t) => (
          <div
            key={t.task_id}
            data-testid={APP.taskItem}
            className="card flex items-start gap-4"
            style={{ opacity: t.done ? 0.7 : 1 }}
          >
            <button
              onClick={() => !t.done && complete(t.task_id)}
              data-testid={APP.taskCompleteBtn}
              disabled={t.done || busyId === t.task_id}
              className="mt-0.5"
              style={{ background: 'transparent', border: 'none', cursor: t.done ? 'default' : 'pointer' }}
              aria-label="Mark complete"
            >
              {t.done
                ? <CheckCircle size={26} color="var(--primary)" weight="fill" />
                : <Circle size={26} color="var(--muted)" weight="regular" />}
            </button>
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h3 className="text-lg font-medium" style={{
                  fontFamily: 'Outfit',
                  textDecoration: t.done ? 'line-through' : 'none',
                }}>
                  {t.title}
                </h3>
                <span className="chip"><Clock size={12} /> {t.estimated_minutes ?? 30} min</span>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t.description}</p>
              <div className="flex gap-2 mt-3">
                {t.topic && <span className="chip">{t.topic}</span>}
                {t.kind && <span className="chip" style={{ textTransform: 'capitalize' }}>{t.kind}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {doc.all_done && (
        <div className="card mt-8" style={{ background: 'var(--surface-2)', borderColor: 'var(--primary)' }}>
          <h3 className="text-xl font-medium mb-1" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            Day complete 🌱
          </h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Streak extended. Come back tomorrow — your next set will be ready.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
