export interface UserAccount {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  token: string;
  user: UserAccount;
}

export interface GoalRecord {
  id: number;
  user_id: string;
  title: string;
  level: string;
  hours: number;
  target_date: string | null;
  preferred_style: string | null;
  resource_mode: 'has_materials' | 'needs_plan';
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface TaskRecord {
  id: number;
  user_id: string;
  goal_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  completed_at: string | null;
}

export interface EventRecord {
  id: number;
  user_id: string;
  task_id: number;
  date: string;
  duration: number;
  google_calendar_id: string | null;
  google_event_id: string | null;
  google_sync_status: 'not_synced' | 'synced' | 'failed';
  google_synced_at: string | null;
  google_sync_error: string | null;
}

export interface NoteRecord {
  id: number;
  user_id: string;
  topic: string;
  content: string;
  kind: 'plan' | 'note';
  created_at: string;
}

export interface StudySessionRecord {
  id: number;
  user_id: string;
  task_id: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  reflection: string | null;
  confusion: string | null;
  confidence: number | null;
}

export interface ReviewRecord {
  id: number;
  user_id: string;
  task_id: number;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
}

export type ResourceType =
  | 'link'
  | 'course'
  | 'book'
  | 'article'
  | 'documentation'
  | 'notes'
  | 'video'
  | 'other';

export type ResourceMode = 'has_materials' | 'needs_plan';

export interface LearningResourceInput {
  title: string;
  type: ResourceType;
  reference: string | null;
  notes: string | null;
}

export interface ResourceRecord extends LearningResourceInput {
  id: number;
  user_id: string;
  goal_id: number;
  source_kind: 'user_supplied' | 'system_suggested';
  created_at: string;
}

export interface TaskResourceRecord {
  id: number;
  user_id: string;
  task_id: number;
  resource_id: number;
  relevance_note: string | null;
}

export type QuickActionKind = 'explain' | 'example' | 'analogy' | 'confused';

export interface QuickActionRecord {
  id: number;
  user_id: string;
  task_id: number;
  action: QuickActionKind;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AppDataPayload {
  user: UserAccount;
  goals: GoalRecord[];
  tasks: TaskRecord[];
  events: EventRecord[];
  notes: NoteRecord[];
  sessions: StudySessionRecord[];
  reviews: ReviewRecord[];
  resources: ResourceRecord[];
  task_resources: TaskResourceRecord[];
  quick_actions: QuickActionRecord[];
}
