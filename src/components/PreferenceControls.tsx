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

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <PreferenceGroup
        icon={<MoonStar className="h-3.5 w-3.5" />}
        label={t('preferences.theme')}
        compact={compact}
      >
        <PreferenceButton
          active={theme === 'dark'}
          compact={compact}
          onClick={() => setTheme('dark')}
        >
          <MoonStar className="h-3.5 w-3.5" />
          {t('preferences.dark')}
        </PreferenceButton>
        <PreferenceButton
          active={theme === 'light'}
          compact={compact}
          onClick={() => setTheme('light')}
        >
          <SunMedium className="h-3.5 w-3.5" />
          {t('preferences.light')}
        </PreferenceButton>
      </PreferenceGroup>

      <PreferenceGroup
        icon={<Languages className="h-3.5 w-3.5" />}
        label={t('preferences.language')}
        compact={compact}
      >
        <PreferenceButton
          active={locale === 'en'}
          compact={compact}
          onClick={() => setLocale('en')}
        >
          EN
        </PreferenceButton>
        <PreferenceButton
          active={locale === 'id'}
          compact={compact}
          onClick={() => setLocale('id')}
        >
          ID
        </PreferenceButton>
      </PreferenceGroup>
    </div>
  );
}

function PreferenceGroup({
  children,
  compact,
  icon,
  label,
}: {
  children: ReactNode;
  compact: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        'rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)]/90 backdrop-blur px-1.5 py-1 shadow-[var(--shadow-panel)]',
        compact ? 'flex items-center gap-1.5' : 'flex items-center gap-2',
      )}
    >
      <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">
        {icon}
        {!compact && <span>{label}</span>}
      </div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function PreferenceButton({
  active,
  children,
  compact,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-[var(--accent-amber)] text-[var(--accent-ink)] shadow-[0_0_18px_var(--glow-amber)]'
          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]',
        compact && 'px-2.5',
      )}
    >
      {children}
    </button>
  );
}
