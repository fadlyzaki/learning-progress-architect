import crypto from 'crypto';
import { env, type AgentProvider } from '../config/env.ts';
import { nowIso } from '../utils/date.ts';
import type {
  AppRepositories,
  StudyCoach,
  StudyCoachQuickActionResult,
  WorkflowPlanner,
  WorkflowPlannerInput,
} from '../repositories/types.ts';
import type { QuickActionContext, QuickActionKind, TaskRow, UserRow } from '../types.ts';
import { legacyWorkflowPlanner } from './planners/legacyWorkflowPlanner.ts';
import { adkWorkflowPlanner } from './planners/adkWorkflowPlanner.ts';
import { legacyStudyCoach } from './agents/legacyStudyCoach.ts';
import { adkStudyCoach } from './agents/adkStudyCoach.ts';

function selectWorkflowPlanner(provider: AgentProvider): WorkflowPlanner {
  return provider === 'adk' ? adkWorkflowPlanner : legacyWorkflowPlanner;
}

function selectStudyCoach(provider: AgentProvider): StudyCoach {
  return provider === 'adk' ? adkStudyCoach : legacyStudyCoach;
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function createAgentRuntime(repositories: AppRepositories) {
  return {
    async planWorkflow(input: WorkflowPlannerInput, context: { user: UserRow; requestId: string }) {
      const provider = env.agentProvider;
      const runId = crypto.randomUUID();
      const timestamp = nowIso();

      await repositories.agentRuns.createRun({
        id: runId,
        userId: context.user.id,
        kind: 'workflow',
        provider,
        status: 'running',
        requestId: context.requestId,
        metadataJson: JSON.stringify({ goal: input.goal }),
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      try {
        let tasks;
        try {
          tasks = await selectWorkflowPlanner(provider).plan(input, context);
        } catch (error) {
          if (provider !== 'adk') {
            throw error;
          }

          await repositories.agentRuns.appendEvent({
            id: crypto.randomUUID(),
            runId,
            level: 'warning',
            message: 'ADK workflow planner failed. Falling back to legacy planner.',
            payloadJson: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            createdAt: nowIso(),
          });
          tasks = await legacyWorkflowPlanner.plan(input, context);
        }
        await repositories.agentRuns.appendEvent({
          id: crypto.randomUUID(),
          runId,
          level: 'info',
          message: 'Workflow planner completed successfully.',
          payloadJson: JSON.stringify({ taskCount: tasks.length }),
          createdAt: nowIso(),
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: 'completed',
          updatedAt: nowIso(),
        });
        return tasks;
      } catch (error) {
        await repositories.agentRuns.appendEvent({
          id: crypto.randomUUID(),
          runId,
          level: 'error',
          message: error instanceof Error ? error.message : 'Workflow planner failed.',
          payloadJson: null,
          createdAt: nowIso(),
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: 'failed',
          updatedAt: nowIso(),
        });
        throw error;
      }
    },
    async generateQuickAction(input: {
      action: QuickActionKind;
      context: QuickActionContext;
    }, context: { user: UserRow; task: TaskRow; requestId: string }) {
      const provider = env.agentProvider;
      const runId = crypto.randomUUID();
      const timestamp = nowIso();

      await repositories.agentRuns.createRun({
        id: runId,
        userId: context.user.id,
        kind: 'quick_action',
        provider,
        status: 'running',
        requestId: context.requestId,
        metadataJson: JSON.stringify({ taskId: context.task.id, action: input.action }),
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      try {
        let result: StudyCoachQuickActionResult;
        try {
          result = await selectStudyCoach(provider).generateQuickAction(input, context);
        } catch (error) {
          if (provider !== 'adk') {
            throw error;
          }

          await repositories.agentRuns.appendEvent({
            id: crypto.randomUUID(),
            runId,
            level: 'warning',
            message: 'ADK study coach failed. Falling back to legacy coach.',
            payloadJson: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            createdAt: nowIso(),
          });
          result = await legacyStudyCoach.generateQuickAction(input, context);
        }
        await repositories.agentRuns.appendEvent({
          id: crypto.randomUUID(),
          runId,
          level: 'info',
          message: 'Study coach generated quick action content.',
          payloadJson: JSON.stringify({ length: result.content.length, source: result.source }),
          createdAt: nowIso(),
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: 'completed',
          updatedAt: nowIso(),
        });
        return result;
      } catch (error) {
        await repositories.agentRuns.appendEvent({
          id: crypto.randomUUID(),
          runId,
          level: 'error',
          message: error instanceof Error ? error.message : 'Study coach failed.',
          payloadJson: null,
          createdAt: nowIso(),
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: 'failed',
          updatedAt: nowIso(),
        });
        throw error;
      }
    },
  };
}
