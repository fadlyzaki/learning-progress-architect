import { GoogleGenAI } from '@google/genai';
import type { QuickActionContext, QuickActionKind, QuickActionResource } from '../types.ts';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const QUICK_ACTION_SYSTEM_INSTRUCTION = [
  'You are a study assistant helping a learner understand one specific task in their active study session.',
  'Stay tightly scoped to the provided task and goal context.',
  'Return plain study-ready text only.',
  'Do not add preambles, disclaimers, or mention missing hidden context.',
].join(' ');

const QUICK_ACTION_OUTPUT_INSTRUCTION = [
  'Write a concise but useful response for direct study use.',
  'Use short paragraphs or simple lists when helpful.',
  'Do not output JSON, XML, markdown code fences, or role labels.',
].join(' ');

const MIN_COMPLETE_QUICK_ACTION_WORDS = 55;

export const QUICK_ACTION_KINDS = ['explain', 'example', 'analogy', 'confused'] as const;

export const QUICK_ACTION_PROMPTS: Record<QuickActionKind, string> = {
  explain:
    "Explain [Concept] simply. Focus strictly on two things: 1. A high-level summary of what I am actually learning here, and 2. The specific objective or problem this solves. Skip the technical 'how-to' for now-just give me the 'what' and the 'why'.",
  example:
    'Provide a real-world case study for [Concept]. Focus on: 1. A specific industry or type of company that uses it, 2. The exact workflow or implementation details, and 3. The business impact (time saved, money earned, or errors prevented). Avoid generic examples-show me how a professional actually uses this in their daily work.',
  analogy:
    'Give me a universal analogy for [Concept] that anyone-regardless of their technical background-can understand. Use a common daily activity (like grocery shopping, driving, or household chores) to illustrate how it works. Focus on making the invisible logic of the concept visible through this story.',
  confused:
    "I am lost on [Concept]. Please reset and explain the lesson material to me as if I am a 5-year-old. Break it down into tiny, simple steps. Use 'first, then, finally' logic, and tell me a story where I am the main character interacting with this concept. No big words allowed.",
};

export class QuickActionGenerationError extends Error {
  constructor(message = 'Our AI assistant is temporarily unavailable to generate quick actions. Please try again in a moment.') {
    super(message);
    this.name = 'QuickActionGenerationError';
  }
}

export function isQuickActionKind(value: string): value is QuickActionKind {
  return QUICK_ACTION_KINDS.includes(value as QuickActionKind);
}

function formatResource(resource: QuickActionResource, index: number): string {
  const details = [
    `[${resource.source_kind}] ${resource.title}`,
    `type: ${resource.type}`,
    resource.reference ? `reference: ${resource.reference}` : null,
    resource.notes ? `notes: ${resource.notes}` : null,
  ].filter(Boolean);

  return `${index + 1}. ${details.join(' | ')}`;
}

export function buildQuickActionContextBlock(context: QuickActionContext): string {
  const lines = [
    `Goal: ${context.goalTitle ?? 'Not provided'}`,
    `Task title: ${context.taskTitle}`,
    `Task description: ${context.taskDescription || 'Not provided'}`,
    'Resources:',
  ];

  if (context.resources.length === 0) {
    lines.push('None attached');
    return lines.join('\n');
  }

  lines.push(...context.resources.map(formatResource));
  return lines.join('\n');
}

export function buildQuickActionConcept(context: QuickActionContext): string {
  return buildQuickActionContextBlock(context);
}

export function getQuickActionPromptTemplate(action: QuickActionKind): string {
  return QUICK_ACTION_PROMPTS[action];
}

export function buildQuickActionPrompt(action: QuickActionKind, context: QuickActionContext): string {
  const concept = buildQuickActionConcept(context);
  const promptTemplate = getQuickActionPromptTemplate(action).replace('[Concept]', concept);

  return [
    QUICK_ACTION_SYSTEM_INSTRUCTION,
    '',
    `Action request:\n${promptTemplate}`,
    '',
    `Session context:\n${buildQuickActionContextBlock(context)}`,
    '',
    QUICK_ACTION_OUTPUT_INSTRUCTION,
  ].join('\n');
}

export function normalizeQuickActionContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/^```[\w-]*\n?/g, '')
    .replace(/\n?```$/g, '')
    .trim();
}

export function isIncompleteQuickActionContent(content: string, taskTitle?: string): boolean {
  const trimmed = content.trim();
  const normalized = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const knownWeakPatterns = [
    taskTitle ? `${taskTitle.toLowerCase()} is the concept for this step` : null,
    'imagine a real team using it in production',
    'well-organized kitchen',
    taskTitle ? `first, ${taskTitle.toLowerCase()} is the main idea you are learning` : null,
  ].filter((pattern): pattern is string => Boolean(pattern));

  const hasTerminalPunctuation = /[.!?]["']?$/.test(trimmed);
  const endsLikeFragment = /(?:[,;:]|(?:\s|^)(and|or|but|because|so|then|with|for|to|of|in|on|at|from|as|that|which|where|when|while|like|into|through|by|about|the|a|an))$/i.test(trimmed);

  return (
    words.length < MIN_COMPLETE_QUICK_ACTION_WORDS
    || !hasTerminalPunctuation
    || endsLikeFragment
    || knownWeakPatterns.some((pattern) => normalized.includes(pattern))
  );
}

export async function generateQuickActionContent(input: {
  action: QuickActionKind;
  context: QuickActionContext;
}): Promise<string> {
  if (!ai) {
    throw new QuickActionGenerationError('The AI assistant is not fully configured for this feature yet. Please check your setup or try again later.');
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: buildQuickActionPrompt(input.action, input.context),
    });

    const content = normalizeQuickActionContent(response.text || '');

    if (!content) {
      throw new QuickActionGenerationError('The AI assistant returned an empty response. Please try clicking generate again.');
    }

    return content;
  } catch (error) {
    if (error instanceof QuickActionGenerationError) {
      throw error;
    }

    throw new QuickActionGenerationError('Our AI assistant encountered an unexpected issue while preparing your quick action. Please try again.');
  }
}
