import Redis from 'ioredis';
import { loggers } from './logger';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create Redis clients
export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

// Separate client for pub/sub (Bull uses this pattern)
export const redisPub = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export const redisSub = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Connection management
let isConnected = false;

export async function connectRedis(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    await Promise.all([
      redis.connect(),
      redisPub.connect(),
      redisSub.connect(),
    ]);

    isConnected = true;
    loggers.redis.info('Redis connected successfully');
  } catch (error) {
    loggers.redis.error({ error }, 'Redis connection error');
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await Promise.all([
      redis.disconnect(),
      redisPub.disconnect(),
      redisSub.disconnect(),
    ]);

    isConnected = false;
    loggers.redis.info('Redis disconnected');
  } catch (error) {
    loggers.redis.error({ error }, 'Redis disconnection error');
    throw error;
  }
}

// Health check
export function isRedisConnected(): boolean {
  return redis.status === 'ready';
}

// Event handlers
redis.on('error', (error) => {
  loggers.redis.error({ error }, 'Redis client error');
});

redis.on('connect', () => {
  loggers.redis.debug('Redis client connected');
});

redis.on('ready', () => {
  loggers.redis.debug('Redis client ready');
});

redisPub.on('error', (error) => {
  loggers.redis.error({ error }, 'Redis pub client error');
});

redisSub.on('error', (error) => {
  loggers.redis.error({ error }, 'Redis sub client error');
});

export default redis;
