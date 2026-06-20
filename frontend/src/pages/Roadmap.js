import { useEffect, useState } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { CheckCircle, Circle, MapPin } from '@phosphor-icons/react';

export default function Roadmap() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/roadmap')
      .then(({ data }) => setDoc(data))
      .catch((e) => setError(e?.response?.data?.detail || 'Could not load roadmap'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout><div style={{ color: 'var(--text-muted)' }}>Loading roadmap…</div></AppLayout>;
  if (error) return <AppLayout><div className="card" style={{ color: 'var(--terracotta)' }}>{error}</div></AppLayout>;

  const data = doc.data;
  return (
    <AppLayout>
      <div className="mb-10">
        <div className="label">Your roadmap</div>
        <h1 className="text-4xl font-semibold mt-1">{data.summary}</h1>
      </div>

      <div className="card mb-8">
        <div className="label mb-3">Core skills you'll build</div>
        <div className="flex flex-wrap gap-2">
          {(data.core_skills || []).map((s) => <span key={s} className="chip">{s}</span>)}
        </div>
      </div>

      <div className="relative pl-8 stagger">
        <div className="absolute left-3 top-2 bottom-2 w-px" style={{ background: 'var(--line)' }} />
        {(data.phases || []).map((p) => (
          <div key={`phase-${p.month}`} className="mb-8 relative">
            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                 style={{ background: 'var(--brand)', color: 'white' }}>
              {p.month}
            </div>
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-medium" style={{ fontFamily: 'Outfit' }}>{p.title}</h3>
                <span className="chip"><MapPin size={12} /> Month {p.month}</span>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{p.focus}</p>
              <div className="label">Topics</div>
              <ul className="mb-4">
                {(p.topics || []).map((t) => (
                  <li key={`p${p.month}-${t}`} className="flex items-center gap-2 py-1 text-sm">
                    <Circle size={14} color="var(--sage)" weight="duotone" /> {t}
                  </li>
                ))}
              </ul>
              <div className="label">Milestone</div>
              <p className="text-sm mb-3 flex items-start gap-2">
                <CheckCircle size={16} color="var(--terracotta)" weight="fill" />
                <span>{p.milestone}</span>
              </p>
              {p.resources?.length > 0 && (
                <>
                  <div className="label">Resources</div>
                  <div className="flex flex-wrap gap-2">
                    {p.resources.map((r) => <span key={`p${p.month}-r-${r}`} className="chip">{r}</span>)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
