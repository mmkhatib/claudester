import pino from 'pino';
import { isDevelopment } from './env';

/**
 * Create a Pino logger instance
 * In development: pretty-print with colors
 * In production: JSON format for log aggregation
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment() ? 'debug' : 'info'),
  ...(isDevelopment()
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      }
    : {}),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with a specific context
 */
export function createLogger(context: string, bindings?: Record<string, any>) {
  return logger.child({ context, ...bindings });
}

/**
 * Logger instances for different modules
 */
export const loggers = {
  api: createLogger('api'),
  db: createLogger('database'),
  redis: createLogger('redis'),
  queue: createLogger('queue'),
  agent: createLogger('agent'),
  auth: createLogger('auth'),
  websocket: createLogger('websocket'),
};

/**
 * Log request/response for API routes
 */
export function logRequest(
  method: string,
  path: string,
  statusCode?: number,
  duration?: number,
  error?: any
) {
  const log = {
    method,
    path,
    statusCode,
    duration,
  };

  if (error) {
    loggers.api.error({ ...log, error: error.message || error }, 'API request failed');
  } else if (statusCode && statusCode >= 400) {
    loggers.api.warn(log, 'API request warning');
  } else {
    loggers.api.info(log, 'API request completed');
  }
}

/**
 * Log database operations
 */
export function logDatabase(operation: string, details?: any) {
  loggers.db.info({ operation, ...details }, 'Database operation');
}

/**
 * Log agent operations
 */
export function logAgent(
  agentId: string,
  operation: string,
  details?: any
) {
  loggers.agent.info({ agentId, operation, ...details }, 'Agent operation');
}

/**
 * Log queue operations
 */
export function logQueue(
  queue: string,
  operation: string,
  details?: any
) {
  loggers.queue.info({ queue, operation, ...details }, 'Queue operation');
}

/**
 * Log authentication events
 */
export function logAuth(
  userId: string | undefined,
  event: string,
  details?: any
) {
  loggers.auth.info({ userId, event, ...details }, 'Auth event');
}

/**
 * Log errors with full context
 */
export function logError(
  error: Error | any,
  context?: string,
  details?: any
) {
  const errorInfo = {
    error: {
      message: error.message || String(error),
      stack: error.stack,
      name: error.name,
      code: error.code,
    },
    context,
    ...details,
  };

  logger.error(errorInfo, 'Application error');
}

export default logger;
