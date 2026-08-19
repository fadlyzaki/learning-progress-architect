var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/utils/date.ts
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
var init_date = __esm({
  "server/utils/date.ts"() {
  }
});

// server/services/demoService.ts
var demoService_exports = {};
__export(demoService_exports, {
  DEMO_SESSION_TOKEN: () => DEMO_SESSION_TOKEN,
  provisionDemoSession: () => provisionDemoSession
});
import crypto from "crypto";
async function provisionDemoSession(repositories, options = {}) {
  const { authSessions, workspace, workflow, tasks, sessions, reviews, quickActions } = repositories;
  const isGuest = options.isGuest ?? false;
  const reset = options.reset ?? false;
  let user;
  const createdAt = nowIso();
  if (isGuest) {
    const guestId = crypto.randomUUID();
    const guestSuffix = crypto.randomBytes(3).toString("hex");
    user = await authSessions.createUser({
      id: guestId,
      name: "Guest Learner",
      email: `guest_${guestSuffix}@demo.local`,
      passwordHash: "guest_session_hash",
      createdAt
    });
  } else {
    const existing = await authSessions.findUserByEmail("demo@learningprogress.app");
    if (existing) {
      user = {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        created_at: existing.created_at
      };
    } else {
      const demoId = crypto.randomUUID();
      user = await authSessions.createUser({
        id: demoId,
        name: "Demo Learner",
        email: "demo@learningprogress.app",
        passwordHash: "demo_session_hash",
        createdAt
      });
    }
  }
  const workspaceData = await workspace.getWorkspaceData(user);
  if (workspaceData.goals.length === 0 || reset) {
    const goalTitle = "Distributed Systems & Cloud Architecture";
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
    const taskDefs = [
      {
        title: "Distributed Consensus & State Machine Replication (Raft)",
        description: "Explore leader election, log replication safety, and split-brain resolution in distributed consensus protocols.",
        searchQuery: "Raft consensus algorithm visual guide",
        references: [
          {
            title: "Raft Consensus Specification & Visual Simulator",
            url: "https://raft.github.io/",
            snippet: "Interactive visualization of Raft leader election and log replication invariants.",
            source: "Raft Paper"
          }
        ]
      },
      {
        title: "Event Sourcing, CQRS & Message Streaming (Kafka & NATS)",
        description: "Implement event-driven communication patterns, partition ordering, and exactly-once delivery semantics.",
        searchQuery: "Apache Kafka event streaming patterns",
        references: [
          {
            title: "Apache Kafka Core Concepts & Architecture",
            url: "https://kafka.apache.org/documentation/",
            snippet: "Architecture guide on topics, partitions, consumer groups, and replication.",
            source: "Apache Docs"
          }
        ]
      },
      {
        title: "Caching Strategies, Cache Invalidation & Redis Patterns",
        description: "Apply cache-aside, write-through, and cache-stampede mitigation strategies with Redis.",
        searchQuery: "Distributed caching strategies Redis",
        references: [
          {
            title: "Redis Architecture & Data Structures Guide",
            url: "https://redis.io/docs/latest/develop/data-types/",
            snippet: "Caching patterns, pub/sub, and data structures.",
            source: "Redis Docs"
          }
        ]
      },
      {
        title: "Resiliency Patterns: Circuit Breakers, Bulkheads & Chaos Engineering",
        description: "Design fault-tolerant services using retries with exponential backoff, rate limiting, and circuit breakers.",
        searchQuery: "Distributed systems resiliency patterns circuit breaker",
        references: [
          {
            title: "Release It! Design Patterns for Production Resiliency",
            url: "https://pragprog.com/titles/mnee2/release-it-second-edition/",
            snippet: "Production resiliency patterns and stability anti-patterns.",
            source: "Reference"
          }
        ]
      }
    ];
    const todayDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const scheduledEvents = [
      { date: todayDate, duration: 45 },
      { date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10), duration: 60 },
      { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10), duration: 45 },
      { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10), duration: 60 }
    ];
    await workflow.persistGeneratedWorkflow({
      userId: user.id,
      goal: goalTitle,
      level: "Intermediate",
      hours: 6,
      targetDate,
      preferredStyle: "Practice-Heavy",
      resourceMode: "needs_plan",
      planSummary: "A structured intermediate roadmap focusing on building highly-available, partition-tolerant backend architectures, consensus algorithms, and distributed streaming.",
      resourceNote: "Core study anchors covering Raft consensus, message queues, and caching invariants.",
      resources: [],
      tasks: taskDefs,
      scheduledEvents,
      createdAt
    });
    const refreshed = await workspace.getWorkspaceData(user);
    const firstTask = refreshed.tasks.find((t) => t.title.includes("Distributed Consensus"));
    const secondTask = refreshed.tasks.find((t) => t.title.includes("Event Sourcing"));
    if (firstTask) {
      await tasks.markCompleted(firstTask.id, user.id, createdAt);
      await sessions.createCompletedSession({
        userId: user.id,
        taskId: firstTask.id,
        durationSeconds: 2700,
        reflection: "Grasped leader election, log replication invariants, and split-brain resolution through majority quorums.",
        confusion: "Need to review joint consensus configuration changes in Raft edge cases.",
        confidence: 4,
        completedAt: createdAt
      });
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
      await reviews.create({
        userId: user.id,
        taskId: firstTask.id,
        dueDate,
        priority: "high",
        status: "pending"
      });
    }
    if (secondTask) {
      await tasks.markInProgress(secondTask.id, user.id);
      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: "explain",
        content: `**Core Concept: Event Sourcing & CQRS**

1. **Why Event Sourcing?** Traditional CRUD loses historical context. Event Sourcing retains the complete immutable audit trail of how the system arrived at its current state.
2. **Why CQRS?** Read and write workloads have drastically different scaling profiles and schemas. Decoupling them allows independent optimization.
3. **Delivery Semantics:** Kafka provides partition-level ordering with idempotent producers (\`enable.idempotence=true\`) for end-to-end reliability.`,
        createdAt,
        updatedAt: createdAt
      });
      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: "example",
        content: `**Practical Implementation Example:**

\`\`\`typescript
// Command Handler (Write Model - enforces invariants)
async function handleCreateOrder(command: CreateOrderCommand) {
  const events = aggregate.process(command);
  await eventStore.append('orders', events);
  await kafkaProducer.send({ topic: 'order-events', messages: events });
}

// Projection Consumer (Read Model - materialized query view)
async function onOrderCreated(event: OrderCreatedEvent) {
  await readDb.orderSummaries.insert({
    id: event.orderId,
    customer: event.customerId,
    total: event.totalAmount,
    status: 'PLACED',
  });
}
\`\`\``,
        createdAt,
        updatedAt: createdAt
      });
      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: "analogy",
        content: `**Mental Model / Analogy:**

Think of Event Sourcing like an **accounting ledger**. You never white-out numbers or overwrite your bank balance directly. Every transaction (+ $50 deposit, - $20 coffee) is recorded immutably. Your current balance is simply the projection (fold/reduce) of all ledger entries from the beginning of time.`,
        createdAt,
        updatedAt: createdAt
      });
    }
  }
  const token = isGuest ? `guest_token_${crypto.randomUUID()}` : DEMO_SESSION_TOKEN;
  await authSessions.createSession({
    token,
    userId: user.id,
    createdAt
  });
  return {
    token,
    user
  };
}
var DEMO_SESSION_TOKEN;
var init_demoService = __esm({
  "server/services/demoService.ts"() {
    init_date();
    DEMO_SESSION_TOKEN = "demo_session_token_learning_progress_architect";
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  migrateDatabase: () => migrateDatabase
});
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
function resolveDatabasePath() {
  if (process.env.DATABASE_FILE) {
    return process.env.DATABASE_FILE;
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join("/tmp", "app.db");
    const sourceDbPath = path.join(process.cwd(), "app.db");
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(sourceDbPath)) {
      try {
        fs.copyFileSync(sourceDbPath, tmpDbPath);
      } catch (e) {
        console.warn("Could not copy seed database to /tmp:", e);
      }
    }
    return tmpDbPath;
  }
  return "app.db";
}
function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}
function ensureColumn(tableName, definition) {
  const columnName = definition.split(" ")[0];
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}
function migrateDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      level TEXT,
      hours INTEGER,
      target_date TEXT,
      preferred_style TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      goal_id INTEGER,
      title TEXT,
      description TEXT,
      status TEXT,
      created_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      task_id INTEGER,
      date TEXT,
      duration INTEGER,
      google_calendar_id TEXT,
      google_event_id TEXT,
      google_sync_status TEXT DEFAULT 'not_synced',
      google_synced_at TEXT,
      google_sync_error TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      user_id TEXT,
      topic TEXT,
      content TEXT,
      kind TEXT DEFAULT 'plan',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      reflection TEXT,
      confusion TEXT,
      confidence INTEGER,
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      goal_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      source_kind TEXT NOT NULL DEFAULT 'user_supplied',
      created_at TEXT NOT NULL,
      FOREIGN KEY(goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS task_resources (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      resource_id INTEGER NOT NULL,
      relevance_note TEXT,
      FOREIGN KEY(task_id) REFERENCES tasks(id),
      FOREIGN KEY(resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS quick_actions (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, task_id, action),
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      kind TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      request_id TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_run_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id)
    );

    CREATE TABLE IF NOT EXISTS retrieval_sources (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_embeddings (
      id TEXT PRIMARY KEY,
      retrieval_source_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(retrieval_source_id) REFERENCES retrieval_sources(id)
    );

    CREATE TABLE IF NOT EXISTS google_calendar_connections (
      user_id TEXT PRIMARY KEY,
      encrypted_refresh_token TEXT NOT NULL,
      calendar_id TEXT NOT NULL DEFAULT 'primary',
      granted_scopes TEXT,
      status TEXT NOT NULL DEFAULT 'connected',
      connected_at TEXT NOT NULL,
      last_synced_at TEXT,
      last_error TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS google_oauth_states (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      state_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  ensureColumn("goals", "user_id TEXT");
  ensureColumn("goals", "target_date TEXT");
  ensureColumn("goals", "preferred_style TEXT");
  ensureColumn("goals", "status TEXT DEFAULT 'active'");
  ensureColumn("goals", "created_at TEXT");
  ensureColumn("goals", "resource_mode TEXT DEFAULT 'needs_plan'");
  ensureColumn("tasks", "user_id TEXT");
  ensureColumn("tasks", "created_at TEXT");
  ensureColumn("tasks", "completed_at TEXT");
  ensureColumn("calendar_events", "user_id TEXT");
  ensureColumn("calendar_events", "google_calendar_id TEXT");
  ensureColumn("calendar_events", "google_event_id TEXT");
  ensureColumn("calendar_events", "google_sync_status TEXT DEFAULT 'not_synced'");
  ensureColumn("calendar_events", "google_synced_at TEXT");
  ensureColumn("calendar_events", "google_sync_error TEXT");
  ensureColumn("notes", "user_id TEXT");
  ensureColumn("notes", "kind TEXT DEFAULT 'plan'");
  ensureColumn("notes", "created_at TEXT");
  db.exec(`
    UPDATE goals SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE goals SET status = COALESCE(status, 'active') WHERE status IS NULL;
    UPDATE goals SET resource_mode = COALESCE(resource_mode, 'needs_plan') WHERE resource_mode IS NULL;
    UPDATE tasks SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE notes SET created_at = COALESCE(created_at, datetime('now')) WHERE created_at IS NULL;
    UPDATE notes SET kind = COALESCE(kind, 'plan') WHERE kind IS NULL;
    UPDATE calendar_events SET google_sync_status = COALESCE(google_sync_status, 'not_synced') WHERE google_sync_status IS NULL;
  `);
}
var db;
var init_db = __esm({
  "server/db.ts"() {
    db = new Database(resolveDatabasePath());
  }
});

// server/serverless.ts
import express from "express";

// server/appContext.ts
import { Pool } from "pg";

// server/config/env.ts
function normalizeDatabaseProvider(value) {
  return value === "alloydb" ? "alloydb" : "sqlite";
}
function normalizeAgentProvider(value) {
  return value === "adk" ? "adk" : "legacy";
}
function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function readBoolean(value, fallback = false) {
  if (value === void 0) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
var env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: readNumber(process.env.PORT, 3e3),
  databaseProvider: normalizeDatabaseProvider(process.env.DB_PROVIDER),
  databaseFile: process.env.DATABASE_FILE || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "/tmp/app.db" : "app.db"),
  databaseUrl: process.env.DATABASE_URL ?? "",
  agentProvider: normalizeAgentProvider(process.env.AGENT_PROVIDER),
  adkServiceUrl: process.env.ADK_SERVICE_URL ?? "",
  appBaseUrl: process.env.APP_BASE_URL || process.env.APP_URL || `http://localhost:${readNumber(process.env.PORT, 3e3)}`,
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN ?? "",
  mcpBaseUrl: process.env.MCP_BASE_URL || `http://127.0.0.1:${readNumber(process.env.MCP_PORT, 3101)}`,
  mcpPort: readNumber(process.env.MCP_PORT, 3101),
  vertexProjectId: process.env.VERTEX_PROJECT_ID ?? "",
  alloydbInstance: process.env.ALLOYDB_INSTANCE ?? "",
  alloydbDatabase: process.env.ALLOYDB_DATABASE ?? "",
  alloydbUser: process.env.ALLOYDB_USER ?? "",
  googleCalendarSyncEnabled: readBoolean(process.env.GOOGLE_CALENDAR_SYNC_ENABLED),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  googleTokenEncryptionKey: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? ""
};
function requireDatabaseUrl() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required when DB_PROVIDER=alloydb.");
  }
  return env.databaseUrl;
}
function requireAdkServiceUrl() {
  if (!env.adkServiceUrl) {
    throw new Error("ADK_SERVICE_URL is required when AGENT_PROVIDER=adk.");
  }
  return env.adkServiceUrl;
}
function requireInternalServiceToken() {
  if (!env.internalServiceToken) {
    throw new Error("INTERNAL_SERVICE_TOKEN is required for internal service communication.");
  }
  return env.internalServiceToken;
}
function getInternalServiceHeaders() {
  return {
    "x-internal-service-token": requireInternalServiceToken()
  };
}
function getGoogleOAuthRedirectUri() {
  return env.googleOAuthRedirectUri || `${env.appBaseUrl}/api/integrations/google-calendar/callback`;
}
function requireGoogleCalendarConfig() {
  if (!env.googleCalendarSyncEnabled) {
    throw new Error("Google Calendar sync is disabled.");
  }
  if (!env.googleClientId || !env.googleClientSecret || !env.googleTokenEncryptionKey) {
    throw new Error("Google Calendar integration is not configured.");
  }
  return {
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
    redirectUri: getGoogleOAuthRedirectUri(),
    tokenEncryptionKey: env.googleTokenEncryptionKey
  };
}

// server/repositories/postgres/index.ts
function mapRow(result) {
  return result.rows[0] ?? null;
}
async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function createPostgresRepositories(pool) {
  return {
    authSessions: {
      async findUserByEmail(email) {
        const result = await pool.query(
          "SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1",
          [email]
        );
        return mapRow(result);
      },
      async findUserIdByEmail(email) {
        const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        return result.rows[0]?.id ?? null;
      },
      async createUser(input) {
        await pool.query(
          "INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)",
          [input.id, input.name, input.email, input.passwordHash, input.createdAt]
        );
        return {
          id: input.id,
          name: input.name,
          email: input.email,
          created_at: input.createdAt
        };
      },
      async createSession(input) {
        await pool.query(
          "INSERT INTO auth_sessions (token, user_id, created_at) VALUES ($1, $2, $3)",
          [input.token, input.userId, input.createdAt]
        );
      },
      async getUserByToken(token) {
        const result = await pool.query(
          `
            SELECT users.id, users.name, users.email, users.created_at
            FROM auth_sessions
            INNER JOIN users ON users.id = auth_sessions.user_id
            WHERE auth_sessions.token = $1
          `,
          [token]
        );
        return mapRow(result);
      }
    },
    goals: {
      async getByIdForUser(goalId, userId) {
        const result = await pool.query("SELECT * FROM goals WHERE id = $1 AND user_id = $2", [goalId, userId]);
        return mapRow(result);
      }
    },
    tasks: {
      async findByIdForUser(taskId, userId) {
        const result = await pool.query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [taskId, userId]);
        return mapRow(result);
      },
      async markInProgress(taskId, userId) {
        await pool.query("UPDATE tasks SET status = $1 WHERE id = $2 AND user_id = $3", ["in_progress", taskId, userId]);
      },
      async markCompleted(taskId, userId, completedAt) {
        await pool.query(
          "UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3 AND user_id = $4",
          ["completed", completedAt, taskId, userId]
        );
      },
      async resetToInProgress(taskId, userId) {
        await pool.query(
          "UPDATE tasks SET status = $1, completed_at = NULL WHERE id = $2 AND user_id = $3",
          ["in_progress", taskId, userId]
        );
      }
    },
    sessions: {
      async findOpenByTask(taskId, userId) {
        const result = await pool.query(
          `
            SELECT * FROM study_sessions
            WHERE task_id = $1 AND user_id = $2 AND completed_at IS NULL
            ORDER BY started_at DESC, id DESC
            LIMIT 1
          `,
          [taskId, userId]
        );
        return mapRow(result);
      },
      async createOpenSession(taskId, userId, startedAt) {
        const result = await pool.query(
          `
            INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
            VALUES ($1, $2, $3, NULL, 0, NULL, NULL, NULL)
            RETURNING *
          `,
          [userId, taskId, startedAt]
        );
        return result.rows[0];
      },
      async completeTaskSession(input) {
        const openSession = await pool.query(
          `
            SELECT * FROM study_sessions
            WHERE task_id = $1 AND user_id = $2 AND completed_at IS NULL
            ORDER BY started_at DESC, id DESC
            LIMIT 1
          `,
          [input.taskId, input.userId]
        );
        const session = mapRow(openSession);
        if (!session) {
          throw new Error("No open session exists for this task.");
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
            session.id
          ]
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
            input.confidence
          ]
        );
      }
    },
    reviews: {
      async findLatestForTask(taskId, userId) {
        const result = await pool.query(
          `
            SELECT id FROM reviews
            WHERE task_id = $1 AND user_id = $2
            ORDER BY id DESC
            LIMIT 1
          `,
          [taskId, userId]
        );
        return mapRow(result);
      },
      async updateById(id, input) {
        await pool.query("UPDATE reviews SET due_date = $1, priority = $2, status = $3 WHERE id = $4", [
          input.dueDate,
          input.priority,
          input.status,
          id
        ]);
      },
      async create(input) {
        await pool.query(
          "INSERT INTO reviews (user_id, task_id, due_date, priority, status) VALUES ($1, $2, $3, $4, $5)",
          [input.userId, input.taskId, input.dueDate, input.priority, input.status]
        );
      }
    },
    resources: {
      async getTaskResources(taskId, userId) {
        const result = await pool.query(
          `
            SELECT resources.title, resources.type, resources.reference, resources.notes, resources.source_kind
            FROM task_resources
            INNER JOIN resources ON resources.id = task_resources.resource_id
            WHERE task_resources.task_id = $1 AND task_resources.user_id = $2
            ORDER BY task_resources.id ASC
          `,
          [taskId, userId]
        );
        return result.rows;
      },
      async addSystemResource(taskId, goalId, userId, input) {
        await withTransaction(pool, async (client) => {
          const result = await client.query(
            `
              INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
              VALUES ($1, $2, $3, 'link', $4, NULL, 'system_suggested', $5)
              RETURNING id
            `,
            [userId, goalId, input.title, input.url, input.createdAt]
          );
          await client.query(
            "INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note) VALUES ($1, $2, $3, $4)",
            [userId, taskId, result.rows[0].id, "System-suggested learning resource"]
          );
        });
      }
    },
    quickActions: {
      async findByTaskAndAction(taskId, userId, action) {
        const result = await pool.query(
          `
            SELECT * FROM quick_actions
            WHERE task_id = $1 AND user_id = $2 AND action = $3
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
          `,
          [taskId, userId, action]
        );
        return mapRow(result);
      },
      async save(input) {
        const result = await pool.query(
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
            input.updatedAt
          ]
        );
        return result.rows[0];
      }
    },
    workspace: {
      async getWorkspaceData(user) {
        const [goals, tasks, events, notes, sessions, reviews, resources, task_resources, quick_actions] = await Promise.all([
          pool.query("SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC, id DESC", [user.id]),
          pool.query("SELECT * FROM tasks WHERE user_id = $1 ORDER BY id ASC", [user.id]),
          pool.query("SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY date ASC, id ASC", [user.id]),
          pool.query("SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC, id DESC", [user.id]),
          pool.query("SELECT * FROM study_sessions WHERE user_id = $1 ORDER BY started_at DESC, id DESC", [user.id]),
          pool.query("SELECT * FROM reviews WHERE user_id = $1 ORDER BY due_date ASC, id ASC", [user.id]),
          pool.query("SELECT * FROM resources WHERE user_id = $1 ORDER BY created_at ASC, id ASC", [user.id]),
          pool.query("SELECT * FROM task_resources WHERE user_id = $1 ORDER BY id ASC", [user.id]),
          pool.query("SELECT * FROM quick_actions WHERE user_id = $1 ORDER BY updated_at DESC, id DESC", [user.id])
        ]);
        return {
          user,
          goals: goals.rows,
          tasks: tasks.rows,
          events: events.rows,
          notes: notes.rows,
          sessions: sessions.rows,
          reviews: reviews.rows,
          resources: resources.rows,
          task_resources: task_resources.rows,
          quick_actions: quick_actions.rows
        };
      }
    },
    workflow: {
      async persistGeneratedWorkflow(input) {
        return withTransaction(pool, async (client) => {
          const goalResult = await client.query(
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
              input.resourceMode
            ]
          );
          const goalId = goalResult.rows[0].id;
          const storedResourceIds = [];
          for (const resource of input.resources) {
            const resourceResult = await client.query(
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
                input.createdAt
              ]
            );
            storedResourceIds.push(resourceResult.rows[0].id);
          }
          for (const [index, task] of input.tasks.entries()) {
            const taskResult = await client.query(
              `
                INSERT INTO tasks (user_id, goal_id, title, description, status, created_at, completed_at)
                VALUES ($1, $2, $3, $4, 'pending', $5, NULL)
                RETURNING id
              `,
              [input.userId, goalId, task.title, task.description, input.createdAt]
            );
            const taskId = taskResult.rows[0].id;
            await client.query(
              "INSERT INTO calendar_events (user_id, task_id, date, duration) VALUES ($1, $2, $3, $4)",
              [input.userId, taskId, input.scheduledEvents[index].date, input.scheduledEvents[index].duration]
            );
            if (storedResourceIds.length > 0) {
              const resourceId = storedResourceIds[index % storedResourceIds.length];
              await client.query(
                "INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note) VALUES ($1, $2, $3, $4)",
                [input.userId, taskId, resourceId, "Primary study anchor for this task"]
              );
            }
            for (const link of task.references) {
              const systemResourceResult = await client.query(
                `
                  INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
                  VALUES ($1, $2, $3, 'link', $4, NULL, 'system_suggested', $5)
                  RETURNING id
                `,
                [input.userId, goalId, link.title, link.url, input.createdAt]
              );
              await client.query(
                "INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note) VALUES ($1, $2, $3, $4)",
                [input.userId, taskId, systemResourceResult.rows[0].id, "System-suggested learning resource"]
              );
            }
          }
          await client.query(
            "INSERT INTO notes (user_id, topic, content, kind, created_at) VALUES ($1, $2, $3, $4, $5)",
            [input.userId, input.goal, input.planSummary, "plan", input.createdAt]
          );
          await client.query(
            "INSERT INTO notes (user_id, topic, content, kind, created_at) VALUES ($1, $2, $3, $4, $5)",
            [input.userId, `${input.goal} resources`, input.resourceNote, "note", input.createdAt]
          );
          return { goalId };
        });
      }
    },
    googleCalendar: {
      async getConnection(userId) {
        const result = await pool.query(
          "SELECT * FROM google_calendar_connections WHERE user_id = $1",
          [userId]
        );
        return mapRow(result);
      },
      async saveConnection(input) {
        const result = await pool.query(
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
            input.connectedAt
          ]
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
          [syncedAt, userId]
        );
      },
      async markConnectionError(userId, error) {
        await pool.query(
          `
            UPDATE google_calendar_connections
            SET status = 'error', last_error = $1
            WHERE user_id = $2
          `,
          [error, userId]
        );
      },
      async disconnect(userId) {
        await withTransaction(pool, async (client) => {
          await client.query("DELETE FROM google_calendar_connections WHERE user_id = $1", [userId]);
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
            [userId]
          );
        });
      },
      async createOAuthState(input) {
        await pool.query(
          `
            INSERT INTO google_oauth_states (user_id, state_hash, expires_at, consumed_at, created_at)
            VALUES ($1, $2, $3, NULL, $4)
          `,
          [input.userId, input.stateHash, input.expiresAt, input.createdAt]
        );
      },
      async consumeOAuthState(stateHash, consumedAt) {
        return withTransaction(pool, async (client) => {
          const result = await client.query(
            `
              SELECT user_id FROM google_oauth_states
              WHERE state_hash = $1
                AND consumed_at IS NULL
                AND expires_at > $2
              LIMIT 1
            `,
            [stateHash, consumedAt]
          );
          const state = mapRow(result);
          if (!state) {
            return null;
          }
          await client.query("UPDATE google_oauth_states SET consumed_at = $1 WHERE state_hash = $2", [
            consumedAt,
            stateHash
          ]);
          return { userId: state.user_id };
        });
      },
      async listSyncEvents(userId) {
        const result = await pool.query(
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
          [userId]
        );
        return result.rows;
      },
      async getSyncSummary(userId) {
        const result = await pool.query(
          `
            SELECT
              COUNT(*)::int AS total,
              SUM(CASE WHEN google_sync_status = 'synced' THEN 1 ELSE 0 END)::int AS synced,
              SUM(CASE WHEN google_sync_status = 'failed' THEN 1 ELSE 0 END)::int AS failed,
              SUM(CASE WHEN google_sync_status IS NULL OR google_sync_status = 'not_synced' THEN 1 ELSE 0 END)::int AS pending
            FROM calendar_events
            WHERE user_id = $1
          `,
          [userId]
        );
        const row = result.rows[0];
        return {
          total: Number(row.total ?? 0),
          synced: Number(row.synced ?? 0),
          failed: Number(row.failed ?? 0),
          pending: Number(row.pending ?? 0)
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
            input.userId
          ]
        );
      }
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
            input.updatedAt
          ]
        );
      },
      async appendEvent(input) {
        await pool.query(
          "INSERT INTO agent_run_events (id, run_id, level, message, payload_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [input.id, input.runId, input.level, input.message, input.payloadJson, input.createdAt]
        );
      },
      async updateRunStatus(input) {
        await pool.query(
          `
            UPDATE agent_runs
            SET status = $1, updated_at = $2, metadata_json = COALESCE($3, metadata_json)
            WHERE id = $4
          `,
          [input.status, input.updatedAt, input.metadataJson ?? null, input.runId]
        );
      }
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
            input.updatedAt
          ]
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
            input.createdAt
          ]
        );
      }
    }
  };
}

// server/repositories/sqlite/index.ts
function createSQLiteRepositories(db2) {
  const repositories = {
    authSessions: {
      async findUserByEmail(email) {
        return db2.prepare("SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?").get(email) ?? null;
      },
      async findUserIdByEmail(email) {
        const row = db2.prepare("SELECT id FROM users WHERE email = ?").get(email);
        return row?.id ?? null;
      },
      async createUser(input) {
        db2.prepare(
          "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(input.id, input.name, input.email, input.passwordHash, input.createdAt);
        return {
          id: input.id,
          name: input.name,
          email: input.email,
          created_at: input.createdAt
        };
      },
      async createSession(input) {
        db2.prepare("INSERT INTO auth_sessions (token, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id").run(input.token, input.userId, input.createdAt);
      },
      async getUserByToken(token) {
        const found = db2.prepare(
          `
              SELECT users.id, users.name, users.email, users.created_at
              FROM auth_sessions
              INNER JOIN users ON users.id = auth_sessions.user_id
              WHERE auth_sessions.token = ?
            `
        ).get(token) ?? null;
        if (!found && (token === "demo_session_token_learning_progress_architect" || token.startsWith("demo_"))) {
          const { provisionDemoSession: provisionDemoSession2 } = await Promise.resolve().then(() => (init_demoService(), demoService_exports));
          const result = await provisionDemoSession2(repositories, { isGuest: false });
          return result.user;
        }
        return found;
      }
    },
    goals: {
      async getByIdForUser(goalId, userId) {
        return db2.prepare("SELECT * FROM goals WHERE id = ? AND user_id = ?").get(goalId, userId) ?? null;
      }
    },
    tasks: {
      async findByIdForUser(taskId, userId) {
        return db2.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId) ?? null;
      },
      async markInProgress(taskId, userId) {
        db2.prepare("UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?").run("in_progress", taskId, userId);
      },
      async markCompleted(taskId, userId, completedAt) {
        db2.prepare("UPDATE tasks SET status = ?, completed_at = ? WHERE id = ? AND user_id = ?").run("completed", completedAt, taskId, userId);
      },
      async resetToInProgress(taskId, userId) {
        db2.prepare("UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ? AND user_id = ?").run("in_progress", taskId, userId);
      }
    },
    sessions: {
      async findOpenByTask(taskId, userId) {
        return db2.prepare(
          `
                SELECT * FROM study_sessions
                WHERE task_id = ? AND user_id = ? AND completed_at IS NULL
                ORDER BY started_at DESC, id DESC
                LIMIT 1
              `
        ).get(taskId, userId) ?? null;
      },
      async createOpenSession(taskId, userId, startedAt) {
        const insertResult = db2.prepare(
          `
              INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
              VALUES (?, ?, ?, NULL, 0, NULL, NULL, NULL)
            `
        ).run(userId, taskId, startedAt);
        return db2.prepare("SELECT * FROM study_sessions WHERE id = ?").get(Number(insertResult.lastInsertRowid));
      },
      async completeTaskSession(input) {
        const existingOpenSession = db2.prepare(
          `
              SELECT * FROM study_sessions
              WHERE task_id = ? AND user_id = ? AND completed_at IS NULL
              ORDER BY started_at DESC, id DESC
              LIMIT 1
            `
        ).get(input.taskId, input.userId);
        if (!existingOpenSession) {
          throw new Error("No open session exists for this task.");
        }
        db2.prepare(
          `
            UPDATE study_sessions
            SET completed_at = ?, duration_seconds = ?, reflection = ?, confusion = ?, confidence = ?
            WHERE id = ?
          `
        ).run(
          input.completedAt,
          input.durationSeconds,
          input.reflection,
          input.confusion,
          input.confidence,
          existingOpenSession.id
        );
      },
      async createCompletedSession(input) {
        db2.prepare(
          `
            INSERT INTO study_sessions (user_id, task_id, started_at, completed_at, duration_seconds, reflection, confusion, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          input.userId,
          input.taskId,
          input.completedAt,
          input.completedAt,
          input.durationSeconds,
          input.reflection,
          input.confusion,
          input.confidence
        );
      }
    },
    reviews: {
      async findLatestForTask(taskId, userId) {
        return db2.prepare(
          `
                SELECT id FROM reviews
                WHERE task_id = ? AND user_id = ?
                ORDER BY id DESC
                LIMIT 1
              `
        ).get(taskId, userId) ?? null;
      },
      async updateById(id, input) {
        db2.prepare("UPDATE reviews SET due_date = ?, priority = ?, status = ? WHERE id = ?").run(input.dueDate, input.priority, input.status, id);
      },
      async create(input) {
        db2.prepare(
          `
            INSERT INTO reviews (user_id, task_id, due_date, priority, status)
            VALUES (?, ?, ?, ?, ?)
          `
        ).run(input.userId, input.taskId, input.dueDate, input.priority, input.status);
      }
    },
    resources: {
      async getTaskResources(taskId, userId) {
        return db2.prepare(
          `
              SELECT resources.title, resources.type, resources.reference, resources.notes, resources.source_kind
              FROM task_resources
              INNER JOIN resources ON resources.id = task_resources.resource_id
              WHERE task_resources.task_id = ? AND task_resources.user_id = ?
              ORDER BY task_resources.id ASC
            `
        ).all(taskId, userId);
      },
      async addSystemResource(taskId, goalId, userId, input) {
        const tx = db2.transaction(() => {
          const insertResource = db2.prepare(
            `
              INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
              VALUES (?, ?, ?, 'link', ?, NULL, 'system_suggested', ?)
            `
          );
          const result = insertResource.run(userId, goalId, input.title, input.url, input.createdAt);
          const resourceId = Number(result.lastInsertRowid);
          db2.prepare(
            "INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note) VALUES (?, ?, ?, ?)"
          ).run(userId, taskId, resourceId, "System-suggested learning resource");
        });
        tx();
      }
    },
    quickActions: {
      async findByTaskAndAction(taskId, userId, action) {
        return db2.prepare(
          `
                SELECT * FROM quick_actions
                WHERE task_id = ? AND user_id = ? AND action = ?
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
              `
        ).get(taskId, userId, action) ?? null;
      },
      async save(input) {
        db2.prepare(
          `
            INSERT INTO quick_actions (user_id, task_id, action, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, task_id, action) DO UPDATE SET
              content = excluded.content,
              updated_at = excluded.updated_at
          `
        ).run(
          input.userId,
          input.taskId,
          input.action,
          input.content,
          input.createdAt,
          input.updatedAt
        );
        return db2.prepare(
          `
              SELECT * FROM quick_actions
              WHERE task_id = ? AND user_id = ? AND action = ?
              ORDER BY updated_at DESC, id DESC
              LIMIT 1
            `
        ).get(input.taskId, input.userId, input.action);
      }
    },
    workspace: {
      async getWorkspaceData(user) {
        const goals = db2.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(user.id);
        const tasks = db2.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY id ASC").all(user.id);
        const events = db2.prepare("SELECT * FROM calendar_events WHERE user_id = ? ORDER BY date ASC, id ASC").all(user.id);
        const notes = db2.prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(user.id);
        const sessions = db2.prepare("SELECT * FROM study_sessions WHERE user_id = ? ORDER BY started_at DESC, id DESC").all(user.id);
        const reviews = db2.prepare("SELECT * FROM reviews WHERE user_id = ? ORDER BY due_date ASC, id ASC").all(user.id);
        const resources = db2.prepare("SELECT * FROM resources WHERE user_id = ? ORDER BY created_at ASC, id ASC").all(user.id);
        const task_resources = db2.prepare("SELECT * FROM task_resources WHERE user_id = ? ORDER BY id ASC").all(user.id);
        const quick_actions = db2.prepare("SELECT * FROM quick_actions WHERE user_id = ? ORDER BY updated_at DESC, id DESC").all(user.id);
        return { user, goals, tasks, events, notes, sessions, reviews, resources, task_resources, quick_actions };
      }
    },
    workflow: {
      async persistGeneratedWorkflow(input) {
        const insertGoal = db2.prepare(
          `
            INSERT INTO goals (user_id, title, level, hours, target_date, preferred_style, status, created_at, resource_mode)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
          `
        );
        const insertTask = db2.prepare(
          `
            INSERT INTO tasks (user_id, goal_id, title, description, status, created_at, completed_at)
            VALUES (?, ?, ?, ?, 'pending', ?, NULL)
          `
        );
        const insertEvent = db2.prepare(
          "INSERT INTO calendar_events (user_id, task_id, date, duration) VALUES (?, ?, ?, ?)"
        );
        const insertResource = db2.prepare(
          `
            INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'user_supplied', ?)
          `
        );
        const insertSystemResource = db2.prepare(
          `
            INSERT INTO resources (user_id, goal_id, title, type, reference, notes, source_kind, created_at)
            VALUES (?, ?, ?, 'link', ?, ?, 'system_suggested', ?)
          `
        );
        const insertTaskResource = db2.prepare(
          `
            INSERT INTO task_resources (user_id, task_id, resource_id, relevance_note)
            VALUES (?, ?, ?, ?)
          `
        );
        const insertNote = db2.prepare(
          `
            INSERT INTO notes (user_id, topic, content, kind, created_at)
            VALUES (?, ?, ?, ?, ?)
          `
        );
        const tx = db2.transaction(() => {
          const goalInsert = insertGoal.run(
            input.userId,
            input.goal,
            input.level,
            input.hours,
            input.targetDate,
            input.preferredStyle,
            input.createdAt,
            input.resourceMode
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
              input.createdAt
            );
            return Number(result.lastInsertRowid);
          });
          input.tasks.forEach((task, index) => {
            const taskInsert = insertTask.run(
              input.userId,
              goalId,
              task.title,
              task.description,
              input.createdAt
            );
            const taskId = Number(taskInsert.lastInsertRowid);
            insertEvent.run(
              input.userId,
              taskId,
              input.scheduledEvents[index].date,
              input.scheduledEvents[index].duration
            );
            if (storedResourceIds.length > 0) {
              const resourceId = storedResourceIds[index % storedResourceIds.length];
              insertTaskResource.run(input.userId, taskId, resourceId, "Primary study anchor for this task");
            }
            for (const link of task.references) {
              const note = [link.snippet ?? null, link.source ? `Source: ${link.source}` : null].filter(Boolean).join(" \u2014 ") || null;
              const sysInsert = insertSystemResource.run(
                input.userId,
                goalId,
                link.title,
                link.url,
                note,
                input.createdAt
              );
              const sysResourceId = Number(sysInsert.lastInsertRowid);
              insertTaskResource.run(input.userId, taskId, sysResourceId, "System-suggested learning resource");
            }
          });
          insertNote.run(input.userId, input.goal, input.planSummary, "plan", input.createdAt);
          insertNote.run(input.userId, `${input.goal} resources`, input.resourceNote, "note", input.createdAt);
          return goalId;
        });
        return { goalId: tx() };
      }
    },
    googleCalendar: {
      async getConnection(userId) {
        return db2.prepare("SELECT * FROM google_calendar_connections WHERE user_id = ?").get(userId) ?? null;
      },
      async saveConnection(input) {
        db2.prepare(
          `
            INSERT INTO google_calendar_connections (
              user_id, encrypted_refresh_token, calendar_id, granted_scopes, status, connected_at, last_synced_at, last_error
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
            ON CONFLICT(user_id) DO UPDATE SET
              encrypted_refresh_token = excluded.encrypted_refresh_token,
              calendar_id = excluded.calendar_id,
              granted_scopes = excluded.granted_scopes,
              status = excluded.status,
              connected_at = excluded.connected_at,
              last_synced_at = NULL,
              last_error = NULL
          `
        ).run(
          input.userId,
          input.encryptedRefreshToken,
          input.calendarId,
          input.grantedScopes,
          input.status,
          input.connectedAt
        );
        return db2.prepare("SELECT * FROM google_calendar_connections WHERE user_id = ?").get(input.userId);
      },
      async markConnectionSynced(userId, syncedAt) {
        db2.prepare(
          `
            UPDATE google_calendar_connections
            SET status = 'connected', last_synced_at = ?, last_error = NULL
            WHERE user_id = ?
          `
        ).run(syncedAt, userId);
      },
      async markConnectionError(userId, error) {
        db2.prepare(
          `
            UPDATE google_calendar_connections
            SET status = 'error', last_error = ?
            WHERE user_id = ?
          `
        ).run(error, userId);
      },
      async disconnect(userId) {
        const tx = db2.transaction(() => {
          db2.prepare("DELETE FROM google_calendar_connections WHERE user_id = ?").run(userId);
          db2.prepare(
            `
              UPDATE calendar_events
              SET google_calendar_id = NULL,
                  google_event_id = NULL,
                  google_sync_status = 'not_synced',
                  google_synced_at = NULL,
                  google_sync_error = NULL
              WHERE user_id = ?
            `
          ).run(userId);
        });
        tx();
      },
      async createOAuthState(input) {
        db2.prepare(
          `
            INSERT INTO google_oauth_states (user_id, state_hash, expires_at, consumed_at, created_at)
            VALUES (?, ?, ?, NULL, ?)
          `
        ).run(input.userId, input.stateHash, input.expiresAt, input.createdAt);
      },
      async consumeOAuthState(stateHash, consumedAt) {
        const tx = db2.transaction(() => {
          const state = db2.prepare(
            `
                SELECT user_id FROM google_oauth_states
                WHERE state_hash = ?
                  AND consumed_at IS NULL
                  AND expires_at > ?
                LIMIT 1
              `
          ).get(stateHash, consumedAt);
          if (!state) {
            return null;
          }
          db2.prepare("UPDATE google_oauth_states SET consumed_at = ? WHERE state_hash = ?").run(consumedAt, stateHash);
          return { userId: state.user_id };
        });
        return tx();
      },
      async listSyncEvents(userId) {
        return db2.prepare(
          `
              SELECT
                calendar_events.*,
                tasks.title AS task_title,
                tasks.description AS task_description,
                goals.title AS goal_title
              FROM calendar_events
              INNER JOIN tasks ON tasks.id = calendar_events.task_id AND tasks.user_id = calendar_events.user_id
              LEFT JOIN goals ON goals.id = tasks.goal_id AND goals.user_id = calendar_events.user_id
              WHERE calendar_events.user_id = ?
              ORDER BY calendar_events.date ASC, calendar_events.id ASC
            `
        ).all(userId);
      },
      async getSyncSummary(userId) {
        const row = db2.prepare(
          `
              SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN google_sync_status = 'synced' THEN 1 ELSE 0 END) AS synced,
                SUM(CASE WHEN google_sync_status = 'failed' THEN 1 ELSE 0 END) AS failed,
                SUM(CASE WHEN google_sync_status IS NULL OR google_sync_status = 'not_synced' THEN 1 ELSE 0 END) AS pending
              FROM calendar_events
              WHERE user_id = ?
            `
        ).get(userId);
        return {
          total: Number(row.total ?? 0),
          synced: Number(row.synced ?? 0),
          failed: Number(row.failed ?? 0),
          pending: Number(row.pending ?? 0)
        };
      },
      async updateEventSync(input) {
        db2.prepare(
          `
            UPDATE calendar_events
            SET google_calendar_id = ?,
                google_event_id = ?,
                google_sync_status = ?,
                google_synced_at = ?,
                google_sync_error = ?
            WHERE id = ? AND user_id = ?
          `
        ).run(
          input.googleCalendarId,
          input.googleEventId,
          input.googleSyncStatus,
          input.googleSyncedAt,
          input.googleSyncError,
          input.eventId,
          input.userId
        );
      }
    },
    agentRuns: {
      async createRun(input) {
        db2.prepare(
          `
            INSERT INTO agent_runs (id, user_id, kind, provider, status, request_id, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          input.id,
          input.userId,
          input.kind,
          input.provider,
          input.status,
          input.requestId,
          input.metadataJson,
          input.createdAt,
          input.updatedAt
        );
      },
      async appendEvent(input) {
        db2.prepare(
          `
            INSERT INTO agent_run_events (id, run_id, level, message, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `
        ).run(input.id, input.runId, input.level, input.message, input.payloadJson, input.createdAt);
      },
      async updateRunStatus(input) {
        db2.prepare(
          `
            UPDATE agent_runs
            SET status = ?, updated_at = ?, metadata_json = COALESCE(?, metadata_json)
            WHERE id = ?
          `
        ).run(input.status, input.updatedAt, input.metadataJson ?? null, input.runId);
      }
    },
    retrieval: {
      async saveSource(input) {
        db2.prepare(
          `
            INSERT INTO retrieval_sources (id, user_id, source_type, source_id, content, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              content = excluded.content,
              metadata_json = excluded.metadata_json,
              updated_at = excluded.updated_at
          `
        ).run(
          input.id,
          input.userId,
          input.sourceType,
          input.sourceId,
          input.content,
          input.metadataJson,
          input.createdAt,
          input.updatedAt
        );
      },
      async saveEmbedding(input) {
        db2.prepare(
          `
            INSERT INTO document_embeddings (id, retrieval_source_id, provider, embedding_model, embedding, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              embedding = excluded.embedding
          `
        ).run(
          input.id,
          input.retrievalSourceId,
          input.provider,
          input.embeddingModel,
          input.embedding,
          input.createdAt
        );
      }
    }
  };
  return repositories;
}

// server/services/agentRuntime.ts
import crypto2 from "crypto";
init_date();

// server/services/syllabusService.ts
init_date();
import { GoogleGenAI, Type } from "@google/genai";
var ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
function buildFallbackPlan(goal, level, preferredStyle, resources = [], resourceMode = "needs_plan", locale) {
  const styleLabel = preferredStyle ? ` using a ${preferredStyle.toLowerCase()} approach` : "";
  const resourceHint = resourceMode === "has_materials" && resources.length > 0 ? ` Anchor the work around materials like ${resources.slice(0, 2).map((resource) => resource.title).join(" and ")}.` : " Start with a lightweight plan and gather one strong reference per task.";
  const tasks = [
    {
      title: `Foundations of ${goal}`,
      description: `Build the mental model, vocabulary, and first principles for ${goal} at a ${level.toLowerCase()} level${styleLabel}.${resourceHint}`
    },
    {
      title: `Guided practice for ${goal}`,
      description: resourceMode === "has_materials" && resources.length > 0 ? `Work through focused exercises using your provided materials to turn the core ideas of ${goal} into repeatable habits.` : `Work through focused exercises that turn the core ideas of ${goal} into repeatable habits, and identify the best kind of resource to deepen each area.`
    },
    {
      title: `Applied project for ${goal}`,
      description: `Ship one practical outcome that proves you can apply ${goal} beyond tutorials and passive study.`
    }
  ];
  return tasks.map((task) => ({
    ...task,
    searchQuery: `${goal} ${task.title} tutorial documentation`
  }));
}
async function planSyllabusTasks(goal, level, preferredStyle, resources = [], resourceMode = "needs_plan", locale) {
  if (!ai) {
    return buildFallbackPlan(goal, level, preferredStyle, resources, resourceMode, locale);
  }
  try {
    const resourceContext = resourceMode === "has_materials" && resources.length > 0 ? `
        Use these learner-provided materials as primary planning anchors:
        ${resources.map(
      (resource, index) => `${index + 1}. [${resource.type}] ${resource.title}${resource.reference ? ` | ${resource.reference}` : ""}${resource.notes ? ` | Notes: ${resource.notes}` : ""}`
    ).join("\n")}
      ` : `
        The learner does not have materials yet.
        Generate a roadmap that acts like a starter curriculum and make each task self-starting.
      `;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a curriculum planner. Your job is to break a learning goal into exactly 3 actionable study tasks and provide one targeted search query per task optimised for finding authoritative learning sources (official documentation, reputable tutorials, or books).
        Goal: "${goal}"
        Level: "${level}"
        Preferred style: "${preferredStyle ?? "mixed"}"
        Resource mode: "${resourceMode}"
        ${resourceContext}
        Each task description should either reference the learner materials or explain how to begin without them.
        For each task, also produce a concise searchQuery string a learner would type into a search engine to find the best documentation or tutorial for that task.
        ${locale === "id" ? "CRITICAL INSTRUCTION: You MUST generate the task title and description entirely in Indonesian language. Only the searchQuery should remain in English if it helps find better technical resources." : ""}
        Return only JSON.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              searchQuery: { type: Type.STRING }
            },
            required: ["title", "description", "searchQuery"]
          }
        }
      }
    });
    const parsed = JSON.parse(response.text || "[]");
    if (parsed.length >= 3) {
      return parsed.slice(0, 3);
    }
  } catch (error) {
    console.error("Falling back to local syllabus generation.", error);
  }
  return buildFallbackPlan(goal, level, preferredStyle, resources, resourceMode);
}
function buildEventSchedule(taskCount, weeklyHours) {
  const start = addDays(/* @__PURE__ */ new Date(), 1);
  start.setHours(19, 0, 0, 0);
  const gap = Math.max(1, Math.floor(7 / Math.max(taskCount, 1)));
  const duration = Math.max(30, Math.min(120, Math.round(weeklyHours * 60 / Math.max(taskCount, 1))));
  return Array.from({ length: taskCount }, (_, index) => ({
    date: addDays(start, index * gap).toISOString(),
    duration
  }));
}
function buildPlanSummary(goal, level, hours, syllabus, resourceMode, resources) {
  const lines = syllabus.map((item, index) => `${index + 1}. ${item.title}: ${item.description}`);
  const resourceSection = resourceMode === "has_materials" && resources.length > 0 ? [
    "Planning mode: learner-provided materials",
    "Resources:",
    ...resources.map(
      (resource, index) => `- ${index + 1}. ${resource.title} [${resource.type}]${resource.reference ? ` | ${resource.reference}` : ""}`
    )
  ] : [
    "Planning mode: generated starting plan",
    "Recommended resource types to gather next:",
    "- One primary reference (documentation, book chapter, or course module)",
    "- One practice-oriented resource (exercise, sandbox, or project prompt)",
    "- One reinforcement resource (article, recap note, or worked example)"
  ];
  return [
    `Goal: ${goal}`,
    `Level: ${level}`,
    `Weekly hours: ${hours}`,
    ...resourceSection,
    ...lines
  ].join("\n");
}
function buildResourceNote(goal, resourceMode, resources) {
  if (resourceMode === "has_materials" && resources.length > 0) {
    return [
      `Resource posture for ${goal}: learner-supplied materials`,
      ...resources.map(
        (resource, index) => `${index + 1}. ${resource.title} [${resource.type}]${resource.reference ? ` | ${resource.reference}` : ""}`
      )
    ].join("\n");
  }
  return [
    `Resource posture for ${goal}: start-from-zero plan`,
    "Next best resource types:",
    "1. A trusted primary reference",
    "2. A practice environment or exercise source",
    "3. A concise recap or example-based explanation"
  ].join("\n");
}

// server/services/searchService.ts
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";
var ai2 = process.env.GEMINI_API_KEY ? new GoogleGenAI2({ apiKey: process.env.GEMINI_API_KEY }) : null;
function extractHostname(uri) {
  try {
    return new URL(uri).hostname;
  } catch {
    return void 0;
  }
}
function isHomepageRoot(uri) {
  try {
    const url = new URL(uri);
    return url.pathname === "/" || url.pathname === "";
  } catch {
    return false;
  }
}
async function searchLearningResources(input) {
  if (!ai2) {
    return [];
  }
  try {
    const response = await ai2.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Find authoritative learning resources for: ${input.query}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seen = /* @__PURE__ */ new Set();
    const links = [];
    for (const chunk of chunks) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title;
      if (!uri || !title) continue;
      if (isHomepageRoot(uri)) continue;
      if (seen.has(uri)) continue;
      seen.add(uri);
      links.push({
        title,
        url: uri,
        source: extractHostname(uri)
      });
    }
    return links.slice(0, input.maxResults ?? 3);
  } catch {
    return [];
  }
}

// server/services/workflowAgentService.ts
async function generateWorkflowPlan(input) {
  const { goal, level, preferredStyle, resourceMode, resources, locale } = input;
  let plannedTasks;
  try {
    plannedTasks = await planSyllabusTasks(
      goal,
      level,
      preferredStyle ?? void 0,
      resources,
      resourceMode,
      locale
    );
  } catch {
    plannedTasks = buildFallbackPlan(goal, level, preferredStyle ?? void 0, resources, resourceMode, locale);
  }
  const searchResults = await Promise.all(
    plannedTasks.map(
      (task) => searchLearningResources({ query: task.searchQuery, maxResults: 3 })
    )
  );
  return plannedTasks.map((task, index) => ({
    title: task.title,
    description: task.description,
    searchQuery: task.searchQuery,
    references: searchResults[index]
  }));
}

// server/services/planners/legacyWorkflowPlanner.ts
var legacyWorkflowPlanner = {
  async plan(input) {
    return generateWorkflowPlan(input);
  }
};

// server/services/planners/adkWorkflowPlanner.ts
var ADK_TIMEOUT_MS = 3e4;
var adkWorkflowPlanner = {
  async plan(input, context) {
    const response = await fetch(`${requireAdkServiceUrl()}/workflow/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getInternalServiceHeaders()
      },
      body: JSON.stringify({
        input,
        context: {
          user: context.user,
          requestId: context.requestId
        }
      }),
      signal: AbortSignal.timeout(ADK_TIMEOUT_MS)
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`ADK workflow planner returned ${response.status}: ${body.slice(0, 200)}`);
    }
    return response.json();
  }
};

// server/services/quickActionService.ts
import { GoogleGenAI as GoogleGenAI3 } from "@google/genai";
var ai3 = process.env.GEMINI_API_KEY ? new GoogleGenAI3({ apiKey: process.env.GEMINI_API_KEY }) : null;
var QUICK_ACTION_SYSTEM_INSTRUCTION = [
  "You are a study assistant helping a learner understand one specific task in their active study session.",
  "Stay tightly scoped to the provided task and goal context.",
  "Return plain study-ready text only.",
  "Do not add preambles, disclaimers, or mention missing hidden context."
].join(" ");
var QUICK_ACTION_OUTPUT_INSTRUCTION = [
  "Write a concise but useful response for direct study use.",
  "Use short paragraphs or simple lists when helpful.",
  "Do not output JSON, XML, markdown code fences, or role labels."
].join(" ");
var MIN_COMPLETE_QUICK_ACTION_WORDS = 55;
var QUICK_ACTION_KINDS = ["explain", "example", "analogy", "confused"];
var QUICK_ACTION_PROMPTS = {
  explain: "Explain [Concept] simply. Focus strictly on two things: 1. A high-level summary of what I am actually learning here, and 2. The specific objective or problem this solves. Skip the technical 'how-to' for now-just give me the 'what' and the 'why'.",
  example: "Provide a real-world case study for [Concept]. Focus on: 1. A specific industry or type of company that uses it, 2. The exact workflow or implementation details, and 3. The business impact (time saved, money earned, or errors prevented). Avoid generic examples-show me how a professional actually uses this in their daily work.",
  analogy: "Give me a universal analogy for [Concept] that anyone-regardless of their technical background-can understand. Use a common daily activity (like grocery shopping, driving, or household chores) to illustrate how it works. Focus on making the invisible logic of the concept visible through this story.",
  confused: "I am lost on [Concept]. Please reset and explain the lesson material to me as if I am a 5-year-old. Break it down into tiny, simple steps. Use 'first, then, finally' logic, and tell me a story where I am the main character interacting with this concept. No big words allowed."
};
var QuickActionGenerationError = class extends Error {
  constructor(message = "Our AI assistant is temporarily unavailable to generate quick actions. Please try again in a moment.") {
    super(message);
    this.name = "QuickActionGenerationError";
  }
};
function isQuickActionKind(value) {
  return QUICK_ACTION_KINDS.includes(value);
}
function formatResource(resource, index) {
  const details = [
    `[${resource.source_kind}] ${resource.title}`,
    `type: ${resource.type}`,
    resource.reference ? `reference: ${resource.reference}` : null,
    resource.notes ? `notes: ${resource.notes}` : null
  ].filter(Boolean);
  return `${index + 1}. ${details.join(" | ")}`;
}
function buildQuickActionContextBlock(context) {
  const lines = [
    `Goal: ${context.goalTitle ?? "Not provided"}`,
    `Task title: ${context.taskTitle}`,
    `Task description: ${context.taskDescription || "Not provided"}`,
    "Resources:"
  ];
  if (context.resources.length === 0) {
    lines.push("None attached");
    return lines.join("\n");
  }
  lines.push(...context.resources.map(formatResource));
  return lines.join("\n");
}
function buildQuickActionConcept(context) {
  return buildQuickActionContextBlock(context);
}
function getQuickActionPromptTemplate(action) {
  return QUICK_ACTION_PROMPTS[action];
}
function buildQuickActionPrompt(action, context) {
  const concept = buildQuickActionConcept(context);
  const promptTemplate = getQuickActionPromptTemplate(action).replace("[Concept]", concept);
  return [
    QUICK_ACTION_SYSTEM_INSTRUCTION,
    "",
    `Action request:
${promptTemplate}`,
    "",
    `Session context:
${buildQuickActionContextBlock(context)}`,
    "",
    QUICK_ACTION_OUTPUT_INSTRUCTION,
    context.locale === "id" ? "\nCRITICAL INSTRUCTION: You MUST generate the response entirely in Indonesian language." : ""
  ].filter(Boolean).join("\n");
}
function normalizeQuickActionContent(content) {
  return content.replace(/\r\n/g, "\n").replace(/^```[\w-]*\n?/g, "").replace(/\n?```$/g, "").trim();
}
function isIncompleteQuickActionContent(content, taskTitle) {
  const trimmed = content.trim();
  const normalized = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const knownWeakPatterns = [
    taskTitle ? `${taskTitle.toLowerCase()} is the concept for this step` : null,
    "imagine a real team using it in production",
    "well-organized kitchen",
    taskTitle ? `first, ${taskTitle.toLowerCase()} is the main idea you are learning` : null
  ].filter((pattern) => Boolean(pattern));
  const hasTerminalPunctuation = /[.!?]["']?$/.test(trimmed);
  const endsLikeFragment = /(?:[,;:]|(?:\s|^)(and|or|but|because|so|then|with|for|to|of|in|on|at|from|as|that|which|where|when|while|like|into|through|by|about|the|a|an))$/i.test(trimmed);
  return words.length < MIN_COMPLETE_QUICK_ACTION_WORDS || !hasTerminalPunctuation || endsLikeFragment || knownWeakPatterns.some((pattern) => normalized.includes(pattern));
}
async function generateQuickActionContent(input) {
  if (!ai3) {
    throw new QuickActionGenerationError("The AI assistant is not fully configured for this feature yet. Please check your setup or try again later.");
  }
  try {
    const response = await ai3.models.generateContent({
      model: "gemini-2.0-flash",
      contents: buildQuickActionPrompt(input.action, input.context)
    });
    const content = normalizeQuickActionContent(response.text || "");
    if (!content) {
      throw new QuickActionGenerationError("The AI assistant returned an empty response. Please try clicking generate again.");
    }
    return content;
  } catch (error) {
    if (error instanceof QuickActionGenerationError) {
      throw error;
    }
    throw new QuickActionGenerationError("Our AI assistant encountered an unexpected issue while preparing your quick action. Please try again.");
  }
}

// server/services/agents/legacyStudyCoach.ts
var legacyStudyCoach = {
  async generateQuickAction(input) {
    return {
      content: await generateQuickActionContent(input),
      source: "generated",
      updatedAt: null,
      persisted: false
    };
  }
};

// server/services/agents/adkStudyCoach.ts
var ADK_TIMEOUT_MS2 = 3e4;
var adkStudyCoach = {
  async generateQuickAction(input, context) {
    const response = await fetch(`${requireAdkServiceUrl()}/study-coach/quick-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getInternalServiceHeaders()
      },
      body: JSON.stringify({
        input,
        context: {
          user: context.user,
          task: context.task,
          requestId: context.requestId
        }
      }),
      signal: AbortSignal.timeout(ADK_TIMEOUT_MS2)
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`ADK study coach returned ${response.status}: ${body.slice(0, 200)}`);
    }
    const payload = await response.json();
    return {
      content: payload.content,
      source: payload.source ?? "generated",
      updatedAt: payload.updatedAt ?? null,
      persisted: payload.persisted ?? false
    };
  }
};

// server/services/agentRuntime.ts
function selectWorkflowPlanner(provider) {
  return provider === "adk" ? adkWorkflowPlanner : legacyWorkflowPlanner;
}
function selectStudyCoach(provider) {
  return provider === "adk" ? adkStudyCoach : legacyStudyCoach;
}
function createRequestId() {
  return crypto2.randomUUID();
}
function createAgentRuntime(repositories) {
  return {
    async planWorkflow(input, context) {
      const provider = env.agentProvider;
      const runId = crypto2.randomUUID();
      const timestamp = nowIso();
      await repositories.agentRuns.createRun({
        id: runId,
        userId: context.user.id,
        kind: "workflow",
        provider,
        status: "running",
        requestId: context.requestId,
        metadataJson: JSON.stringify({ goal: input.goal }),
        createdAt: timestamp,
        updatedAt: timestamp
      });
      try {
        let tasks;
        try {
          tasks = await selectWorkflowPlanner(provider).plan(input, context);
        } catch (error) {
          if (provider !== "adk") {
            throw error;
          }
          await repositories.agentRuns.appendEvent({
            id: crypto2.randomUUID(),
            runId,
            level: "warning",
            message: "ADK workflow planner failed. Falling back to legacy planner.",
            payloadJson: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            createdAt: nowIso()
          });
          tasks = await legacyWorkflowPlanner.plan(input, context);
        }
        await repositories.agentRuns.appendEvent({
          id: crypto2.randomUUID(),
          runId,
          level: "info",
          message: "Workflow planner completed successfully.",
          payloadJson: JSON.stringify({ taskCount: tasks.length }),
          createdAt: nowIso()
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: "completed",
          updatedAt: nowIso()
        });
        return tasks;
      } catch (error) {
        await repositories.agentRuns.appendEvent({
          id: crypto2.randomUUID(),
          runId,
          level: "error",
          message: error instanceof Error ? error.message : "Workflow planner failed.",
          payloadJson: null,
          createdAt: nowIso()
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: "failed",
          updatedAt: nowIso()
        });
        throw error;
      }
    },
    async generateQuickAction(input, context) {
      const provider = env.agentProvider;
      const runId = crypto2.randomUUID();
      const timestamp = nowIso();
      await repositories.agentRuns.createRun({
        id: runId,
        userId: context.user.id,
        kind: "quick_action",
        provider,
        status: "running",
        requestId: context.requestId,
        metadataJson: JSON.stringify({ taskId: context.task.id, action: input.action }),
        createdAt: timestamp,
        updatedAt: timestamp
      });
      try {
        let result;
        try {
          result = await selectStudyCoach(provider).generateQuickAction(input, context);
        } catch (error) {
          if (provider !== "adk") {
            throw error;
          }
          await repositories.agentRuns.appendEvent({
            id: crypto2.randomUUID(),
            runId,
            level: "warning",
            message: "ADK study coach failed. Falling back to legacy coach.",
            payloadJson: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            createdAt: nowIso()
          });
          result = await legacyStudyCoach.generateQuickAction(input, context);
        }
        await repositories.agentRuns.appendEvent({
          id: crypto2.randomUUID(),
          runId,
          level: "info",
          message: "Study coach generated quick action content.",
          payloadJson: JSON.stringify({ length: result.content.length, source: result.source }),
          createdAt: nowIso()
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: "completed",
          updatedAt: nowIso()
        });
        return result;
      } catch (error) {
        await repositories.agentRuns.appendEvent({
          id: crypto2.randomUUID(),
          runId,
          level: "error",
          message: error instanceof Error ? error.message : "Study coach failed.",
          payloadJson: null,
          createdAt: nowIso()
        });
        await repositories.agentRuns.updateRunStatus({
          runId,
          status: "failed",
          updatedAt: nowIso()
        });
        throw error;
      }
    }
  };
}

// server/appContext.ts
var appContext = null;
function shouldUseSsl(connectionString) {
  try {
    const url = new URL(connectionString);
    return url.searchParams.get("sslmode") !== "disable";
  } catch {
    return true;
  }
}
function createAlloyDbPoolConfig(connectionString) {
  return {
    connectionString,
    max: 10,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : void 0
  };
}
async function initializeAppContext() {
  if (appContext) {
    return appContext;
  }
  if (env.databaseProvider === "alloydb") {
    const pool = new Pool(createAlloyDbPoolConfig(requireDatabaseUrl()));
    await pool.query("SELECT 1");
    const repositories2 = createPostgresRepositories(pool);
    appContext = {
      repositories: repositories2,
      agents: createAgentRuntime(repositories2),
      postgresPool: pool
    };
    return appContext;
  }
  const { db: db2, migrateDatabase: migrateDatabase2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  migrateDatabase2();
  const repositories = createSQLiteRepositories(db2);
  appContext = {
    repositories,
    agents: createAgentRuntime(repositories),
    postgresPool: null
  };
  return appContext;
}
function getAppContext() {
  if (!appContext) {
    throw new Error("App context has not been initialized yet.");
  }
  return appContext;
}

// server/routes/auth.ts
import crypto4 from "crypto";
import { Router } from "express";

// server/utils/http.ts
function jsonError(res, status, error, code) {
  res.status(status).json({ error, code });
}

// server/routes/auth.ts
init_date();

// server/services/authService.ts
import crypto3 from "crypto";
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function hashPassword(password) {
  const salt = crypto3.randomBytes(16).toString("hex");
  const hash = crypto3.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) {
    return false;
  }
  const actualHash = crypto3.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  return expectedBuffer.length === actualHash.length && crypto3.timingSafeEqual(expectedBuffer, actualHash);
}
function createSessionToken() {
  return crypto3.randomUUID();
}

// server/routes/auth.ts
var authRouter = Router();
authRouter.post("/signup", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = normalizeEmail(String(req.body?.email ?? ""));
  const password = String(req.body?.password ?? "");
  if (!name || !email || password.length < 8) {
    jsonError(
      res,
      400,
      "Name, email, and a password of at least 8 characters are required.",
      "INVALID_AUTH_PAYLOAD"
    );
    return;
  }
  const { authSessions } = getAppContext().repositories;
  const existingUserId = await authSessions.findUserIdByEmail(email);
  if (existingUserId) {
    jsonError(res, 409, "An account with that email already exists.", "EMAIL_IN_USE");
    return;
  }
  const userId = crypto4.randomUUID();
  const createdAt = nowIso();
  const passwordHash = hashPassword(password);
  try {
    await authSessions.createUser({
      id: userId,
      name,
      email,
      passwordHash,
      createdAt
    });
  } catch (createError) {
    const message = createError instanceof Error ? createError.message : "";
    if (message.includes("UNIQUE") || message.includes("unique") || message.includes("duplicate key")) {
      jsonError(res, 409, "An account with that email already exists.", "EMAIL_IN_USE");
      return;
    }
    throw createError;
  }
  const token = createSessionToken();
  await authSessions.createSession({
    token,
    userId,
    createdAt
  });
  res.status(201).json({
    token,
    user: {
      id: userId,
      name,
      email,
      created_at: createdAt
    }
  });
});
authRouter.post("/login", async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ""));
  const password = String(req.body?.password ?? "");
  const { authSessions } = getAppContext().repositories;
  const user = await authSessions.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    jsonError(res, 401, "Incorrect email or password.", "INVALID_CREDENTIALS");
    return;
  }
  const token = createSessionToken();
  await authSessions.createSession({
    token,
    userId: user.id,
    createdAt: nowIso()
  });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    }
  });
});
authRouter.post("/demo", async (req, res) => {
  try {
    const { repositories } = getAppContext();
    const reset = req.body?.reset === true;
    const { importDemo } = await Promise.resolve().then(() => (init_demoService(), demoService_exports)).then((m) => ({
      importDemo: m.provisionDemoSession
    }));
    const result = await importDemo(repositories, { isGuest: false, reset });
    res.json(result);
  } catch (error) {
    console.error("Failed to provision demo session:", error);
    jsonError(res, 500, "Failed to start demo session.", "DEMO_SESSION_ERROR");
  }
});
authRouter.post("/guest", async (req, res) => {
  try {
    const { repositories } = getAppContext();
    const { importDemo } = await Promise.resolve().then(() => (init_demoService(), demoService_exports)).then((m) => ({
      importDemo: m.provisionDemoSession
    }));
    const result = await importDemo(repositories, { isGuest: true });
    res.json(result);
  } catch (error) {
    console.error("Failed to provision guest session:", error);
    jsonError(res, 500, "Failed to start guest session.", "GUEST_SESSION_ERROR");
  }
});

// server/routes/data.ts
import { Router as Router2 } from "express";

// server/middleware/auth.ts
function getBearerToken(req) {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}
async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }
  return getAppContext().repositories.authSessions.getUserByToken(token);
}
async function requireUser(req, res) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    jsonError(res, 401, "Your session has expired. Please sign in again.", "AUTH_REQUIRED");
    return null;
  }
  return user;
}

// server/routes/data.ts
var dataRouter = Router2();
dataRouter.get("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const snapshot = await getAppContext().repositories.workspace.getWorkspaceData(user);
  const taskTitleById = new Map(snapshot.tasks.map((task) => [task.id, task.title]));
  res.json({
    ...snapshot,
    quick_actions: snapshot.quick_actions.filter(
      (quickAction) => !isIncompleteQuickActionContent(
        quickAction.content,
        taskTitleById.get(quickAction.task_id)
      )
    )
  });
});

// server/routes/workflow.ts
import { Router as Router3 } from "express";

// server/utils/validation.ts
var VALID_RESOURCE_TYPES = /* @__PURE__ */ new Set([
  "link",
  "course",
  "book",
  "article",
  "documentation",
  "notes",
  "video",
  "other"
]);
function sanitizeResourceInput(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    const candidate = item;
    const title = String(candidate?.title ?? "").trim();
    const type = String(candidate?.type ?? "").trim();
    const reference = String(candidate?.reference ?? "").trim();
    const notes = String(candidate?.notes ?? "").trim();
    if (!title || !VALID_RESOURCE_TYPES.has(type)) {
      return null;
    }
    return {
      title,
      type,
      reference: reference || null,
      notes: notes || null
    };
  }).filter((item) => Boolean(item));
}
function normalizeResourceMode(raw) {
  return raw === "has_materials" ? "has_materials" : "needs_plan";
}

// server/services/workflowService.ts
init_date();
function buildStarterReferenceUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
function compactSentence(text, maxLength = 180) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}
function buildReferenceSnippet(task, variant) {
  const taskFocus = compactSentence(task.description, 160) || `Study the core idea behind ${task.title}.`;
  if (variant === "official") {
    return `Start here for the core concept and vocabulary. Focus on this task goal: ${taskFocus}`;
  }
  if (variant === "walkthrough") {
    return `Use this next to find a guided walkthrough you can follow step by step while working on "${task.title}".`;
  }
  return `Use this to find a worked example and compare how the concept becomes practical inside the current task.`;
}
function buildFallbackReferences(task) {
  return [
    {
      title: `${task.title} official docs search`,
      url: buildStarterReferenceUrl(`${task.searchQuery} official documentation`),
      snippet: buildReferenceSnippet(task, "official"),
      source: "google search"
    },
    {
      title: `${task.title} tutorial search`,
      url: buildStarterReferenceUrl(`${task.searchQuery} tutorial walkthrough`),
      snippet: buildReferenceSnippet(task, "walkthrough"),
      source: "google search"
    },
    {
      title: `${task.title} example search`,
      url: buildStarterReferenceUrl(`${task.searchQuery} worked example`),
      snippet: buildReferenceSnippet(task, "example"),
      source: "google search"
    }
  ];
}
function hydrateTaskReferences(task, resourceMode) {
  if (task.references.length === 0 && resourceMode !== "has_materials") {
    return buildFallbackReferences(task);
  }
  return task.references.map((reference, index) => {
    if (reference.snippet?.trim()) {
      return reference;
    }
    const variant = index === 0 ? "official" : index === 1 ? "walkthrough" : "example";
    return {
      ...reference,
      snippet: buildReferenceSnippet(task, variant)
    };
  });
}
async function runWorkflow(repositories, planner, user, input) {
  const { goal, level, hours, targetDate, preferredStyle, resourceMode, resources, locale } = input;
  const createdAt = nowIso();
  const hydratedTasks = await planner.planWorkflow({
    goal,
    level,
    preferredStyle,
    resourceMode,
    resources,
    locale
  }, {
    user,
    requestId: createRequestId()
  });
  const tasksWithGuaranteedReferences = hydratedTasks.map((task) => {
    return {
      ...task,
      references: hydrateTaskReferences(task, resourceMode)
    };
  });
  const scheduledEvents = buildEventSchedule(tasksWithGuaranteedReferences.length, hours);
  return repositories.workflow.persistGeneratedWorkflow({
    userId: user.id,
    goal,
    level,
    hours,
    targetDate,
    preferredStyle,
    resourceMode,
    resources,
    tasks: tasksWithGuaranteedReferences.map((task) => ({
      title: task.title,
      description: task.description,
      references: task.references
    })),
    scheduledEvents,
    createdAt,
    planSummary: buildPlanSummary(goal, level, hours, tasksWithGuaranteedReferences, resourceMode, resources),
    resourceNote: buildResourceNote(goal, resourceMode, resources)
  });
}

// server/routes/workflow.ts
var workflowRouter = Router3();
workflowRouter.post("/", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  try {
    const goal = String(req.body?.goal ?? "").trim();
    const level = String(req.body?.level ?? "Intermediate").trim();
    const hours = Math.max(1, Number(req.body?.hours ?? 1));
    const targetDate = req.body?.targetDate ? String(req.body.targetDate) : null;
    const preferredStyle = req.body?.preferredStyle ? String(req.body.preferredStyle) : null;
    const resourceMode = normalizeResourceMode(req.body?.resourceMode);
    const resources = sanitizeResourceInput(req.body?.resources);
    const acceptLanguage = req.headers["accept-language"];
    const locale = typeof acceptLanguage === "string" && acceptLanguage.toLowerCase().startsWith("id") ? "id" : "en";
    if (!goal) {
      jsonError(res, 400, "A learning goal is required.", "GOAL_REQUIRED");
      return;
    }
    if (resourceMode === "has_materials" && resources.length === 0) {
      jsonError(
        res,
        400,
        "Add at least one resource or switch to the starting-plan mode.",
        "RESOURCES_REQUIRED"
      );
      return;
    }
    const appContext2 = getAppContext();
    const { goalId } = await runWorkflow(appContext2.repositories, appContext2.agents, user, {
      goal,
      level,
      hours,
      targetDate,
      preferredStyle,
      resourceMode,
      resources,
      locale
    });
    res.status(201).json({ success: true, goalId });
  } catch (error) {
    console.error(error);
    jsonError(res, 500, "Failed to generate a learning roadmap.", "WORKFLOW_GENERATION_FAILED");
  }
});

// server/routes/tasks.ts
import { Router as Router4 } from "express";
import crypto5 from "crypto";
init_date();

// server/services/reviewService.ts
function getReviewSchedule(confidence) {
  if (confidence === null || confidence <= 2) {
    return { daysUntilReview: 2, priority: "high" };
  }
  if (confidence === 3) {
    return { daysUntilReview: 4, priority: "medium" };
  }
  return { daysUntilReview: 7, priority: "low" };
}

// server/routes/tasks.ts
var tasksRouter = Router4();
tasksRouter.post("/:taskId/start", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const taskId = Number(req.params.taskId);
  const { tasks, sessions } = getAppContext().repositories;
  const task = await tasks.findByIdForUser(taskId, user.id);
  if (!task) {
    jsonError(res, 404, "Task not found.", "TASK_NOT_FOUND");
    return;
  }
  let session = await sessions.findOpenByTask(taskId, user.id);
  if (!session) {
    session = await sessions.createOpenSession(taskId, user.id, nowIso());
  }
  if (task.status === "pending") {
    await tasks.markInProgress(taskId, user.id);
  }
  res.json({ session });
});
tasksRouter.post("/:taskId/complete", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const taskId = Number(req.params.taskId);
  const { tasks, sessions, reviews } = getAppContext().repositories;
  const task = await tasks.findByIdForUser(taskId, user.id);
  if (!task) {
    jsonError(res, 404, "Task not found.", "TASK_NOT_FOUND");
    return;
  }
  const reflection = String(req.body?.reflection ?? "").trim();
  const confusion = String(req.body?.confusion ?? "").trim();
  const confidence = req.body?.confidence === null || req.body?.confidence === void 0 ? null : Math.max(1, Math.min(5, Number(req.body.confidence)));
  const durationSeconds = Math.max(0, Number(req.body?.durationSeconds ?? 0));
  const completedAt = nowIso();
  const existingOpenSession = await sessions.findOpenByTask(taskId, user.id);
  if (existingOpenSession) {
    await sessions.completeTaskSession({
      userId: user.id,
      taskId,
      reflection: reflection || null,
      confusion: confusion || null,
      confidence,
      durationSeconds,
      completedAt
    });
  } else {
    await sessions.createCompletedSession({
      userId: user.id,
      taskId,
      reflection: reflection || null,
      confusion: confusion || null,
      confidence,
      durationSeconds,
      completedAt
    });
  }
  await tasks.markCompleted(taskId, user.id, completedAt);
  const { daysUntilReview, priority } = getReviewSchedule(confidence);
  const dueDate = addDays(/* @__PURE__ */ new Date(), daysUntilReview).toISOString();
  const existingReview = await reviews.findLatestForTask(taskId, user.id);
  if (existingReview) {
    await reviews.updateById(existingReview.id, {
      userId: user.id,
      taskId,
      dueDate,
      priority,
      status: "pending"
    });
  } else {
    await reviews.create({
      userId: user.id,
      taskId,
      dueDate,
      priority,
      status: "pending"
    });
  }
  res.json({ success: true });
});
tasksRouter.post("/:taskId/materials/generate", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const taskId = Number(req.params.taskId);
  const appContext2 = getAppContext();
  const { tasks, resources } = appContext2.repositories;
  const task = await tasks.findByIdForUser(taskId, user.id);
  if (!task) {
    jsonError(res, 404, "Task not found.", "TASK_NOT_FOUND");
    return;
  }
  try {
    const searchLinks = await searchLearningResources({
      query: `${task.title} tutorial documentation guide`,
      maxResults: 3
    });
    const timestamp = nowIso();
    for (const link of searchLinks) {
      await resources.addSystemResource(taskId, task.goal_id, user.id, {
        title: link.title,
        url: link.url,
        createdAt: timestamp
      });
    }
    res.json({ success: true, count: searchLinks.length });
  } catch (error) {
    console.error("Material generation failed.", error);
    jsonError(res, 500, "Our AI assistant encountered an issue while finding materials. Please try again.", "MATERIAL_GENERATION_FAILED");
  }
});
tasksRouter.post("/:taskId/relearn", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const taskId = Number(req.params.taskId);
  const { tasks } = getAppContext().repositories;
  const task = await tasks.findByIdForUser(taskId, user.id);
  if (!task) {
    jsonError(res, 404, "Task not found.", "TASK_NOT_FOUND");
    return;
  }
  if (task.status !== "completed") {
    jsonError(res, 400, "Task must be completed to relearn.", "TASK_NOT_COMPLETED");
    return;
  }
  await tasks.resetToInProgress(taskId, user.id);
  res.json({ success: true });
});
tasksRouter.post("/:taskId/quick-action", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const taskId = Number(req.params.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    jsonError(res, 400, "Task id must be a positive integer.", "INVALID_TASK_ID");
    return;
  }
  const action = String(req.body?.action ?? "").trim();
  if (!isQuickActionKind(action)) {
    jsonError(res, 400, "Quick action type is invalid.", "INVALID_QUICK_ACTION");
    return;
  }
  try {
    const appContext2 = getAppContext();
    const { tasks, goals, resources, quickActions, retrieval } = appContext2.repositories;
    const task = await tasks.findByIdForUser(taskId, user.id);
    if (!task) {
      jsonError(res, 404, "Task not found.", "TASK_NOT_FOUND");
      return;
    }
    const cachedRow = await quickActions.findByTaskAndAction(taskId, user.id, action);
    if (cachedRow && !isIncompleteQuickActionContent(cachedRow.content, task.title)) {
      res.json({
        action: cachedRow.action,
        content: cachedRow.content,
        source: "cache",
        updatedAt: cachedRow.updated_at
      });
      return;
    }
    const goal = await goals.getByIdForUser(task.goal_id, user.id);
    const taskResources = await resources.getTaskResources(taskId, user.id);
    const acceptLanguage = req.headers["accept-language"];
    const locale = typeof acceptLanguage === "string" && acceptLanguage.toLowerCase().startsWith("id") ? "id" : "en";
    const quickActionResult = await appContext2.agents.generateQuickAction({
      action,
      context: {
        taskTitle: task.title,
        taskDescription: task.description,
        goalTitle: goal?.title ?? null,
        resources: taskResources,
        locale
      }
    }, {
      user,
      task,
      requestId: createRequestId()
    });
    let updatedAt = quickActionResult.updatedAt;
    if (!quickActionResult.persisted) {
      const timestamp = nowIso();
      const storedRow = await quickActions.save({
        userId: user.id,
        taskId,
        action,
        content: quickActionResult.content,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await retrieval.saveSource({
        id: crypto5.randomUUID(),
        userId: user.id,
        sourceType: "quick_action",
        sourceId: String(storedRow.id),
        content: quickActionResult.content,
        metadataJson: JSON.stringify({
          taskId,
          action,
          goalId: task.goal_id
        }),
        createdAt: timestamp,
        updatedAt: timestamp
      });
      updatedAt = storedRow.updated_at;
    }
    res.json({
      action,
      content: quickActionResult.content,
      source: quickActionResult.source,
      updatedAt
    });
  } catch (error) {
    if (error instanceof QuickActionGenerationError) {
      jsonError(res, 503, error.message, "QUICK_ACTION_UNAVAILABLE");
      return;
    }
    console.error("Quick action request failed.", error);
    jsonError(res, 500, "Our AI assistant encountered an unexpected issue while preparing your quick action. Please try again.", "QUICK_ACTION_FAILED");
  }
});

// server/routes/internalMcp.ts
import crypto6 from "crypto";
import { Router as Router5 } from "express";

// server/middleware/internal.ts
var INTERNAL_TOKEN_HEADER = "x-internal-service-token";
function getInternalServiceTokenHeader(req) {
  return String(req.header(INTERNAL_TOKEN_HEADER) ?? "").trim();
}
function requireInternalService(req, res, next) {
  if (!env.internalServiceToken) {
    jsonError(res, 503, "Internal service authentication is not configured.", "INTERNAL_SERVICE_DISABLED");
    return;
  }
  if (getInternalServiceTokenHeader(req) !== env.internalServiceToken) {
    jsonError(res, 401, "Internal service authentication failed.", "INTERNAL_SERVICE_AUTH_FAILED");
    return;
  }
  next();
}

// server/routes/internalMcp.ts
init_date();
var internalMcpRouter = Router5();
internalMcpRouter.use(requireInternalService);
internalMcpRouter.post("/workspace", async (req, res) => {
  const userId = String(req.body?.userId ?? "").trim();
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim();
  const createdAt = String(req.body?.createdAt ?? "").trim();
  if (!userId || !name || !email || !createdAt) {
    jsonError(res, 400, "A complete user payload is required.", "INVALID_USER_PAYLOAD");
    return;
  }
  const workspace = await getAppContext().repositories.workspace.getWorkspaceData({
    id: userId,
    name,
    email,
    created_at: createdAt
  });
  res.json(workspace);
});
internalMcpRouter.post("/task-context", async (req, res) => {
  const userId = String(req.body?.userId ?? "").trim();
  const taskId = Number(req.body?.taskId);
  if (!userId || !Number.isInteger(taskId) || taskId <= 0) {
    jsonError(res, 400, "A valid user id and task id are required.", "INVALID_TASK_CONTEXT_REQUEST");
    return;
  }
  const { tasks, goals, resources, quickActions } = getAppContext().repositories;
  const task = await tasks.findByIdForUser(taskId, userId);
  if (!task) {
    jsonError(res, 404, "Task not found.", "TASK_NOT_FOUND");
    return;
  }
  const goal = await goals.getByIdForUser(task.goal_id, userId);
  const taskResources = await resources.getTaskResources(taskId, userId);
  const cachedQuickActions = await Promise.all(
    ["explain", "example", "analogy", "confused"].map(
      (action) => quickActions.findByTaskAndAction(taskId, userId, action)
    )
  );
  res.json({
    task,
    goal,
    resources: taskResources,
    quickActions: cachedQuickActions.filter(Boolean)
  });
});
internalMcpRouter.post("/workflow-records", async (req, res) => {
  const userId = String(req.body?.userId ?? "").trim();
  const goal = String(req.body?.goal ?? "").trim();
  const level = String(req.body?.level ?? "").trim();
  const hours = Math.max(1, Number(req.body?.hours ?? 1));
  const targetDate = req.body?.targetDate ? String(req.body.targetDate) : null;
  const preferredStyle = req.body?.preferredStyle ? String(req.body.preferredStyle) : null;
  const resourceMode = req.body?.resourceMode === "has_materials" ? "has_materials" : "needs_plan";
  const resources = Array.isArray(req.body?.resources) ? req.body.resources : [];
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
  if (!userId || !goal || !level || tasks.length === 0) {
    jsonError(res, 400, "Workflow persistence requires user, goal, level, and at least one task.", "INVALID_WORKFLOW_REQUEST");
    return;
  }
  const createdAt = nowIso();
  const scheduledEvents = buildEventSchedule(tasks.length, hours);
  const workflow = await getAppContext().repositories.workflow.persistGeneratedWorkflow({
    userId,
    goal,
    level,
    hours,
    targetDate,
    preferredStyle,
    resourceMode,
    resources,
    tasks,
    scheduledEvents,
    createdAt,
    planSummary: buildPlanSummary(
      goal,
      level,
      hours,
      tasks.map((task) => ({
        ...task,
        searchQuery: `${goal} ${task.title} tutorial documentation`
      })),
      resourceMode,
      resources
    ),
    resourceNote: buildResourceNote(goal, resourceMode, resources)
  });
  res.json(workflow);
});
internalMcpRouter.post("/quick-action/cache", async (req, res) => {
  const userId = String(req.body?.userId ?? "").trim();
  const taskId = Number(req.body?.taskId);
  const action = String(req.body?.action ?? "").trim();
  if (!userId || !Number.isInteger(taskId) || taskId <= 0 || !isQuickActionKind(action)) {
    jsonError(res, 400, "A valid cache lookup request is required.", "INVALID_QUICK_ACTION_CACHE_REQUEST");
    return;
  }
  const quickAction = await getAppContext().repositories.quickActions.findByTaskAndAction(taskId, userId, action);
  res.json({ quickAction });
});
internalMcpRouter.post("/quick-action/save", async (req, res) => {
  const userId = String(req.body?.userId ?? "").trim();
  const taskId = Number(req.body?.taskId);
  const action = String(req.body?.action ?? "").trim();
  const content = String(req.body?.content ?? "").trim();
  if (!userId || !Number.isInteger(taskId) || taskId <= 0 || !isQuickActionKind(action) || !content) {
    jsonError(res, 400, "A valid quick action payload is required.", "INVALID_QUICK_ACTION_SAVE_REQUEST");
    return;
  }
  const timestamp = nowIso();
  const { quickActions, retrieval } = getAppContext().repositories;
  const quickAction = await quickActions.save({
    userId,
    taskId,
    action,
    content,
    createdAt: timestamp,
    updatedAt: timestamp
  });
  await retrieval.saveSource({
    id: crypto6.randomUUID(),
    userId,
    sourceType: "quick_action",
    sourceId: String(quickAction.id),
    content,
    metadataJson: JSON.stringify({ taskId, action }),
    createdAt: timestamp,
    updatedAt: timestamp
  });
  res.json(quickAction);
});
internalMcpRouter.post("/review/schedule", async (req, res) => {
  const userId = String(req.body?.userId ?? "").trim();
  const taskId = Number(req.body?.taskId);
  const priority = String(req.body?.priority ?? "").trim();
  const daysUntilReview = Number(req.body?.daysUntilReview);
  if (!userId || !Number.isInteger(taskId) || taskId <= 0 || !["high", "medium", "low"].includes(priority) || !Number.isInteger(daysUntilReview) || daysUntilReview < 0) {
    jsonError(res, 400, "A valid review scheduling request is required.", "INVALID_REVIEW_REQUEST");
    return;
  }
  const dueDate = addDays(/* @__PURE__ */ new Date(), daysUntilReview).toISOString();
  const { reviews } = getAppContext().repositories;
  const existingReview = await reviews.findLatestForTask(taskId, userId);
  if (existingReview) {
    await reviews.updateById(existingReview.id, {
      userId,
      taskId,
      dueDate,
      priority,
      status: "pending"
    });
    res.json({ status: "updated", dueDate });
    return;
  }
  await reviews.create({
    userId,
    taskId,
    dueDate,
    priority,
    status: "pending"
  });
  res.json({ status: "created", dueDate });
});

// server/routes/googleCalendar.ts
import { Router as Router6 } from "express";

// server/services/googleCalendarService.ts
import crypto7 from "crypto";
import { google } from "googleapis";
init_date();
var GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events.owned"];
var OAUTH_STATE_TTL_MS = 10 * 60 * 1e3;
var DEFAULT_CALENDAR_ID = "primary";
var GoogleCalendarIntegrationError = class extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "GoogleCalendarIntegrationError";
    this.status = status;
    this.code = code;
  }
};
var GoogleCalendarApiClient = class {
  constructor(refreshToken) {
    this.refreshToken = refreshToken;
    const config = requireGoogleCalendarConfig();
    const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
    oauthClient.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: "v3", auth: oauthClient });
  }
  async insertEvent(input) {
    const response = await this.calendar.events.insert({
      calendarId: input.calendarId,
      requestBody: {
        ...input.event,
        id: input.eventId
      }
    });
    return { id: response.data.id ?? null };
  }
  async updateEvent(input) {
    const response = await this.calendar.events.patch({
      calendarId: input.calendarId,
      eventId: input.eventId,
      requestBody: input.event
    });
    return { id: response.data.id ?? null };
  }
  async revoke() {
    const config = requireGoogleCalendarConfig();
    const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
    oauthClient.setCredentials({ refresh_token: this.refreshToken });
    await oauthClient.revokeCredentials();
  }
};
function isGoogleCalendarConfigured() {
  return Boolean(
    env.googleCalendarSyncEnabled && env.googleClientId && env.googleClientSecret && env.googleTokenEncryptionKey
  );
}
async function getGoogleCalendarStatus(repositories, userId) {
  const summary = await repositories.googleCalendar.getSyncSummary(userId);
  if (!isGoogleCalendarConfigured()) {
    return {
      configured: false,
      connected: false,
      status: "disabled",
      calendarId: null,
      lastSyncedAt: null,
      lastError: null,
      summary
    };
  }
  const connection = await repositories.googleCalendar.getConnection(userId);
  if (!connection) {
    return {
      configured: true,
      connected: false,
      status: "disconnected",
      calendarId: null,
      lastSyncedAt: null,
      lastError: null,
      summary
    };
  }
  return {
    configured: true,
    connected: connection.status === "connected",
    status: connection.status,
    calendarId: connection.calendar_id,
    lastSyncedAt: connection.last_synced_at,
    lastError: connection.last_error,
    summary
  };
}
async function createGoogleCalendarAuthUrl(repositories, user) {
  const config = requireGoogleCalendarConfig();
  const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  const state = crypto7.randomBytes(32).toString("base64url");
  const timestamp = /* @__PURE__ */ new Date();
  await repositories.googleCalendar.createOAuthState({
    userId: user.id,
    stateHash: hashState(state),
    expiresAt: new Date(timestamp.getTime() + OAUTH_STATE_TTL_MS).toISOString(),
    createdAt: timestamp.toISOString()
  });
  return oauthClient.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state
  });
}
async function handleGoogleCalendarOAuthCallback(repositories, input) {
  const config = requireGoogleCalendarConfig();
  const consumedAt = nowIso();
  const state = await repositories.googleCalendar.consumeOAuthState(hashState(input.state), consumedAt);
  if (!state) {
    throw new GoogleCalendarIntegrationError(
      "Google Calendar authorization expired. Please reconnect from the dashboard.",
      400,
      "GOOGLE_CALENDAR_STATE_INVALID"
    );
  }
  const oauthClient = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  const tokenResult = await oauthClient.getToken(input.code);
  const refreshToken = tokenResult.tokens.refresh_token;
  if (!refreshToken) {
    throw new GoogleCalendarIntegrationError(
      "Google did not return offline access. Please reconnect and approve Calendar access again.",
      400,
      "GOOGLE_CALENDAR_REFRESH_TOKEN_MISSING"
    );
  }
  await repositories.googleCalendar.saveConnection({
    userId: state.userId,
    encryptedRefreshToken: encryptToken(refreshToken, config.tokenEncryptionKey),
    calendarId: DEFAULT_CALENDAR_ID,
    grantedScopes: tokenResult.tokens.scope ?? GOOGLE_CALENDAR_SCOPES.join(" "),
    status: "connected",
    connectedAt: nowIso()
  });
}
async function disconnectGoogleCalendar(repositories, userId) {
  const connection = await repositories.googleCalendar.getConnection(userId);
  if (connection && isGoogleCalendarConfigured()) {
    const config = requireGoogleCalendarConfig();
    const refreshToken = decryptToken(connection.encrypted_refresh_token, config.tokenEncryptionKey);
    const client = new GoogleCalendarApiClient(refreshToken);
    await client.revoke?.().catch(() => void 0);
  }
  await repositories.googleCalendar.disconnect(userId);
}
async function syncGoogleCalendarEvents(repositories, userId, calendarClient) {
  const connection = await repositories.googleCalendar.getConnection(userId);
  if (!connection) {
    throw new GoogleCalendarIntegrationError(
      "Connect Google Calendar before syncing your study schedule.",
      409,
      "GOOGLE_CALENDAR_NOT_CONNECTED"
    );
  }
  const client = calendarClient ?? new GoogleCalendarApiClient(
    decryptToken(connection.encrypted_refresh_token, requireGoogleCalendarConfig().tokenEncryptionKey)
  );
  const events = await repositories.googleCalendar.listSyncEvents(userId);
  const calendarId = connection.calendar_id || DEFAULT_CALENDAR_ID;
  const syncedAt = nowIso();
  let synced = 0;
  let failed = 0;
  for (const event of events) {
    const googleEventId = event.google_event_id || buildGoogleEventId(userId, event.id);
    try {
      const payload = buildGoogleEventPayload(event);
      if (event.google_event_id) {
        await patchOrInsertEvent(client, calendarId, googleEventId, payload);
      } else {
        await insertOrPatchEvent(client, calendarId, googleEventId, payload);
      }
      await repositories.googleCalendar.updateEventSync({
        userId,
        eventId: event.id,
        googleCalendarId: calendarId,
        googleEventId,
        googleSyncStatus: "synced",
        googleSyncedAt: syncedAt,
        googleSyncError: null
      });
      synced += 1;
    } catch (error) {
      failed += 1;
      await repositories.googleCalendar.updateEventSync({
        userId,
        eventId: event.id,
        googleCalendarId: calendarId,
        googleEventId,
        googleSyncStatus: "failed",
        googleSyncedAt: null,
        googleSyncError: normalizeErrorMessage(error)
      });
    }
  }
  if (failed > 0) {
    await repositories.googleCalendar.markConnectionError(
      userId,
      `${failed} study block${failed === 1 ? "" : "s"} could not be synced.`
    );
  } else {
    await repositories.googleCalendar.markConnectionSynced(userId, syncedAt);
  }
  return {
    total: events.length,
    synced,
    failed,
    pending: 0,
    syncedAt: failed > 0 ? null : syncedAt
  };
}
async function insertOrPatchEvent(client, calendarId, eventId, event) {
  try {
    return await client.insertEvent({ calendarId, eventId, event });
  } catch (error) {
    if (getGoogleErrorStatus(error) === 409) {
      return client.updateEvent({ calendarId, eventId, event });
    }
    throw error;
  }
}
async function patchOrInsertEvent(client, calendarId, eventId, event) {
  try {
    return await client.updateEvent({ calendarId, eventId, event });
  } catch (error) {
    if (getGoogleErrorStatus(error) === 404) {
      return client.insertEvent({ calendarId, eventId, event });
    }
    throw error;
  }
}
function buildGoogleEventPayload(event) {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + Math.max(1, event.duration) * 60 * 1e3);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Study block has an invalid start date.");
  }
  const sessionUrl = `${env.appBaseUrl}/app/session/${event.task_id}`;
  return {
    summary: `Study: ${event.task_title}`,
    description: [
      event.goal_title ? `Goal: ${event.goal_title}` : null,
      event.task_description,
      `Open the study session: ${sessionUrl}`,
      "Google Calendar mirrors this study block. Learning Progress Architect remains the source of truth."
    ].filter(Boolean).join("\n\n"),
    start: {
      dateTime: start.toISOString()
    },
    end: {
      dateTime: end.toISOString()
    },
    visibility: "private",
    transparency: "opaque",
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 10 }]
    },
    source: {
      title: "Learning Progress Architect",
      url: sessionUrl
    },
    extendedProperties: {
      private: {
        app: "learning-progress-architect",
        calendarEventId: String(event.id),
        taskId: String(event.task_id)
      }
    }
  };
}
function buildGoogleEventId(userId, eventId) {
  return `lpa${crypto7.createHash("sha256").update(`${userId}:${eventId}`).digest("hex").slice(0, 48)}`;
}
function hashState(state) {
  return crypto7.createHash("sha256").update(state).digest("hex");
}
function encryptToken(token, rawKey) {
  const key = normalizeEncryptionKey(rawKey);
  const iv = crypto7.randomBytes(12);
  const cipher = crypto7.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}
function decryptToken(payload, rawKey) {
  const [version, ivText, tagText, encryptedText] = payload.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("Stored Google Calendar token uses an unsupported format.");
  }
  const decipher = crypto7.createDecipheriv(
    "aes-256-gcm",
    normalizeEncryptionKey(rawKey),
    Buffer.from(ivText, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
function normalizeEncryptionKey(rawKey) {
  const base64 = Buffer.from(rawKey, "base64");
  if (base64.length === 32) {
    return base64;
  }
  const hex = Buffer.from(rawKey, "hex");
  if (hex.length === 32) {
    return hex;
  }
  return crypto7.createHash("sha256").update(rawKey).digest();
}
function getGoogleErrorStatus(error) {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const maybeError = error;
  const value = maybeError.code ?? maybeError.status ?? maybeError.response?.status;
  return typeof value === "number" ? value : null;
}
function normalizeErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 500);
  }
  return "Google Calendar sync failed.";
}

// server/routes/googleCalendar.ts
var googleCalendarRouter = Router6();
googleCalendarRouter.get("/status", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  try {
    const status = await getGoogleCalendarStatus(getAppContext().repositories, user.id);
    res.json(status);
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});
googleCalendarRouter.post("/connect", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  try {
    const authUrl = await createGoogleCalendarAuthUrl(getAppContext().repositories, user);
    res.json({ authUrl });
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});
googleCalendarRouter.get("/callback", async (req, res) => {
  const errorParam = String(req.query.error ?? "").trim();
  if (errorParam) {
    console.warn(`Google Calendar OAuth denied: ${errorParam}`);
    res.redirect(`/app?googleCalendar=error&reason=${encodeURIComponent(errorParam)}`);
    return;
  }
  const code = String(req.query.code ?? "").trim();
  const state = String(req.query.state ?? "").trim();
  if (!code || !state) {
    jsonError(res, 400, "Google Calendar authorization response is incomplete.", "GOOGLE_CALENDAR_CALLBACK_INVALID");
    return;
  }
  try {
    await handleGoogleCalendarOAuthCallback(getAppContext().repositories, { code, state });
    res.redirect("/app?googleCalendar=connected");
  } catch (error) {
    console.error("Google Calendar OAuth callback failed.", error);
    res.redirect("/app?googleCalendar=error");
  }
});
googleCalendarRouter.post("/disconnect", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  try {
    await disconnectGoogleCalendar(getAppContext().repositories, user.id);
    res.json({ success: true });
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});
googleCalendarRouter.post("/sync", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  try {
    const result = await syncGoogleCalendarEvents(getAppContext().repositories, user.id);
    res.json(result);
  } catch (error) {
    handleGoogleCalendarError(res, error);
  }
});
function handleGoogleCalendarError(res, error) {
  if (error instanceof GoogleCalendarIntegrationError) {
    jsonError(res, error.status, error.message, error.code);
    return;
  }
  if (error instanceof Error && error.message.includes("Google Calendar sync is disabled")) {
    jsonError(res, 503, "Google Calendar sync is disabled.", "GOOGLE_CALENDAR_DISABLED");
    return;
  }
  if (error instanceof Error && error.message.includes("Google Calendar integration is not configured")) {
    jsonError(res, 503, "Google Calendar integration is not configured.", "GOOGLE_CALENDAR_NOT_CONFIGURED");
    return;
  }
  console.error("Google Calendar integration failed.", error);
  jsonError(res, 500, "Google Calendar integration failed.", "GOOGLE_CALENDAR_FAILED");
}

// server/serverless.ts
var app = express();
app.use(express.json());
app.use(async (_req, _res, next) => {
  try {
    await initializeAppContext();
    next();
  } catch (err) {
    next(err);
  }
});
app.get("/api/healthz", (_req, res) => {
  res.json({ ok: true, serverless: true });
});
app.use("/api/auth", authRouter);
app.use("/api/data", dataRouter);
app.use("/api/agent/workflow", workflowRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/integrations/google-calendar", googleCalendarRouter);
app.use("/internal/mcp", internalMcpRouter);
var serverless_default = app;
export {
  serverless_default as default
};
