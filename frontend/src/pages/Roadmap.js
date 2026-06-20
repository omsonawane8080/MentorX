import { useEffect, useState } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import LearnModal from '@/components/LearnModal';
import {
  CheckCircle, MapPin, BookOpen, Sparkle, ArrowRight, Clock,
} from '@phosphor-icons/react';

const phaseGradients = [
  'linear-gradient(135deg, #2C5545 0%, #3D705C 100%)',
  'linear-gradient(135deg, #3D705C 0%, #8EA696 100%)',
  'linear-gradient(135deg, #C86B53 0%, #DDA77B 100%)',
  'linear-gradient(135deg, #DDA77B 0%, #8EA696 100%)',
  'linear-gradient(135deg, #8EA696 0%, #2C5545 100%)',
  'linear-gradient(135deg, #2C5545 0%, #C86B53 100%)',
];

export default function Roadmap() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [learn, setLearn] = useState({ open: false, name: '', kind: 'topic' });

  useEffect(() => {
    api.get('/roadmap')
      .then(({ data }) => setDoc(data))
      .catch((e) => setError(e?.response?.data?.detail || 'Could not load roadmap'))
      .finally(() => setLoading(false));
  }, []);

  const openLearn = (name, kind = 'topic') => setLearn({ open: true, name, kind });
  const closeLearn = () => setLearn({ open: false, name: '', kind: 'topic' });

  if (loading) return <AppLayout><div style={{ color: 'var(--text-muted)' }}>Loading roadmap…</div></AppLayout>;
  if (error) return <AppLayout><div className="card" style={{ color: 'var(--terracotta)' }}>{error}</div></AppLayout>;

  const data = doc.data;

  return (
    <AppLayout>
      <div className="mb-10 fade-in">
        <div className="label">Your roadmap</div>
        <h1 className="text-4xl font-semibold mt-1 mb-3">{data.summary}</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 640, lineHeight: 1.6 }}>
          Click any topic or resource to get a full in-app explanation from your mentor — no need to leave this page.
        </p>
      </div>

      {(data.core_skills || []).length > 0 && (
        <div className="card mb-10">
          <div className="label mb-3">Core skills you'll build</div>
          <div className="flex flex-wrap gap-2">
            {data.core_skills.map((s) => (
              <button
                key={`skill-${s}`}
                onClick={() => openLearn(s, 'topic')}
                className="chip"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                data-testid={`core-skill-${s}`}
              >
                <Sparkle size={12} weight="fill" /> {s}
              </button>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Tap any skill above for a deep dive →
          </p>
        </div>
      )}

      <div className="grid gap-6 stagger">
        {(data.phases || []).map((p, i) => (
          <PhaseCard
            key={`phase-${p.month}`}
            phase={p}
            gradient={phaseGradients[i % phaseGradients.length]}
            onTopic={(t) => openLearn(t, 'topic')}
            onResource={(r) => openLearn(r, 'resource')}
          />
        ))}
      </div>

      <LearnModal
        open={learn.open}
        name={learn.name}
        kind={learn.kind}
        onClose={closeLearn}
      />
    </AppLayout>
  );
}

function PhaseCard({ phase, gradient, onTopic, onResource }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Phase header */}
      <div style={{
        background: gradient, color: 'white',
        padding: '24px 28px', position: 'relative',
      }}>
        <div className="label" style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
          <MapPin size={12} className="inline mr-1" /> Month {phase.month}
        </div>
        <h3 style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 600, margin: 0, lineHeight: 1.15 }}>
          {phase.title}
        </h3>
        <p style={{ marginTop: 8, opacity: 0.92, lineHeight: 1.55, maxWidth: 560 }}>{phase.focus}</p>
      </div>

      <div style={{ padding: 28 }}>
        {/* Topics — large clickable cards */}
        {(phase.topics || []).length > 0 && (
          <>
            <div className="label" style={{ marginBottom: 12 }}>Topics in this phase</div>
            <div style={{
              display: 'grid', gap: 10, marginBottom: 24,
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            }}>
              {phase.topics.map((t) => (
                <button
                  key={`p${phase.month}-t-${t}`}
                  onClick={() => onTopic(t)}
                  data-testid={`topic-${t}`}
                  className="card-hover"
                  style={{
                    textAlign: 'left', cursor: 'pointer',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 12, padding: 14,
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--surface-2)', color: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <BookOpen size={18} weight="duotone" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{t}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Tap to learn →
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Milestone */}
        {phase.milestone && (
          <div style={{
            padding: 16, marginBottom: 24,
            background: 'var(--surface-2)', borderRadius: 12,
            borderLeft: '4px solid var(--terracotta)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <CheckCircle size={22} color="var(--terracotta)" weight="fill" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div className="label" style={{ marginBottom: 4 }}>Milestone</div>
              <div style={{ lineHeight: 1.55 }}>{phase.milestone}</div>
            </div>
          </div>
        )}

        {/* Resources */}
        {phase.resources?.length > 0 && (
          <>
            <div className="label" style={{ marginBottom: 12 }}>Recommended resources</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {phase.resources.map((r) => (
                <button
                  key={`p${phase.month}-r-${r}`}
                  onClick={() => onResource(r)}
                  data-testid={`resource-${r}`}
                  style={{
                    textAlign: 'left', cursor: 'pointer',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 12, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--terracotta)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: '#FCEFEA', color: 'var(--terracotta)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <BookOpen size={16} weight="duotone" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>{r}</div>
                  <div className="chip" style={{ background: 'transparent', border: '1px solid var(--line)', fontSize: 11 }}>
                    <Sparkle size={11} weight="fill" color="var(--terracotta)" /> Open
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
