import type { ReactNode } from 'react';
import { Languages, MoonStar, SunMedium } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePreferences } from '../lib/preferences';

interface PreferenceControlsProps {
  className?: string;
  compact?: boolean;
}

export function PreferenceControls({ className, compact = false }: PreferenceControlsProps) {
  const { locale, setLocale, setTheme, t, theme } = usePreferences();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const nextLocale = locale === 'en' ? 'id' : 'en';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PreferenceToggle
        ariaLabel={t('preferences.toggleTheme')}
        compact={compact}
        icon={theme === 'dark' ? <MoonStar className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}
        label={t('preferences.theme')}
        onClick={() => setTheme(nextTheme)}
        value={theme === 'dark' ? t('preferences.dark') : t('preferences.light')}
      />
      <PreferenceToggle
        ariaLabel={t('preferences.toggleLanguage')}
        compact={compact}
        icon={<Languages className="h-3.5 w-3.5" />}
        label={t('preferences.language')}
        onClick={() => setLocale(nextLocale)}
        value={locale === 'en' ? 'EN' : 'ID'}
      />
    </div>
  );
}

function PreferenceToggle({
  ariaLabel,
  compact,
  icon,
  label,
  onClick,
  value,
}: {
  ariaLabel: string;
  compact: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)]/92 px-3 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-panel)] backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]',
        compact ? 'min-w-[3rem] justify-center px-2.5' : 'pr-3.5',
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--accent-amber)]">
        {icon}
      </span>
      <span className={cn('min-w-0 text-left', compact && 'hidden sm:block')}>
        <span className="block text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {label}
        </span>
        <span className="block text-sm font-medium leading-tight">{value}</span>
      </span>
      {compact ? <span className="text-xs font-semibold text-[var(--text-primary)] sm:hidden">{value}</span> : null}
    </button>
  );
}
