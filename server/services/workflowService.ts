import { nowIso } from '../utils/date.ts';
import {
  buildEventSchedule,
  buildPlanSummary,
  buildResourceNote,
} from './syllabusService.ts';
import type { UserRow, ResourceMode, LearningResourceInput } from '../types.ts';
import type { AppRepositories } from '../repositories/types.ts';
import { createRequestId } from './agentRuntime.ts';

type WorkflowInput = {
  goal: string;
  level: string;
  hours: number;
  targetDate: string | null;
  preferredStyle: string | null;
  resourceMode: ResourceMode;
  resources: LearningResourceInput[];
};

type WorkflowResult = {
  goalId: number;
};

export async function runWorkflow(
  repositories: AppRepositories,
  planner: {
    planWorkflow: (input: {
      goal: string;
      level: string;
      preferredStyle: string | null;
      resourceMode: ResourceMode;
      resources: LearningResourceInput[];
    }, context: { user: UserRow; requestId: string }) => Promise<Array<{
      title: string;
      description: string;
      searchQuery: string;
      references: Array<{
        title: string;
        url: string;
        snippet?: string;
        source?: string;
      }>;
    }>>;
  },
  user: UserRow,
  input: WorkflowInput,
): Promise<WorkflowResult> {
  const { goal, level, hours, targetDate, preferredStyle, resourceMode, resources } = input;
  const createdAt = nowIso();

  const hydratedTasks = await planner.planWorkflow({
    goal,
    level,
    preferredStyle,
    resourceMode,
    resources,
  }, {
    user,
    requestId: createRequestId(),
  });

  const scheduledEvents = buildEventSchedule(hydratedTasks.length, hours);

  return repositories.workflow.persistGeneratedWorkflow({
    userId: user.id,
    goal,
    level,
    hours,
    targetDate,
    preferredStyle,
    resourceMode,
    resources,
    tasks: hydratedTasks.map((task) => ({
      title: task.title,
      description: task.description,
      references: task.references,
    })),
    scheduledEvents,
    createdAt,
    planSummary: buildPlanSummary(goal, level, hours, hydratedTasks, resourceMode, resources),
    resourceNote: buildResourceNote(goal, resourceMode, resources),
  });
}
