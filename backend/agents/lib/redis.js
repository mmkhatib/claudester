"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redisPub = exports.redis = void 0;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.isRedisConnected = isRedisConnected;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
// Create Redis clients
exports.redis = new ioredis_1.default({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    lazyConnect: true,
});
// Separate client for pub/sub (Bull uses this pattern)
exports.redisPub = new ioredis_1.default({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});
exports.redisSub = new ioredis_1.default({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});
// Connection management
let isConnected = false;
async function connectRedis() {
    if (isConnected) {
        return;
    }
    try {
        await Promise.all([
            exports.redis.connect(),
            exports.redisPub.connect(),
            exports.redisSub.connect(),
        ]);
        isConnected = true;
        logger_1.loggers.redis.info('Redis connected successfully');
    }
    catch (error) {
        logger_1.loggers.redis.error({ error }, 'Redis connection error');
        throw error;
    }
}
async function disconnectRedis() {
    if (!isConnected) {
        return;
    }
    try {
        await Promise.all([
            exports.redis.disconnect(),
            exports.redisPub.disconnect(),
            exports.redisSub.disconnect(),
        ]);
        isConnected = false;
        logger_1.loggers.redis.info('Redis disconnected');
    }
    catch (error) {
        logger_1.loggers.redis.error({ error }, 'Redis disconnection error');
        throw error;
    }
}
// Health check
function isRedisConnected() {
    return exports.redis.status === 'ready';
}
// Event handlers
exports.redis.on('error', (error) => {
    logger_1.loggers.redis.error({ error }, 'Redis client error');
});
exports.redis.on('connect', () => {
    logger_1.loggers.redis.debug('Redis client connected');
});
exports.redis.on('ready', () => {
    logger_1.loggers.redis.debug('Redis client ready');
});
exports.redisPub.on('error', (error) => {
    logger_1.loggers.redis.error({ error }, 'Redis pub client error');
});
exports.redisSub.on('error', (error) => {
    logger_1.loggers.redis.error({ error }, 'Redis sub client error');
});
exports.default = exports.redis;
