import { requireAdkServiceUrl } from '../../config/env.ts';
import type { StudyCoach } from '../../repositories/types.ts';

export const adkStudyCoach: StudyCoach = {
  async generateQuickAction(input, context) {
    const response = await fetch(`${requireAdkServiceUrl()}/study-coach/quick-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        context: {
          user: context.user,
          task: context.task,
          requestId: context.requestId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ADK study coach returned ${response.status}.`);
    }

    const payload = await response.json() as { content: string };
    return payload.content;
  },
};
