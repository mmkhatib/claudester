import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { connectDB } from '@/lib/mongodb';
import { Agent, Task, AgentType, AgentStatus, TaskStatus } from '@/backend/models';
import { loggers } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import type { Types } from 'mongoose';

export interface AgentConfig {
  taskId: string;
  agentType: AgentType;
  workspacePath: string;
  files: string[];
  description: string;
  acceptanceCriteria: string[];
}

export interface SpawnedAgent {
  agentId: string;
  process: ChildProcess;
  taskId: string;
  workspacePath: string;
  startTime: Date;
}

class AgentSpawner {
  private activeAgents: Map<string, SpawnedAgent> = new Map();
  private readonly maxConcurrentAgents: number;
  private readonly agentMemoryLimit: number;
  private readonly agentTimeout: number;
  private readonly baseWorkspacePath: string;

  constructor() {
    const env = getEnv();
    this.maxConcurrentAgents = env.MAX_CONCURRENT_AGENTS;
    this.agentMemoryLimit = env.AGENT_MEMORY_LIMIT;
    this.agentTimeout = env.AGENT_TIMEOUT;
    this.baseWorkspacePath = path.join(process.cwd(), 'projects');
  }

  /**
   * Check if we can spawn a new agent
   */
  canSpawnAgent(): boolean {
    return this.activeAgents.size < this.maxConcurrentAgents;
  }

  /**
   * Get count of active agents
   */
  getActiveAgentCount(): number {
    return this.activeAgents.size;
  }

  /**
   * Get active agent by ID
   */
  getAgent(agentId: string): SpawnedAgent | undefined {
    return this.activeAgents.get(agentId);
  }

  /**
   * Get all active agents
   */
  getAllAgents(): SpawnedAgent[] {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Create workspace directory for agent
   */
  private async createWorkspace(taskId: string): Promise<string> {
    const workspacePath = path.join(this.baseWorkspacePath, taskId);

    try {
      await fs.mkdir(workspacePath, { recursive: true });
      loggers.agent.info({ taskId, workspacePath }, 'Created agent workspace');
      return workspacePath;
    } catch (error) {
      loggers.agent.error({ taskId, error }, 'Failed to create workspace');
      throw new Error(`Failed to create workspace: ${error}`);
    }
  }

  /**
   * Clean up workspace directory
   */
  private async cleanupWorkspace(workspacePath: string): Promise<void> {
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
      loggers.agent.info({ workspacePath }, 'Cleaned up workspace');
    } catch (error) {
      loggers.agent.error({ workspacePath, error }, 'Failed to cleanup workspace');
    }
  }

  /**
   * Spawn a new agent process
   */
  async spawnAgent(config: AgentConfig): Promise<string> {
    if (!this.canSpawnAgent()) {
      throw new Error(
        `Cannot spawn agent: max concurrent agents (${this.maxConcurrentAgents}) reached`
      );
    }

    await connectDB();

    // Create workspace
    const workspacePath = await this.createWorkspace(config.taskId);

    // Create agent record in database
    const agent = await Agent.create({
      agentId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: config.taskId,
      type: config.agentType,
      status: AgentStatus.IDLE,
      workspacePath,
      processId: null,
      developmentSessionId: null,
    });

    const agentId = agent.agentId;

    try {
      // Spawn Node.js process
      const agentProcess = spawn(
        'node',
        [
          path.join(__dirname, '../agents/agent-runner.js'),
          '--agent-id',
          agentId,
          '--task-id',
          config.taskId,
          '--workspace',
          workspacePath,
        ],
        {
          cwd: workspacePath,
          env: {
            ...process.env,
            AGENT_ID: agentId,
            TASK_ID: config.taskId,
            WORKSPACE_PATH: workspacePath,
            AGENT_TYPE: config.agentType,
            NODE_OPTIONS: `--max-old-space-size=${this.agentMemoryLimit}`,
          },
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        }
      );

      // Update agent with process ID
      agent.processId = agentProcess.pid || null;
      agent.status = AgentStatus.RUNNING;
      await agent.save();

      // Store active agent
      const spawnedAgent: SpawnedAgent = {
        agentId,
        process: agentProcess,
        taskId: config.taskId,
        workspacePath,
        startTime: new Date(),
      };

      this.activeAgents.set(agentId, spawnedAgent);

      // Set up process event handlers
      this.setupProcessHandlers(agentId, agentProcess, config.taskId);

      // Set timeout
      setTimeout(() => {
        this.handleTimeout(agentId);
      }, this.agentTimeout);

      loggers.agent.info(
        {
          agentId,
          taskId: config.taskId,
          pid: agentProcess.pid,
          type: config.agentType,
        },
        'Agent spawned successfully'
      );

      return agentId;
    } catch (error) {
      // Clean up on failure
      await agent.deleteOne();
      await this.cleanupWorkspace(workspacePath);

      loggers.agent.error({ agentId, error }, 'Failed to spawn agent');
      throw error;
    }
  }

  /**
   * Set up event handlers for agent process
   */
  private setupProcessHandlers(
    agentId: string,
    process: ChildProcess,
    taskId: string
  ): void {
    // Handle stdout
    process.stdout?.on('data', (data) => {
      loggers.agent.debug({ agentId, output: data.toString() }, 'Agent stdout');
    });

    // Handle stderr
    process.stderr?.on('data', (data) => {
      loggers.agent.error({ agentId, error: data.toString() }, 'Agent stderr');
    });

    // Handle process exit
    process.on('exit', async (code, signal) => {
      await this.handleAgentExit(agentId, code, signal);
    });

    // Handle process error
    process.on('error', async (error) => {
      loggers.agent.error({ agentId, error }, 'Agent process error');
      await this.handleAgentError(agentId, error);
    });

    // Handle IPC messages
    process.on('message', async (message: any) => {
      await this.handleAgentMessage(agentId, message);
    });
  }

  /**
   * Handle agent timeout
   */
  private async handleTimeout(agentId: string): Promise<void> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) return;

    const runtime = Date.now() - agent.startTime.getTime();
    if (runtime >= this.agentTimeout) {
      loggers.agent.warn({ agentId, runtime }, 'Agent timed out');
      await this.stopAgent(agentId, 'timeout');
    }
  }

  /**
   * Handle agent exit
   */
  private async handleAgentExit(
    agentId: string,
    code: number | null,
    signal: string | null
  ): Promise<void> {
    loggers.agent.info({ agentId, code, signal }, 'Agent process exited');

    const agent = this.activeAgents.get(agentId);
    if (!agent) return;

    await connectDB();

    // Update agent status in database
    const agentDoc = await Agent.findOne({ agentId });
    if (agentDoc) {
      agentDoc.status = code === 0 ? AgentStatus.COMPLETED : AgentStatus.FAILED;
      await agentDoc.save();
    }

    // Update task status
    const task = await Task.findById(agent.taskId);
    if (task) {
      task.status = code === 0 ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      await task.save();
    }

    // Remove from active agents
    this.activeAgents.delete(agentId);

    // Clean up workspace (optional - may want to keep for debugging)
    // await this.cleanupWorkspace(agent.workspacePath);
  }

  /**
   * Handle agent error
   */
  private async handleAgentError(agentId: string, error: Error): Promise<void> {
    await connectDB();

    const agentDoc = await Agent.findOne({ agentId });
    if (agentDoc) {
      agentDoc.status = AgentStatus.FAILED;
      await agentDoc.save();
    }

    const agent = this.activeAgents.get(agentId);
    if (agent) {
      const task = await Task.findById(agent.taskId);
      if (task) {
        task.status = TaskStatus.FAILED;
        await task.save();
      }
    }

    this.activeAgents.delete(agentId);
  }

  /**
   * Handle IPC message from agent
   */
  private async handleAgentMessage(agentId: string, message: any): Promise<void> {
    loggers.agent.debug({ agentId, message }, 'Received agent message');

    // Handle different message types
    switch (message.type) {
      case 'heartbeat':
        await this.handleHeartbeat(agentId, message.data);
        break;
      case 'progress':
        await this.handleProgress(agentId, message.data);
        break;
      case 'log':
        loggers.agent.info({ agentId, ...message.data }, 'Agent log');
        break;
      default:
        loggers.agent.warn({ agentId, message }, 'Unknown message type');
    }
  }

  /**
   * Handle heartbeat from agent
   */
  private async handleHeartbeat(agentId: string, data: any): Promise<void> {
    await connectDB();

    const agent = await Agent.findOne({ agentId });
    if (agent) {
      agent.lastHeartbeat = new Date();
      agent.cpuUsage = data.cpu;
      agent.memoryUsage = data.memory;
      await agent.save();
    }
  }

  /**
   * Handle progress update from agent
   */
  private async handleProgress(agentId: string, data: any): Promise<void> {
    loggers.agent.info({ agentId, progress: data }, 'Agent progress update');
    // Could emit to WebSocket for real-time updates
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string, reason: string = 'manual'): Promise<void> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    loggers.agent.info({ agentId, reason }, 'Stopping agent');

    // Try graceful shutdown first
    agent.process.send({ type: 'shutdown', reason });

    // Wait 5 seconds, then force kill
    setTimeout(() => {
      if (this.activeAgents.has(agentId)) {
        agent.process.kill('SIGKILL');
      }
    }, 5000);

    // Update database
    await connectDB();
    const agentDoc = await Agent.findOne({ agentId });
    if (agentDoc) {
      agentDoc.status = AgentStatus.FAILED;
      await agentDoc.save();
    }
  }

  /**
   * Stop all agents
   */
  async stopAllAgents(): Promise<void> {
    loggers.agent.info(
      { count: this.activeAgents.size },
      'Stopping all agents'
    );

    const stopPromises = Array.from(this.activeAgents.keys()).map((agentId) =>
      this.stopAgent(agentId, 'shutdown')
    );

    await Promise.all(stopPromises);
  }
}

// Singleton instance
export const agentSpawner = new AgentSpawner();
