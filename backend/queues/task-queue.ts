import Queue from 'bull';
import { redis } from '@/lib/redis';
import { loggers } from '@/lib/logger';
import { taskExecutor } from '@/backend/services/task-executor';
import { connectDB } from '@/lib/mongodb';
import { Task, TaskStatus } from '@/backend/models';
import { publishTaskUpdate } from '@/lib/pubsub';

interface TaskJobData {
  taskId: string;
  specId: string;
  projectId?: string;
  type: string;
  priority: number;
}

class TaskQueue {
  private queue: Queue.Queue<TaskJobData>;

  constructor() {
    this.queue = new Queue<TaskJobData>('task-execution', {
      redis: {
        host: redis.options?.host as string,
        port: redis.options?.port as number,
        password: redis.options?.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.setupProcessor();
    this.setupEventHandlers();

    loggers.agent.info('Task queue initialized');
  }

  /**
   * Setup queue processor
   */
  private setupProcessor(): void {
    this.queue.process(async (job) => {
      const { taskId, specId, projectId } = job.data;

      loggers.agent.info(
        {
          jobId: job.id,
          taskId,
          specId,
        },
        'Processing task job'
      );

      try {
        // Check if dependencies are met
        const dependenciesMet = await taskExecutor.checkDependencies(taskId);

        if (!dependenciesMet) {
          loggers.agent.warn(
            { taskId },
            'Task dependencies not met, marking as blocked'
          );

          await connectDB();
          const task = await Task.findById(taskId);
          if (task) {
            task.status = TaskStatus.BLOCKED;
            await task.save();

            await publishTaskUpdate({
              taskId,
              specId,
              projectId,
              status: TaskStatus.BLOCKED,
            });
          }

          throw new Error('Task dependencies not met');
        }

        // Execute the task
        const result = await taskExecutor.executeTask({
          taskId,
        });

        // Update progress
        await job.progress(100);

        loggers.agent.info(
          {
            jobId: job.id,
            taskId,
            success: result.success,
          },
          'Task job completed'
        );

        return result;
      } catch (error: any) {
        loggers.agent.error(
          {
            jobId: job.id,
            taskId,
            error: error.message,
          },
          'Task job failed'
        );

        throw error;
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.queue.on('completed', (job, result) => {
      loggers.agent.info(
        {
          jobId: job.id,
          taskId: job.data.taskId,
          duration: result.duration,
        },
        'Task job completed successfully'
      );
    });

    this.queue.on('failed', (job, error) => {
      loggers.agent.error(
        {
          jobId: job?.id,
          taskId: job?.data.taskId,
          error: error.message,
          attempts: job?.attemptsMade,
        },
        'Task job failed'
      );
    });

    this.queue.on('stalled', (job) => {
      loggers.agent.warn(
        {
          jobId: job.id,
          taskId: job.data.taskId,
        },
        'Task job stalled'
      );
    });

    this.queue.on('error', (error) => {
      loggers.agent.error(
        {
          error: error.message,
        },
        'Task queue error'
      );
    });
  }

  /**
   * Add a task to the queue
   */
  async addTask(data: TaskJobData, options?: Queue.JobOptions): Promise<Queue.Job<TaskJobData>> {
    const job = await this.queue.add(data, {
      priority: data.priority || 5,
      ...options,
    });

    loggers.agent.info(
      {
        jobId: job.id,
        taskId: data.taskId,
        priority: data.priority,
      },
      'Task added to queue'
    );

    return job;
  }

  /**
   * Add multiple tasks to the queue
   */
  async addTasks(tasks: TaskJobData[], options?: Queue.JobOptions): Promise<Queue.Job<TaskJobData>[]> {
    const jobs = await Promise.all(
      tasks.map((task) => this.addTask(task, options))
    );

    loggers.agent.info(
      {
        count: tasks.length,
      },
      'Multiple tasks added to queue'
    );

    return jobs;
  }

  /**
   * Get job by task ID
   */
  async getJobByTaskId(taskId: string): Promise<Queue.Job<TaskJobData> | null> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
    return jobs.find((job) => job.data.taskId === taskId) || null;
  }

  /**
   * Remove a task from the queue
   */
  async removeTask(taskId: string): Promise<boolean> {
    const job = await this.getJobByTaskId(taskId);
    if (job) {
      await job.remove();
      loggers.agent.info({ taskId, jobId: job.id }, 'Task removed from queue');
      return true;
    }
    return false;
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    loggers.agent.info('Task queue paused');
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    loggers.agent.info('Task queue resumed');
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanup(grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.queue.clean(grace, 'completed');
    await this.queue.clean(grace, 'failed');
    loggers.agent.info({ grace }, 'Task queue cleaned');
  }

  /**
   * Get the underlying Bull queue
   */
  getQueue(): Queue.Queue<TaskJobData> {
    return this.queue;
  }
}

// Singleton instance
export const taskQueue = new TaskQueue();
