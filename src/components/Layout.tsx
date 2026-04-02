import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Target, Map, BookOpen, Clock, Activity, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { clearStoredSession, getStoredSession } from '../lib/auth';

const navItems = [
  { icon: LayoutDashboard, label: 'Today', path: '/app' },
  { icon: Target, label: 'Goals', path: '/app/goals' },
  { icon: Map, label: 'Roadmap', path: '/app/roadmap' },
  { icon: Clock, label: 'Reviews', path: '/app/reviews' },
  { icon: Activity, label: 'Progress', path: '/app/progress' },
  { icon: BookOpen, label: 'Reflections', path: '/app/reflections' },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getStoredSession();

  const handleSignOut = () => {
    clearStoredSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex-col hidden md:flex">
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800">
          <div className="flex flex-col">
            <span className="font-mono font-bold tracking-[0.28em] uppercase text-amber-500 text-xs">Fadlyzaki</span>
            <span className="font-mono font-semibold tracking-[0.18em] uppercase text-zinc-100 text-sm">Architect</span>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Human By Design</div>
          <div className="mt-2 text-sm text-zinc-200">{session?.user.name}</div>
          <div className="text-xs text-zinc-500">{session?.user.email}</div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-800 md:hidden bg-zinc-950">
          <div className="flex flex-col">
            <span className="font-mono font-bold tracking-[0.28em] uppercase text-amber-500 text-[10px]">Fadlyzaki</span>
            <span className="font-mono font-semibold tracking-[0.18em] uppercase text-zinc-100 text-sm">Architect</span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Sign Out
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
