import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BookOpen, Clock, LayoutDashboard, LogOut, Map, Sparkles, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { clearStoredSession, getStoredSession } from '../lib/auth';
import { usePreferences } from '../lib/preferences';
import { AppFooter } from './AppFooter';
import { DeveloperBrand } from './DeveloperBrand';
import { PreferenceControls } from './PreferenceControls';

function isNavItemActive(pathname: string, path: string) {
  if (path === '/app') {
    return (
      pathname === '/app' ||
      pathname.startsWith('/app/session/') ||
      pathname.startsWith('/app/comprehension/')
    );
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function getMobilePageContext(pathname: string, t: (key: string, params?: Record<string, string | number>) => string) {
  if (pathname === '/app') {
    return {
      title: t('nav.today'),
      subtitle: t('dashboard.nextFocusBody'),
    };
  }

  if (pathname.startsWith('/app/goals')) {
    return {
      title: t('nav.goals'),
      subtitle: t('goals.subtitle'),
    };
  }

  if (pathname.startsWith('/app/roadmap')) {
    return {
      title: t('nav.roadmap'),
      subtitle: t('roadmap.timelineBody'),
    };
  }

  if (pathname.startsWith('/app/reviews')) {
    return {
      title: t('nav.reviews'),
      subtitle: t('reviews.priorityFocusBody'),
    };
  }

  if (pathname.startsWith('/app/progress')) {
    return {
      title: t('nav.progress'),
      subtitle: t('progress.subtitle'),
    };
  }

  if (pathname.startsWith('/app/reflections')) {
    return {
      title: t('nav.reflections'),
      subtitle: t('reflections.subtitle'),
    };
  }

  if (pathname.startsWith('/app/session/')) {
    return {
      title: t('common.session'),
      subtitle: t('session.completeHint'),
    };
  }

  if (pathname.startsWith('/app/comprehension/')) {
    return {
      title: t('comprehension.badge'),
      subtitle: t('comprehension.saveSummaryBody'),
    };
  }

  return {
    title: t('brand.name'),
    subtitle: t('layout.summary'),
  };
}

import { useAppData } from '../hooks/useAppData';
import { useActiveGoal } from '../lib/activeGoal';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getStoredSession();
  const { data } = useAppData();
  const { activeGoal, setActiveGoalId } = useActiveGoal(data?.goals);
  const { t } = usePreferences();
  const mobilePage = getMobilePageContext(location.pathname, t);
  const isDemo = session?.user.email.includes('demo') || session?.user.email.includes('guest');
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
        <div className="flex h-20 items-center gap-4 border-b border-[var(--border-color)] px-6">
            <img src="/lia-logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)] leading-tight">
                {t('brand.name')}
              </span>
              <DeveloperBrand className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)] mt-1" />
            </div>
        </div>

        <div className="space-y-4 border-b border-[var(--border-color)] px-6 py-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--text-muted)]">
                  {t('brand.tagline')}
                </span>
                {isDemo && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    <Sparkles className="h-2.5 w-2.5" />
                    {t('workspace.demoBadge')}
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{session?.user.name}</div>
              <div className="text-xs text-[var(--text-muted)]">{session?.user.email}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title={t('auth.signOut')}
              className="mt-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {activeGoal && (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
                <span className="flex items-center gap-1 text-[var(--accent-amber)]">
                  <Target className="h-3 w-3" />
                  {t('goals.activeFocus')}
                </span>
                {data && data.goals.length > 1 && (
                  <Link to="/app/goals" className="text-[9px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {t('goals.tasks', { count: data.goals.length }).replace('Tasks', 'Goals')}
                  </Link>
                )}
              </div>
              {data && data.goals.length > 1 ? (
                <select
                  aria-label={t('goals.switchGoal')}
                  className="w-full truncate bg-transparent text-xs font-semibold text-[var(--text-primary)] border-0 focus:outline-none focus:ring-0 cursor-pointer p-0"
                  value={activeGoal.id}
                  onChange={(e) => setActiveGoalId(Number(e.target.value))}
                >
                  {data.goals.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {g.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                  {activeGoal.title}
                </div>
              )}
            </div>
          )}

          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {t('layout.summary')}
          </p>
          <PreferenceControls />
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path);

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


      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-panel)] px-4 py-3 backdrop-blur md:hidden">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--accent-amber)]">
              {t('brand.name')}
            </span>
            <div className="mt-1 text-base font-semibold leading-tight text-[var(--text-primary)]">
              {mobilePage.title}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {mobilePage.subtitle}
            </p>
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

        <div className="flex-1 overflow-y-auto p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-8 md:pb-8 lg:p-12">
          <div className="mx-auto max-w-5xl space-y-10">
            <Outlet />
            <AppFooter />
          </div>
        </div>

        <nav
          aria-label="Workspace sections"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-color)] bg-[var(--bg-panel)]/96 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1">
            {navItems.map((item) => {
              const isActive = isNavItemActive(location.pathname, item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center transition-colors',
                    isActive
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[0_0_24px_var(--glow-amber)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
                  )}
                >
                  <item.icon className={cn('h-4 w-4', isActive && 'text-[var(--accent-amber)]')} />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
