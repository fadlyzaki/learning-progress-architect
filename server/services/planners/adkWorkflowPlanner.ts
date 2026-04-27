import { getInternalServiceHeaders, requireAdkServiceUrl } from '../../config/env.ts';
import type { WorkflowPlanner } from '../../repositories/types.ts';

const ADK_TIMEOUT_MS = 30_000;

export const adkWorkflowPlanner: WorkflowPlanner = {
  async plan(input, context) {
    const response = await fetch(`${requireAdkServiceUrl()}/workflow/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getInternalServiceHeaders(),
      },
      body: JSON.stringify({
        input,
        context: {
          user: context.user,
          requestId: context.requestId,
        },
      }),
      signal: AbortSignal.timeout(ADK_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ADK workflow planner returned ${response.status}: ${body.slice(0, 200)}`);
    }

    return response.json() as ReturnType<WorkflowPlanner['plan']>;
  },
};
