import crypto from 'crypto';
import type { AppRepositories } from '../repositories/types.ts';
import { nowIso } from '../utils/date.ts';
import { createSessionToken } from './authService.ts';

export const DEMO_SESSION_TOKEN = 'demo_session_token_learning_progress_architect';

export async function provisionDemoSession(
  repositories: AppRepositories,
  options: { isGuest?: boolean; reset?: boolean } = {},
) {
  const { authSessions, workspace, workflow, tasks, sessions, reviews, quickActions } = repositories;
  const isGuest = options.isGuest ?? false;
  const reset = options.reset ?? false;

  let user;
  const createdAt = nowIso();

  if (isGuest) {
    const guestId = crypto.randomUUID();
    const guestSuffix = crypto.randomBytes(3).toString('hex');
    user = await authSessions.createUser({
      id: guestId,
      name: 'Guest Learner',
      email: `guest_${guestSuffix}@demo.local`,
      passwordHash: 'guest_session_hash',
      createdAt,
    });
  } else {
    const existing = await authSessions.findUserByEmail('demo@learningprogress.app');
    if (existing) {
      user = {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        created_at: existing.created_at,
      };
    } else {
      const demoId = crypto.randomUUID();
      user = await authSessions.createUser({
        id: demoId,
        name: 'Demo Learner',
        email: 'demo@learningprogress.app',
        passwordHash: 'demo_session_hash',
        createdAt,
      });
    }
  }

  const workspaceData = await workspace.getWorkspaceData(user);
  if (workspaceData.goals.length === 0 || reset) {
    const goalTitle = 'Distributed Systems & Cloud Architecture';
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const taskDefs = [
      {
        title: 'Distributed Consensus & State Machine Replication (Raft)',
        description: 'Explore leader election, log replication safety, and split-brain resolution in distributed consensus protocols.',
        searchQuery: 'Raft consensus algorithm visual guide',
        references: [
          {
            title: 'Raft Consensus Specification & Visual Simulator',
            url: 'https://raft.github.io/',
            snippet: 'Interactive visualization of Raft leader election and log replication invariants.',
            source: 'Raft Paper',
          },
        ],
      },
      {
        title: 'Event Sourcing, CQRS & Message Streaming (Kafka & NATS)',
        description: 'Implement event-driven communication patterns, partition ordering, and exactly-once delivery semantics.',
        searchQuery: 'Apache Kafka event streaming patterns',
        references: [
          {
            title: 'Apache Kafka Core Concepts & Architecture',
            url: 'https://kafka.apache.org/documentation/',
            snippet: 'Architecture guide on topics, partitions, consumer groups, and replication.',
            source: 'Apache Docs',
          },
        ],
      },
      {
        title: 'Caching Strategies, Cache Invalidation & Redis Patterns',
        description: 'Apply cache-aside, write-through, and cache-stampede mitigation strategies with Redis.',
        searchQuery: 'Distributed caching strategies Redis',
        references: [
          {
            title: 'Redis Architecture & Data Structures Guide',
            url: 'https://redis.io/docs/latest/develop/data-types/',
            snippet: 'Caching patterns, pub/sub, and data structures.',
            source: 'Redis Docs',
          },
        ],
      },
      {
        title: 'Resiliency Patterns: Circuit Breakers, Bulkheads & Chaos Engineering',
        description: 'Design fault-tolerant services using retries with exponential backoff, rate limiting, and circuit breakers.',
        searchQuery: 'Distributed systems resiliency patterns circuit breaker',
        references: [
          {
            title: 'Release It! Design Patterns for Production Resiliency',
            url: 'https://pragprog.com/titles/mnee2/release-it-second-edition/',
            snippet: 'Production resiliency patterns and stability anti-patterns.',
            source: 'Reference',
          },
        ],
      },
    ];

    const todayDate = new Date().toISOString().slice(0, 10);
    const scheduledEvents = [
      { date: todayDate, duration: 45 },
      { date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), duration: 60 },
      { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), duration: 45 },
      { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), duration: 60 },
    ];

    await workflow.persistGeneratedWorkflow({
      userId: user.id,
      goal: goalTitle,
      level: 'Intermediate',
      hours: 6,
      targetDate,
      preferredStyle: 'Practice-Heavy',
      resourceMode: 'needs_plan',
      planSummary: 'A structured intermediate roadmap focusing on building highly-available, partition-tolerant backend architectures, consensus algorithms, and distributed streaming.',
      resourceNote: 'Core study anchors covering Raft consensus, message queues, and caching invariants.',
      resources: [],
      tasks: taskDefs,
      scheduledEvents,
      createdAt,
    });

    const refreshed = await workspace.getWorkspaceData(user);
    const firstTask = refreshed.tasks.find((t) => t.title.includes('Distributed Consensus'));
    const secondTask = refreshed.tasks.find((t) => t.title.includes('Event Sourcing'));

    if (firstTask) {
      await tasks.markCompleted(firstTask.id, user.id, createdAt);
      await sessions.createCompletedSession({
        userId: user.id,
        taskId: firstTask.id,
        durationSeconds: 2700,
        reflection: 'Grasped leader election, log replication invariants, and split-brain resolution through majority quorums.',
        confusion: 'Need to review joint consensus configuration changes in Raft edge cases.',
        confidence: 4,
        completedAt: createdAt,
      });

      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await reviews.create({
        userId: user.id,
        taskId: firstTask.id,
        dueDate,
        priority: 'high',
        status: 'pending',
      });
    }

    if (secondTask) {
      await tasks.markInProgress(secondTask.id, user.id);
      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: 'explain',
        content: `**Core Concept: Event Sourcing & CQRS**

1. **Why Event Sourcing?** Traditional CRUD loses historical context. Event Sourcing retains the complete immutable audit trail of how the system arrived at its current state.
2. **Why CQRS?** Read and write workloads have drastically different scaling profiles and schemas. Decoupling them allows independent optimization.
3. **Delivery Semantics:** Kafka provides partition-level ordering with idempotent producers (\`enable.idempotence=true\`) for end-to-end reliability.`,
        createdAt,
        updatedAt: createdAt,
      });

      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: 'example',
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
        updatedAt: createdAt,
      });

      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: 'analogy',
        content: `**Mental Model / Analogy:**

Think of Event Sourcing like an **accounting ledger**. You never white-out numbers or overwrite your bank balance directly. Every transaction (+ $50 deposit, - $20 coffee) is recorded immutably. Your current balance is simply the projection (fold/reduce) of all ledger entries from the beginning of time.`,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  const token = isGuest ? `guest_token_${crypto.randomUUID()}` : DEMO_SESSION_TOKEN;
  await authSessions.createSession({
    token,
    userId: user.id,
    createdAt,
  });

  return {
    token,
    user,
  };
}
