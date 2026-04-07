import { Router } from 'express';
import { getAppContext } from '../appContext.ts';
import { requireUser } from '../middleware/auth.ts';

export const dataRouter = Router();

dataRouter.get('/', async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const snapshot = await getAppContext().repositories.workspace.getWorkspaceData(user);
  res.json(snapshot);
});
