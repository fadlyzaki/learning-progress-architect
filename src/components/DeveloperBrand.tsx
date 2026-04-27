import React from 'react';
import { usePreferences } from '../lib/preferences';
import { useTeamModal } from '../lib/teamModal';

interface DeveloperBrandProps {
  className?: string;
}

export function DeveloperBrand({ className = '' }: DeveloperBrandProps) {
  const { t } = usePreferences();
  const { openTeamModal } = useTeamModal();

  return (
    <button
      type="button"
      onClick={openTeamModal}
      className={`text-left transition-colors hover:text-[var(--accent-amber)] ${className}`.trim()}
    >
      {t('brand.developer')}
    </button>
  );
}
