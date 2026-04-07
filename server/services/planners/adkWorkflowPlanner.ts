import { getInternalServiceHeaders, requireAdkServiceUrl } from '../../config/env.ts';
import type { WorkflowPlanner } from '../../repositories/types.ts';

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
    });

    if (!response.ok) {
      throw new Error(`ADK workflow planner returned ${response.status}.`);
    }

    return response.json() as ReturnType<WorkflowPlanner['plan']>;
  },
};
