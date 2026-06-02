/**
 * Central structured logger for TurfBook RN app.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('LOGIN_SUCCESS', { userId: 42, role: 'PLAYER' });
 *   logger.warn('OTP_INVALID_CODE', { attemptsLeft: 3 });
 *   logger.error('API_ERROR', { status: 500, url: '/api/v1/bookings' }, err);
 *
 * Rules:
 *  - debug/trace only emit in __DEV__ builds — silent in production.
 *  - Never pass raw email, phone, token, OTP, or password in the context object.
 *    Use mask.ts helpers before passing identifiers.
 *  - Each log line includes: level, timestamp (ms), correlationId (if set), event, context.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

type LogContext = Record<string, unknown>;

let _correlationId: string | null = null;
let _screen: string | null = null;

/** Called by the API client on each request to bind the active correlationId. */
export function setCorrelationId(id: string | null) {
  _correlationId = id;
}

/** Called by the navigation logger on screen change. */
export function setCurrentScreen(name: string | null) {
  _screen = name;
}

function emit(level: LogLevel, event: string, ctx?: LogContext, err?: unknown) {
  const entry: Record<string, unknown> = {
    ts: Date.now(),
    level,
    event,
    ...((_correlationId) ? { cid: _correlationId } : {}),
    ...((_screen) ? { screen: _screen } : {}),
    ...ctx,
  };

  const msg = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(msg, err ?? '');
      break;
    case 'warn':
      console.warn(msg);
      break;
    case 'debug':
      if (__DEV__) console.debug(msg);
      break;
    default:
      console.log(msg);
  }
}

export const logger = {
  error: (event: string, ctx?: LogContext, err?: unknown) => emit('error', event, ctx, err),
  warn:  (event: string, ctx?: LogContext)               => emit('warn',  event, ctx),
  info:  (event: string, ctx?: LogContext)               => emit('info',  event, ctx),
  /** Only emits in __DEV__ — completely silent in production builds. */
  debug: (event: string, ctx?: LogContext)               => emit('debug', event, ctx),
};
