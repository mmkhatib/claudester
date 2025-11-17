import { connectDB } from '@/lib/mongodb';
import { Agent, AgentStatus } from '@/backend/models';
import { loggers } from '@/lib/logger';
import { agentSpawner } from './agent-spawner';
import { publishSystemAlert } from '@/lib/pubsub';

interface HealthCheck {
  agentId: string;
  lastHeartbeat: Date | null;
  status: AgentStatus;
  cpuUsage: number;
  memoryUsage: number;
  isStalled: boolean;
  timeSinceHeartbeat: number;
}

class HealthMonitor {
  private interval: NodeJS.Timeout | null = null;
  private checkIntervalMs: number = 30000; // 30 seconds
  private stalledThresholdMs: number = 120000; // 2 minutes
  private isRunning = false;

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      loggers.agent.warn('Health monitor already running');
      return;
    }

    this.isRunning = true;
    loggers.agent.info('Starting health monitor');

    this.interval = setInterval(() => {
      this.performHealthCheck().catch((error) => {
        loggers.agent.error({ error }, 'Health check failed');
      });
    }, this.checkIntervalMs);

    // Run initial check
    this.performHealthCheck().catch((error) => {
      loggers.agent.error({ error }, 'Initial health check failed');
    });
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    loggers.agent.info('Stopping health monitor');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
  }

  /**
   * Perform health check on all agents
   */
  private async performHealthCheck(): Promise<void> {
    await connectDB();

    // Get all running agents
    const agents = await Agent.find({
      status: { $in: [AgentStatus.RUNNING, AgentStatus.IDLE] },
    });

    if (agents.length === 0) {
      loggers.agent.debug('No active agents to monitor');
      return;
    }

    loggers.agent.debug({ count: agents.length }, 'Performing health check on agents');

    const healthChecks: HealthCheck[] = [];

    for (const agent of agents) {
      const check = await this.checkAgentHealth(agent);
      healthChecks.push(check);

      // Handle stalled agents
      if (check.isStalled) {
        await this.handleStalledAgent(agent);
      }

      // Check resource usage
      if (check.memoryUsage > 0.9 * 1024 * 1024 * 1024) { // > 90% of 1GB
        await this.handleHighMemoryUsage(agent, check.memoryUsage);
      }
    }

    // Log summary
    const stalledCount = healthChecks.filter((c) => c.isStalled).length;
    const healthyCount = healthChecks.length - stalledCount;

    loggers.agent.info(
      {
        total: healthChecks.length,
        healthy: healthyCount,
        stalled: stalledCount,
      },
      'Health check complete'
    );
  }

  /**
   * Check individual agent health
   */
  private async checkAgentHealth(agent: any): Promise<HealthCheck> {
    const now = Date.now();
    const lastHeartbeat = agent.lastHeartbeat;
    const timeSinceHeartbeat = lastHeartbeat
      ? now - new Date(lastHeartbeat).getTime()
      : Infinity;

    const isStalled = timeSinceHeartbeat > this.stalledThresholdMs;

    return {
      agentId: agent.agentId,
      lastHeartbeat: agent.lastHeartbeat,
      status: agent.status,
      cpuUsage: agent.cpuUsage || 0,
      memoryUsage: agent.memoryUsage || 0,
      isStalled,
      timeSinceHeartbeat,
    };
  }

  /**
   * Handle stalled agent
   */
  private async handleStalledAgent(agent: any): Promise<void> {
    loggers.agent.warn(
      {
        agentId: agent.agentId,
        taskId: agent.taskId,
        lastHeartbeat: agent.lastHeartbeat,
      },
      'Agent stalled - no heartbeat received'
    );

    // Update agent status
    agent.status = AgentStatus.STALLED;
    await agent.save();

    // Publish alert
    await publishSystemAlert({
      level: 'warning',
      message: `Agent ${agent.agentId} has stalled`,
      metadata: {
        agentId: agent.agentId,
        taskId: agent.taskId,
        lastHeartbeat: agent.lastHeartbeat,
      },
    });

    // Try to stop the agent
    try {
      const spawnedAgent = agentSpawner.getAgent(agent.agentId);
      if (spawnedAgent) {
        await agentSpawner.stopAgent(agent.agentId, 'stalled');
      }
    } catch (error) {
      loggers.agent.error(
        { agentId: agent.agentId, error },
        'Failed to stop stalled agent'
      );
    }
  }

  /**
   * Handle high memory usage
   */
  private async handleHighMemoryUsage(agent: any, memoryUsage: number): Promise<void> {
    loggers.agent.warn(
      {
        agentId: agent.agentId,
        taskId: agent.taskId,
        memoryUsage: `${Math.round(memoryUsage / 1024 / 1024)}MB`,
      },
      'Agent using high memory'
    );

    // Publish alert
    await publishSystemAlert({
      level: 'warning',
      message: `Agent ${agent.agentId} using high memory`,
      metadata: {
        agentId: agent.agentId,
        taskId: agent.taskId,
        memoryUsage: Math.round(memoryUsage / 1024 / 1024),
      },
    });
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
      stalledThresholdMs: this.stalledThresholdMs,
    };
  }

  /**
   * Get health report
   */
  async getHealthReport(): Promise<any> {
    await connectDB();

    const agents = await Agent.find({
      status: { $in: [AgentStatus.RUNNING, AgentStatus.IDLE, AgentStatus.STALLED] },
    });

    const report = {
      timestamp: new Date(),
      totalAgents: agents.length,
      byStatus: {
        running: 0,
        idle: 0,
        stalled: 0,
      },
      averageMemoryUsage: 0,
      averageCpuUsage: 0,
      stalledAgents: [] as string[],
    };

    let totalMemory = 0;
    let totalCpu = 0;

    for (const agent of agents) {
      // Count by status
      switch (agent.status) {
        case AgentStatus.RUNNING:
          report.byStatus.running++;
          break;
        case AgentStatus.IDLE:
          report.byStatus.idle++;
          break;
        case AgentStatus.STALLED:
          report.byStatus.stalled++;
          report.stalledAgents.push(agent.agentId);
          break;
      }

      // Accumulate resource usage
      totalMemory += agent.memoryUsage || 0;
      totalCpu += agent.cpuUsage || 0;
    }

    if (agents.length > 0) {
      report.averageMemoryUsage = Math.round(totalMemory / agents.length / 1024 / 1024); // MB
      report.averageCpuUsage = Math.round(totalCpu / agents.length);
    }

    return report;
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();

// Start monitor on module load
if (process.env.NODE_ENV !== 'test') {
  healthMonitor.start();
}

// Graceful shutdown
process.on('SIGTERM', () => {
  healthMonitor.stop();
});

process.on('SIGINT', () => {
  healthMonitor.stop();
});
