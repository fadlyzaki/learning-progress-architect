import type {
  AppDataSnapshot,
  GoalRow,
  LearningResourceInput,
  QuickActionContext,
  QuickActionKind,
  QuickActionResource,
  QuickActionRow,
  ReviewRow,
  StudySessionRow,
  TaskRow,
  UserRow,
  UserWithPasswordRow,
  WorkflowPersistenceInput,
} from '../types.ts';

export type CreateUserInput = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type CreateSessionInput = {
  token: string;
  userId: string;
  createdAt: string;
};

export type CompleteTaskSessionInput = {
  userId: string;
  taskId: number;
  reflection: string | null;
  confusion: string | null;
  confidence: number | null;
  durationSeconds: number;
  completedAt: string;
};

export type UpsertReviewInput = {
  userId: string;
  taskId: number;
  dueDate: string;
  priority: ReviewRow['priority'];
  status: ReviewRow['status'];
};

export type SaveQuickActionInput = {
  userId: string;
  taskId: number;
  action: QuickActionKind;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAgentRunInput = {
  id: string;
  userId: string | null;
  kind: 'workflow' | 'quick_action';
  provider: 'legacy' | 'adk';
  status: 'running' | 'completed' | 'failed';
  requestId: string;
  metadataJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface AuthSessionRepository {
  findUserByEmail(email: string): Promise<UserWithPasswordRow | null>;
  findUserIdByEmail(email: string): Promise<string | null>;
  createUser(input: CreateUserInput): Promise<UserRow>;
  createSession(input: CreateSessionInput): Promise<void>;
  getUserByToken(token: string): Promise<UserRow | null>;
}

export interface GoalRepository {
  getByIdForUser(goalId: number, userId: string): Promise<GoalRow | null>;
}

export interface TaskRepository {
  findByIdForUser(taskId: number, userId: string): Promise<TaskRow | null>;
  markInProgress(taskId: number, userId: string): Promise<void>;
  markCompleted(taskId: number, userId: string, completedAt: string): Promise<void>;
}

export interface StudySessionRepository {
  findOpenByTask(taskId: number, userId: string): Promise<StudySessionRow | null>;
  createOpenSession(taskId: number, userId: string, startedAt: string): Promise<StudySessionRow>;
  completeTaskSession(input: CompleteTaskSessionInput): Promise<void>;
  createCompletedSession(input: CompleteTaskSessionInput): Promise<void>;
}

export interface ReviewRepository {
  findLatestForTask(taskId: number, userId: string): Promise<Pick<ReviewRow, 'id'> | null>;
  updateById(id: number, input: UpsertReviewInput): Promise<void>;
  create(input: UpsertReviewInput): Promise<void>;
}

export interface ResourceRepository {
  getTaskResources(taskId: number, userId: string): Promise<QuickActionResource[]>;
}

export interface QuickActionRepository {
  findByTaskAndAction(taskId: number, userId: string, action: QuickActionKind): Promise<QuickActionRow | null>;
  save(input: SaveQuickActionInput): Promise<QuickActionRow>;
}

export interface WorkspaceRepository {
  getWorkspaceData(user: UserRow): Promise<AppDataSnapshot>;
}

export interface WorkflowRepository {
  persistGeneratedWorkflow(input: WorkflowPersistenceInput): Promise<{ goalId: number }>;
}

export interface AgentRunRepository {
  createRun(input: CreateAgentRunInput): Promise<void>;
  appendEvent(input: {
    id: string;
    runId: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    payloadJson: string | null;
    createdAt: string;
  }): Promise<void>;
  updateRunStatus(input: {
    runId: string;
    status: 'completed' | 'failed';
    updatedAt: string;
    metadataJson?: string | null;
  }): Promise<void>;
}

export interface RetrievalRepository {
  saveSource(input: {
    id: string;
    userId: string | null;
    sourceType: 'resource' | 'reflection' | 'confusion' | 'quick_action';
    sourceId: string;
    content: string;
    metadataJson: string | null;
    createdAt: string;
    updatedAt: string;
  }): Promise<void>;
  saveEmbedding(input: {
    id: string;
    retrievalSourceId: string;
    provider: string;
    embeddingModel: string;
    embedding: string;
    createdAt: string;
  }): Promise<void>;
}

export interface AppRepositories {
  authSessions: AuthSessionRepository;
  goals: GoalRepository;
  tasks: TaskRepository;
  sessions: StudySessionRepository;
  reviews: ReviewRepository;
  resources: ResourceRepository;
  quickActions: QuickActionRepository;
  workspace: WorkspaceRepository;
  workflow: WorkflowRepository;
  agentRuns: AgentRunRepository;
  retrieval: RetrievalRepository;
}

export type WorkflowPlannerInput = {
  goal: string;
  level: string;
  preferredStyle: string | null;
  resourceMode: 'has_materials' | 'needs_plan';
  resources: LearningResourceInput[];
};

export interface WorkflowPlanner {
  plan(input: WorkflowPlannerInput, context: { user: UserRow; requestId: string }): Promise<Array<{
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
}

export interface StudyCoach {
  generateQuickAction(input: {
    action: QuickActionKind;
    context: QuickActionContext;
  }, context: { user: UserRow; task: TaskRow; requestId: string }): Promise<string>;
}
