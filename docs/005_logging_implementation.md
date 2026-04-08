# Backend Logging Implementation

## Goal

Implement backend logging for the server started from `server/index.ts` with:

1. `pino` as the primary application logger
2. `morgan` as the HTTP request logging middleware

This document is intentionally scoped to the main Express backend under `server/index.ts` and the modules it calls. It does not assume the same changes are automatically applied to `server/mcp/index.ts` or `adk_service/`.

---

## Current State

The current backend has no centralized logging path.

Observed gaps in the current codebase:

- `server/index.ts` still uses `console.log` for server startup.
- There is no HTTP request logging middleware registered in the Express app.
- There is no centralized error logging middleware in the main backend.
- Some backend paths still use direct `console.error`, including:
	- `server/routes/workflow.ts`
	- `server/routes/tasks.ts`
	- `server/services/syllabusService.ts`
- The project already has runtime packages installed for logging: `pino`, `pino-pretty`, and `morgan`.
- `@types/morgan` is already installed under `devDependencies`, so the TypeScript prerequisite is complete.

---

## Implementation Plan

Each step below is intended to be completed and verified before moving to the next one.

### Step 0 - TypeScript prerequisite is complete

**Focus:** Avoid avoidable TypeScript friction before wiring middleware.

Already completed:

```bash
npm install -D @types/morgan
```

Why this matters:

- This backend is written in TypeScript, so the middleware should compile cleanly without relying on implicit `any`.

**Status:** Done. `package.json` now contains `@types/morgan` under `devDependencies`.

---

### Step 1 - Create a single Pino logger module

**Focus:** Establish one logger entrypoint and stop ad hoc `console.*` usage.

Create a new file, recommended path:

- `server/utils/logger.ts`

Recommended exported surface:

```ts
import pino from 'pino';

export const logger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
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
	transport:
		process.env.NODE_ENV !== 'production'
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
```

Implementation notes:

- Keep logger construction in exactly one place.
- Default to structured JSON in production.
- Use `pino-pretty` only for local development readability.
- Do not log request bodies by default.
- Prefer child loggers for subsystem context, for example:

```ts
const routeLogger = logger.child({ scope: 'workflow-route' });
```

**Done when:** Backend modules can import the same `logger` instance and no new logging code needs `console.log` or `console.error`.

---

### Step 2 - Add logging config to `server/config/env.ts`

**Focus:** Make log behavior explicit and environment-driven.

Add the following environment-backed fields to `env` in `server/config/env.ts`:

```ts
logLevel: process.env.LOG_LEVEL ?? 'info',
logPretty: process.env.LOG_PRETTY
	? process.env.LOG_PRETTY === 'true'
	: process.env.NODE_ENV !== 'production',
```

Recommended behavior:

- `LOG_LEVEL=debug` for local debugging
- `LOG_LEVEL=info` as the default baseline
- `LOG_PRETTY=true` locally
- `LOG_PRETTY=false` in production so logs stay machine-readable

Use these values from the logger module instead of reading `process.env` repeatedly across the codebase.

**Done when:** Logger behavior can be controlled without editing application code.

---

### Step 3 - Add request correlation middleware before Morgan

**Focus:** Ensure every request log and error log can be tied together.

Create a middleware file, recommended path:

- `server/middleware/requestContext.ts`

Recommended behavior:

1. Read `x-request-id` from the incoming request if present.
2. If absent, generate a new ID with `crypto.randomUUID()`.
3. Attach the value to the request object and response locals.
4. Set `x-request-id` on the response.

Recommended implementation shape:

```ts
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
	const incomingRequestId = req.header('x-request-id');
	const requestId = incomingRequestId || crypto.randomUUID();

	res.locals.requestId = requestId;
	res.setHeader('x-request-id', requestId);

	next();
}
```

Decision:

- Standardize request correlation on `x-request-id` in the first implementation.

TypeScript note:

- Add a small type augmentation if you want `req.requestId` as a typed field.
- If you want to keep the first pass minimal, storing it in `res.locals.requestId` is enough.

**Done when:** Every HTTP response includes `x-request-id` and the same ID is available to request logs and error logs.

---

### Step 4 - Create the Morgan-to-Pino bridge middleware

**Focus:** Use Morgan for HTTP lifecycle logging, but send the output into Pino so the backend still has one logging sink.

Create a middleware file, recommended path:

- `server/middleware/httpLogger.ts`

Implementation approach:

1. Define Morgan tokens for request correlation and selected metadata.
2. Use a custom Morgan formatter function that returns a JSON string.
3. Provide a `stream.write()` implementation that parses that JSON and forwards it to Pino.

Recommended Morgan tokens:

- `request-id`
- `method`
- `url`
- `status`
- `response-time`
- `res[content-length]`
- `remote-addr`
- `user-agent`

Recommended implementation shape:

```ts
import morgan from 'morgan';
import { logger } from '../utils/logger.ts';

morgan.token('request-id', (_req, res) => String(res.locals.requestId ?? ''));

export const httpLogger = morgan((tokens, req, res) => {
	return JSON.stringify({
		requestId: tokens['request-id'](req, res),
		method: tokens.method(req, res),
		url: tokens.url(req, res),
		status: Number(tokens.status(req, res) ?? 0),
		responseTimeMs: Number(tokens['response-time'](req, res) ?? 0),
		contentLength: tokens.res(req, res, 'content-length'),
		remoteAddr: tokens['remote-addr'](req, res),
		userAgent: tokens['user-agent'](req, res),
	});
}, {
	stream: {
		write(message) {
			const payload = JSON.parse(message);
			const level = payload.status >= 500 ? 'error' : payload.status >= 400 ? 'warn' : 'info';
			logger[level]({ http: payload }, 'HTTP request completed');
		},
	},
});
```

Important constraints:

- Do not log headers wholesale.
- Do not log request bodies by default.
- Keep the log payload flat enough to filter easily, but structured enough for querying.
- If you want to reduce noise, skip `/healthz` or log it at `debug` instead of `info`.

**Done when:** Every completed request generates a structured Pino log entry through Morgan.

---

### Step 5 - Wire the middleware into `server/index.ts` in the correct order

**Focus:** Ensure startup logs, request logs, and route logs all use the same logger stack.

Update `server/index.ts` in this order:

1. Import the shared `logger`.
2. Create a child logger for bootstrap, for example `logger.child({ scope: 'server' })`.
3. Log application startup before `initializeAppContext()` begins.
4. Replace the existing `console.log` inside `app.listen()` with `logger.info(...)`.
5. Register middleware in this order:
	 1. request context middleware
	 2. `express.json()`
	 3. Morgan HTTP logger
	 4. routes

Recommended startup logging points:

- server boot started
- app context initialized
- HTTP server listening
- fatal startup failure

Recommended startup pattern:

```ts
const serverLogger = logger.child({ scope: 'server' });

export async function startServer() {
	serverLogger.info({ port: env.port, nodeEnv: env.nodeEnv }, 'Starting backend server');

	await initializeAppContext();

	const app = express();
	app.use(attachRequestContext);
	app.use(express.json());
	app.use(httpLogger);

	// routes...

	app.listen(env.port, '0.0.0.0', () => {
		serverLogger.info({ port: env.port }, 'Server listening');
	});
}
```

Also update the top-level bootstrap in `server.ts` so startup failures are logged properly:

```ts
try {
	await startServer();
} catch (error) {
	logger.fatal({ err: error }, 'Failed to start backend server');
	process.exit(1);
}
```

**Done when:** Startup, successful listen, and fatal boot failures all go through Pino.

---

### Step 6 - Add a centralized Express error logging middleware

**Focus:** Stop losing request context when a route fails.

Create a middleware file, recommended path:

- `server/middleware/errorHandler.ts`

Recommended responsibilities:

1. Log unhandled route failures through Pino.
2. Include `requestId`, method, URL, and status.
3. Avoid leaking stack traces to clients.
4. Return a stable JSON shape for unexpected server errors.

Recommended implementation shape:

```ts
import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.ts';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
	if (res.headersSent) {
		next(error);
		return;
	}

	logger.error(
		{
			err: error,
			requestId: res.locals.requestId,
			method: req.method,
			url: req.originalUrl,
		},
		'Unhandled request error',
	);

	res.status(500).json({
		error: 'Internal server error.',
		code: 'INTERNAL_SERVER_ERROR',
	});
};
```

Register this middleware after the route registrations.

Important limitation in the current codebase:

- Express 4 does not automatically catch errors thrown from async route handlers unless they are forwarded.
- Today, several routes already use `try/catch` and respond manually.
- That means this middleware should be added, but route handlers still need to either call `next(error)` or use a shared async wrapper if you want full centralization.

**Done when:** Unhandled backend request failures are logged once, with request context, and the client gets a stable 500 response.

---

### Step 7 - Replace current `console.*` calls in the main backend

**Focus:** Move real application events to Pino after the logging foundation is in place.

Current backend call sites to update in the main server scope:

1. `server/index.ts`
	 - Replace startup `console.log` with `logger.info`.
2. `server/routes/workflow.ts`
	 - Replace raw `console.error(error)` in the catch block.
	 - Log with route context and keep the current `jsonError(...)` response.
3. `server/routes/tasks.ts`
	 - Replace `console.error('Quick action request failed.', error)`.
	 - Log with task id, action, user id when available, and request id.
4. `server/services/syllabusService.ts`
	 - Replace the fallback `console.error(...)` with `logger.warn(...)` because the system is degrading gracefully, not crashing.

Recommended examples:

```ts
logger.error({ err: error, requestId: res.locals.requestId }, 'Workflow generation failed');
```

```ts
logger.warn({ err: error, goal, level }, 'Falling back to local syllabus generation');
```

Level guidance for these specific cases:

- `info`: startup complete, normal request completion, expected operational milestones
- `warn`: degraded but still functional path, such as syllabus fallback
- `error`: failed request or failed dependency call that surfaces as a 5xx
- `debug`: temporary local diagnostics only

**Done when:** The main backend started from `server/index.ts` no longer depends on `console.*` for runtime logging.

---

### Step 8 - Verify behavior before calling the rollout done

**Focus:** Confirm the logger is useful, not merely present.

Verification checklist:

1. Run typecheck:

```bash
npm run lint
```

2. Start the backend locally and confirm startup logs are emitted through Pino.

3. Hit `GET /healthz` and verify the request log shape.

4. Hit a normal authenticated route and confirm the log includes:
	 - method
	 - URL
	 - status
	 - response time
	 - request ID

5. Trigger an expected degraded path in `syllabusService.ts` and verify it logs at `warn`, not `error`.

6. Trigger a failing route path, for example by forcing a service error, and verify:
	 - one structured error log is emitted
	 - the request ID matches the HTTP request log
	 - the client receives the expected JSON error response

7. Confirm sensitive values do not appear in logs.

**Done when:** Logs are readable locally, structured for production, correlated per request, and do not leak sensitive fields.

---

## Best Practices To Keep

These rules should be treated as implementation requirements, not optional style preferences.

### Use log levels correctly

Do not make everything `info`.

- `debug`: noisy details for local development
- `info`: normal application flow
- `warn`: something unexpected happened, but the app is still running
- `error`: something failed and needs attention

### Avoid sensitive data

Never log passwords, credit card numbers, or full JWT tokens.

Use Pino redaction for fields such as:

- `authorization` headers
- password fields
- access and refresh tokens
- internal service tokens

Also avoid logging full request payloads unless there is a narrow, temporary debugging need.

### Prefer structured logs

Do this:

```ts
logger.warn({ userId: id }, 'Login failed');
```

Do not do this:

```ts
logger.info('User ' + id + ' failed to login');
```

Structured payloads are easier to query later in log platforms.

### Keep one sink

Morgan should not become a second logging system.

Use Morgan only for request lifecycle capture and forward those entries into Pino so the backend still emits through one logger.

### Log events, not noise

Good logs answer operational questions quickly:

- Did the server boot successfully?
- Which request failed?
- How long did the request take?
- Did the app take a fallback path?
- Which subsystem emitted the error?

If a log line does not help answer one of those questions, it probably does not belong at `info`.

---

## Recommended File Additions

If you want the cleanest structure, add these files:

- `server/utils/logger.ts`
- `server/middleware/requestContext.ts`
- `server/middleware/httpLogger.ts`
- `server/middleware/errorHandler.ts`

And update these existing files:

- `server/index.ts`
- `server.ts`
- `server/config/env.ts`
- `server/routes/workflow.ts`
- `server/routes/tasks.ts`
- `server/services/syllabusService.ts`

---

## Open Questions

No open questions at this time.

Resolved decisions already reflected in this document:

1. The scope is limited to the public backend started from `server/index.ts`.
2. Request correlation should be implemented now with `x-request-id`.