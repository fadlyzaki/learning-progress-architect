import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.ts';

const errorLogger = logger.child({ scope: 'http-error' });

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  errorLogger.error(
    {
      err: error,
      requestId: res.locals.requestId,
      method: req.method,
      url: req.originalUrl,
      status: 500,
    },
    'Unhandled request error',
  );

  res.status(500).json({
    error: 'Internal server error.',
    code: 'INTERNAL_SERVER_ERROR',
  });
};