import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { APP } from '@/constants/testIds';
import {
  House, MapTrifold, ListChecks, Question, Microphone,
  ChartLineUp, SignOut, Leaf,
} from '@phosphor-icons/react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: House, testId: APP.navDashboard },
  { to: '/roadmap', label: 'Roadmap', icon: MapTrifold, testId: APP.navRoadmap },
  { to: '/tasks', label: 'Today', icon: ListChecks, testId: APP.navTasks },
  { to: '/quiz', label: 'Quiz', icon: Question, testId: APP.navQuiz },
  { to: '/interview', label: 'Interview', icon: Microphone, testId: APP.navInterview },
  { to: '/mentor', label: 'Mentor Review', icon: ChartLineUp, testId: APP.navMentor },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside
        className="hidden md:flex flex-col gap-2 p-6 border-r"
        style={{ width: 248, borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'var(--brand)' }}>
            <Leaf size={20} color="white" weight="duotone" />
          </div>
          <div>
            <div className="font-semibold" style={{ fontFamily: 'Outfit' }}>Mentor</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Career Coach</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon, testId }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                data-testid={testId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: active ? 'var(--brand)' : 'var(--text)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon size={18} weight={active ? 'fill' : 'regular'} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-3 mb-3">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-9 h-9 rounded-full" />
            ) : (
              <div className="w-9 h-9 rounded-full"
                   style={{ background: 'var(--surface-2)' }} />
            )}
            <div className="text-sm overflow-hidden">
              <div className="truncate font-medium">{user?.name}</div>
              <div className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid={APP.navLogout}
            className="btn btn-ghost w-full"
            style={{ justifyContent: 'flex-start' }}
          >
            <SignOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-6 md:p-10 fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
