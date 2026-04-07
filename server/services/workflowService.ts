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

function buildStarterReferenceUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function compactSentence(text: string, maxLength = 180) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildReferenceSnippet(task: {
  title: string;
  description: string;
}, variant: 'official' | 'walkthrough' | 'example') {
  const taskFocus = compactSentence(task.description, 160) || `Study the core idea behind ${task.title}.`;

  if (variant === 'official') {
    return `Start here for the core concept and vocabulary. Focus on this task goal: ${taskFocus}`;
  }

  if (variant === 'walkthrough') {
    return `Use this next to find a guided walkthrough you can follow step by step while working on "${task.title}".`;
  }

  return `Use this to find a worked example and compare how the concept becomes practical inside the current task.`;
}

function buildFallbackReferences(task: {
  title: string;
  description: string;
  searchQuery: string;
}) {
  return [
    {
      title: `${task.title} official docs search`,
      url: buildStarterReferenceUrl(`${task.searchQuery} official documentation`),
      snippet: buildReferenceSnippet(task, 'official'),
      source: 'google search',
    },
    {
      title: `${task.title} tutorial search`,
      url: buildStarterReferenceUrl(`${task.searchQuery} tutorial walkthrough`),
      snippet: buildReferenceSnippet(task, 'walkthrough'),
      source: 'google search',
    },
    {
      title: `${task.title} example search`,
      url: buildStarterReferenceUrl(`${task.searchQuery} worked example`),
      snippet: buildReferenceSnippet(task, 'example'),
      source: 'google search',
    },
  ];
}

function hydrateTaskReferences(task: {
  title: string;
  description: string;
  searchQuery: string;
  references: Array<{
    title: string;
    url: string;
    snippet?: string;
    source?: string;
  }>;
}, resourceMode: ResourceMode) {
  if (task.references.length === 0 && resourceMode !== 'has_materials') {
    return buildFallbackReferences(task);
  }

  return task.references.map((reference, index) => {
    if (reference.snippet?.trim()) {
      return reference;
    }

    const variant = index === 0 ? 'official' : index === 1 ? 'walkthrough' : 'example';
    return {
      ...reference,
      snippet: buildReferenceSnippet(task, variant),
    };
  });
}

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

  const tasksWithGuaranteedReferences = hydratedTasks.map((task) => {
    return {
      ...task,
      references: hydrateTaskReferences(task, resourceMode),
    };
  });

  const scheduledEvents = buildEventSchedule(tasksWithGuaranteedReferences.length, hours);

  return repositories.workflow.persistGeneratedWorkflow({
    userId: user.id,
    goal,
    level,
    hours,
    targetDate,
    preferredStyle,
    resourceMode,
    resources,
    tasks: tasksWithGuaranteedReferences.map((task) => ({
      title: task.title,
      description: task.description,
      references: task.references,
    })),
    scheduledEvents,
    createdAt,
    planSummary: buildPlanSummary(goal, level, hours, tasksWithGuaranteedReferences, resourceMode, resources),
    resourceNote: buildResourceNote(goal, resourceMode, resources),
  });
}
