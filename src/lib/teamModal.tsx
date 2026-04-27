import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { usePreferences } from './preferences';

interface TeamModalContextType {
  openTeamModal: () => void;
  closeTeamModal: () => void;
}

const TeamModalContext = createContext<TeamModalContextType | undefined>(undefined);

export const useTeamModal = () => {
  const context = useContext(TeamModalContext);
  if (!context) {
    throw new Error('useTeamModal must be used within a TeamModalProvider');
  }
  return context;
};

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

export const TeamModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = usePreferences();

  const openTeamModal = () => setIsOpen(true);
  const closeTeamModal = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTeamModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <TeamModalContext.Provider value={{ openTeamModal, closeTeamModal }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeTeamModal}
        >
          <div
            className="app-card-primary w-full max-w-2xl rounded-[1.75rem] p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--accent-amber)]">
                  {t('footer.teamKicker')}
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {t('footer.modalTitle')}
                </h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
                  {t('footer.modalBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTeamModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-4">
              {teamMembers.map((member) => (
                <div key={member.name} className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/78 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {t('footer.teamMember')}
                      </div>
                      <div className="mt-2 text-xl font-medium text-[var(--text-primary)]">
                        {member.name}
                      </div>
                    </div>
                    <a href={member.url} target="_blank" rel="noreferrer">
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
      )}
    </TeamModalContext.Provider>
  );
};
