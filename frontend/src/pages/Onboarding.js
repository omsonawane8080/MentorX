import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { APP } from '@/constants/testIds';
import { Sparkle, ArrowLeft, ArrowRight, Plant, TreeStructure, Mountains } from '@phosphor-icons/react';

const ROLE_SUGGESTIONS = [
  'AI/ML Engineer', 'GenAI Engineer', 'Data Scientist', 'Data Engineer',
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full-stack Engineer',
  'DevOps Engineer', 'Cloud Engineer', 'SAP ABAP Developer', 'Salesforce Developer',
  'Mobile App Developer', 'Cybersecurity Analyst', 'Product Manager', 'UI/UX Designer',
];

const LEVELS = [
  {
    value: 'beginner',
    label: 'Beginner',
    icon: Plant,
    blurb: 'Starting from zero. Need to build the basics step-by-step.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    icon: TreeStructure,
    blurb: 'Know the fundamentals. Ready to specialize and build projects.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    icon: Mountains,
    blurb: 'Comfortable shipping. Want to deepen, prep interviews, switch domain.',
  },
];

export default function Onboarding() {
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [background, setBackground] = useState('');
  const [timeline, setTimeline] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const isValid = targetRole.trim().length >= 3 && background.trim().length >= 10;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (targetRole.trim().length < 3) {
      setError('Please enter a target role (at least 3 characters).');
      return;
    }
    if (background.trim().length < 10) {
      setError('Please describe your background in at least a sentence (10+ characters).');
      return;
    }
    setLoading(true);
    try {
      await api.post('/onboarding', {
        target_role: targetRole.trim(),
        background: background.trim(),
        timeline_months: Number(timeline),
        experience_level: experienceLevel,
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
            <span className="label" style={{ marginBottom: 0 }}>Four quick questions</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">Let's design your path</h1>
          <p style={{ color: 'var(--text-muted)' }} className="mb-6">
            Under 90 seconds. Your roadmap is generated right after.
          </p>

          <div className="flex flex-col gap-5 card" data-testid={APP.onboardForm}>
            {/* 1. Target role — FREE TEXT */}
            <div>
              <label className="label">1. Your target role</label>
              <input
                type="text"
                className="input"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder='e.g. "AI/ML Engineer", "SAP ABAP Developer", "Game Developer", "DevRel Engineer"…'
                data-testid={APP.onboardTargetRole}
                list="role-suggestions"
                autoComplete="off"
              />
              <datalist id="role-suggestions">
                {ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
              </datalist>
              <div className="flex flex-wrap gap-2 mt-2">
                {ROLE_SUGGESTIONS.slice(0, 6).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRole(r)}
                    className="chip"
                    style={{
                      cursor: 'pointer',
                      background: targetRole === r ? 'var(--brand)' : 'var(--surface-2)',
                      color: targetRole === r ? 'white' : 'var(--text)',
                      borderColor: targetRole === r ? 'var(--brand)' : 'var(--line)',
                    }}
                  >
                    {r}
                  </button>
                ))}
                <span className="chip" style={{ background: 'transparent', borderStyle: 'dashed' }}>
                  …or type your own
                </span>
              </div>
            </div>

            {/* 2. Experience level */}
            <div>
              <label className="label">2. Where are you on the journey?</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {LEVELS.map((lvl) => {
                  const Icon = lvl.icon;
                  const selected = experienceLevel === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.value)}
                      data-testid={`onboard-level-${lvl.value}`}
                      style={{
                        textAlign: 'left', cursor: 'pointer',
                        background: selected ? 'var(--brand)' : 'var(--surface-2)',
                        color: selected ? 'white' : 'var(--text)',
                        border: '1px solid ' + (selected ? 'var(--brand)' : 'var(--line)'),
                        borderRadius: 12, padding: 14,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Icon size={20} weight="duotone" />
                        <span style={{ fontWeight: 600, fontFamily: 'Outfit' }}>{lvl.label}</span>
                      </div>
                      <div style={{
                        fontSize: 12, lineHeight: 1.45,
                        color: selected ? 'rgba(255,255,255,0.88)' : 'var(--text-muted)',
                      }}>
                        {lvl.blurb}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Background */}
            <div>
              <label className="label">3. Your background</label>
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
                {background.length} characters {background.length > 0 && background.length < 10 && '— need at least 10'}
              </div>
            </div>

            {/* 4. Timeline */}
            <div>
              <label className="label">4. Your timeline</label>
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
          </div>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            Your roadmap will be tailored to a {experienceLevel} — takes about 5-10 seconds to generate.
          </p>
        </div>
      </div>

      {/* FIXED submit bar — pinned to viewport bottom */}
      <div
        className="border-t px-4 py-4"
        style={{
          borderColor: 'var(--line)',
          background: 'var(--surface)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
          paddingRight: 'max(180px, 1rem)',
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        }}
      >
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isValid
              ? <>Ready: <strong style={{ color: 'var(--brand)' }}>{experienceLevel}</strong> · {timeline}-month roadmap for <strong style={{ color: 'var(--brand)' }}>{targetRole.trim()}</strong></>
              : <>Fill in your target role and background to continue</>}
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
