import { useState } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { Sparkle } from '@phosphor-icons/react';

export default function MentorReview() {
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError(''); setBusy(true);
    try {
      const { data } = await api.post('/mentor/review');
      setReview(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Review failed');
    } finally { setBusy(false); }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="label">Mentor review</div>
        <h1 className="text-4xl font-semibold mt-1">Get an honest pulse check.</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Your AI mentor reviews everything — tasks, quizzes, interviews — and gives you a readiness score with honest next steps.
        </p>
      </div>

      {!review && (
        <button className="btn btn-primary" onClick={run} disabled={busy}
                data-testid={APP.mentorRunBtn}>
          <Sparkle size={16} weight="fill" /> {busy ? 'Reviewing…' : 'Run mentor review'}
        </button>
      )}
      {error && <div className="card mt-4" style={{ color: 'var(--terracotta)' }}>{error}</div>}

      {review && (
        <div className="grid gap-6 mt-2 fade-in">
          <div className="card">
            <div className="label">Readiness</div>
            <div className="text-6xl font-semibold mb-3"
                 style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
              {review.readiness_score}<span className="text-xl" style={{ color: 'var(--muted)' }}>/100</span>
            </div>
            <p>{review.summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <div className="label">Strong areas</div>
              <ul className="list-disc pl-5 text-sm">
                {review.strong_areas?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="card">
              <div className="label">Weak areas</div>
              <ul className="list-disc pl-5 text-sm">
                {review.weak_areas?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="label">Recommended focus this week</div>
            <ul className="list-disc pl-5 text-sm">
              {review.recommended_focus?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <button className="btn btn-outline self-start" onClick={() => setReview(null)}>
            Run again later
          </button>
        </div>
      )}
    </AppLayout>
  );
}
