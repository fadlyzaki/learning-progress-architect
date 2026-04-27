import { getInternalServiceHeaders, requireAdkServiceUrl } from '../../config/env.ts';
import type { StudyCoach } from '../../repositories/types.ts';

const ADK_TIMEOUT_MS = 30_000;

export const adkStudyCoach: StudyCoach = {
  async generateQuickAction(input, context) {
    const response = await fetch(`${requireAdkServiceUrl()}/study-coach/quick-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getInternalServiceHeaders(),
      },
      body: JSON.stringify({
        input,
        context: {
          user: context.user,
          task: context.task,
          requestId: context.requestId,
        },
      }),
      signal: AbortSignal.timeout(ADK_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ADK study coach returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const payload = await response.json() as {
      content: string;
      source?: 'generated' | 'cache';
      updatedAt?: string | null;
      persisted?: boolean;
    };
    return {
      content: payload.content,
      source: payload.source ?? 'generated',
      updatedAt: payload.updatedAt ?? null,
      persisted: payload.persisted ?? false,
    };
  },
};
