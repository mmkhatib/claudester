import Bull, { Queue, Job, JobOptions } from 'bull';
import { redis, redisPub, redisSub } from './redis';
import { loggers } from './logger';

// Queue options
const queueOptions = {
  createClient: (type: 'client' | 'subscriber' | 'bclient') => {
    switch (type) {
      case 'client':
        return redis;
      case 'subscriber':
        return redisSub;
      case 'bclient':
        return redisPub;
      default:
        return redis;
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

// Agent task queue
export interface AgentTaskData {
  taskId: string;
  specId: string;
  agentType: 'DEVELOPMENT' | 'TEST' | 'TDD';
  taskType: 'DEVELOPMENT' | 'TEST' | 'TDD';
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  files: string[];
  testRequirements?: {
    coverageThreshold: number;
    requiredTests: string[];
  };
  workspacePath: string;
  priority: number; // Lower number = higher priority
}

export const agentTaskQueue: Queue<AgentTaskData> = new Bull('agent-tasks', queueOptions);

// Test execution queue
export interface TestTaskData {
  taskId: string;
  specId: string;
  agentId: string;
  testSuite: string;
  testFiles: string[];
  workspacePath: string;
}

export const testQueue: Queue<TestTaskData> = new Bull('test-execution', queueOptions);

// Spec processing queue (for background spec analysis)
export interface SpecProcessingData {
  specId: string;
  phase: 'REQUIREMENTS' | 'DESIGN' | 'TASKS';
  content: any;
  userId: string;
}

export const specQueue: Queue<SpecProcessingData> = new Bull('spec-processing', queueOptions);

// Job priority levels
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

// Helper functions
export async function addAgentTask(
  data: AgentTaskData,
  priority: JobPriority = JobPriority.NORMAL
): Promise<Job<AgentTaskData>> {
  const jobOptions: JobOptions = {
    priority,
    jobId: data.taskId, // Use taskId as job ID for idempotency
  };

  return agentTaskQueue.add(data, jobOptions);
}

export async function addTestTask(
  data: TestTaskData,
  priority: JobPriority = JobPriority.HIGH
): Promise<Job<TestTaskData>> {
  const jobOptions: JobOptions = {
    priority,
    jobId: `test-${data.taskId}`,
  };

  return testQueue.add(data, jobOptions);
}

export async function addSpecProcessing(
  data: SpecProcessingData,
  priority: JobPriority = JobPriority.NORMAL
): Promise<Job<SpecProcessingData>> {
  const jobOptions: JobOptions = {
    priority,
    jobId: `spec-${data.specId}-${data.phase}`,
  };

  return specQueue.add(data, jobOptions);
}

// Queue status monitoring
export async function getQueueStats() {
  const [agentStats, testStats, specStats] = await Promise.all([
    getQueueCounts(agentTaskQueue),
    getQueueCounts(testQueue),
    getQueueCounts(specQueue),
  ]);

  return {
    agentTasks: agentStats,
    tests: testStats,
    specs: specStats,
  };
}

async function getQueueCounts(queue: Queue) {
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
export async function cleanQueues() {
  await Promise.all([
    agentTaskQueue.clean(24 * 3600 * 1000, 'completed'), // Clean completed jobs older than 24h
    agentTaskQueue.clean(7 * 24 * 3600 * 1000, 'failed'), // Clean failed jobs older than 7 days
    testQueue.clean(24 * 3600 * 1000, 'completed'),
    testQueue.clean(7 * 24 * 3600 * 1000, 'failed'),
    specQueue.clean(24 * 3600 * 1000, 'completed'),
    specQueue.clean(7 * 24 * 3600 * 1000, 'failed'),
  ]);
}

// Event listeners for monitoring
agentTaskQueue.on('completed', (job) => {
  loggers.queue.info({ jobId: job.id }, 'Agent task completed');
});

agentTaskQueue.on('failed', (job, err) => {
  loggers.queue.error({ jobId: job?.id, error: err.message }, 'Agent task failed');
});

agentTaskQueue.on('stalled', (job) => {
  loggers.queue.warn({ jobId: job.id }, 'Agent task stalled');
});

testQueue.on('completed', (job) => {
  loggers.queue.info({ jobId: job.id }, 'Test task completed');
});

testQueue.on('failed', (job, err) => {
  loggers.queue.error({ jobId: job?.id, error: err.message }, 'Test task failed');
});

specQueue.on('completed', (job) => {
  loggers.queue.info({ jobId: job.id }, 'Spec processing completed');
});

specQueue.on('failed', (job, err) => {
  loggers.queue.error({ jobId: job?.id, error: err.message }, 'Spec processing failed');
});

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    agentTaskQueue.close(),
    testQueue.close(),
    specQueue.close(),
  ]);
  loggers.queue.info('All queues closed');
}
