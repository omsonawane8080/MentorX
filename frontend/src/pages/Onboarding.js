import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { APP } from '@/constants/testIds';
import { Sparkle, ArrowLeft, ArrowRight } from '@phosphor-icons/react';

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

  const isValid = background.trim().length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValid) {
      setError('Please describe your background in at least a sentence (10+ characters).');
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
    <div className="min-h-screen" style={{ background: 'var(--bg)', paddingBottom: 100 }}>
      {/* Top bar — keeps escape route visible */}
      <div className="px-6 py-4 flex items-center justify-between border-b"
           style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-ghost"
          style={{ padding: '6px 12px' }}
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>
        <span className="label" style={{ marginBottom: 0 }}>Onboarding</span>
      </div>

      {/* Scrollable form area */}
      <div className="px-4 py-6 md:py-8">
        <div className="w-full max-w-2xl mx-auto fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Sparkle size={18} color="var(--terracotta)" weight="fill" />
            <span className="label" style={{ marginBottom: 0 }}>Three quick questions</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">Let's design your path</h1>
          <p style={{ color: 'var(--text-muted)' }} className="mb-6">
            Under 60 seconds. We'll generate your roadmap right after.
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 card"
            data-testid={APP.onboardForm}
          >
            <div>
              <label className="label">1. Your target role</label>
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
              <label className="label">2. Your background</label>
              <textarea
                className="textarea"
                placeholder="e.g. Final-year CSE student. Comfortable with Python and basic ML. Built a small React app."
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                data-testid={APP.onboardBackground}
                rows={3}
                style={{ minHeight: 80 }}
              />
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {background.length} characters {!isValid && background.length > 0 && '— need at least 10'}
              </div>
            </div>

            <div>
              <label className="label">3. Your timeline</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 6, 9, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTimeline(m)}
                    data-testid={`${APP.onboardTimeline}-${m}`}
                    className="px-4 py-2 rounded-full text-sm transition-colors"
                    style={{
                      background: timeline === m ? 'var(--brand)' : 'var(--surface-2)',
                      color: timeline === m ? 'white' : 'var(--text)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    {m} {m === 1 ? 'month' : 'months'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm p-3 rounded-lg"
                   style={{ color: 'var(--terracotta)', background: '#FCEFEA' }}>
                {error}
              </div>
            )}
          </form>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            Your roadmap will be generated by AI — takes about 5-10 seconds.
          </p>
        </div>
      </div>

      {/* FIXED submit bar — pinned to viewport bottom regardless of scroll */}
      <div
        className="border-t px-4 py-4"
        style={{
          borderColor: 'var(--line)',
          background: 'var(--surface)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
          paddingRight: 'max(180px, 1rem)', // leave room for floating Emergent badge
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
        }}
      >
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isValid
              ? <>Ready: <strong style={{ color: 'var(--brand)' }}>{timeline}-month</strong> roadmap for <strong style={{ color: 'var(--brand)' }}>{targetRole}</strong></>
              : <>Fill in your background to continue</>}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !isValid}
            data-testid={APP.onboardSubmit}
            className="btn btn-primary"
            style={{ minWidth: 220 }}
          >
            {loading ? 'Generating roadmap…' : (
              <>Generate my roadmap <ArrowRight size={14} weight="bold" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
