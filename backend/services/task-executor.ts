import { connectDB } from '@/lib/mongodb';
import { Task, TaskStatus, Agent, AgentStatus, Spec } from '@/backend/models';
import { loggers } from '@/lib/logger';
import { publishActivityLog, publishTaskUpdate } from '@/lib/pubsub';
import { EventType, TaskType } from '@/backend/models';
import { agentSpawner } from './agent-spawner';
import { claudeClient } from './claude-client';
import type { Types } from 'mongoose';

interface TaskExecutionConfig {
  taskId: string;
  agentId?: string;
  context?: Record<string, any>;
}

interface TaskExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  artifacts?: string[];
  duration: number;
}

class TaskExecutor {
  /**
   * Execute a task
   */
  async executeTask(config: TaskExecutionConfig): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    await connectDB();

    const task = await Task.findById(config.taskId)
      .populate('specId')
      .populate('projectId');

    if (!task) {
      throw new Error(`Task ${config.taskId} not found`);
    }

    loggers.agent.info(
      {
        taskId: config.taskId,
        type: task.type,
        title: task.title,
      },
      'Starting task execution'
    );

    try {
      // Update task status
      task.status = TaskStatus.IN_PROGRESS;
      task.startedAt = new Date();
      await task.save();

      await publishTaskUpdate({
        taskId: task._id.toString(),
        specId: task.specId._id.toString(),
        projectId: task.projectId?._id.toString(),
        status: task.status,
        progress: 0,
      });

      // Execute based on task type
      let result: any;
      switch (task.type) {
        case TaskType.DEVELOPMENT:
          result = await this.executeDevelopmentTask(task);
          break;
        case TaskType.TESTING:
          result = await this.executeTestingTask(task);
          break;
        case TaskType.REVIEW:
          result = await this.executeReviewTask(task);
          break;
        case TaskType.DOCUMENTATION:
          result = await this.executeDocumentationTask(task);
          break;
        case TaskType.DEPLOYMENT:
          result = await this.executeDeploymentTask(task);
          break;
        default:
          result = await this.executeGenericTask(task);
      }

      // Update task as completed
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.progress = 100;
      task.result = result;
      task.actualHours = (Date.now() - startTime) / (1000 * 60 * 60); // Convert to hours
      await task.save();

      const duration = Date.now() - startTime;

      await publishTaskUpdate({
        taskId: task._id.toString(),
        specId: task.specId._id.toString(),
        projectId: task.projectId?._id.toString(),
        status: task.status,
        progress: 100,
      });

      await publishActivityLog({
        eventType: EventType.TASK_COMPLETED,
        taskId: task._id.toString(),
        specId: task.specId._id.toString(),
        message: `Task completed: ${task.title}`,
        metadata: {
          duration,
          type: task.type,
        },
      });

      loggers.agent.info(
        {
          taskId: config.taskId,
          duration,
        },
        'Task execution completed'
      );

      return {
        success: true,
        result,
        duration,
      };
    } catch (error: any) {
      // Update task as failed
      task.status = TaskStatus.FAILED;
      task.error = error.message;
      await task.save();

      const duration = Date.now() - startTime;

      await publishTaskUpdate({
        taskId: task._id.toString(),
        specId: task.specId._id.toString(),
        projectId: task.projectId?._id.toString(),
        status: task.status,
      });

      await publishActivityLog({
        eventType: EventType.TASK_UPDATED,
        taskId: task._id.toString(),
        specId: task.specId._id.toString(),
        message: `Task failed: ${error.message}`,
        metadata: {
          error: error.message,
          duration,
        },
      });

      loggers.agent.error(
        {
          taskId: config.taskId,
          error: error.message,
        },
        'Task execution failed'
      );

      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Execute a development task
   */
  private async executeDevelopmentTask(task: any): Promise<any> {
    loggers.agent.info({ taskId: task._id }, 'Executing development task');

    // Build context for Claude
    const spec = await Spec.findById(task.specId);
    const context = this.buildTaskContext(task, spec);

    // Generate code using Claude
    const prompt = `
Task: ${task.title}

Description:
${task.description}

${task.acceptanceCriteria?.length > 0 ? `
Acceptance Criteria:
${task.acceptanceCriteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}
` : ''}

${task.files?.length > 0 ? `
Files to modify/create:
${task.files.join('\n')}
` : ''}

Context:
${JSON.stringify(context, null, 2)}

Please implement this task following best practices.
`;

    const response = await claudeClient.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8000,
    });

    // Update progress
    task.progress = 50;
    await task.save();

    await publishTaskUpdate({
      taskId: task._id.toString(),
      specId: task.specId.toString(),
      projectId: task.projectId?.toString(),
      progress: 50,
    });

    return {
      code: response.content,
      files: task.files || [],
    };
  }

  /**
   * Execute a testing task
   */
  private async executeTestingTask(task: any): Promise<any> {
    loggers.agent.info({ taskId: task._id }, 'Executing testing task');

    const spec = await Spec.findById(task.specId);
    const context = this.buildTaskContext(task, spec);

    const prompt = `
Task: ${task.title}

Description:
${task.description}

${task.files?.length > 0 ? `
Files to test:
${task.files.join('\n')}
` : ''}

Please generate comprehensive tests for this task.
`;

    const response = await claudeClient.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8000,
    });

    task.progress = 50;
    await task.save();

    return {
      tests: response.content,
    };
  }

  /**
   * Execute a review task
   */
  private async executeReviewTask(task: any): Promise<any> {
    loggers.agent.info({ taskId: task._id }, 'Executing review task');

    const spec = await Spec.findById(task.specId);
    const context = this.buildTaskContext(task, spec);

    const prompt = `
Task: ${task.title}

Description:
${task.description}

${task.files?.length > 0 ? `
Files to review:
${task.files.join('\n')}
` : ''}

Please review this code and provide detailed feedback.
`;

    const response = await claudeClient.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8000,
    });

    task.progress = 50;
    await task.save();

    return {
      feedback: response.content,
    };
  }

  /**
   * Execute a documentation task
   */
  private async executeDocumentationTask(task: any): Promise<any> {
    loggers.agent.info({ taskId: task._id }, 'Executing documentation task');

    const spec = await Spec.findById(task.specId);
    const context = this.buildTaskContext(task, spec);

    const prompt = `
Task: ${task.title}

Description:
${task.description}

${task.files?.length > 0 ? `
Files to document:
${task.files.join('\n')}
` : ''}

Please generate comprehensive documentation.
`;

    const response = await claudeClient.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4000,
    });

    task.progress = 50;
    await task.save();

    return {
      documentation: response.content,
    };
  }

  /**
   * Execute a deployment task
   */
  private async executeDeploymentTask(task: any): Promise<any> {
    loggers.agent.info({ taskId: task._id }, 'Executing deployment task');

    // For now, just return a placeholder
    // In a real implementation, this would trigger actual deployment
    task.progress = 50;
    await task.save();

    return {
      status: 'deployed',
      message: 'Deployment task requires manual intervention',
    };
  }

  /**
   * Execute a generic task
   */
  private async executeGenericTask(task: any): Promise<any> {
    loggers.agent.info({ taskId: task._id }, 'Executing generic task');

    const spec = await Spec.findById(task.specId);
    const context = this.buildTaskContext(task, spec);

    const prompt = `
Task: ${task.title}

Description:
${task.description}

${task.acceptanceCriteria?.length > 0 ? `
Acceptance Criteria:
${task.acceptanceCriteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}
` : ''}

Please complete this task.
`;

    const response = await claudeClient.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4000,
    });

    task.progress = 50;
    await task.save();

    return {
      result: response.content,
    };
  }

  /**
   * Build context for task execution
   */
  private buildTaskContext(task: any, spec: any): Record<string, any> {
    return {
      task: {
        title: task.title,
        description: task.description,
        type: task.type,
        acceptanceCriteria: task.acceptanceCriteria,
        files: task.files,
      },
      spec: spec
        ? {
            title: spec.title,
            description: spec.description,
            requirements: spec.requirements,
            design: spec.design,
            currentPhase: spec.currentPhase,
          }
        : null,
    };
  }

  /**
   * Check if dependencies are met for a task
   */
  async checkDependencies(taskId: string): Promise<boolean> {
    await connectDB();

    const task = await Task.findById(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    const dependencies = await Task.find({
      _id: { $in: task.dependencies },
    }).select('status');

    return dependencies.every((dep) => dep.status === TaskStatus.COMPLETED);
  }

  /**
   * Get tasks that are ready to execute
   */
  async getReadyTasks(specId?: string): Promise<any[]> {
    await connectDB();

    const filter: any = {
      status: { $in: [TaskStatus.PENDING, TaskStatus.ASSIGNED] },
    };

    if (specId) {
      filter.specId = specId;
    }

    const tasks = await Task.find(filter)
      .sort({ priority: -1, order: 1 })
      .populate('specId', 'title currentPhase')
      .populate('dependencies', 'status')
      .lean();

    // Filter tasks with met dependencies
    const readyTasks = [];
    for (const task of tasks) {
      const deps = task.dependencies as any[];
      if (!deps || deps.length === 0 || deps.every((d) => d.status === TaskStatus.COMPLETED)) {
        readyTasks.push(task);
      }
    }

    return readyTasks;
  }
}

// Singleton instance
export const taskExecutor = new TaskExecutor();
