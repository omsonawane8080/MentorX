import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { APP } from '@/constants/testIds';
import { Sparkle } from '@phosphor-icons/react';

const ROLES = [
  'AI/ML Engineer', 'GenAI Engineer', 'Data Scientist',
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer',
  'DevOps Engineer', 'Data Engineer',
];

export default function Onboarding() {
  const [targetRole, setTargetRole] = useState('AI/ML Engineer');
  const [background, setBackground] = useState('');
  const [timeline, setTimeline] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (background.trim().length < 10) {
      setError('Please describe your background in at least a sentence.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/onboarding', {
        target_role: targetRole,
        background: background.trim(),
        timeline_months: Number(timeline),
      });
      await checkAuth();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'var(--bg)' }}>
      <div className="card w-full max-w-2xl fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Sparkle size={18} color="var(--terracotta)" weight="fill" />
          <span className="label" style={{ marginBottom: 0 }}>Onboarding</span>
        </div>
        <h1 className="text-3xl font-semibold mb-2">Let's design your path</h1>
        <p style={{ color: 'var(--muted)' }} className="mb-8">
          Three quick questions. We'll generate your personalized roadmap right after.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" data-testid={APP.onboardForm}>
          <div>
            <label className="label">Target role</label>
            <select
              className="select"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              data-testid={APP.onboardTargetRole}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Your background</label>
            <textarea
              className="textarea"
              placeholder="e.g. Final-year CSE student, comfortable with Python, basic ML, built a small web app in React."
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              data-testid={APP.onboardBackground}
              rows={4}
            />
          </div>

          <div>
            <label className="label">Timeline (months)</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 6, 9, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTimeline(m)}
                  data-testid={`${APP.onboardTimeline}-${m}`}
                  className="px-4 py-2 rounded-full text-sm transition-colors"
                  style={{
                    background: timeline === m ? 'var(--primary)' : 'var(--surface-2)',
                    color: timeline === m ? 'white' : 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {m} mo
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm" style={{ color: 'var(--terracotta)' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid={APP.onboardSubmit}
            className="btn btn-primary self-start"
          >
            {loading ? 'Generating your roadmap…' : 'Generate my roadmap'}
          </button>
        </form>
      </div>
    </div>
  );
}
