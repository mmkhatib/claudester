import { connectDB } from '@/lib/mongodb';
import { Agent, Task, AgentStatus, TaskStatus } from '@/backend/models';
import { loggers } from '@/lib/logger';
import { agentSpawner } from './agent-spawner';
import { addAgentTask, JobPriority } from '@/lib/queue';
import { publishSystemAlert, publishActivityLog } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
}

class ErrorRecovery {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    backoffMultiplier: 2,
  };

  /**
   * Handle agent failure
   */
  async handleAgentFailure(
    agentId: string,
    error: Error,
    shouldRetry: boolean = true
  ): Promise<void> {
    loggers.agent.error(
      {
        agentId,
        error: error.message,
      },
      'Handling agent failure'
    );

    await connectDB();

    const agent = await Agent.findOne({ agentId }).populate('taskId');
    if (!agent) {
      loggers.agent.warn({ agentId }, 'Agent not found for failure handling');
      return;
    }

    // Update agent status
    agent.status = AgentStatus.FAILED;
    await agent.save();

    // Get task
    const task = await Task.findById(agent.taskId);
    if (!task) {
      loggers.agent.warn({ taskId: agent.taskId }, 'Task not found for failed agent');
      return;
    }

    // Increment retry count
    const retryCount = (task.metadata?.retryCount || 0) + 1;

    // Update task
    task.status = TaskStatus.FAILED;
    task.metadata = {
      ...task.metadata,
      retryCount,
      lastError: error.message,
      lastFailedAt: new Date(),
    };
    await task.save();

    // Publish failure event
    await publishActivityLog({
      eventType: EventType.AGENT_FAILED,
      agentId,
      taskId: task._id.toString(),
      specId: task.specId.toString(),
      message: `Agent failed: ${error.message}`,
      metadata: { error: error.message, retryCount },
    });

    // Publish alert
    await publishSystemAlert({
      level: 'error',
      message: `Agent ${agentId} failed`,
      metadata: {
        agentId,
        taskId: task._id.toString(),
        error: error.message,
        retryCount,
      },
    });

    // Attempt retry if enabled and not exceeded max retries
    if (shouldRetry && retryCount < this.defaultRetryConfig.maxRetries) {
      await this.retryTask(task, retryCount);
    } else if (retryCount >= this.defaultRetryConfig.maxRetries) {
      loggers.agent.error(
        {
          taskId: task._id.toString(),
          retryCount,
        },
        'Task failed - max retries exceeded'
      );

      await publishSystemAlert({
        level: 'error',
        message: `Task ${task._id} failed after ${retryCount} retries`,
        metadata: {
          taskId: task._id.toString(),
          specId: task.specId.toString(),
          description: task.description,
        },
      });
    }
  }

  /**
   * Retry a failed task
   */
  private async retryTask(task: any, retryCount: number): Promise<void> {
    const delay =
      this.defaultRetryConfig.retryDelay *
      Math.pow(this.defaultRetryConfig.backoffMultiplier, retryCount - 1);

    loggers.agent.info(
      {
        taskId: task._id.toString(),
        retryCount,
        delayMs: delay,
      },
      'Scheduling task retry'
    );

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Reset task status
    task.status = TaskStatus.PENDING;
    await task.save();

    // Re-queue the task
    await addAgentTask(
      {
        taskId: task._id.toString(),
        specId: task.specId.toString(),
        agentType: task.agentType || 'DEVELOPMENT',
        taskType: task.type,
        description: task.description,
        acceptanceCriteria: task.acceptanceCriteria || [],
        dependencies: task.dependencies || [],
        files: task.files || [],
        testRequirements: task.testRequirements,
        workspacePath: '',
        priority: 1, // High priority for retries
      },
      JobPriority.HIGH
    );

    await publishActivityLog({
      eventType: EventType.TASK_STARTED,
      taskId: task._id.toString(),
      specId: task.specId.toString(),
      message: `Task retry ${retryCount} scheduled`,
      metadata: { retryCount, delayMs: delay },
    });
  }

  /**
   * Handle task timeout
   */
  async handleTaskTimeout(taskId: string): Promise<void> {
    loggers.agent.warn({ taskId }, 'Handling task timeout');

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return;
    }

    // Find associated agent
    const agent = await Agent.findOne({
      taskId,
      status: { $in: [AgentStatus.RUNNING, AgentStatus.IDLE] },
    });

    if (agent) {
      // Stop the agent
      try {
        await agentSpawner.stopAgent(agent.agentId, 'timeout');
      } catch (error) {
        loggers.agent.error({ agentId: agent.agentId, error }, 'Failed to stop timed out agent');
      }
    }

    // Handle as failure
    await this.handleAgentFailure(
      agent?.agentId || 'unknown',
      new Error('Task execution timeout'),
      true
    );
  }

  /**
   * Recover stalled tasks
   */
  async recoverStalledTasks(): Promise<void> {
    loggers.agent.info('Recovering stalled tasks');

    await connectDB();

    // Find tasks that are in progress but have no active agent
    const stalledTasks = await Task.find({
      status: TaskStatus.IN_PROGRESS,
    });

    for (const task of stalledTasks) {
      const agent = await Agent.findOne({
        taskId: task._id,
        status: { $in: [AgentStatus.RUNNING, AgentStatus.IDLE] },
      });

      if (!agent) {
        // Task is in progress but has no active agent - recover it
        loggers.agent.warn(
          {
            taskId: task._id.toString(),
          },
          'Found stalled task - recovering'
        );

        task.status = TaskStatus.PENDING;
        await task.save();

        // Re-queue the task
        await addAgentTask(
          {
            taskId: task._id.toString(),
            specId: task.specId.toString(),
            agentType: task.agentType || 'DEVELOPMENT',
            taskType: task.type,
            description: task.description,
            acceptanceCriteria: task.acceptanceCriteria || [],
            dependencies: task.dependencies || [],
            files: task.files || [],
            testRequirements: task.testRequirements,
            workspacePath: '',
            priority: 2,
          },
          JobPriority.HIGH
        );

        await publishSystemAlert({
          level: 'warning',
          message: `Recovered stalled task ${task._id}`,
          metadata: {
            taskId: task._id.toString(),
            description: task.description,
          },
        });
      }
    }
  }

  /**
   * Clean up failed agents and tasks
   */
  async cleanup(olderThanDays: number = 7): Promise<void> {
    loggers.agent.info({ olderThanDays }, 'Cleaning up failed agents and tasks');

    await connectDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Delete old failed agents
    const deletedAgents = await Agent.deleteMany({
      status: AgentStatus.FAILED,
      updatedAt: { $lt: cutoffDate },
    });

    loggers.agent.info(
      {
        count: deletedAgents.deletedCount,
      },
      'Cleaned up failed agents'
    );
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(): Promise<any> {
    await connectDB();

    const [failedTasks, failedAgents, retriedTasks] = await Promise.all([
      Task.countDocuments({ status: TaskStatus.FAILED }),
      Agent.countDocuments({ status: AgentStatus.FAILED }),
      Task.countDocuments({ 'metadata.retryCount': { $gt: 0 } }),
    ]);

    return {
      failedTasks,
      failedAgents,
      retriedTasks,
      maxRetries: this.defaultRetryConfig.maxRetries,
    };
  }
}

// Singleton instance
export const errorRecovery = new ErrorRecovery();

// Run recovery check periodically
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    errorRecovery.recoverStalledTasks().catch((error) => {
      loggers.agent.error({ error }, 'Failed to recover stalled tasks');
    });
  }, 5 * 60 * 1000); // Every 5 minutes
}
