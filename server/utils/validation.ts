import type { ResourceType, ResourceMode, LearningResourceInput } from '../types.ts';

export const VALID_RESOURCE_TYPES = new Set<ResourceType>([
  'link',
  'course',
  'book',
  'article',
  'documentation',
  'notes',
  'video',
  'other',
]);

export function sanitizeResourceInput(raw: unknown): LearningResourceInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      const title = String(candidate?.title ?? '').trim();
      const type = String(candidate?.type ?? '').trim() as ResourceType;
      const reference = String(candidate?.reference ?? '').trim();
      const notes = String(candidate?.notes ?? '').trim();

      if (!title || !VALID_RESOURCE_TYPES.has(type)) {
        return null;
      }

      return {
        title,
        type,
        reference: reference || null,
        notes: notes || null,
      };
    })
    .filter((item): item is LearningResourceInput => Boolean(item));
}

export function normalizeResourceMode(raw: unknown): ResourceMode {
  return raw === 'has_materials' ? 'has_materials' : 'needs_plan';
}
