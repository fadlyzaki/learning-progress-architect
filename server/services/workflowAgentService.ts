import { planSyllabusTasks, buildFallbackPlan } from './syllabusService.ts';
import { searchLearningResources } from './searchService.ts';
import type { HydratedTask, ResourceMode, LearningResourceInput } from '../types.ts';

type WorkflowPlanInput = {
  goal: string;
  level: string;
  preferredStyle: string | null;
  resourceMode: ResourceMode;
  resources: LearningResourceInput[];
};

export async function generateWorkflowPlan(input: WorkflowPlanInput): Promise<HydratedTask[]> {
  const { goal, level, preferredStyle, resourceMode, resources } = input;

  let plannedTasks;
  try {
    plannedTasks = await planSyllabusTasks(
      goal,
      level,
      preferredStyle ?? undefined,
      resources,
      resourceMode,
    );
  } catch {
    plannedTasks = buildFallbackPlan(goal, level, preferredStyle ?? undefined, resources, resourceMode);
  }

  const searchResults = await Promise.all(
    plannedTasks.map((task) =>
      searchLearningResources({ query: task.searchQuery, maxResults: 3 }),
    ),
  );

  return plannedTasks.map((task, index) => ({
    title: task.title,
    description: task.description,
    searchQuery: task.searchQuery,
    estimatedMinutes: task.estimatedMinutes,
    references: searchResults[index],
  }));
}
