"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
exports.getEnv = getEnv;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.isTest = isTest;
const zod_1 = require("zod");
/**
 * Environment variable schema
 * Validates all required environment variables at application startup
 */
const envSchema = zod_1.z.object({
    // Application
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    NEXT_PUBLIC_APP_URL: zod_1.z.string().url().default('http://localhost:3000'),
    // Database
    MONGODB_URI: zod_1.z.string().min(1, 'MongoDB URI is required'),
    // Redis
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z.string().regex(/^\d+$/).transform(Number).default('6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    // Anthropic Claude API
    ANTHROPIC_API_KEY: zod_1.z.string().min(1, 'Anthropic API key is required'),
    // Authentication (Clerk)
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: zod_1.z.string().min(1, 'Clerk publishable key is required'),
    CLERK_SECRET_KEY: zod_1.z.string().min(1, 'Clerk secret key is required'),
    CLERK_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // WebSocket
    WEBSOCKET_PORT: zod_1.z.string().regex(/^\d+$/).transform(Number).default('3001'),
    // Agent Configuration
    MAX_CONCURRENT_AGENTS: zod_1.z.string().regex(/^\d+$/).transform(Number).default('5'),
    AGENT_MEMORY_LIMIT: zod_1.z.string().regex(/^\d+$/).transform(Number).default('2048'),
    AGENT_TIMEOUT: zod_1.z.string().regex(/^\d+$/).transform(Number).default('3600000'), // 1 hour in ms
});
/**
 * Validate and parse environment variables
 * This should be called at application startup
 */
function validateEnv() {
    try {
        const parsed = envSchema.parse(process.env);
        return parsed;
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
let cachedEnv = null;
function getEnv() {
    if (!cachedEnv) {
        cachedEnv = validateEnv();
    }
    return cachedEnv;
}
/**
 * Check if we're in development mode
 */
function isDevelopment() {
    return getEnv().NODE_ENV === 'development';
}
/**
 * Check if we're in production mode
 */
function isProduction() {
    return getEnv().NODE_ENV === 'production';
}
/**
 * Check if we're in test mode
 */
function isTest() {
    return getEnv().NODE_ENV === 'test';
}
// Validate environment variables at module load
const isServer = typeof process !== 'undefined' && process.versions && process.versions.node;
if (isServer) {
    // Only validate on server-side
    try {
        validateEnv();
        console.log('✅ Environment variables validated successfully');
    }
    catch (error) {
        // Error is already logged in validateEnv
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
    }
}
