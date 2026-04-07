import crypto from 'crypto';
import { Router } from 'express';
import { getAppContext } from '../appContext.ts';
import { requireInternalService } from '../middleware/internal.ts';
import { jsonError } from '../utils/http.ts';
import { nowIso, addDays } from '../utils/date.ts';
import { buildEventSchedule, buildPlanSummary, buildResourceNote } from '../services/syllabusService.ts';
import { isQuickActionKind } from '../services/quickActionService.ts';
import type { LearningResourceInput, QuickActionKind, ResourceMode } from '../types.ts';

type WorkflowTaskReference = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
};

type WorkflowTaskBody = {
  title: string;
  description: string;
  references: WorkflowTaskReference[];
};

export const internalMcpRouter = Router();

internalMcpRouter.use(requireInternalService);

internalMcpRouter.post('/workspace', async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim();
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const createdAt = String(req.body?.createdAt ?? '').trim();

  if (!userId || !name || !email || !createdAt) {
    jsonError(res, 400, 'A complete user payload is required.', 'INVALID_USER_PAYLOAD');
    return;
  }

  const workspace = await getAppContext().repositories.workspace.getWorkspaceData({
    id: userId,
    name,
    email,
    created_at: createdAt,
  });

  res.json(workspace);
});

internalMcpRouter.post('/task-context', async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim();
  const taskId = Number(req.body?.taskId);

  if (!userId || !Number.isInteger(taskId) || taskId <= 0) {
    jsonError(res, 400, 'A valid user id and task id are required.', 'INVALID_TASK_CONTEXT_REQUEST');
    return;
  }

  const { tasks, goals, resources, quickActions } = getAppContext().repositories;
  const task = await tasks.findByIdForUser(taskId, userId);
  if (!task) {
    jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
    return;
  }

  const goal = await goals.getByIdForUser(task.goal_id, userId);
  const taskResources = await resources.getTaskResources(taskId, userId);
  const cachedQuickActions = await Promise.all(
    ['explain', 'example', 'analogy', 'confused'].map((action) =>
      quickActions.findByTaskAndAction(taskId, userId, action as QuickActionKind),
    ),
  );

  res.json({
    task,
    goal,
    resources: taskResources,
    quickActions: cachedQuickActions.filter(Boolean),
  });
});

internalMcpRouter.post('/workflow-records', async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim();
  const goal = String(req.body?.goal ?? '').trim();
  const level = String(req.body?.level ?? '').trim();
  const hours = Math.max(1, Number(req.body?.hours ?? 1));
  const targetDate = req.body?.targetDate ? String(req.body.targetDate) : null;
  const preferredStyle = req.body?.preferredStyle ? String(req.body.preferredStyle) : null;
  const resourceMode = req.body?.resourceMode === 'has_materials' ? 'has_materials' : 'needs_plan';
  const resources = Array.isArray(req.body?.resources) ? (req.body.resources as LearningResourceInput[]) : [];
  const tasks = Array.isArray(req.body?.tasks) ? (req.body.tasks as WorkflowTaskBody[]) : [];

  if (!userId || !goal || !level || tasks.length === 0) {
    jsonError(res, 400, 'Workflow persistence requires user, goal, level, and at least one task.', 'INVALID_WORKFLOW_REQUEST');
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
    resourceMode: resourceMode as ResourceMode,
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
        searchQuery: `${goal} ${task.title} tutorial documentation`,
      })),
      resourceMode as ResourceMode,
      resources,
    ),
    resourceNote: buildResourceNote(goal, resourceMode as ResourceMode, resources),
  });

  res.json(workflow);
});

internalMcpRouter.post('/quick-action/cache', async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim();
  const taskId = Number(req.body?.taskId);
  const action = String(req.body?.action ?? '').trim();

  if (!userId || !Number.isInteger(taskId) || taskId <= 0 || !isQuickActionKind(action)) {
    jsonError(res, 400, 'A valid cache lookup request is required.', 'INVALID_QUICK_ACTION_CACHE_REQUEST');
    return;
  }

  const quickAction = await getAppContext().repositories.quickActions.findByTaskAndAction(taskId, userId, action);
  res.json({ quickAction });
});

internalMcpRouter.post('/quick-action/save', async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim();
  const taskId = Number(req.body?.taskId);
  const action = String(req.body?.action ?? '').trim();
  const content = String(req.body?.content ?? '').trim();

  if (!userId || !Number.isInteger(taskId) || taskId <= 0 || !isQuickActionKind(action) || !content) {
    jsonError(res, 400, 'A valid quick action payload is required.', 'INVALID_QUICK_ACTION_SAVE_REQUEST');
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
    updatedAt: timestamp,
  });

  await retrieval.saveSource({
    id: crypto.randomUUID(),
    userId,
    sourceType: 'quick_action',
    sourceId: String(quickAction.id),
    content,
    metadataJson: JSON.stringify({ taskId, action }),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  res.json(quickAction);
});

internalMcpRouter.post('/review/schedule', async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim();
  const taskId = Number(req.body?.taskId);
  const priority = String(req.body?.priority ?? '').trim();
  const daysUntilReview = Number(req.body?.daysUntilReview);

  if (
    !userId ||
    !Number.isInteger(taskId) ||
    taskId <= 0 ||
    !['high', 'medium', 'low'].includes(priority) ||
    !Number.isInteger(daysUntilReview) ||
    daysUntilReview < 0
  ) {
    jsonError(res, 400, 'A valid review scheduling request is required.', 'INVALID_REVIEW_REQUEST');
    return;
  }

  const dueDate = addDays(new Date(), daysUntilReview).toISOString();
  const { reviews } = getAppContext().repositories;
  const existingReview = await reviews.findLatestForTask(taskId, userId);

  if (existingReview) {
    await reviews.updateById(existingReview.id, {
      userId,
      taskId,
      dueDate,
      priority: priority as 'high' | 'medium' | 'low',
      status: 'pending',
    });
    res.json({ status: 'updated', dueDate });
    return;
  }

  await reviews.create({
    userId,
    taskId,
    dueDate,
    priority: priority as 'high' | 'medium' | 'low',
    status: 'pending',
  });

  res.json({ status: 'created', dueDate });
});
