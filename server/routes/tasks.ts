import { Router } from 'express';
import crypto from 'crypto';
import { getAppContext } from '../appContext.ts';
import { requireUser } from '../middleware/auth.ts';
import { jsonError } from '../utils/http.ts';
import { nowIso, addDays } from '../utils/date.ts';
import { getReviewSchedule } from '../services/reviewService.ts';
import { searchLearningResources } from '../services/searchService.ts';
import { QuickActionGenerationError, isIncompleteQuickActionContent, isQuickActionKind } from '../services/quickActionService.ts';
import { createRequestId } from '../services/agentRuntime.ts';

export const tasksRouter = Router();

tasksRouter.post('/:taskId/start', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const taskId = Number(req.params.taskId);
  const { tasks, sessions } = getAppContext().repositories;
  const task = await tasks.findByIdForUser(taskId, user.id);

  if (!task) {
    jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
    return;
  }

  let session = await sessions.findOpenByTask(taskId, user.id);

  if (!session) {
    session = await sessions.createOpenSession(taskId, user.id, nowIso());
  }

  if (task.status === 'pending') {
    await tasks.markInProgress(taskId, user.id);
  }

  res.json({ session });
});

tasksRouter.post('/:taskId/complete', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const taskId = Number(req.params.taskId);
  const { tasks, sessions, reviews } = getAppContext().repositories;
  const task = await tasks.findByIdForUser(taskId, user.id);

  if (!task) {
    jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
    return;
  }

  const reflection = String(req.body?.reflection ?? '').trim();
  const confusion = String(req.body?.confusion ?? '').trim();
  const confidence =
    req.body?.confidence === null || req.body?.confidence === undefined
      ? null
      : Math.max(1, Math.min(5, Number(req.body.confidence)));
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
      completedAt,
    });
  } else {
    await sessions.createCompletedSession({
      userId: user.id,
      taskId,
      reflection: reflection || null,
      confusion: confusion || null,
      confidence,
      durationSeconds,
      completedAt,
    });
  }

  await tasks.markCompleted(taskId, user.id, completedAt);

  const { daysUntilReview, priority } = getReviewSchedule(confidence);
  const dueDate = addDays(new Date(), daysUntilReview).toISOString();
  const existingReview = await reviews.findLatestForTask(taskId, user.id);

  if (existingReview) {
    await reviews.updateById(existingReview.id, {
      userId: user.id,
      taskId,
      dueDate,
      priority,
      status: 'pending',
    });
  } else {
    await reviews.create({
      userId: user.id,
      taskId,
      dueDate,
      priority,
      status: 'pending',
    });
  }

  res.json({ success: true });
});

tasksRouter.post('/:taskId/materials/generate', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const taskId = Number(req.params.taskId);
  const appContext = getAppContext();
  const { tasks, resources } = appContext.repositories;
  
  const task = await tasks.findByIdForUser(taskId, user.id);
  if (!task) {
    jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
    return;
  }

  try {
    const searchLinks = await searchLearningResources({
      query: `${task.title} tutorial documentation guide`,
      maxResults: 3,
    });

    const timestamp = nowIso();
    for (const link of searchLinks) {
      await resources.addSystemResource(taskId, task.goal_id, user.id, {
        title: link.title,
        url: link.url,
        createdAt: timestamp,
      });
    }

    res.json({ success: true, count: searchLinks.length });
  } catch (error) {
    console.error('Material generation failed.', error);
    jsonError(res, 500, 'Our AI assistant encountered an issue while finding materials. Please try again.', 'MATERIAL_GENERATION_FAILED');
  }
});

tasksRouter.post('/:taskId/relearn', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const taskId = Number(req.params.taskId);
  const { tasks } = getAppContext().repositories;
  
  const task = await tasks.findByIdForUser(taskId, user.id);
  if (!task) {
    jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
    return;
  }

  if (task.status !== 'completed') {
    jsonError(res, 400, 'Task must be completed to relearn.', 'TASK_NOT_COMPLETED');
    return;
  }

  await tasks.resetToInProgress(taskId, user.id);
  res.json({ success: true });
});

tasksRouter.post('/:taskId/quick-action', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const taskId = Number(req.params.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    jsonError(res, 400, 'Task id must be a positive integer.', 'INVALID_TASK_ID');
    return;
  }

  const action = String(req.body?.action ?? '').trim();
  if (!isQuickActionKind(action)) {
    jsonError(res, 400, 'Quick action type is invalid.', 'INVALID_QUICK_ACTION');
    return;
  }

  try {
    const appContext = getAppContext();
    const { tasks, goals, resources, quickActions, retrieval } = appContext.repositories;
    const task = await tasks.findByIdForUser(taskId, user.id);
    if (!task) {
      jsonError(res, 404, 'Task not found.', 'TASK_NOT_FOUND');
      return;
    }

    const cachedRow = await quickActions.findByTaskAndAction(taskId, user.id, action);
    if (cachedRow && !isIncompleteQuickActionContent(cachedRow.content, task.title)) {
      res.json({
        action: cachedRow.action,
        content: cachedRow.content,
        source: 'cache',
        updatedAt: cachedRow.updated_at,
      });
      return;
    }

    const goal = await goals.getByIdForUser(task.goal_id, user.id);
    const taskResources = await resources.getTaskResources(taskId, user.id);
    
    const acceptLanguage = req.headers['accept-language'];
    const locale = typeof acceptLanguage === 'string' && acceptLanguage.toLowerCase().startsWith('id') ? 'id' : 'en';

    const quickActionResult = await appContext.agents.generateQuickAction({
      action,
      context: {
        taskTitle: task.title,
        taskDescription: task.description,
        goalTitle: goal?.title ?? null,
        resources: taskResources,
        locale,
      },
    }, {
      user,
      task,
      requestId: createRequestId(),
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
        updatedAt: timestamp,
      });

      await retrieval.saveSource({
        id: crypto.randomUUID(),
        userId: user.id,
        sourceType: 'quick_action',
        sourceId: String(storedRow.id),
        content: quickActionResult.content,
        metadataJson: JSON.stringify({
          taskId,
          action,
          goalId: task.goal_id,
        }),
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      updatedAt = storedRow.updated_at;
    }

    res.json({
      action,
      content: quickActionResult.content,
      source: quickActionResult.source,
      updatedAt,
    });
  } catch (error) {
    if (error instanceof QuickActionGenerationError) {
      jsonError(res, 503, error.message, 'QUICK_ACTION_UNAVAILABLE');
      return;
    }

    console.error('Quick action request failed.', error);
    jsonError(res, 500, 'Our AI assistant encountered an unexpected issue while preparing your quick action. Please try again.', 'QUICK_ACTION_FAILED');
  }
});
