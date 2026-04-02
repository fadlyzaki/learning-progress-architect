import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BookOpen, Clock, LayoutDashboard, LogOut, Map, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { clearStoredSession, getStoredSession } from '../lib/auth';
import { usePreferences } from '../lib/preferences';
import { PreferenceControls } from './PreferenceControls';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getStoredSession();
  const { t } = usePreferences();
  const navItems = [
    { icon: LayoutDashboard, label: t('nav.today'), path: '/app' },
    { icon: Target, label: t('nav.goals'), path: '/app/goals' },
    { icon: Map, label: t('nav.roadmap'), path: '/app/roadmap' },
    { icon: Clock, label: t('nav.reviews'), path: '/app/reviews' },
    { icon: Activity, label: t('nav.progress'), path: '/app/progress' },
    { icon: BookOpen, label: t('nav.reflections'), path: '/app/reflections' },
  ];

  const handleSignOut = () => {
    clearStoredSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell min-h-screen flex font-sans">
      <aside className="hidden w-72 flex-col border-r border-[var(--border-color)] bg-[var(--bg-panel)] backdrop-blur md:flex">
        <div className="flex h-20 items-center justify-between border-b border-[var(--border-color)] px-6">
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)]">
              {t('brand.name')}
            </span>
            <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
              {t('brand.product')}
            </span>
          </div>
        </div>

        <div className="space-y-4 border-b border-[var(--border-color)] px-6 py-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--text-muted)]">
            {t('brand.tagline')}
          </div>
          <div className="text-sm text-[var(--text-primary)]">{session?.user.name}</div>
          <div className="text-xs text-[var(--text-muted)]">{session?.user.email}</div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {t('layout.summary')}
          </p>
          <PreferenceControls />
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors',
                  isActive
                    ? 'border-amber-500/30 bg-[var(--bg-card)] font-medium text-[var(--text-primary)] shadow-[0_0_24px_var(--glow-amber)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border-color)] p-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-color)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          >
            <LogOut className="w-4 h-4" />
            {t('auth.signOut')}
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-panel)] px-4 py-3 backdrop-blur md:hidden">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)]">
              {t('brand.name')}
            </span>
            <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
              {t('brand.product')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PreferenceControls compact />
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {t('auth.signOut')}
            </button>
          </div>
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
