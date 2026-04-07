import { generateQuickActionContent } from '../quickActionService.ts';
import type { StudyCoach } from '../../repositories/types.ts';

export const legacyStudyCoach: StudyCoach = {
  async generateQuickAction(input) {
    return generateQuickActionContent(input);
  },
};
