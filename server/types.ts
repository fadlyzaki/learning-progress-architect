export type UserRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type UserWithPasswordRow = UserRow & {
  password_hash: string;
};

export type AuthSessionRow = {
  token: string;
  user_id: string;
  created_at: string;
};

export type GoalRow = {
  id: number;
  user_id: string;
  title: string;
  level: string;
  hours: number;
  target_date: string | null;
  preferred_style: string | null;
  resource_mode: ResourceMode;
  status: 'active' | 'paused' | 'completed';
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

export type CalendarEventRow = {
  id: number;
  user_id: string;
  task_id: number;
  date: string;
  duration: number;
};

export type NoteRow = {
  id: number;
  user_id: string;
  topic: string;
  content: string;
  kind: 'plan' | 'note';
  created_at: string;
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

export type QuickActionKind = 'explain' | 'example' | 'analogy' | 'confused';

export type QuickActionResource = {
  title: string;
  type: ResourceType;
  reference: string | null;
  notes: string | null;
  source_kind: 'user_supplied' | 'system_suggested';
};

export type QuickActionContext = {
  taskTitle: string;
  taskDescription: string;
  goalTitle: string | null;
  resources: QuickActionResource[];
};

export type QuickActionRow = {
  id: number;
  user_id: string;
  task_id: number;
  action: QuickActionKind;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ReviewRow = {
  id: number;
  user_id: string;
  task_id: number;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
};

export type AppDataSnapshot = {
  user: UserRow;
  goals: GoalRow[];
  tasks: TaskRow[];
  events: CalendarEventRow[];
  notes: NoteRow[];
  sessions: StudySessionRow[];
  reviews: ReviewRow[];
  resources: ResourceRow[];
  task_resources: TaskResourceRow[];
  quick_actions: QuickActionRow[];
};

export type WorkflowTaskInput = {
  title: string;
  description: string;
  references: SearchLink[];
};

export type WorkflowPersistenceInput = {
  userId: string;
  goal: string;
  level: string;
  hours: number;
  targetDate: string | null;
  preferredStyle: string | null;
  resourceMode: ResourceMode;
  resources: LearningResourceInput[];
  tasks: WorkflowTaskInput[];
  scheduledEvents: Array<{
    date: string;
    duration: number;
  }>;
  createdAt: string;
  planSummary: string;
  resourceNote: string;
};

export type AgentRunRow = {
  id: string;
  user_id: string | null;
  kind: 'workflow' | 'quick_action';
  provider: 'legacy' | 'adk';
  status: 'running' | 'completed' | 'failed';
  request_id: string;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentRunEventRow = {
  id: string;
  run_id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  payload_json: string | null;
  created_at: string;
};

export type RetrievalSourceRow = {
  id: string;
  user_id: string | null;
  source_type: 'resource' | 'reflection' | 'confusion' | 'quick_action';
  source_id: string;
  content: string;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentEmbeddingRow = {
  id: string;
  retrieval_source_id: string;
  provider: string;
  embedding_model: string;
  embedding: string;
  created_at: string;
};

export type LearningResourceInput = {
  title: string;
  type: ResourceType;
  reference: string | null;
  notes: string | null;
};

export type PlannedTask = {
  title: string;
  description: string;
  searchQuery: string;
};

export type SearchLink = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
};

export type HydratedTask = {
  title: string;
  description: string;
  searchQuery: string;
  references: SearchLink[];
};
