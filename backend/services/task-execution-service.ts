import os from 'os';
import path from 'path';
import { Task, Agent, Spec, Project } from '../models';
import { AgentStatus, TaskStatus } from '../models';
import { claudeClient } from './claude-client';
import mongoose from 'mongoose';

interface TaskExecutionContext {
  project: {
    name: string;
    description: string;
    workspacePath: string;
    architecture?: any;
  };
  spec: {
    name: string;
    description: string;
    requirements: any;
    design: any;
    priority: string;
  };
  task: {
    title: string;
    description: string;
    type: string;
    acceptanceCriteria: string[];
    dependencies: any[];
    files: string[];
    estimatedHours?: number;
  };
}

interface TaskExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  attempts: number;
}

interface StartTaskOptions {
  retryCount?: number;
  maxRetries?: number;
}

export class TaskExecutionService {
  private readonly MAX_RETRIES = 3;
  private taskQueue: Map<string, { taskId: string; priority: number }[]> = new Map();

  /**
   * Start executing a single task
   */
  async startTask(
    taskId: string,
    options: StartTaskOptions = {}
  ): Promise<{ agent: any; result?: TaskExecutionResult }> {
    const { retryCount = 0, maxRetries = this.MAX_RETRIES } = options;

    console.log(`[TaskExecution] Starting task ${taskId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    // 1. Fetch task with all relations
    const task = await Task.findById(taskId)
      .populate('specId')
      .populate('projectId')
      .populate('dependencies');

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 2. Check if dependencies are met
    const dependenciesMet = await this.checkDependencies(task);
    if (!dependenciesMet) {
      throw new Error(`Dependencies not met for task ${task.title}`);
    }

    // 3. Build full context
    const context = await this.buildTaskContext(task);

    // 4. Create or find agent
    const agent = await this.getOrCreateAgent(task, context);

    // 5. Update task status
    task.status = TaskStatus.IN_PROGRESS;
    task.agentId = agent._id;
    task.startedAt = new Date();
    await task.save();

    // 6. Execute task with retry logic
    try {
      const result = await this.executeTaskWithRetry(task, agent, context, retryCount, maxRetries);
      return { agent, result };
    } catch (error) {
      console.error(`[TaskExecution] Task ${taskId} failed after ${retryCount + 1} attempts:`, error);

      // Mark task as failed
      task.status = TaskStatus.FAILED;
      task.error = error instanceof Error ? error.message : String(error);
      await task.save();

      // Update agent status
      agent.status = AgentStatus.FAILED;
      agent.error = error instanceof Error ? error.message : String(error);
      await agent.save();

      throw error;
    }
  }

  /**
   * Start multiple tasks in sequence (with queue)
   */
  async startTasksSequentially(
    taskIds: string[],
    specId?: string
  ): Promise<{ completed: string[]; failed: string[]; queued: string[] }> {
    console.log(`[TaskExecution] Starting ${taskIds.length} tasks sequentially`);

    const completed: string[] = [];
    const failed: string[] = [];
    const queued: string[] = [];

    for (const taskId of taskIds) {
      try {
        queued.push(taskId);
        console.log(`[TaskExecution] Processing task ${taskId} (${queued.length}/${taskIds.length})`);

        await this.startTask(taskId);
        completed.push(taskId);
        queued.pop(); // Remove from queue once completed
      } catch (error) {
        console.error(`[TaskExecution] Task ${taskId} failed:`, error);
        failed.push(taskId);
        queued.pop();

        // Check if we should continue with independent tasks
        const shouldContinue = await this.shouldContinueAfterFailure(taskId, taskIds);
        if (!shouldContinue) {
          console.log('[TaskExecution] Stopping queue due to critical failure');
          // Add remaining tasks to queued list
          const remainingIndex = taskIds.indexOf(taskId) + 1;
          queued.push(...taskIds.slice(remainingIndex));
          break;
        }
      }
    }

    return { completed, failed, queued };
  }

  /**
   * Build comprehensive task context from project → spec → task
   */
  private async buildTaskContext(task: any): Promise<TaskExecutionContext> {
    const spec = task.specId;
    const project = task.projectId;

    // Build workspace path (default to ~/workspace/projects/[projectname])
    const workspacePath = project.workspacePath ||
      path.join(os.homedir(), 'workspace', 'projects', project.name.toLowerCase().replace(/\s+/g, '-'));

    return {
      project: {
        name: project.name,
        description: project.description,
        workspacePath,
        architecture: project.architecture,
      },
      spec: {
        name: spec.name || spec.title,
        description: spec.description,
        requirements: spec.requirements,
        design: spec.design,
        priority: spec.priority,
      },
      task: {
        title: task.title,
        description: task.description,
        type: task.type,
        acceptanceCriteria: task.acceptanceCriteria || [],
        dependencies: task.dependencies || [],
        files: task.files || [],
        estimatedHours: task.estimatedHours,
      },
    };
  }

  /**
   * Build AI prompt with full context
   */
  private buildExecutionPrompt(context: TaskExecutionContext): string {
    const { project, spec, task } = context;

    let prompt = `# Code Generation Task

## PROJECT CONTEXT
Project: ${project.name}
Description: ${project.description}
Workspace: ${project.workspacePath}
`;

    // Add architecture if available
    if (project.architecture) {
      const { techStack, patterns, dataModel, conventions } = project.architecture;

      prompt += `\n## ARCHITECTURE

Tech Stack:`;
      if (techStack) {
        if (techStack.frontend?.length) prompt += `\n- Frontend: ${techStack.frontend.join(', ')}`;
        if (techStack.backend?.length) prompt += `\n- Backend: ${techStack.backend.join(', ')}`;
        if (techStack.database?.length) prompt += `\n- Database: ${techStack.database.join(', ')}`;
        if (techStack.deployment?.length) prompt += `\n- Deployment: ${techStack.deployment.join(', ')}`;
      }

      if (patterns?.length) {
        prompt += `\n\nArchitectural Patterns: ${patterns.join(', ')}`;
      }

      if (dataModel) {
        prompt += `\n\nShared Data Model:\n${dataModel}`;
      }

      if (conventions) {
        prompt += `\n\nCode Conventions:`;
        if (conventions.naming) prompt += `\n- Naming: ${conventions.naming}`;
        if (conventions.fileStructure) prompt += `\n- File Structure: ${conventions.fileStructure}`;
        if (conventions.codeStyle) prompt += `\n- Code Style: ${conventions.codeStyle}`;
      }
    }

    prompt += `\n\n## FEATURE SPECIFICATION
Feature: ${spec.name}
Description: ${spec.description}
Priority: ${spec.priority}

### Requirements
${JSON.stringify(spec.requirements, null, 2)}

### Design
${typeof spec.design === 'object' ? JSON.stringify(spec.design, null, 2) : spec.design}
`;

    prompt += `\n## TASK TO IMPLEMENT
Task: ${task.title}
Type: ${task.type}
Description: ${task.description}

### Acceptance Criteria
${task.acceptanceCriteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}
`;

    if (task.files?.length) {
      prompt += `\n### Files to Create/Modify
${task.files.map((f: string) => `- ${f}`).join('\n')}
`;
    }

    if (task.dependencies?.length) {
      prompt += `\n### Dependencies
The following tasks should be completed first:
${task.dependencies.map((d: any) => `- ${d.title} (Status: ${d.status})`).join('\n')}
`;
    }

    prompt += `\n\n## INSTRUCTIONS
1. Implement this task following the project's architecture and conventions
2. Save all files to the workspace path: ${project.workspacePath}
3. Ensure the code integrates properly with existing components
4. Follow the acceptance criteria exactly
5. Write clean, well-documented code
6. Include error handling where appropriate

Please implement this task now.`;

    return prompt;
  }

  /**
   * Execute task with retry logic (3 attempts)
   */
  private async executeTaskWithRetry(
    task: any,
    agent: any,
    context: TaskExecutionContext,
    currentRetry: number,
    maxRetries: number
  ): Promise<TaskExecutionResult> {
    const prompt = this.buildExecutionPrompt(context);

    try {
      console.log(`[TaskExecution] Executing task (attempt ${currentRetry + 1}/${maxRetries + 1})`);

      // Execute using Claude Code CLI
      const result = await claudeClient.generateCode(task.description, prompt);

      console.log(`[TaskExecution] Task completed successfully`);

      // Update task with result
      task.status = TaskStatus.COMPLETED;
      task.output = result;
      task.completedAt = new Date();
      await task.save();

      // Update agent
      agent.status = AgentStatus.COMPLETED;
      agent.output = result;
      await agent.save();

      return {
        success: true,
        output: result,
        attempts: currentRetry + 1,
      };
    } catch (error) {
      console.error(`[TaskExecution] Attempt ${currentRetry + 1} failed:`, error);

      // Retry if we haven't hit max retries
      if (currentRetry < maxRetries) {
        console.log(`[TaskExecution] Retrying... (${currentRetry + 1}/${maxRetries})`);
        return this.executeTaskWithRetry(task, agent, context, currentRetry + 1, maxRetries);
      }

      // All retries exhausted
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        attempts: currentRetry + 1,
      };
    }
  }

  /**
   * Check if all task dependencies are completed
   */
  private async checkDependencies(task: any): Promise<boolean> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    const dependencies = await Task.find({
      _id: { $in: task.dependencies },
    });

    return dependencies.every(dep => dep.status === TaskStatus.COMPLETED);
  }

  /**
   * Get or create an agent for a task
   */
  private async getOrCreateAgent(task: any, context: TaskExecutionContext): Promise<any> {
    // Check if agent already exists for this task
    let agent = await Agent.findOne({ currentTaskId: task._id });

    if (!agent) {
      // Create new agent
      const agentId = `agent-${task._id.toString().slice(-8)}`;

      agent = await Agent.create({
        agentId,
        type: 'DEVELOPMENT',
        status: AgentStatus.RUNNING,
        currentTaskId: task._id,
        specId: task.specId,
        workspacePath: context.project.workspacePath,
      });
    } else {
      // Update existing agent
      agent.status = AgentStatus.RUNNING;
      await agent.save();
    }

    return agent;
  }

  /**
   * Determine if we should continue executing tasks after a failure
   */
  private async shouldContinueAfterFailure(
    failedTaskId: string,
    remainingTaskIds: string[]
  ): Promise<boolean> {
    // Get all remaining tasks
    const remainingTasks = await Task.find({
      _id: { $in: remainingTaskIds },
    });

    // Check if any remaining tasks depend on the failed task
    const hasBlockedTasks = remainingTasks.some(t =>
      t.dependencies?.some((dep: any) => dep.toString() === failedTaskId)
    );

    // Continue if there are independent tasks
    return !hasBlockedTasks || remainingTasks.some(t =>
      !t.dependencies || t.dependencies.length === 0
    );
  }

  /**
   * Get default workspace path for a project
   */
  static getDefaultWorkspacePath(projectName: string): string {
    const sanitizedName = projectName.toLowerCase().replace(/\s+/g, '-');
    return path.join(os.homedir(), 'workspace', 'projects', sanitizedName);
  }
}

export const taskExecutionService = new TaskExecutionService();
