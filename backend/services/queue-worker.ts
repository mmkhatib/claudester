import { Job } from 'bull';
import { connectDB } from '@/lib/mongodb';
import { Agent, Task, Spec, AgentStatus, TaskStatus } from '@/backend/models';
import { loggers } from '@/lib/logger';
import { agentTaskQueue, testQueue, specQueue, type AgentTaskData, type TestTaskData, type SpecProcessingData } from '@/lib/queue';
import { agentSpawner } from './agent-spawner';
import { publishActivityLog, publishTaskUpdate, publishAgentUpdate } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

class QueueWorker {
  private isRunning = false;
  private concurrency: number;

  constructor(concurrency: number = 5) {
    this.concurrency = concurrency;
  }

  /**
   * Start processing queues
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      loggers.queue.warn('Queue worker already running');
      return;
    }

    this.isRunning = true;
    loggers.queue.info({ concurrency: this.concurrency }, 'Starting queue worker');

    await connectDB();

    // Process agent tasks
    agentTaskQueue.process(this.concurrency, async (job: Job<AgentTaskData>) => {
      return this.processAgentTask(job);
    });

    // Process test tasks
    testQueue.process(this.concurrency, async (job: Job<TestTaskData>) => {
      return this.processTestTask(job);
    });

    // Process spec processing tasks
    specQueue.process(2, async (job: Job<SpecProcessingData>) => {
      return this.processSpec(job);
    });

    loggers.queue.info('Queue worker started successfully');
  }

  /**
   * Stop processing queues
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    loggers.queue.info('Stopping queue worker');
    this.isRunning = false;

    // Close queues
    await Promise.all([
      agentTaskQueue.close(),
      testQueue.close(),
      specQueue.close(),
    ]);

    // Stop all running agents
    await agentSpawner.stopAllAgents();

    loggers.queue.info('Queue worker stopped');
  }

  /**
   * Process agent task
   */
  private async processAgentTask(job: Job<AgentTaskData>): Promise<any> {
    const { taskId, agentType, description, priority } = job.data;

    loggers.queue.info(
      {
        jobId: job.id,
        taskId,
        agentType,
        priority,
      },
      'Processing agent task'
    );

    await connectDB();

    try {
      // Update job progress
      await job.progress(10);

      // Get task from database
      const task = await Task.findById(taskId).populate('specId');

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Check if task is already being processed
      const existingAgent = await Agent.findOne({
        taskId,
        status: { $in: [AgentStatus.IDLE, AgentStatus.RUNNING] },
      });

      if (existingAgent) {
        loggers.queue.warn({ taskId, agentId: existingAgent.agentId }, 'Task already has active agent');
        return { status: 'already_processing', agentId: existingAgent.agentId };
      }

      await job.progress(20);

      // Wait for agent slot if necessary
      while (!agentSpawner.canSpawnAgent()) {
        loggers.queue.debug({ taskId }, 'Waiting for available agent slot');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      await job.progress(30);

      // Spawn agent
      const agentId = await agentSpawner.spawnAgent({
        taskId,
        agentType,
        workspacePath: '', // Will be created
        files: job.data.files,
        description: job.data.description,
        acceptanceCriteria: job.data.acceptanceCriteria,
      });

      await job.progress(50);

      // Publish updates
      await publishTaskUpdate({
        taskId,
        specId: task.specId.toString(),
        status: TaskStatus.IN_PROGRESS,
        agentId,
      });

      await publishAgentUpdate({
        agentId,
        status: AgentStatus.RUNNING,
        taskId,
      });

      await publishActivityLog({
        eventType: EventType.AGENT_STARTED,
        taskId,
        agentId,
        specId: task.specId.toString(),
        message: `Agent ${agentId} started for task: ${task.description}`,
      });

      await job.progress(100);

      loggers.queue.info({ jobId: job.id, taskId, agentId }, 'Agent task processed successfully');

      return {
        status: 'success',
        agentId,
        taskId,
      };
    } catch (error) {
      loggers.queue.error(
        {
          jobId: job.id,
          taskId,
          error,
        },
        'Failed to process agent task'
      );

      // Update task status to failed
      const task = await Task.findById(taskId);
      if (task) {
        task.status = TaskStatus.FAILED;
        await task.save();

        await publishTaskUpdate({
          taskId,
          specId: task.specId.toString(),
          status: TaskStatus.FAILED,
        });

        await publishActivityLog({
          eventType: EventType.TASK_FAILED,
          taskId,
          specId: task.specId.toString(),
          message: `Task failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      throw error;
    }
  }

  /**
   * Process test task
   */
  private async processTestTask(job: Job<TestTaskData>): Promise<any> {
    const { taskId, specId, agentId, testSuite, testFiles } = job.data;

    loggers.queue.info(
      {
        jobId: job.id,
        taskId,
        testSuite,
      },
      'Processing test task'
    );

    await connectDB();

    try {
      await job.progress(10);

      // Get task
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      await job.progress(30);

      // TODO: Implement test execution
      // This will:
      // 1. Set up test environment
      // 2. Run test suite
      // 3. Collect results
      // 4. Store in TestResult collection
      // 5. Update task with test results

      await job.progress(70);

      // Publish test results
      await publishActivityLog({
        eventType: EventType.TEST_PASSED,
        taskId,
        specId,
        message: `Tests passed for task: ${task.description}`,
      });

      await job.progress(100);

      loggers.queue.info({ jobId: job.id, taskId }, 'Test task processed successfully');

      return {
        status: 'success',
        taskId,
      };
    } catch (error) {
      loggers.queue.error(
        {
          jobId: job.id,
          taskId,
          error,
        },
        'Failed to process test task'
      );

      await publishActivityLog({
        eventType: EventType.TEST_FAILED,
        taskId,
        specId,
        message: `Tests failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      throw error;
    }
  }

  /**
   * Process spec
   */
  private async processSpec(job: Job<SpecProcessingData>): Promise<any> {
    const { specId, phase, content, userId } = job.data;

    loggers.queue.info(
      {
        jobId: job.id,
        specId,
        phase,
      },
      'Processing spec'
    );

    await connectDB();

    try {
      await job.progress(10);

      // Get spec
      const spec = await Spec.findById(specId);
      if (!spec) {
        throw new Error(`Spec ${specId} not found`);
      }

      await job.progress(30);

      // TODO: Implement spec processing
      // This will:
      // 1. Analyze spec content based on phase
      // 2. Generate tasks if in TASKS phase
      // 3. Validate requirements/design
      // 4. Update spec document

      await job.progress(70);

      // Publish spec update
      await publishActivityLog({
        eventType: EventType.SPEC_UPDATED,
        specId,
        message: `Spec ${phase} phase processing completed`,
      });

      await job.progress(100);

      loggers.queue.info({ jobId: job.id, specId }, 'Spec processed successfully');

      return {
        status: 'success',
        specId,
        phase,
      };
    } catch (error) {
      loggers.queue.error(
        {
          jobId: job.id,
          specId,
          error,
        },
        'Failed to process spec'
      );

      throw error;
    }
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      concurrency: this.concurrency,
      activeAgents: agentSpawner.getActiveAgentCount(),
    };
  }
}

// Singleton instance
export const queueWorker = new QueueWorker();

// Start worker on module load
if (process.env.NODE_ENV !== 'test') {
  queueWorker.start().catch((error) => {
    loggers.queue.error({ error }, 'Failed to start queue worker');
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  loggers.queue.info('Received SIGTERM, shutting down gracefully');
  await queueWorker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  loggers.queue.info('Received SIGINT, shutting down gracefully');
  await queueWorker.stop();
  process.exit(0);
});
