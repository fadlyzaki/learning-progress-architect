import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import type { AppRepositories } from '../types.ts';
import type {
  AppDataSnapshot,
  GoogleCalendarConnectionRow,
  GoogleCalendarSyncEvent,
  GoogleCalendarSyncSummary,
  GoalRow,
  QuickActionResource,
  QuickActionRow,
  ReviewRow,
  StudySessionRow,
  TaskRow,
  UserRow,
  UserWithPasswordRow,
} from '../../types.ts';

function mapRow<T extends QueryResultRow>(result: { rows: T[] }): T | null {
  return result.rows[0] ?? null;
}

async function withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function createPostgresRepositories(pool: Pool): AppRepositories {
  return {
    authSessions: {
      async findUserByEmail(email) {
        const result = await pool.query<UserWithPasswordRow>(
          'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
          [email],
        );
        return mapRow(result);
      },
      async findUserIdByEmail(email) {
        const result = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
        return result.rows[0]?.id ?? null;
      },
      async createUser(input) {
        await pool.query(
          'INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
          [input.id, input.name, input.email, input.passwordHash, input.createdAt],
        );
        return {
          id: input.id,
          name: input.name,
          email: input.email,
          created_at: input.createdAt,
        };
      },
      async createSession(input) {
        await pool.query(
          'INSERT INTO auth_sessions (token, user_id, created_at) VALUES ($1, $2, $3)',
          [input.token, input.userId, input.createdAt],
        );
      },
      async getUserByToken(token) {
        const result = await pool.query<UserRow>(
          `
            SELECT users.id, users.name, users.email, users.created_at
            FROM auth_sessions
            INNER JOIN users ON users.id = auth_sessions.user_id
            WHERE auth_sessions.token = $1
          `,
          [token],
        );
        return mapRow(result);
      },
    },
    goals: {
      async getByIdForUser(goalId, userId) {
        const result = await pool.query<GoalRow>('SELECT * FROM goals WHERE id = $1 AND user_id = $2', [goalId, userId]);
        return mapRow(result);
      },
    },
    tasks: {
      async findByIdForUser(taskId, userId) {
        const result = await pool.query<TaskRow>('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);
        return mapRow(result);
      },
      async markInProgress(taskId, userId) {
        await pool.query('UPDATE tasks SET status = $1 WHERE id = $2 AND user_id = $3', ['in_progress', taskId, userId]);
      },
      async markCompleted(taskId, userId, completedAt) {
        await pool.query(
          'UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3 AND user_id = $4',
          ['completed', completedAt, taskId, userId],
        );
      },
      async resetToInProgress(taskId, userId) {
        await pool.query(
          'UPDATE tasks SET status = $1, completed_at = NULL WHERE id = $2 AND user_id = $3',
          ['in_progress', taskId, userId],
        );
      },
    },
    sessions: {
      async findOpenByTask(taskId, userId) {
        const result = await pool.query<StudySessionRow>(
          `
            SELECT * FROM study_sessions
            WHERE task_id = $1 AND user_id = $2 AND completed_at IS NULL
            ORDER BY started_at DESC, id DESC
            LIMIT 1
          `,
          [taskId, userId],
        );
        return mapRow(result);
      },
      async createOpenSession(taskId, userId, startedAt) {
        const result = await pool.query<StudySessionRow>(
          `
            INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
            VALUES ($1, $2, $3, NULL, 0, NULL, NULL, NULL)
            RETURNING *
          `,
          [userId, taskId, startedAt],
        );
        return result.rows[0];
      },
      async completeTaskSession(input) {
        const openSession = await pool.query<StudySessionRow>(
          `
            SELECT * FROM study_sessions
            WHERE task_id = $1 AND user_id = $2 AND completed_at IS NULL
            ORDER BY started_at DESC, id DESC
            LIMIT 1
          `,
          [input.taskId, input.userId],
        );
        const session = mapRow(openSession);
        if (!session) {
          throw new Error('No open session exists for this task.');
        }

        await pool.query(
          `
            UPDATE study_sessions
            SET completed_at = $1, duration_seconds = $2, reflection = $3, confusion = $4, confidence = $5
            WHERE id = $6
          `,
          [
            input.completedAt,
            input.durationSeconds,
            input.reflection,
            input.confusion,
            input.confidence,
            session.id,
          ],
        );
      },
      async createCompletedSession(input) {
        await pool.query(
          `
            INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            input.userId,
            input.taskId,
            input.completedAt,
            input.completedAt,
            input.durationSeconds,
            input.reflection,
            input.confusion,
            input.confidence,
          ],
        );
      },
    },
    reviews: {
      async findLatestForTask(taskId, userId) {
        const result = await pool.query<Pick<ReviewRow, 'id'>>(
          `
            SELECT id FROM reviews
            WHERE task_id = $1 AND user_id = $2
            ORDER BY id DESC
            LIMIT 1
          `,
          [taskId, userId],
        );
        return mapRow(result);
      },
      async updateById(id, input) {
        await pool.query('UPDATE reviews SET due_date = $1, priority = $2, status = $3 WHERE id = $4', [
          input.dueDate,
          input.priority,
          input.status,
          id,
        ]);
      },
      async create(input) {
        await pool.query(
          'INSERT INTO reviews (user_id, task_id, due_date, priority, status) VALUES ($1, $2, $3, $4, $5)',
          [input.userId, input.taskId, input.dueDate, input.priority, input.status],
        );
      },
    },
    resources: {
      async getTaskResources(taskId, userId) {
        const result = await pool.query<QuickActionResource>(
          `
            SELECT resources.title, resources.type, resources.reference, resources.notes, resources.source_kind
            FROM task_resources
            INNER JOIN resources ON resources.id = task_resources.resource_id
            WHERE task_resources.task_id = $1 AND task_resources.user_id = $2
            ORDER BY task_resources.id ASC
          `,
          [taskId, userId],
        );
        return result.rows;
      },
      async addSystemResource(taskId, goalId, userId, input) {
        await withTransaction(pool, async (client) => {
          const result = await client.query<{ id: number }>(
            `
              INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
              VALUES ($1, $2, $3, 'link', $4, NULL, 'system_suggested', $5)
              RETURNING id
            `,
            [userId, goalId, input.title, input.url, input.createdAt],
          );
          
          await client.query(
            'INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note) VALUES ($1, $2, $3, $4)',
            [userId, taskId, result.rows[0].id, 'System-suggested learning resource'],
          );
        });
      },
    },
    quickActions: {
      async findByTaskAndAction(taskId, userId, action) {
        const result = await pool.query<QuickActionRow>(
          `
            SELECT * FROM quick_actions
            WHERE task_id = $1 AND user_id = $2 AND action = $3
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
          `,
          [taskId, userId, action],
        );
        return mapRow(result);
      },
      async save(input) {
        const result = await pool.query<QuickActionRow>(
          `
            INSERT INTO quick_actions (user_id, task_id, action, content, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT(user_id, task_id, action) DO UPDATE SET
              content = EXCLUDED.content,
              updated_at = EXCLUDED.updated_at
            RETURNING *
          `,
          [
            input.userId,
            input.taskId,
            input.action,
            input.content,
            input.createdAt,
            input.updatedAt,
          ],
        );
        return result.rows[0];
      },
    },
    workspace: {
      async getWorkspaceData(user) {
        const [goals, tasks, events, notes, sessions, reviews, resources, task_resources, quick_actions] =
          await Promise.all([
            pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [user.id]),
            pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY id ASC', [user.id]),
            pool.query('SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY date ASC, id ASC', [user.id]),
            pool.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [user.id]),
            pool.query('SELECT * FROM study_sessions WHERE user_id = $1 ORDER BY started_at DESC, id DESC', [user.id]),
            pool.query('SELECT * FROM reviews WHERE user_id = $1 ORDER BY due_date ASC, id ASC', [user.id]),
            pool.query('SELECT * FROM resources WHERE user_id = $1 ORDER BY created_at ASC, id ASC', [user.id]),
            pool.query('SELECT * FROM task_resources WHERE user_id = $1 ORDER BY id ASC', [user.id]),
            pool.query('SELECT * FROM quick_actions WHERE user_id = $1 ORDER BY updated_at DESC, id DESC', [user.id]),
          ]);

        return {
          user,
          goals: goals.rows as AppDataSnapshot['goals'],
          tasks: tasks.rows as AppDataSnapshot['tasks'],
          events: events.rows as AppDataSnapshot['events'],
          notes: notes.rows as AppDataSnapshot['notes'],
          sessions: sessions.rows as AppDataSnapshot['sessions'],
          reviews: reviews.rows as AppDataSnapshot['reviews'],
          resources: resources.rows as AppDataSnapshot['resources'],
          task_resources: task_resources.rows as AppDataSnapshot['task_resources'],
          quick_actions: quick_actions.rows as AppDataSnapshot['quick_actions'],
        };
      },
    },
    workflow: {
      async persistGeneratedWorkflow(input) {
        return withTransaction(pool, async (client) => {
          const goalResult = await client.query<{ id: number }>(
            `
              INSERT INTO goals (user_id, title, level, hours, target_date, preferred_style, status, created_at, resource_mode)
              VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
              RETURNING id
            `,
            [
              input.userId,
              input.goal,
              input.level,
              input.hours,
              input.targetDate,
              input.preferredStyle,
              input.createdAt,
              input.resourceMode,
            ],
          );
          const goalId = goalResult.rows[0].id;

          const storedResourceIds: number[] = [];
          for (const resource of input.resources) {
            const resourceResult = await client.query<{ id: number }>(
              `
                INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'user_supplied', $7)
                RETURNING id
              `,
              [
                input.userId,
                goalId,
                resource.title,
                resource.type,
                resource.reference,
                resource.notes,
                input.createdAt,
              ],
            );
            storedResourceIds.push(resourceResult.rows[0].id);
          }

          for (const [index, task] of input.tasks.entries()) {
            const taskResult = await client.query<{ id: number }>(
              `
                INSERT INTO tasks (user_id, goal_id, title, description, status, created_at, completed_at)
                VALUES ($1, $2, $3, $4, 'pending', $5, NULL)
                RETURNING id
              `,
              [input.userId, goalId, task.title, task.description, input.createdAt],
            );
            const taskId = taskResult.rows[0].id;

            await client.query(
              'INSERT INTO calendar_events (user_id, task_id, date, duration) VALUES ($1, $2, $3, $4)',
              [input.userId, taskId, input.scheduledEvents[index].date, input.scheduledEvents[index].duration],
            );

            if (storedResourceIds.length > 0) {
              const resourceId = storedResourceIds[index % storedResourceIds.length];
              await client.query(
                'INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note) VALUES ($1, $2, $3, $4)',
                [input.userId, taskId, resourceId, 'Primary study anchor for this task'],
              );
            }

            for (const link of task.references) {
              const systemResourceResult = await client.query<{ id: number }>(
                `
                  INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
                  VALUES ($1, $2, $3, 'link', $4, NULL, 'system_suggested', $5)
                  RETURNING id
                `,
                [input.userId, goalId, link.title, link.url, input.createdAt],
              );

              await client.query(
                'INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note) VALUES ($1, $2, $3, $4)',
                [input.userId, taskId, systemResourceResult.rows[0].id, 'System-suggested learning resource'],
              );
            }
          }

          await client.query(
            'INSERT INTO notes (user_id, topic, content, kind, created_at) VALUES ($1, $2, $3, $4, $5)',
            [input.userId, input.goal, input.planSummary, 'plan', input.createdAt],
          );
          await client.query(
            'INSERT INTO notes (user_id, topic, content, kind, created_at) VALUES ($1, $2, $3, $4, $5)',
            [input.userId, `${input.goal} resources`, input.resourceNote, 'note', input.createdAt],
          );

          return { goalId };
        });
      },
    },
    googleCalendar: {
      async getConnection(userId) {
        const result = await pool.query<GoogleCalendarConnectionRow>(
          'SELECT * FROM google_calendar_connections WHERE user_id = $1',
          [userId],
        );
        return mapRow(result);
      },
      async saveConnection(input) {
        const result = await pool.query<GoogleCalendarConnectionRow>(
          `
            INSERT INTO google_calendar_connections (
              user_id, encrypted_refresh_token, calendar_id, granted_scopes, status, connected_at, last_synced_at, last_error
            )
            VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)
            ON CONFLICT(user_id) DO UPDATE SET
              encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
              calendar_id = EXCLUDED.calendar_id,
              granted_scopes = EXCLUDED.granted_scopes,
              status = EXCLUDED.status,
              connected_at = EXCLUDED.connected_at,
              last_synced_at = NULL,
              last_error = NULL
            RETURNING *
          `,
          [
            input.userId,
            input.encryptedRefreshToken,
            input.calendarId,
            input.grantedScopes,
            input.status,
            input.connectedAt,
          ],
        );
        return result.rows[0];
      },
      async markConnectionSynced(userId, syncedAt) {
        await pool.query(
          `
            UPDATE google_calendar_connections
            SET status = 'connected', last_synced_at = $1, last_error = NULL
            WHERE user_id = $2
          `,
          [syncedAt, userId],
        );
      },
      async markConnectionError(userId, error) {
        await pool.query(
          `
            UPDATE google_calendar_connections
            SET status = 'error', last_error = $1
            WHERE user_id = $2
          `,
          [error, userId],
        );
      },
      async disconnect(userId) {
        await withTransaction(pool, async (client) => {
          await client.query('DELETE FROM google_calendar_connections WHERE user_id = $1', [userId]);
          await client.query(
            `
              UPDATE calendar_events
              SET google_calendar_id = NULL,
                  google_event_id = NULL,
                  google_sync_status = 'not_synced',
                  google_synced_at = NULL,
                  google_sync_error = NULL
              WHERE user_id = $1
            `,
            [userId],
          );
        });
      },
      async createOAuthState(input) {
        await pool.query(
          `
            INSERT INTO google_oauth_states (user_id, state_hash, expires_at, consumed_at, created_at)
            VALUES ($1, $2, $3, NULL, $4)
          `,
          [input.userId, input.stateHash, input.expiresAt, input.createdAt],
        );
      },
      async consumeOAuthState(stateHash, consumedAt) {
        return withTransaction(pool, async (client) => {
          const result = await client.query<{ user_id: string }>(
            `
              SELECT user_id FROM google_oauth_states
              WHERE state_hash = $1
                AND consumed_at IS NULL
                AND expires_at > $2
              LIMIT 1
            `,
            [stateHash, consumedAt],
          );
          const state = mapRow(result);
          if (!state) {
            return null;
          }

          await client.query('UPDATE google_oauth_states SET consumed_at = $1 WHERE state_hash = $2', [
            consumedAt,
            stateHash,
          ]);
          return { userId: state.user_id };
        });
      },
      async listSyncEvents(userId) {
        const result = await pool.query<GoogleCalendarSyncEvent>(
          `
            SELECT
              calendar_events.*,
              tasks.title AS task_title,
              tasks.description AS task_description,
              goals.title AS goal_title
            FROM calendar_events
            INNER JOIN tasks ON tasks.id = calendar_events.task_id AND tasks.user_id = calendar_events.user_id
            LEFT JOIN goals ON goals.id = tasks.goal_id AND goals.user_id = calendar_events.user_id
            WHERE calendar_events.user_id = $1
            ORDER BY calendar_events.date ASC, calendar_events.id ASC
          `,
          [userId],
        );
        return result.rows;
      },
      async getSyncSummary(userId) {
        const result = await pool.query<GoogleCalendarSyncSummary>(
          `
            SELECT
              COUNT(*)::int AS total,
              SUM(CASE WHEN google_sync_status = 'synced' THEN 1 ELSE 0 END)::int AS synced,
              SUM(CASE WHEN google_sync_status = 'failed' THEN 1 ELSE 0 END)::int AS failed,
              SUM(CASE WHEN google_sync_status IS NULL OR google_sync_status = 'not_synced' THEN 1 ELSE 0 END)::int AS pending
            FROM calendar_events
            WHERE user_id = $1
          `,
          [userId],
        );
        const row = result.rows[0];
        return {
          total: Number(row.total ?? 0),
          synced: Number(row.synced ?? 0),
          failed: Number(row.failed ?? 0),
          pending: Number(row.pending ?? 0),
        };
      },
      async updateEventSync(input) {
        await pool.query(
          `
            UPDATE calendar_events
            SET google_calendar_id = $1,
                google_event_id = $2,
                google_sync_status = $3,
                google_synced_at = $4,
                google_sync_error = $5
            WHERE id = $6 AND user_id = $7
          `,
          [
            input.googleCalendarId,
            input.googleEventId,
            input.googleSyncStatus,
            input.googleSyncedAt,
            input.googleSyncError,
            input.eventId,
            input.userId,
          ],
        );
      },
    },
    agentRuns: {
      async createRun(input) {
        await pool.query(
          `
            INSERT INTO agent_runs (id, user_id, kind, provider, status, request_id, metadata_json, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            input.id,
            input.userId,
            input.kind,
            input.provider,
            input.status,
            input.requestId,
            input.metadataJson,
            input.createdAt,
            input.updatedAt,
          ],
        );
      },
      async appendEvent(input) {
        await pool.query(
          'INSERT INTO agent_run_events (id, run_id, level, message, payload_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [input.id, input.runId, input.level, input.message, input.payloadJson, input.createdAt],
        );
      },
      async updateRunStatus(input) {
        await pool.query(
          `
            UPDATE agent_runs
            SET status = $1, updated_at = $2, metadata_json = COALESCE($3, metadata_json)
            WHERE id = $4
          `,
          [input.status, input.updatedAt, input.metadataJson ?? null, input.runId],
        );
      },
    },
    retrieval: {
      async saveSource(input) {
        await pool.query(
          `
            INSERT INTO retrieval_sources (id, user_id, source_type, source_id, content, metadata_json, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT(id) DO UPDATE SET
              content = EXCLUDED.content,
              metadata_json = EXCLUDED.metadata_json,
              updated_at = EXCLUDED.updated_at
          `,
          [
            input.id,
            input.userId,
            input.sourceType,
            input.sourceId,
            input.content,
            input.metadataJson,
            input.createdAt,
            input.updatedAt,
          ],
        );
      },
      async saveEmbedding(input) {
        await pool.query(
          `
            INSERT INTO document_embeddings (id, retrieval_source_id, provider, embedding_model, embedding, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT(id) DO UPDATE SET
              embedding = EXCLUDED.embedding
          `,
          [
            input.id,
            input.retrievalSourceId,
            input.provider,
            input.embeddingModel,
            input.embedding,
            input.createdAt,
          ],
        );
      },
    },
  };
}
