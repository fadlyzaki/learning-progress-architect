export type UserRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type TaskRow = {
  id: number;
  user_id: string;
  goal_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  completed_at: string | null;
};

export type StudySessionRow = {
  id: number;
  user_id: string;
  task_id: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  reflection: string | null;
  confusion: string | null;
  confidence: number | null;
};

export type SyllabusItem = {
  title: string;
  description: string;
};

export type ResourceMode = 'has_materials' | 'needs_plan';

export type ResourceType =
  | 'link'
  | 'course'
  | 'book'
  | 'article'
  | 'documentation'
  | 'notes'
  | 'video'
  | 'other';

export type ResourceRow = {
  id: number;
  user_id: string;
  goal_id: number;
  title: string;
  type: ResourceType;
  reference: string | null;
  notes: string | null;
  source_kind: 'user_supplied' | 'system_suggested';
  created_at: string;
};

export type TaskResourceRow = {
  id: number;
  user_id: string;
  task_id: number;
  resource_id: number;
  relevance_note: string | null;
};

export type LearningResourceInput = {
  title: string;
  type: ResourceType;
  reference: string | null;
  notes: string | null;
};
