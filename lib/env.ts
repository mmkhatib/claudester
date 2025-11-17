import { z } from 'zod';

/**
 * Environment variable schema
 * Validates all required environment variables at application startup
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Anthropic Claude API
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required'),

  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key is required'),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // WebSocket
  WEBSOCKET_PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),

  // Agent Configuration
  MAX_CONCURRENT_AGENTS: z.string().regex(/^\d+$/).transform(Number).default('5'),
  AGENT_MEMORY_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('2048'),
  AGENT_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('3600000'), // 1 hour in ms
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * This should be called at application startup
 */
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Memoized to avoid repeated validation
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}

// Validate environment variables at module load
if (typeof window === 'undefined') {
  // Only validate on server-side
  try {
    validateEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    // Error is already logged in validateEnv
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}
