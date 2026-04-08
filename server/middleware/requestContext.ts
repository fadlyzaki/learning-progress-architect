import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
	const incomingRequestId = req.header('x-request-id');
	const requestId = incomingRequestId || crypto.randomUUID();

	res.locals.requestId = requestId;
	res.setHeader('x-request-id', requestId);

	next();
}
