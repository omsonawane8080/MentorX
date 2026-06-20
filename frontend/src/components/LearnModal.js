import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import {
  X, Sparkle, ArrowRight, BookOpen, Lightbulb, Warning, Clock,
  GraduationCap, ListNumbers, Code, Target,
} from '@phosphor-icons/react';

/** Renders detailed AI-generated explanation for a topic or resource. */
export default function LearnModal({ open, onClose, name, kind = 'topic' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !name) return;
    setData(null); setError(''); setLoading(true);
    api.post('/learn/explain', { name, kind })
      .then(({ data }) => setData(data))
      .catch((e) => setError(e?.response?.data?.detail || 'Could not load explanation'))
      .finally(() => setLoading(false));
  }, [open, name, kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const isTopic = kind === 'topic';
  const accent = isTopic ? 'var(--brand)' : 'var(--terracotta)';

  return (
    <div
      data-testid="learn-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(26, 28, 26, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
        animation: 'fade-in 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          background: 'var(--bg)', width: '100%', maxWidth: 760,
          height: '100vh', overflowY: 'auto',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* Hero */}
        <div style={{
          padding: '32px 32px 24px',
          background: isTopic
            ? 'linear-gradient(135deg, #2C5545 0%, #3D705C 60%, #8EA696 100%)'
            : 'linear-gradient(135deg, #C86B53 0%, #DDA77B 100%)',
          color: 'white', position: 'relative',
        }}>
          <button
            onClick={onClose}
            data-testid="learn-modal-close"
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Close"
          ><X size={18} weight="bold" /></button>

          <div className="label" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 10 }}>
            {isTopic ? 'Topic explainer' : 'Resource overview'}
          </div>
          {data?.emoji && (
            <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }}>{data.emoji}</div>
          )}
          <h1 style={{ fontFamily: 'Outfit', fontSize: 36, fontWeight: 600, margin: 0, lineHeight: 1.1 }}>
            {data?.title || name}
          </h1>
          {data?.tagline && (
            <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.5, opacity: 0.92, maxWidth: 580 }}>
              {data.tagline}
            </p>
          )}
          {data && (
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              {data.estimated_minutes && (
                <span className="chip" style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white' }}>
                  <Clock size={12} /> ~{data.estimated_minutes} min
                </span>
              )}
              {data.resource_type && (
                <span className="chip" style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white', textTransform: 'capitalize' }}>
                  {data.resource_type}
                </span>
              )}
              {data.best_for && (
                <span className="chip" style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white' }}>
                  <Target size={12} /> {data.best_for}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '28px 32px 60px' }}>
          {loading && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Sparkle size={28} weight="fill" color={accent} className="animate-pulse" />
              <p style={{ marginTop: 12 }}>Your mentor is preparing this for you…</p>
            </div>
          )}

          {error && !loading && (
            <div className="card" style={{ borderColor: 'var(--terracotta)' }}>
              <p style={{ color: 'var(--terracotta)' }}>{error}</p>
            </div>
          )}

          {data && !loading && (
            <div className="stagger">
              <Section icon={BookOpen} title="What it is" accent={accent}>
                {(data.summary || '').split(/\n\n+/).map((para, i) => (
                  <p key={`p-${i}`} style={{ marginTop: i === 0 ? 0 : 12, lineHeight: 1.7 }}>{para}</p>
                ))}
              </Section>

              {data.why_it_matters && (
                <Section icon={Lightbulb} title="Why it matters" accent={accent}>
                  <p style={{ lineHeight: 1.7 }}>{data.why_it_matters}</p>
                </Section>
              )}

              {data.key_concepts?.length > 0 && (
                <Section icon={GraduationCap} title="Key concepts" accent={accent}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {data.key_concepts.map((c, i) => (
                      <div key={`k-${i}-${c.name}`} style={{
                        display: 'flex', gap: 12, padding: 14,
                        background: 'var(--surface-2)', borderRadius: 12,
                      }}>
                        <div style={{
                          minWidth: 28, height: 28, borderRadius: 999,
                          background: accent, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 600, flexShrink: 0,
                        }}>{i + 1}</div>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.55 }}>{c.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {data.learning_steps?.length > 0 && (
                <Section icon={ListNumbers} title="Your learning steps" accent={accent}>
                  <div style={{ position: 'relative', paddingLeft: 28 }}>
                    <div style={{ position: 'absolute', left: 13, top: 8, bottom: 8, width: 2, background: 'var(--line)' }} />
                    {data.learning_steps.map((s, i) => (
                      <div key={`s-${i}`} style={{ marginBottom: 16, position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: -28, top: 0,
                          width: 28, height: 28, borderRadius: 999,
                          border: `2px solid ${accent}`, background: 'var(--surface)',
                          color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                        }}>{s.step || i + 1}</div>
                        <div style={{ paddingLeft: 8 }}>
                          <div style={{ fontWeight: 600 }}>{s.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.55, marginTop: 2 }}>
                            {s.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {data.what_youll_learn?.length > 0 && (
                <Section icon={GraduationCap} title="What you'll take away" accent={accent}>
                  <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--text)' }}>
                    {data.what_youll_learn.map((it, i) => <li key={`w-${i}`}>{it}</li>)}
                  </ul>
                </Section>
              )}

              {data.example && (
                <Section icon={Sparkle} title="Example in practice" accent={accent}>
                  <div style={{
                    padding: 16, background: 'var(--surface-2)',
                    borderLeft: `3px solid ${accent}`, borderRadius: 8,
                    fontStyle: 'italic', lineHeight: 1.7,
                  }}>{data.example}</div>
                </Section>
              )}

              {data.code_snippet && data.code_snippet.trim() && (
                <Section icon={Code} title="Code example" accent={accent}>
                  <div style={{
                    background: '#1A1C1A', color: '#E5E4DE', borderRadius: 12,
                    padding: 16, overflowX: 'auto',
                    fontFamily: 'Menlo, Monaco, Consolas, monospace', fontSize: 13, lineHeight: 1.6,
                  }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8EA696', marginBottom: 8 }}>
                      {data.code_language || 'code'}
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}><code>{data.code_snippet}</code></pre>
                  </div>
                </Section>
              )}

              {data.common_pitfalls?.length > 0 && (
                <Section icon={Warning} title="Watch out for" accent="var(--terracotta)">
                  <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
                    {data.common_pitfalls.map((p, i) => <li key={`pf-${i}`}>{p}</li>)}
                  </ul>
                </Section>
              )}

              {data.tips?.length > 0 && (
                <Section icon={Lightbulb} title="Tips to get the most out of it" accent={accent}>
                  <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
                    {data.tips.map((p, i) => <li key={`t-${i}`}>{p}</li>)}
                  </ul>
                </Section>
              )}

              {/* Action bar */}
              <div style={{
                marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line)',
                display: 'flex', gap: 12, flexWrap: 'wrap',
              }}>
                {isTopic && (
                  <button
                    className="btn btn-primary"
                    data-testid="learn-modal-take-quiz"
                    onClick={() => {
                      onClose();
                      navigate(`/quiz?topic=${encodeURIComponent(name)}`);
                    }}
                  >
                    Take a quiz on this <ArrowRight size={14} weight="bold" />
                  </button>
                )}
                {data.official_link_hint && data.official_link_hint.startsWith('http') && (
                  <a
                    href={data.official_link_hint}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                  >
                    Open original resource
                  </a>
                )}
                <button className="btn btn-ghost" onClick={onClose}>
                  Got it, close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, accent, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--surface-2)', color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} weight="duotone" />
        </div>
        <h2 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: 4 }}>{children}</div>
    </section>
  );
}
