import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const sessionId = params.get('session_id');

    if (!sessionId) {
      navigate('/');
      return;
    }

    (async () => {
      try {
        const { data } = await api.post('/auth/session', { session_id: sessionId });
        setUser(data.user);
        // Strip the hash and land on the dashboard. New users will see an
        // onboarding CTA there; returning users see their full dashboard.
        window.history.replaceState({}, '', '/dashboard');
        navigate('/dashboard', { state: { user: data.user } });
      } catch (err) {
        console.error('Auth callback failed', err);
        navigate('/');
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--bg)' }}>
      <div className="text-center fade-in">
        <div className="w-10 h-10 mx-auto rounded-full border-2 animate-spin mb-4"
             style={{ borderColor: 'var(--line)', borderTopColor: 'var(--brand)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Signing you in…</p>
      </div>
    </div>
  );
}
