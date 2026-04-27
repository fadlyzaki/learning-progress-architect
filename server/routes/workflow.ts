import { Router } from 'express';
import { getAppContext } from '../appContext.ts';
import { requireUser } from '../middleware/auth.ts';
import { jsonError } from '../utils/http.ts';
import { normalizeResourceMode, sanitizeResourceInput } from '../utils/validation.ts';
import { runWorkflow } from '../services/workflowService.ts';

export const workflowRouter = Router();

workflowRouter.post('/', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  try {
    const goal = String(req.body?.goal ?? '').trim();
    const level = String(req.body?.level ?? 'Intermediate').trim();
    const hours = Math.max(1, Number(req.body?.hours ?? 1));
    const targetDate = req.body?.targetDate ? String(req.body.targetDate) : null;
    const preferredStyle = req.body?.preferredStyle ? String(req.body.preferredStyle) : null;
    const resourceMode = normalizeResourceMode(req.body?.resourceMode);
    const resources = sanitizeResourceInput(req.body?.resources);
    
    const acceptLanguage = req.headers['accept-language'];
    const locale = typeof acceptLanguage === 'string' && acceptLanguage.toLowerCase().startsWith('id') ? 'id' : 'en';

    if (!goal) {
      jsonError(res, 400, 'A learning goal is required.', 'GOAL_REQUIRED');
      return;
    }

    if (resourceMode === 'has_materials' && resources.length === 0) {
      jsonError(
        res,
        400,
        'Add at least one resource or switch to the starting-plan mode.',
        'RESOURCES_REQUIRED',
      );
      return;
    }

    const appContext = getAppContext();
    const { goalId } = await runWorkflow(appContext.repositories, appContext.agents, user, {
      goal,
      level,
      hours,
      targetDate,
      preferredStyle,
      resourceMode,
      resources,
      locale,
    });

    res.status(201).json({ success: true, goalId });
  } catch (error) {
    console.error(error);
    jsonError(res, 500, 'Failed to generate a learning roadmap.', 'WORKFLOW_GENERATION_FAILED');
  }
});
