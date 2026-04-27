import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Button } from './ui/Button';
import { usePreferences } from '../lib/preferences';

const teamMembers = [
  {
    name: 'Fadly Uzzaki 🧢',
    url: 'https://www.linkedin.com/in/fadlyzaki/',
  },
  {
    name: 'Vedo Alfarizi',
    url: 'https://linkedin.com/in/vedo-alfarizi-56a04b145',
  },
];

export function AppFooter({ className = '' }: { className?: string }) {
  const { t } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
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
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 self-start text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--accent-amber)]/45 underline-offset-4 transition-colors hover:text-[var(--accent-amber)]"
          >
            {t('footer.openCredits')}
          </button>
        </div>
      </footer>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credits-title"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="app-card-primary w-full max-w-2xl rounded-[1.75rem] p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--accent-amber)]">
                  {t('footer.teamKicker')}
                </div>
                <h2 id="credits-title" className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {t('footer.modalTitle')}
                </h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
                  {t('footer.modalBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/78 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {t('footer.teamMember')}
                      </div>
                      <div className="mt-2 text-xl font-medium text-[var(--text-primary)]">
                        {member.name}
                      </div>
                    </div>
                    <a href={member.url} target="_blank" rel="noreferrer" className="self-start sm:self-auto">
                      <Button variant="outline" className="gap-2">
                        {t('footer.viewProfile')}
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
