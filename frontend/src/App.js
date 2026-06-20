import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import '@/App.css';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Landing from '@/pages/Landing';
import AuthCallback from '@/pages/AuthCallback';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Roadmap from '@/pages/Roadmap';
import Tasks from '@/pages/Tasks';
import Quiz from '@/pages/Quiz';
import Interview from '@/pages/Interview';
import MentorReview from '@/pages/MentorReview';

function Protected({ children, requireOnboarded = true }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
             style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (requireOnboarded && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // CRITICAL: synchronously detect session_id in hash (race-free) before normal routes
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={
        <Protected requireOnboarded={false}><Onboarding /></Protected>
      } />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/roadmap" element={<Protected><Roadmap /></Protected>} />
      <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
      <Route path="/quiz" element={<Protected><Quiz /></Protected>} />
      <Route path="/interview" element={<Protected><Interview /></Protected>} />
      <Route path="/mentor" element={<Protected><MentorReview /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
