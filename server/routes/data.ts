import { Router } from 'express';
import { getAppContext } from '../appContext.ts';
import { requireUser } from '../middleware/auth.ts';
import { isIncompleteQuickActionContent } from '../services/quickActionService.ts';

export const dataRouter = Router();

dataRouter.get('/', async (req, res) => {
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
        taskTitleById.get(quickAction.task_id),
      ),
    ),
  });
});
