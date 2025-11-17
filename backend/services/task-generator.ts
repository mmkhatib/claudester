import { connectDB } from '@/lib/mongodb';
import { Spec, Task, TaskType, TaskStatus, AgentType } from '@/backend/models';
import { claudeClient } from './claude-client';
import { loggers } from '@/lib/logger';
import { publishActivityLog } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

export interface GeneratedTask {
  description: string;
  type: TaskType;
  agentType: AgentType;
  acceptanceCriteria: string[];
  files: string[];
  dependencies: number[]; // Indexes of tasks this depends on
  estimatedHours?: number;
  order: number;
}

class TaskGenerator {
  /**
   * Generate tasks from spec design document
   */
  async generateTasks(specId: string): Promise<GeneratedTask[]> {
    await connectDB();

    const spec = await Spec.findById(specId);
    if (!spec) {
      throw new Error(`Spec ${specId} not found`);
    }

    if (!spec.design || Object.keys(spec.design).length === 0) {
      throw new Error('Spec design document is empty');
    }

    loggers.agent.info({ specId }, 'Generating tasks from spec design');

    // Use Claude to analyze design and generate task breakdown
    const taskBreakdown = await this.analyzeDesignDocument(spec);

    // Parse and structure tasks
    const tasks = this.parseTaskBreakdown(taskBreakdown);

    // Validate task dependencies
    this.validateDependencies(tasks);

    loggers.agent.info(
      { specId, taskCount: tasks.length },
      'Tasks generated successfully'
    );

    return tasks;
  }

  /**
   * Analyze design document with Claude
   */
  private async analyzeDesignDocument(spec: any): Promise<string> {
    const systemPrompt = `You are a technical project manager breaking down a software design into executable tasks.

Analyze the design document and create a comprehensive task breakdown. For each task:
1. Provide a clear, specific description
2. Specify the task type (DEVELOPMENT, TEST, or TDD)
3. List acceptance criteria
4. List files that will be created/modified
5. Specify dependencies on other tasks
6. Estimate hours needed

Output format (JSON array):
[
  {
    "description": "Clear task description",
    "type": "DEVELOPMENT",
    "acceptanceCriteria": ["criterion 1", "criterion 2"],
    "files": ["path/to/file.ts"],
    "dependencies": [0, 1],
    "estimatedHours": 4,
    "order": 0
  }
]

Important:
- Break complex features into smaller, manageable tasks
- Create separate test tasks for each development task
- Consider TDD tasks for critical functionality
- Order tasks logically (dependencies first)
- Be specific about file paths and criteria`;

    const designContent = JSON.stringify(spec.design, null, 2);
    const requirementsContent = spec.requirements ? JSON.stringify(spec.requirements, null, 2) : '';

    const prompt = `Break down this design into executable tasks:

SPEC: ${spec.title}
PRIORITY: ${spec.priority}

REQUIREMENTS:
${requirementsContent || 'None specified'}

DESIGN:
${designContent}

Generate a comprehensive task breakdown as a JSON array.`;

    const response = await claudeClient.sendMessage({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 8000,
    });

    return response.content;
  }

  /**
   * Parse Claude's response into structured tasks
   */
  private parseTaskBreakdown(response: string): GeneratedTask[] {
    try {
      // Extract JSON from response (Claude might include markdown code blocks)
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Try to find JSON array in text
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonText = arrayMatch[0];
        }
      }

      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Map to GeneratedTask structure
      return parsed.map((task, index) => ({
        description: task.description || `Task ${index + 1}`,
        type: this.parseTaskType(task.type),
        agentType: this.mapTaskTypeToAgentType(this.parseTaskType(task.type)),
        acceptanceCriteria: Array.isArray(task.acceptanceCriteria) ? task.acceptanceCriteria : [],
        files: Array.isArray(task.files) ? task.files : [],
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
        estimatedHours: typeof task.estimatedHours === 'number' ? task.estimatedHours : undefined,
        order: typeof task.order === 'number' ? task.order : index,
      }));
    } catch (error) {
      loggers.agent.error({ error, response }, 'Failed to parse task breakdown');
      throw new Error('Failed to parse task breakdown from Claude response');
    }
  }

  /**
   * Parse task type from string
   */
  private parseTaskType(type: string): TaskType {
    const normalized = type?.toUpperCase();
    if (normalized === 'DEVELOPMENT' || normalized === 'DEV') {
      return TaskType.DEVELOPMENT;
    } else if (normalized === 'TEST') {
      return TaskType.TEST;
    } else if (normalized === 'TDD') {
      return TaskType.TDD;
    }
    return TaskType.DEVELOPMENT; // Default
  }

  /**
   * Map task type to agent type
   */
  private mapTaskTypeToAgentType(taskType: TaskType): AgentType {
    switch (taskType) {
      case TaskType.DEVELOPMENT:
        return AgentType.DEVELOPMENT;
      case TaskType.TEST:
        return AgentType.TEST;
      case TaskType.TDD:
        return AgentType.TDD;
      default:
        return AgentType.DEVELOPMENT;
    }
  }

  /**
   * Validate task dependencies
   */
  private validateDependencies(tasks: GeneratedTask[]): void {
    tasks.forEach((task, index) => {
      task.dependencies.forEach((depIndex) => {
        if (depIndex >= tasks.length || depIndex < 0) {
          throw new Error(
            `Task ${index} has invalid dependency index ${depIndex}`
          );
        }
        if (depIndex >= index) {
          throw new Error(
            `Task ${index} has circular or forward dependency on task ${depIndex}`
          );
        }
      });
    });
  }

  /**
   * Create tasks in database
   */
  async createTasks(specId: string, tasks: GeneratedTask[]): Promise<void> {
    await connectDB();

    const spec = await Spec.findById(specId);
    if (!spec) {
      throw new Error(`Spec ${specId} not found`);
    }

    loggers.agent.info(
      { specId, taskCount: tasks.length },
      'Creating tasks in database'
    );

    const createdTasks: any[] = [];

    for (const taskData of tasks) {
      // Map dependency indexes to task IDs
      const dependencyIds = taskData.dependencies.map((index) => {
        if (index >= createdTasks.length) {
          throw new Error(`Invalid dependency index ${index}`);
        }
        return createdTasks[index]._id;
      });

      const task = await Task.create({
        specId,
        description: taskData.description,
        type: taskData.type,
        agentType: taskData.agentType,
        status: TaskStatus.PENDING,
        acceptanceCriteria: taskData.acceptanceCriteria,
        files: taskData.files,
        dependencies: dependencyIds,
        estimatedHours: taskData.estimatedHours,
        order: taskData.order,
      });

      createdTasks.push(task);

      await publishActivityLog({
        eventType: EventType.TASK_CREATED,
        specId,
        taskId: task._id.toString(),
        message: `Task created: ${task.description}`,
        metadata: {
          type: task.type,
          order: task.order,
        },
      });
    }

    // Update spec with tasks document
    spec.tasksDoc = {
      totalTasks: tasks.length,
      estimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
      generatedAt: new Date(),
    };
    await spec.save();

    loggers.agent.info(
      { specId, taskCount: createdTasks.length },
      'Tasks created successfully'
    );
  }

  /**
   * Generate and create tasks (combined operation)
   */
  async generateAndCreateTasks(specId: string): Promise<number> {
    const tasks = await this.generateTasks(specId);
    await this.createTasks(specId, tasks);
    return tasks.length;
  }
}

// Singleton instance
export const taskGenerator = new TaskGenerator();
