import morgan from 'morgan';
import { logger } from '../utils/logger.ts';

const httpLoggerSink = logger.child({ scope: 'http' });

morgan.token('request-id', (_req, res) => String(res.getHeader('x-request-id') ?? ''));

function parseNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const httpLogger = morgan(
  (tokens, req, res) =>
    JSON.stringify({
      requestId: tokens['request-id'](req, res),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res) ?? 0),
      responseTimeMs: Number(tokens['response-time'](req, res) ?? 0),
      contentLength: parseNumber(tokens.res(req, res, 'content-length')),
      remoteAddr: tokens['remote-addr'](req, res) ?? null,
      userAgent: tokens['user-agent'](req, res) ?? null,
    }),
  {
    stream: {
      write(message) {
        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
          return;
        }

        try {
          const payload = JSON.parse(trimmedMessage) as {
            status?: number;
          };
          const level = payload.status && payload.status >= 500
            ? 'error'
            : payload.status && payload.status >= 400
              ? 'warn'
              : 'info';

          httpLoggerSink[level]({ http: payload }, 'HTTP request completed');
        } catch (error) {
          httpLoggerSink.warn(
            {
              err: error,
              rawMessage: trimmedMessage,
            },
            'Failed to parse HTTP log payload',
          );
        }
      },
    },
  },
);