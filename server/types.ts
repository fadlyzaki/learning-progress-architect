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

export type CalendarEventSyncStatus = 'pending' | 'synced' | 'failed' | 'partial';

export type CalendarEventRow = {
  id: number;
  user_id: string;
  task_id: number;
  date: string;
  duration: number;
  provider: string;
  external_event_id: string | null;
  external_calendar_id: string | null;
  status: CalendarEventSyncStatus;
  sync_error: string | null;
  synced_at: string | null;
  external_url: string | null;
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

export type PlannedTask = {
  title: string;
  description: string;
  searchQuery: string;
  estimatedMinutes: number;
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
  estimatedMinutes: number;
  references: SearchLink[];
};

export type CalendarSchedulingTask = {
  title: string;
  description: string;
  estimatedMinutes: number;
};

export type CalendarSchedulerInput = {
  weeklyHours: number;
  startDate: string | null;
  tasks: CalendarSchedulingTask[];
  timeZone: string;
  defaultStartHour: number;
  maxEventMinutes: number;
};

export type ScheduledCalendarEvent = {
  taskIndex: number;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  summary: string;
  description: string;
};
