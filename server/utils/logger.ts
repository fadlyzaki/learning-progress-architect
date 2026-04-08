import pino from 'pino';
import { env } from '../config/env.ts';

export const logger = pino({
	level: env.logLevel,
	redact: {
		paths: [
			'req.headers.authorization',
			'headers.authorization',
			'req.body.password',
			'req.body.token',
			'req.body.accessToken',
			'req.body.refreshToken',
			'req.body.internalServiceToken',
			'body.password',
			'body.token',
			'body.accessToken',
			'body.refreshToken',
			'body.internalServiceToken',
		],
		remove: true,
	},
	transport: env.logPretty
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:standard',
					singleLine: true,
				},
			}
		: undefined,
});
