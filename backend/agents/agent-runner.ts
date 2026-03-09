#!/usr/bin/env node

/**
 * Agent Runner
 * This script runs in a child process and executes agent tasks
 */

import { connectDB } from '@/lib/mongodb';
import { Agent, Task, AgentStatus, TaskStatus } from '@/backend/models';

interface AgentContext {
  agentId: string;
  taskId: string;
  workspacePath: string;
  agentType: string;
}

class AgentRunner {
  private context: AgentContext;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private shutdownRequested = false;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    this.log('info', 'Agent initializing', this.context);

    // Connect to database
    await connectDB();

    // Update agent status
    const agent = await Agent.findOne({ agentId: this.context.agentId });
    if (!agent) {
      throw new Error(`Agent ${this.context.agentId} not found in database`);
    }

    agent.status = AgentStatus.RUNNING;
    await agent.save();

    // Start heartbeat
    this.startHeartbeat();

    // Set up shutdown handlers
    this.setupShutdownHandlers();

    this.log('info', 'Agent initialized successfully');
  }

  /**
   * Start heartbeat to parent process
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.shutdownRequested) return;

      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      this.sendMessage('heartbeat', {
        cpu: cpuUsage.user + cpuUsage.system,
        memory: memUsage.heapUsed,
        timestamp: new Date(),
      });
    }, 10000); // Every 10 seconds
  }

  /**
   * Set up shutdown handlers
   */
  private setupShutdownHandlers(): void {
    // Handle shutdown message from parent
    process.on('message', async (message: any) => {
      if (message.type === 'shutdown') {
        await this.shutdown(message.reason || 'parent request');
      }
    });

    // Handle process signals
    process.on('SIGTERM', async () => {
      await this.shutdown('SIGTERM');
    });

    process.on('SIGINT', async () => {
      await this.shutdown('SIGINT');
    });
  }

  /**
   * Execute the agent task
   */
  async execute(): Promise<void> {
    this.log('info', 'Starting task execution');

    try {
      // Load task from database
      const task = await Task.findById(this.context.taskId)
        .populate('specId');

      if (!task) {
        throw new Error(`Task ${this.context.taskId} not found`);
      }

      // Update task status
      task.status = TaskStatus.IN_PROGRESS;
      await task.save();

      this.log('info', 'Task loaded', {
        taskType: task.type,
        description: task.description,
      });

      // Send progress update
      this.sendMessage('progress', {
        status: 'started',
        progress: 0,
      });

      // Execute based on agent type
      switch (this.context.agentType) {
        case 'DEVELOPMENT':
          await this.executeDevelopment(task);
          break;
        case 'TEST':
          await this.executeTest(task);
          break;
        case 'TDD':
          await this.executeTDD(task);
          break;
        default:
          throw new Error(`Unknown agent type: ${this.context.agentType}`);
      }

      // Mark task as completed
      task.status = TaskStatus.COMPLETED;
      await task.save();

      this.log('info', 'Task completed successfully');

      // Send final progress
      this.sendMessage('progress', {
        status: 'completed',
        progress: 100,
      });

      // Exit successfully
      await this.shutdown('completed', 0);
    } catch (error) {
      this.log('error', 'Task execution failed', { error });

      // Mark task as failed
      const task = await Task.findById(this.context.taskId);
      if (task) {
        task.status = TaskStatus.FAILED;
        await task.save();
      }

      // Send error to parent
      this.sendMessage('error', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Exit with error
      await this.shutdown('error', 1);
    }
  }

  /**
   * Execute development task
   */
  private async executeDevelopment(task: any): Promise<void> {
    this.log('info', 'Executing development task');

    const prompt = `You are a software development agent. Implement the following task:

Title: ${task.title}
Description: ${task.description}

${task.acceptanceCriteria?.length > 0 ? `Acceptance Criteria:
${task.acceptanceCriteria.map((c: string) => `- ${c}`).join('\n')}` : ''}

${task.files?.length > 0 ? `Files to modify:
${task.files.join('\n')}` : ''}

Please:
1. Write the necessary code
2. Follow best practices
3. Add comments where needed
4. Ensure all acceptance criteria are met

Output your progress and what you're doing as you work.`;

    this.sendMessage('progress', {
      status: 'in_progress',
      progress: 10,
      message: 'Starting code generation...',
    });

    // Use Claude CLI with streaming
    const { spawn } = require('child_process');
    const claudePath = '/Users/overlord/.local/bin/claude';
    
    const claudeProcess = spawn(claudePath, [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages'
    ], {
      cwd: this.context.workspacePath,
    });

    let buffer = '';
    
    claudeProcess.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      process.stdout.write(chunk); // This gets captured by agent-spawner
      
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const event = JSON.parse(line);
          if (event.stream_event?.delta?.text_delta) {
            const text = event.stream_event.delta.text_delta;
            process.stdout.write(text);
          }
        } catch (e) {
          // Not JSON, just output it
          process.stdout.write(line + '\n');
        }
      }
    });

    claudeProcess.stderr.on('data', (data: Buffer) => {
      process.stderr.write(data);
    });

    await new Promise<void>((resolve, reject) => {
      claudeProcess.on('close', (code: number) => {
        if (code === 0) {
          this.sendMessage('progress', {
            status: 'completed',
            progress: 100,
            message: 'Task completed successfully',
          });
          resolve();
        } else {
          reject(new Error(`Claude process exited with code ${code}`));
        }
      });

      claudeProcess.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Execute test task
   */
  private async executeTest(task: any): Promise<void> {
    this.log('info', 'Executing test task');

    // TODO: Implement test execution
    // This will:
    // 1. Set up test environment
    // 2. Run test suite
    // 3. Collect results
    // 4. Report coverage

    this.sendMessage('progress', {
      status: 'in_progress',
      progress: 50,
      message: 'Test task execution not yet implemented',
    });

    // Placeholder
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Execute TDD task
   */
  private async executeTDD(task: any): Promise<void> {
    this.log('info', 'Executing TDD task');

    // TODO: Implement TDD workflow
    // This will:
    // 1. Write tests first
    // 2. Run tests (should fail)
    // 3. Implement code
    // 4. Run tests (should pass)
    // 5. Refactor if needed

    this.sendMessage('progress', {
      status: 'in_progress',
      progress: 50,
      message: 'TDD task execution not yet implemented',
    });

    // Placeholder
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Send message to parent process
   */
  private sendMessage(type: string, data: any): void {
    if (process.send) {
      process.send({ type, data, agentId: this.context.agentId });
    }
  }

  /**
   * Log message
   */
  private log(level: string, message: string, data?: any): void {
    const logData = {
      level,
      agentId: this.context.agentId,
      taskId: this.context.taskId,
      message,
      ...data,
      timestamp: new Date(),
    };

    console.log(JSON.stringify(logData));
    this.sendMessage('log', logData);
  }

  /**
   * Shutdown agent
   */
  private async shutdown(reason: string, exitCode: number = 0): Promise<void> {
    if (this.shutdownRequested) return;
    this.shutdownRequested = true;

    this.log('info', 'Agent shutting down', { reason, exitCode });

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Update agent status
    try {
      const agent = await Agent.findOne({ agentId: this.context.agentId });
      if (agent) {
        agent.status = exitCode === 0 ? AgentStatus.COMPLETED : AgentStatus.FAILED;
        await agent.save();
      }
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }

    // Exit
    process.exit(exitCode);
  }
}

// Main execution
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const agentId = args[args.indexOf('--agent-id') + 1];
  const taskId = args[args.indexOf('--task-id') + 1];
  const workspacePath = args[args.indexOf('--workspace') + 1];
  const agentType = process.env.AGENT_TYPE || 'DEVELOPMENT';

  if (!agentId || !taskId || !workspacePath) {
    console.error('Missing required arguments');
    process.exit(1);
  }

  const context: AgentContext = {
    agentId,
    taskId,
    workspacePath,
    agentType,
  };

  const runner = new AgentRunner(context);

  try {
    await runner.initialize();
    await runner.execute();
  } catch (error) {
    console.error('Agent runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { AgentRunner };
