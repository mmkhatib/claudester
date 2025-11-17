"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobPriority = exports.specQueue = exports.testQueue = exports.agentTaskQueue = void 0;
exports.addAgentTask = addAgentTask;
exports.addTestTask = addTestTask;
exports.addSpecProcessing = addSpecProcessing;
exports.getQueueStats = getQueueStats;
exports.cleanQueues = cleanQueues;
exports.closeQueues = closeQueues;
const bull_1 = __importDefault(require("bull"));
const redis_1 = require("./redis");
const logger_1 = require("./logger");
// Queue options
const queueOptions = {
    createClient: (type) => {
        switch (type) {
            case 'client':
                return redis_1.redis;
            case 'subscriber':
                return redis_1.redisSub;
            case 'bclient':
                return redis_1.redisPub;
            default:
                return redis_1.redis;
        }
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
    },
};
exports.agentTaskQueue = new bull_1.default('agent-tasks', queueOptions);
exports.testQueue = new bull_1.default('test-execution', queueOptions);
exports.specQueue = new bull_1.default('spec-processing', queueOptions);
// Job priority levels
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["CRITICAL"] = 1] = "CRITICAL";
    JobPriority[JobPriority["HIGH"] = 2] = "HIGH";
    JobPriority[JobPriority["NORMAL"] = 3] = "NORMAL";
    JobPriority[JobPriority["LOW"] = 4] = "LOW";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
// Helper functions
async function addAgentTask(data, priority = JobPriority.NORMAL) {
    const jobOptions = {
        priority,
        jobId: data.taskId, // Use taskId as job ID for idempotency
    };
    return exports.agentTaskQueue.add(data, jobOptions);
}
async function addTestTask(data, priority = JobPriority.HIGH) {
    const jobOptions = {
        priority,
        jobId: `test-${data.taskId}`,
    };
    return exports.testQueue.add(data, jobOptions);
}
async function addSpecProcessing(data, priority = JobPriority.NORMAL) {
    const jobOptions = {
        priority,
        jobId: `spec-${data.specId}-${data.phase}`,
    };
    return exports.specQueue.add(data, jobOptions);
}
// Queue status monitoring
async function getQueueStats() {
    const [agentStats, testStats, specStats] = await Promise.all([
        getQueueCounts(exports.agentTaskQueue),
        getQueueCounts(exports.testQueue),
        getQueueCounts(exports.specQueue),
    ]);
    return {
        agentTasks: agentStats,
        tests: testStats,
        specs: specStats,
    };
}
async function getQueueCounts(queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
}
// Clean up old jobs
async function cleanQueues() {
    await Promise.all([
        exports.agentTaskQueue.clean(24 * 3600 * 1000, 'completed'), // Clean completed jobs older than 24h
        exports.agentTaskQueue.clean(7 * 24 * 3600 * 1000, 'failed'), // Clean failed jobs older than 7 days
        exports.testQueue.clean(24 * 3600 * 1000, 'completed'),
        exports.testQueue.clean(7 * 24 * 3600 * 1000, 'failed'),
        exports.specQueue.clean(24 * 3600 * 1000, 'completed'),
        exports.specQueue.clean(7 * 24 * 3600 * 1000, 'failed'),
    ]);
}
// Event listeners for monitoring
exports.agentTaskQueue.on('completed', (job) => {
    logger_1.loggers.queue.info({ jobId: job.id }, 'Agent task completed');
});
exports.agentTaskQueue.on('failed', (job, err) => {
    logger_1.loggers.queue.error({ jobId: job?.id, error: err.message }, 'Agent task failed');
});
exports.agentTaskQueue.on('stalled', (job) => {
    logger_1.loggers.queue.warn({ jobId: job.id }, 'Agent task stalled');
});
exports.testQueue.on('completed', (job) => {
    logger_1.loggers.queue.info({ jobId: job.id }, 'Test task completed');
});
exports.testQueue.on('failed', (job, err) => {
    logger_1.loggers.queue.error({ jobId: job?.id, error: err.message }, 'Test task failed');
});
exports.specQueue.on('completed', (job) => {
    logger_1.loggers.queue.info({ jobId: job.id }, 'Spec processing completed');
});
exports.specQueue.on('failed', (job, err) => {
    logger_1.loggers.queue.error({ jobId: job?.id, error: err.message }, 'Spec processing failed');
});
// Graceful shutdown
async function closeQueues() {
    await Promise.all([
        exports.agentTaskQueue.close(),
        exports.testQueue.close(),
        exports.specQueue.close(),
    ]);
    logger_1.loggers.queue.info('All queues closed');
}
