import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { env } from '../config/env.ts';
import { searchLearningResources } from '../services/searchService.ts';
import {
  fetchCachedQuickAction,
  fetchTaskContext,
  fetchWorkspaceSnapshot,
  isInternalServiceRequestAuthorized,
  persistQuickAction,
  persistWorkflowRecords,
  scheduleReview,
} from './appApiClient.ts';

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
    const snapshot = await fetchWorkspaceSnapshot({ userId, name, email, createdAt });
    return toTextContent(snapshot);
  });

  server.registerTool('get_task_context', {
    description: 'Return the goal, task, and resources for one task owned by a user.',
    inputSchema: {
      userId: z.string(),
      taskId: z.number(),
    },
  }, async ({ userId, taskId }) => {
    return toTextContent(await fetchTaskContext({ userId, taskId }));
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
    const workflow = await persistWorkflowRecords({
      userId,
      goal,
      level,
      hours,
      targetDate: targetDate ?? null,
      preferredStyle: preferredStyle ?? null,
      resourceMode,
      resources,
      tasks,
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
    return toTextContent(await fetchCachedQuickAction({ userId, taskId, action }));
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
    return toTextContent(await persistQuickAction({ userId, taskId, action, content }));
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
    return toTextContent(await scheduleReview({ userId, taskId, priority, daysUntilReview }));
  });

  return server;
}

async function startMcpServer() {
  const app = createMcpExpressApp();

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/mcp', async (req, res) => {
    if (!isInternalServiceRequestAuthorized(String(req.header('x-internal-service-token') ?? '').trim())) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Internal service authentication failed.',
        },
        id: req.body?.id ?? null,
      });
      return;
    }

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
