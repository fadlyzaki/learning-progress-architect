import { generateWorkflowPlan } from '../workflowAgentService.ts';
import type { WorkflowPlanner } from '../../repositories/types.ts';

export const legacyWorkflowPlanner: WorkflowPlanner = {
  async plan(input) {
    return generateWorkflowPlan(input);
  },
};
