import { GoogleGenAI, Type } from '@google/genai';
import type { PlannedTask, ResourceMode, LearningResourceInput } from '../types.ts';
import { scheduleCalendarEvents } from './calendarSchedulerService.ts';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function normalizeEstimatedMinutes(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 30;
  }

  return Math.round(parsed);
}

export function buildFallbackPlan(
  goal: string,
  level: string,
  preferredStyle?: string,
  resources: LearningResourceInput[] = [],
  resourceMode: ResourceMode = 'needs_plan',
): PlannedTask[] {
  const styleLabel = preferredStyle ? ` using a ${preferredStyle.toLowerCase()} approach` : '';
  const resourceHint =
    resourceMode === 'has_materials' && resources.length > 0
      ? ` Anchor the work around materials like ${resources
          .slice(0, 2)
          .map((resource) => resource.title)
          .join(' and ')}.`
      : ' Start with a lightweight plan and gather one strong reference per task.';

  const tasks = [
    {
      title: `Foundations of ${goal}`,
      description: `Build the mental model, vocabulary, and first principles for ${goal} at a ${level.toLowerCase()} level${styleLabel}.${resourceHint}`,
    },
    {
      title: `Guided practice for ${goal}`,
      description:
        resourceMode === 'has_materials' && resources.length > 0
          ? `Work through focused exercises using your provided materials to turn the core ideas of ${goal} into repeatable habits.`
          : `Work through focused exercises that turn the core ideas of ${goal} into repeatable habits, and identify the best kind of resource to deepen each area.`,
    },
    {
      title: `Applied project for ${goal}`,
      description: `Ship one practical outcome that proves you can apply ${goal} beyond tutorials and passive study.`,
    },
  ];

  return tasks.map((task) => ({
    ...task,
    searchQuery: `${goal} ${task.title} tutorial documentation`,
    estimatedMinutes: 120,
  }));
}

export async function planSyllabusTasks(
  goal: string,
  level: string,
  preferredStyle?: string,
  resources: LearningResourceInput[] = [],
  resourceMode: ResourceMode = 'needs_plan',
): Promise<PlannedTask[]> {
  if (!ai) {
    return buildFallbackPlan(goal, level, preferredStyle, resources, resourceMode);
  }

  try {
    const resourceContext =
      resourceMode === 'has_materials' && resources.length > 0
        ? `
        Use these learner-provided materials as primary planning anchors:
        ${resources
          .map(
            (resource, index) =>
              `${index + 1}. [${resource.type}] ${resource.title}${resource.reference ? ` | ${resource.reference}` : ''}${resource.notes ? ` | Notes: ${resource.notes}` : ''}`,
          )
          .join('\n')}
      `
        : `
        The learner does not have materials yet.
        Generate a roadmap that acts like a starter curriculum and make each task self-starting.
      `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a curriculum planner. Your job is to break a learning goal into exactly 3 actionable study tasks and provide one targeted search query per task optimised for finding authoritative learning sources (official documentation, reputable tutorials, or books).
        Goal: "${goal}"
        Level: "${level}"
        Preferred style: "${preferredStyle ?? 'mixed'}"
        Resource mode: "${resourceMode}"
        ${resourceContext}
        Each task description should either reference the learner materials or explain how to begin without them.
        For each task, also produce a concise searchQuery string a learner would type into a search engine to find the best documentation or tutorial for that task.
        For each task, estimate the total study time in whole minutes needed to complete that task's session plan and return it as estimatedMinutes.
        Return only JSON.
      `,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              searchQuery: { type: Type.STRING },
              estimatedMinutes: { type: Type.NUMBER },
            },
            required: ['title', 'description', 'searchQuery', 'estimatedMinutes'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]') as Array<
      Omit<PlannedTask, 'estimatedMinutes'> & { estimatedMinutes: unknown }
    >;
    if (parsed.length >= 3) {
      return parsed.slice(0, 3).map((task) => ({
        title: task.title,
        description: task.description,
        searchQuery: task.searchQuery,
        estimatedMinutes: normalizeEstimatedMinutes(task.estimatedMinutes),
      }));
    }
  } catch (error) {
    console.error('Falling back to local syllabus generation.', error);
  }

  return buildFallbackPlan(goal, level, preferredStyle, resources, resourceMode);
}

export function buildEventSchedule(taskCount: number, weeklyHours: number) {
  const duration = Math.max(30, Math.min(120, Math.round((weeklyHours * 60) / Math.max(taskCount, 1))));
  const scheduledEvents = scheduleCalendarEvents({
    weeklyHours,
    startDate: null,
    tasks: Array.from({ length: taskCount }, (_, index) => ({
      title: `Study session ${index + 1}`,
      description: `Study session ${index + 1}`,
      estimatedMinutes: duration,
    })),
    timeZone: 'Asia/Jakarta',
    defaultStartHour: 19,
    maxEventMinutes: 120,
  });

  return scheduledEvents.map((event) => ({
    date: event.startAt,
    duration: event.durationMinutes,
  }));
}

export function buildPlanSummary(
  goal: string,
  level: string,
  hours: number,
  syllabus: PlannedTask[],
  resourceMode: ResourceMode,
  resources: LearningResourceInput[],
) {
  const lines = syllabus.map((item, index) => `${index + 1}. ${item.title}: ${item.description}`);
  const resourceSection =
    resourceMode === 'has_materials' && resources.length > 0
      ? [
          'Planning mode: learner-provided materials',
          'Resources:',
          ...resources.map(
            (resource, index) =>
              `- ${index + 1}. ${resource.title} [${resource.type}]${resource.reference ? ` | ${resource.reference}` : ''}`,
          ),
        ]
      : [
          'Planning mode: generated starting plan',
          'Recommended resource types to gather next:',
          '- One primary reference (documentation, book chapter, or course module)',
          '- One practice-oriented resource (exercise, sandbox, or project prompt)',
          '- One reinforcement resource (article, recap note, or worked example)',
        ];

  return [
    `Goal: ${goal}`,
    `Level: ${level}`,
    `Weekly hours: ${hours}`,
    ...resourceSection,
    ...lines,
  ].join('\n');
}

export function buildResourceNote(
  goal: string,
  resourceMode: ResourceMode,
  resources: LearningResourceInput[],
) {
  if (resourceMode === 'has_materials' && resources.length > 0) {
    return [
      `Resource posture for ${goal}: learner-supplied materials`,
      ...resources.map(
        (resource, index) =>
          `${index + 1}. ${resource.title} [${resource.type}]${resource.reference ? ` | ${resource.reference}` : ''}`,
      ),
    ].join('\n');
  }

  return [
    `Resource posture for ${goal}: start-from-zero plan`,
    'Next best resource types:',
    '1. A trusted primary reference',
    '2. A practice environment or exercise source',
    '3. A concise recap or example-based explanation',
  ].join('\n');
}
