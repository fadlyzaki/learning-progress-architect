import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.ts';
import { jsonError } from '../utils/http.ts';

const INTERNAL_TOKEN_HEADER = 'x-internal-service-token';

export function getInternalServiceTokenHeader(req: Request) {
  return String(req.header(INTERNAL_TOKEN_HEADER) ?? '').trim();
}

export function requireInternalService(req: Request, res: Response, next: NextFunction) {
  if (!env.internalServiceToken) {
    jsonError(res, 503, 'Internal service authentication is not configured.', 'INTERNAL_SERVICE_DISABLED');
    return;
  }

  if (getInternalServiceTokenHeader(req) !== env.internalServiceToken) {
    jsonError(res, 401, 'Internal service authentication failed.', 'INTERNAL_SERVICE_AUTH_FAILED');
    return;
  }

  next();
}
