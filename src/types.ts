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

export interface AppDataPayload {
  user: UserAccount;
  goals: GoalRecord[];
  tasks: TaskRecord[];
  events: EventRecord[];
  notes: NoteRecord[];
  sessions: StudySessionRecord[];
  reviews: ReviewRecord[];
}
