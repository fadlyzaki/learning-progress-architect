import type Database from 'better-sqlite3';
import type { AppRepositories } from '../types.ts';
import type {
  AppDataSnapshot,
  GoalRow,
  QuickActionResource,
  QuickActionRow,
  ReviewRow,
  StudySessionRow,
  TaskRow,
  UserRow,
  UserWithPasswordRow,
} from '../../types.ts';

export function createSQLiteRepositories(db: Database.Database): AppRepositories {
  return {
    authSessions: {
      async findUserByEmail(email) {
        return (
          (db
            .prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?')
            .get(email) as UserWithPasswordRow | undefined) ?? null
        );
      },
      async findUserIdByEmail(email) {
        const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
        return row?.id ?? null;
      },
      async createUser(input) {
        db.prepare(
          'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(input.id, input.name, input.email, input.passwordHash, input.createdAt);

        return {
          id: input.id,
          name: input.name,
          email: input.email,
          created_at: input.createdAt,
        };
      },
      async createSession(input) {
        db.prepare('INSERT INTO auth_sessions (token, user_id, created_at) VALUES (?, ?, ?)')
          .run(input.token, input.userId, input.createdAt);
      },
      async getUserByToken(token) {
        return (
          (db
            .prepare(
              `
                SELECT users.id, users.name, users.email, users.created_at
                FROM auth_sessions
                INNER JOIN users ON users.id = auth_sessions.user_id
                WHERE auth_sessions.token = ?
              `,
            )
            .get(token) as UserRow | undefined) ?? null
        );
      },
    },
    goals: {
      async getByIdForUser(goalId, userId) {
        return (
          (db
            .prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?')
            .get(goalId, userId) as GoalRow | undefined) ?? null
        );
      },
    },
    tasks: {
      async findByIdForUser(taskId, userId) {
        return (
          (db
            .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
            .get(taskId, userId) as TaskRow | undefined) ?? null
        );
      },
      async markInProgress(taskId, userId) {
        db.prepare('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?')
          .run('in_progress', taskId, userId);
      },
      async markCompleted(taskId, userId, completedAt) {
        db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ? AND user_id = ?')
          .run('completed', completedAt, taskId, userId);
      },
    },
    sessions: {
      async findOpenByTask(taskId, userId) {
        return (
          (db
            .prepare(
              `
                SELECT * FROM study_sessions
                WHERE task_id = ? AND user_id = ? AND completed_at IS NULL
                ORDER BY started_at DESC, id DESC
                LIMIT 1
              `,
            )
            .get(taskId, userId) as StudySessionRow | undefined) ?? null
        );
      },
      async createOpenSession(taskId, userId, startedAt) {
        const insertResult = db
          .prepare(
            `
              INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
              VALUES (?, ?, ?, NULL, 0, NULL, NULL, NULL)
            `,
          )
          .run(userId, taskId, startedAt);

        return db
          .prepare('SELECT * FROM study_sessions WHERE id = ?')
          .get(Number(insertResult.lastInsertRowid)) as StudySessionRow;
      },
      async completeTaskSession(input) {
        const existingOpenSession = db
          .prepare(
            `
              SELECT * FROM study_sessions
              WHERE task_id = ? AND user_id = ? AND completed_at IS NULL
              ORDER BY started_at DESC, id DESC
              LIMIT 1
            `,
          )
          .get(input.taskId, input.userId) as StudySessionRow | undefined;

        if (!existingOpenSession) {
          throw new Error('No open session exists for this task.');
        }

        db.prepare(
          `
            UPDATE study_sessions
            SET completed_at = ?, duration_seconds = ?, reflection = ?, confusion = ?, confidence = ?
            WHERE id = ?
          `,
        ).run(
          input.completedAt,
          input.durationSeconds,
          input.reflection,
          input.confusion,
          input.confidence,
          existingOpenSession.id,
        );
      },
      async createCompletedSession(input) {
        db.prepare(
          `
            INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
        ).run(
          input.userId,
          input.taskId,
          input.completedAt,
          input.completedAt,
          input.durationSeconds,
          input.reflection,
          input.confusion,
          input.confidence,
        );
      },
    },
    reviews: {
      async findLatestForTask(taskId, userId) {
        return (
          (db
            .prepare(
              `
                SELECT id FROM reviews
                WHERE task_id = ? AND user_id = ?
                ORDER BY id DESC
                LIMIT 1
              `,
            )
            .get(taskId, userId) as Pick<ReviewRow, 'id'> | undefined) ?? null
        );
      },
      async updateById(id, input) {
        db.prepare('UPDATE reviews SET due_date = ?, priority = ?, status = ? WHERE id = ?')
          .run(input.dueDate, input.priority, input.status, id);
      },
      async create(input) {
        db.prepare(
          `
            INSERT INTO reviews (user_id, task_id, due_date, priority, status)
            VALUES (?, ?, ?, ?, ?)
          `,
        ).run(input.userId, input.taskId, input.dueDate, input.priority, input.status);
      },
    },
    resources: {
      async getTaskResources(taskId, userId) {
        return db
          .prepare(
            `
              SELECT resources.title, resources.type, resources.reference, resources.notes, resources.source_kind
              FROM task_resources
              INNER JOIN resources ON resources.id = task_resources.resource_id
              WHERE task_resources.task_id = ? AND task_resources.user_id = ?
              ORDER BY task_resources.id ASC
            `,
          )
          .all(taskId, userId) as QuickActionResource[];
      },
    },
    quickActions: {
      async findByTaskAndAction(taskId, userId, action) {
        return (
          (db
            .prepare(
              `
                SELECT * FROM quick_actions
                WHERE task_id = ? AND user_id = ? AND action = ?
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
              `,
            )
            .get(taskId, userId, action) as QuickActionRow | undefined) ?? null
        );
      },
      async save(input) {
        db.prepare(
          `
            INSERT INTO quick_actions (user_id, task_id, action, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, task_id, action) DO UPDATE SET
              content = excluded.content,
              updated_at = excluded.updated_at
          `,
        ).run(
          input.userId,
          input.taskId,
          input.action,
          input.content,
          input.createdAt,
          input.updatedAt,
        );

        return db
          .prepare(
            `
              SELECT * FROM quick_actions
              WHERE task_id = ? AND user_id = ? AND action = ?
              ORDER BY updated_at DESC, id DESC
              LIMIT 1
            `,
          )
          .get(input.taskId, input.userId, input.action) as QuickActionRow;
      },
    },
    workspace: {
      async getWorkspaceData(user) {
        const goals = db
          .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC, id DESC')
          .all(user.id) as AppDataSnapshot['goals'];
        const tasks = db
          .prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id ASC')
          .all(user.id) as AppDataSnapshot['tasks'];
        const events = db
          .prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY date ASC, id ASC')
          .all(user.id) as AppDataSnapshot['events'];
        const notes = db
          .prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC, id DESC')
          .all(user.id) as AppDataSnapshot['notes'];
        const sessions = db
          .prepare('SELECT * FROM study_sessions WHERE user_id = ? ORDER BY started_at DESC, id DESC')
          .all(user.id) as AppDataSnapshot['sessions'];
        const reviews = db
          .prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY due_date ASC, id ASC')
          .all(user.id) as AppDataSnapshot['reviews'];
        const resources = db
          .prepare('SELECT * FROM resources WHERE user_id = ? ORDER BY created_at ASC, id ASC')
          .all(user.id) as AppDataSnapshot['resources'];
        const task_resources = db
          .prepare('SELECT * FROM task_resources WHERE user_id = ? ORDER BY id ASC')
          .all(user.id) as AppDataSnapshot['task_resources'];
        const quick_actions = db
          .prepare('SELECT * FROM quick_actions WHERE user_id = ? ORDER BY updated_at DESC, id DESC')
          .all(user.id) as AppDataSnapshot['quick_actions'];

        return { user, goals, tasks, events, notes, sessions, reviews, resources, task_resources, quick_actions };
      },
    },
    workflow: {
      async persistGeneratedWorkflow(input) {
        const insertGoal = db.prepare(
          `
            INSERT INTO goals (user_id, title, level, hours, target_date, preferred_style, status, created_at, resource_mode)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
          `,
        );
        const insertTask = db.prepare(
          `
            INSERT INTO tasks (user_id, goal_id, title, description, status, created_at, completed_at)
            VALUES (?, ?, ?, ?, 'pending', ?, NULL)
          `,
        );
        const insertEvent = db.prepare(
          'INSERT INTO calendar_events (user_id, task_id, date, duration) VALUES (?, ?, ?, ?)',
        );
        const insertResource = db.prepare(
          `
            INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'user_supplied', ?)
          `,
        );
        const insertSystemResource = db.prepare(
          `
            INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
            VALUES (?, ?, ?, 'link', ?, ?, 'system_suggested', ?)
          `,
        );
        const insertTaskResource = db.prepare(
          `
            INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note)
            VALUES (?, ?, ?, ?)
          `,
        );
        const insertNote = db.prepare(
          `
            INSERT INTO notes (user_id, topic, content, kind, created_at)
            VALUES (?, ?, ?, ?, ?)
          `,
        );

        const tx = db.transaction(() => {
          const goalInsert = insertGoal.run(
            input.userId,
            input.goal,
            input.level,
            input.hours,
            input.targetDate,
            input.preferredStyle,
            input.createdAt,
            input.resourceMode,
          );
          const goalId = Number(goalInsert.lastInsertRowid);

          const storedResourceIds = input.resources.map((resource) => {
            const result = insertResource.run(
              input.userId,
              goalId,
              resource.title,
              resource.type,
              resource.reference,
              resource.notes,
              input.createdAt,
            );
            return Number(result.lastInsertRowid);
          });

          input.tasks.forEach((task, index) => {
            const taskInsert = insertTask.run(
              input.userId,
              goalId,
              task.title,
              task.description,
              input.createdAt,
            );
            const taskId = Number(taskInsert.lastInsertRowid);

            insertEvent.run(
              input.userId,
              taskId,
              input.scheduledEvents[index].date,
              input.scheduledEvents[index].duration,
            );

            if (storedResourceIds.length > 0) {
              const resourceId = storedResourceIds[index % storedResourceIds.length];
              insertTaskResource.run(input.userId, taskId, resourceId, 'Primary study anchor for this task');
            }

            for (const link of task.references) {
              const note = [link.snippet ?? null, link.source ? `Source: ${link.source}` : null]
                .filter(Boolean)
                .join(' — ') || null;
              const sysInsert = insertSystemResource.run(
                input.userId,
                goalId,
                link.title,
                link.url,
                note,
                input.createdAt,
              );
              const sysResourceId = Number(sysInsert.lastInsertRowid);
              insertTaskResource.run(input.userId, taskId, sysResourceId, 'System-suggested learning resource');
            }
          });

          insertNote.run(input.userId, input.goal, input.planSummary, 'plan', input.createdAt);
          insertNote.run(input.userId, `${input.goal} resources`, input.resourceNote, 'note', input.createdAt);

          return goalId;
        });

        return { goalId: tx() };
      },
    },
    agentRuns: {
      async createRun(input) {
        db.prepare(
          `
            INSERT INTO agent_runs (id, user_id, kind, provider, status, request_id, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        ).run(
          input.id,
          input.userId,
          input.kind,
          input.provider,
          input.status,
          input.requestId,
          input.metadataJson,
          input.createdAt,
          input.updatedAt,
        );
      },
      async appendEvent(input) {
        db.prepare(
          `
            INSERT INTO agent_run_events (id, run_id, level, message, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
        ).run(input.id, input.runId, input.level, input.message, input.payloadJson, input.createdAt);
      },
      async updateRunStatus(input) {
        db.prepare(
          `
            UPDATE agent_runs
            SET status = ?, updated_at = ?, metadata_json = COALESCE(?, metadata_json)
            WHERE id = ?
          `,
        ).run(input.status, input.updatedAt, input.metadataJson ?? null, input.runId);
      },
    },
    retrieval: {
      async saveSource(input) {
        db.prepare(
          `
            INSERT INTO retrieval_sources (id, user_id, source_type, source_id, content, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              content = excluded.content,
              metadata_json = excluded.metadata_json,
              updated_at = excluded.updated_at
          `,
        ).run(
          input.id,
          input.userId,
          input.sourceType,
          input.sourceId,
          input.content,
          input.metadataJson,
          input.createdAt,
          input.updatedAt,
        );
      },
      async saveEmbedding(input) {
        db.prepare(
          `
            INSERT INTO document_embeddings (id, retrieval_source_id, provider, embedding_model, embedding, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              embedding = excluded.embedding
          `,
        ).run(
          input.id,
          input.retrievalSourceId,
          input.provider,
          input.embeddingModel,
          input.embedding,
          input.createdAt,
        );
      },
    },
  };
}
