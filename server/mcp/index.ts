import crypto from 'crypto';
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { env } from '../config/env.ts';
import { getAppContext, initializeAppContext } from '../appContext.ts';
import { buildEventSchedule, buildPlanSummary, buildResourceNote } from '../services/syllabusService.ts';
import { searchLearningResources } from '../services/searchService.ts';
import { addDays, nowIso } from '../utils/date.ts';

function toTextContent(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function createServer() {
  const server = new McpServer({
    name: 'learning-progress-architect-mcp',
    version: '1.0.0',
  });

  server.registerTool('get_user_workspace', {
    description: 'Return the current workspace payload for a user.',
    inputSchema: {
      userId: z.string(),
      name: z.string(),
      email: z.string(),
      createdAt: z.string(),
    },
  }, async ({ userId, name, email, createdAt }) => {
    const snapshot = await getAppContext().repositories.workspace.getWorkspaceData({
      id: userId,
      name,
      email,
      created_at: createdAt,
    });
    return toTextContent(snapshot);
  });

  server.registerTool('get_task_context', {
    description: 'Return the goal, task, and resources for one task owned by a user.',
    inputSchema: {
      userId: z.string(),
      taskId: z.number(),
    },
  }, async ({ userId, taskId }) => {
    const { tasks, goals, resources, quickActions } = getAppContext().repositories;
    const task = await tasks.findByIdForUser(taskId, userId);
    if (!task) {
      throw new Error('Task not found.');
    }

    const goal = await goals.getByIdForUser(task.goal_id, userId);
    const taskResources = await resources.getTaskResources(taskId, userId);
    const cachedQuickActions = await Promise.all(
      ['explain', 'example', 'analogy', 'confused'].map((action) =>
        quickActions.findByTaskAndAction(taskId, userId, action as 'explain' | 'example' | 'analogy' | 'confused'),
      ),
    );

    return toTextContent({
      task,
      goal,
      resources: taskResources,
      quickActions: cachedQuickActions.filter(Boolean),
    });
  });

  server.registerTool('search_learning_resources', {
    description: 'Search grounded learning resources for a task or topic.',
    inputSchema: {
      query: z.string(),
      maxResults: z.number().optional(),
    },
  }, async ({ query, maxResults }) => {
    const results = await searchLearningResources({ query, maxResults });
    return toTextContent(results);
  });

  server.registerTool('create_workflow_plan_records', {
    description: 'Persist a generated workflow plan into the app workspace.',
    inputSchema: {
      userId: z.string(),
      goal: z.string(),
      level: z.string(),
      hours: z.number(),
      targetDate: z.string().nullable().optional(),
      preferredStyle: z.string().nullable().optional(),
      resourceMode: z.enum(['has_materials', 'needs_plan']),
      resources: z.array(z.object({
        title: z.string(),
        type: z.enum(['link', 'course', 'book', 'article', 'documentation', 'notes', 'video', 'other']),
        reference: z.string().nullable().default(null),
        notes: z.string().nullable().default(null),
      })),
      tasks: z.array(z.object({
        title: z.string(),
        description: z.string(),
        references: z.array(z.object({
          title: z.string(),
          url: z.string(),
          snippet: z.string().optional(),
          source: z.string().optional(),
        })),
      })).min(1),
    },
  }, async ({ userId, goal, level, hours, targetDate, preferredStyle, resourceMode, resources, tasks }) => {
    const createdAt = nowIso();
    const scheduledEvents = buildEventSchedule(tasks.length, hours);
    const workflow = await getAppContext().repositories.workflow.persistGeneratedWorkflow({
      userId,
      goal,
      level,
      hours,
      targetDate: targetDate ?? null,
      preferredStyle: preferredStyle ?? null,
      resourceMode,
      resources,
      tasks,
      scheduledEvents,
      createdAt,
      planSummary: buildPlanSummary(goal, level, hours, tasks.map((task) => ({
        ...task,
        searchQuery: `${goal} ${task.title} tutorial documentation`,
      })), resourceMode, resources),
      resourceNote: buildResourceNote(goal, resourceMode, resources),
    });
    return toTextContent(workflow);
  });

  server.registerTool('get_cached_quick_action', {
    description: 'Return a cached quick action if one already exists.',
    inputSchema: {
      userId: z.string(),
      taskId: z.number(),
      action: z.enum(['explain', 'example', 'analogy', 'confused']),
    },
  }, async ({ userId, taskId, action }) => {
    const row = await getAppContext().repositories.quickActions.findByTaskAndAction(taskId, userId, action);
    return toTextContent({ quickAction: row });
  });

  server.registerTool('save_quick_action', {
    description: 'Persist generated quick action content for later reuse.',
    inputSchema: {
      userId: z.string(),
      taskId: z.number(),
      action: z.enum(['explain', 'example', 'analogy', 'confused']),
      content: z.string(),
    },
  }, async ({ userId, taskId, action, content }) => {
    const timestamp = nowIso();
    const row = await getAppContext().repositories.quickActions.save({
      userId,
      taskId,
      action,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await getAppContext().repositories.retrieval.saveSource({
      id: crypto.randomUUID(),
      userId,
      sourceType: 'quick_action',
      sourceId: String(row.id),
      content,
      metadataJson: JSON.stringify({ taskId, action }),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return toTextContent(row);
  });

  server.registerTool('schedule_review', {
    description: 'Create or update a pending review record for a task.',
    inputSchema: {
      userId: z.string(),
      taskId: z.number(),
      priority: z.enum(['high', 'medium', 'low']),
      daysUntilReview: z.number().int().nonnegative(),
    },
  }, async ({ userId, taskId, priority, daysUntilReview }) => {
    const dueDate = addDays(new Date(), daysUntilReview).toISOString();
    const existingReview = await getAppContext().repositories.reviews.findLatestForTask(taskId, userId);
    if (existingReview) {
      await getAppContext().repositories.reviews.updateById(existingReview.id, {
        userId,
        taskId,
        dueDate,
        priority,
        status: 'pending',
      });
      return toTextContent({ status: 'updated', dueDate });
    }

    await getAppContext().repositories.reviews.create({
      userId,
      taskId,
      dueDate,
      priority,
      status: 'pending',
    });
    return toTextContent({ status: 'created', dueDate });
  });

  return server;
}

async function startMcpServer() {
  await initializeAppContext();
  const app = createMcpExpressApp();

  app.post('/mcp', async (req, res) => {
    const server = createServer();

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error('Error handling MCP request.', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', (_req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    }));
  });

  app.delete('/mcp', (_req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    }));
  });

  app.listen(env.mcpPort, () => {
    console.log(`Internal MCP server listening on port ${env.mcpPort}`);
  });
}

void startMcpServer();
