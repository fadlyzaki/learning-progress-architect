import type { QuickActionContext, QuickActionKind } from '../types.ts';

export const QUICK_ACTION_KINDS = ['explain', 'example', 'analogy', 'confused'] as const;

export const QUICK_ACTION_PROMPTS: Record<QuickActionKind, string> = {
  explain:
    "Explain [Concept] simply. Focus strictly on two things: 1. A high-level summary of what I am actually learning here, and 2. The specific objective or problem this solves. Skip the technical 'how-to' for now-just give me the 'what' and the 'why'.",
  example:
    'Provide a real-world case study for [Concept]. Focus on: 1. A specific industry or type of company that uses it, 2. The exact workflow or implementation details, and 3. The business impact (time saved, money earned, or errors prevented). Avoid generic examples-show me how a professional actually uses this in their daily work.',
  analogy:
    'Give me a universal analogy for [Concept] that anyone-regardless of their technical background-can understand. Use a common daily activity (like grocery shopping, driving, or household chores) to illustrate how it works. Focus on making the invisible logic of the concept visible through this story.',
  confused:
    "I am lost on [Concept]. Please reset and explain this to me like I am an elementary school student. Break it down into tiny, simple steps. Use 'first, then, finally' logic, and tell me a story where I am the main character interacting with this concept. No big words allowed.",
};

export function isQuickActionKind(value: string): value is QuickActionKind {
  return QUICK_ACTION_KINDS.includes(value as QuickActionKind);
}

export function buildQuickActionConcept(context: QuickActionContext): string {
  const goalLabel = context.goalTitle ? `Goal: ${context.goalTitle}` : 'Goal: not provided';
  const descriptionLabel = context.taskDescription ? `Task description: ${context.taskDescription}` : 'Task description: not provided';
  const resourceLabel =
    context.resources.length > 0
      ? `Resources: ${context.resources
          .map((resource) => resource.title)
          .join(', ')}`
      : 'Resources: none attached';

  return [
    `Task title: ${context.taskTitle}`,
    descriptionLabel,
    goalLabel,
    resourceLabel,
  ].join('\n');
}

export function getQuickActionPromptTemplate(action: QuickActionKind): string {
  return QUICK_ACTION_PROMPTS[action];
}