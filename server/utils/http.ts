import type { Response } from 'express';

export function jsonError(res: Response, status: number, error: string, code: string) {
  res.status(status).json({ error, code });
}
