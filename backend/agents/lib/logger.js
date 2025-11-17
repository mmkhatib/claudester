"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = exports.logger = void 0;
exports.createLogger = createLogger;
exports.logRequest = logRequest;
exports.logDatabase = logDatabase;
exports.logAgent = logAgent;
exports.logQueue = logQueue;
exports.logAuth = logAuth;
exports.logError = logError;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("./env");
/**
 * Create a Pino logger instance
 * In development: pretty-print with colors
 * In production: JSON format for log aggregation
 */
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || ((0, env_1.isDevelopment)() ? 'debug' : 'info'),
    ...((0, env_1.isDevelopment)()
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
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
});
/**
 * Create a child logger with a specific context
 */
function createLogger(context, bindings) {
    return exports.logger.child({ context, ...bindings });
}
/**
 * Logger instances for different modules
 */
exports.loggers = {
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
function logRequest(method, path, statusCode, duration, error) {
    const log = {
        method,
        path,
        statusCode,
        duration,
    };
    if (error) {
        exports.loggers.api.error({ ...log, error: error.message || error }, 'API request failed');
    }
    else if (statusCode && statusCode >= 400) {
        exports.loggers.api.warn(log, 'API request warning');
    }
    else {
        exports.loggers.api.info(log, 'API request completed');
    }
}
/**
 * Log database operations
 */
function logDatabase(operation, details) {
    exports.loggers.db.info({ operation, ...details }, 'Database operation');
}
/**
 * Log agent operations
 */
function logAgent(agentId, operation, details) {
    exports.loggers.agent.info({ agentId, operation, ...details }, 'Agent operation');
}
/**
 * Log queue operations
 */
function logQueue(queue, operation, details) {
    exports.loggers.queue.info({ queue, operation, ...details }, 'Queue operation');
}
/**
 * Log authentication events
 */
function logAuth(userId, event, details) {
    exports.loggers.auth.info({ userId, event, ...details }, 'Auth event');
}
/**
 * Log errors with full context
 */
function logError(error, context, details) {
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
    exports.logger.error(errorInfo, 'Application error');
}
exports.default = exports.logger;
