import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { CaretDown, Plus, Check, Trash, Sparkle } from '@phosphor-icons/react';

/**
 * Compact dropdown showing the user's active roadmap with a menu to switch
 * between all of their roadmaps or create a new one.
 */
export default function RoadmapSwitcher() {
  const [open, setOpen] = useState(false);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/roadmaps');
      setRoadmaps(data || []);
    } catch (_) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = roadmaps.find((r) => r.active) || roadmaps[0];

  const activate = async (rid) => {
    if (active?.roadmap_id === rid) { setOpen(false); return; }
    setBusyId(rid);
    try {
      await api.post(`/roadmaps/${rid}/activate`);
      await load();
      setOpen(false);
      window.location.reload(); // refresh dashboard/today/etc with new active roadmap
    } catch (_) { /* ignore */ }
    finally { setBusyId(null); }
  };

  const remove = async (rid, ev) => {
    ev.stopPropagation();
    if (!window.confirm('Delete this roadmap? This cannot be undone.')) return;
    setBusyId(rid);
    try {
      await api.delete(`/roadmaps/${rid}`);
      await load();
    } catch (_) { /* ignore */ }
    finally { setBusyId(null); }
  };

  if (loading && roadmaps.length === 0) {
    return (
      <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <button
        onClick={() => navigate('/onboarding')}
        data-testid="rs-create-empty"
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13 }}
      >
        <Plus size={14} weight="bold" /> Create your first roadmap
      </button>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="rs-toggle"
        style={{
          width: '100%', textAlign: 'left',
          background: 'var(--surface-2)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--brand)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Sparkle size={14} weight="fill" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Active roadmap
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {active?.target_role || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {active?.timeline_months ? `${active.timeline_months} months` : ''}
          </div>
        </div>
        <CaretDown size={14} color="var(--text-muted)"
                   style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div
          data-testid="rs-menu"
          className="fade-in"
          style={{
            position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            zIndex: 30, overflow: 'hidden',
          }}
        >
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {roadmaps.map((r) => (
              <button
                key={r.roadmap_id}
                onClick={() => activate(r.roadmap_id)}
                data-testid={`rs-item-${r.roadmap_id}`}
                style={{
                  width: '100%', textAlign: 'left',
                  background: r.active ? 'var(--surface-2)' : 'transparent', border: 'none',
                  padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: busyId ? 'wait' : 'pointer',
                  opacity: busyId === r.roadmap_id ? 0.5 : 1,
                }}
                disabled={!!busyId}
              >
                <div style={{ width: 18, flexShrink: 0 }}>
                  {r.active && <Check size={14} color="var(--brand)" weight="bold" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: r.active ? 600 : 500 }}>{r.target_role}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {r.timeline_months} months · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                {!r.active && (
                  <button
                    onClick={(e) => remove(r.roadmap_id, e)}
                    title="Delete"
                    style={{
                      background: 'transparent', border: 'none', padding: 4,
                      cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--terracotta)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash size={14} />
                  </button>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/onboarding'); }}
            data-testid="rs-create"
            style={{
              width: '100%', textAlign: 'left',
              background: 'var(--surface-2)', border: 'none',
              borderTop: '1px solid var(--line)',
              padding: '12px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', color: 'var(--brand)', fontWeight: 600, fontSize: 13,
            }}
          >
            <Plus size={14} weight="bold" /> Create new roadmap
          </button>
        </div>
      )}
    </div>
  );
}
