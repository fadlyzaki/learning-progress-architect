import { usePreferences } from '../lib/preferences';
import { useTeamModal } from '../lib/teamModal';

export function AppFooter({ className = '' }: { className?: string }) {
  const { t } = usePreferences();
  const { openTeamModal } = useTeamModal();

  return (
    <footer className={`border-t border-[var(--border-color)] ${className}`.trim()}>
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between md:px-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
          <p>{t('footer.copyright')}</p>
          <div className="flex items-center gap-4 text-xs">
            <a href="/privacy" className="transition-colors hover:text-[var(--text-primary)]">
              {t('footer.privacyPolicy')}
            </a>
            <a href="/terms" className="transition-colors hover:text-[var(--text-primary)]">
              {t('footer.termsOfService')}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={openTeamModal}
          className="inline-flex items-center gap-2 self-start text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--accent-amber)]/45 underline-offset-4 transition-colors hover:text-[var(--accent-amber)]"
        >
          {t('footer.openCredits')}
        </button>
      </div>
    </footer>
  );
}

