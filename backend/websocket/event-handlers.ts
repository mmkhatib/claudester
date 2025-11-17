import { websocketServer } from './server';
import {
  subscribeToSpecUpdates,
  subscribeToTaskUpdates,
  subscribeToAgentUpdates,
  subscribeToTestResults,
  subscribeToActivityLog,
  subscribeToSystemAlerts,
  type SpecUpdateMessage,
  type TaskUpdateMessage,
  type AgentUpdateMessage,
  type TestResultMessage,
  type ActivityLogMessage,
  type SystemAlertMessage,
} from '@/lib/pubsub';
import { loggers } from '@/lib/logger';

class WebSocketEventHandlers {
  private unsubscribers: (() => void)[] = [];
  private isInitialized = false;

  /**
   * Initialize event handlers
   */
  initialize(): void {
    if (this.isInitialized) {
      loggers.websocket.warn('Event handlers already initialized');
      return;
    }

    // Subscribe to all pub/sub channels and forward to WebSocket
    this.unsubscribers.push(
      subscribeToSpecUpdates(this.handleSpecUpdate.bind(this)),
      subscribeToTaskUpdates(this.handleTaskUpdate.bind(this)),
      subscribeToAgentUpdates(this.handleAgentUpdate.bind(this)),
      subscribeToTestResults(this.handleTestResult.bind(this)),
      subscribeToActivityLog(this.handleActivityLog.bind(this)),
      subscribeToSystemAlerts(this.handleSystemAlert.bind(this))
    );

    this.isInitialized = true;
    loggers.websocket.info('WebSocket event handlers initialized');
  }

  /**
   * Handle spec update
   */
  private async handleSpecUpdate(message: SpecUpdateMessage): Promise<void> {
    loggers.websocket.debug({ message }, 'Handling spec update');

    // Emit to spec-specific room
    websocketServer.emitToRoom(`spec:${message.specId}`, 'spec:update', {
      specId: message.specId,
      projectId: message.projectId,
      phase: message.phase,
      status: message.status,
      progress: message.progress,
      timestamp: message.timestamp,
    });

    // Emit to project room
    websocketServer.emitToRoom(`project:${message.projectId}`, 'spec:update', {
      specId: message.specId,
      projectId: message.projectId,
      phase: message.phase,
      status: message.status,
      progress: message.progress,
      timestamp: message.timestamp,
    });

    // Emit to global room for dashboard overview
    websocketServer.emitToRoom('global', 'spec:update', {
      specId: message.specId,
      projectId: message.projectId,
      phase: message.phase,
      status: message.status,
      progress: message.progress,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle task update
   */
  private async handleTaskUpdate(message: TaskUpdateMessage): Promise<void> {
    loggers.websocket.debug({ message }, 'Handling task update');

    // Emit to task-specific room
    websocketServer.emitToRoom(`task:${message.taskId}`, 'task:update', {
      taskId: message.taskId,
      specId: message.specId,
      status: message.status,
      agentId: message.agentId,
      timestamp: message.timestamp,
    });

    // Emit to spec room
    websocketServer.emitToRoom(`spec:${message.specId}`, 'task:update', {
      taskId: message.taskId,
      specId: message.specId,
      status: message.status,
      agentId: message.agentId,
      timestamp: message.timestamp,
    });

    // Emit to global room
    websocketServer.emitToRoom('global', 'task:update', {
      taskId: message.taskId,
      specId: message.specId,
      status: message.status,
      agentId: message.agentId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle agent update
   */
  private async handleAgentUpdate(message: AgentUpdateMessage): Promise<void> {
    loggers.websocket.debug({ message }, 'Handling agent update');

    // Emit to agent-specific room
    websocketServer.emitToRoom(`agent:${message.agentId}`, 'agent:update', {
      agentId: message.agentId,
      status: message.status,
      taskId: message.taskId,
      cpuUsage: message.cpuUsage,
      memoryUsage: message.memoryUsage,
      timestamp: message.timestamp,
    });

    // Emit to task room if available
    if (message.taskId) {
      websocketServer.emitToRoom(`task:${message.taskId}`, 'agent:update', {
        agentId: message.agentId,
        status: message.status,
        taskId: message.taskId,
        cpuUsage: message.cpuUsage,
        memoryUsage: message.memoryUsage,
        timestamp: message.timestamp,
      });
    }

    // Emit to global room
    websocketServer.emitToRoom('global', 'agent:update', {
      agentId: message.agentId,
      status: message.status,
      taskId: message.taskId,
      cpuUsage: message.cpuUsage,
      memoryUsage: message.memoryUsage,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle test result
   */
  private async handleTestResult(message: TestResultMessage): Promise<void> {
    loggers.websocket.debug({ message }, 'Handling test result');

    // Emit to task room
    websocketServer.emitToRoom(`task:${message.taskId}`, 'test:result', {
      taskId: message.taskId,
      specId: message.specId,
      suite: message.suite,
      name: message.name,
      status: message.status,
      duration: message.duration,
      error: message.error,
      timestamp: message.timestamp,
    });

    // Emit to spec room
    websocketServer.emitToRoom(`spec:${message.specId}`, 'test:result', {
      taskId: message.taskId,
      specId: message.specId,
      suite: message.suite,
      name: message.name,
      status: message.status,
      duration: message.duration,
      error: message.error,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle activity log
   */
  private async handleActivityLog(message: ActivityLogMessage): Promise<void> {
    loggers.websocket.debug({ message }, 'Handling activity log');

    // Emit to relevant rooms based on what IDs are present
    if (message.specId) {
      websocketServer.emitToRoom(`spec:${message.specId}`, 'activity:log', {
        eventType: message.eventType,
        specId: message.specId,
        taskId: message.taskId,
        agentId: message.agentId,
        message: message.message,
        metadata: message.metadata,
        timestamp: message.timestamp,
      });
    }

    if (message.taskId) {
      websocketServer.emitToRoom(`task:${message.taskId}`, 'activity:log', {
        eventType: message.eventType,
        specId: message.specId,
        taskId: message.taskId,
        agentId: message.agentId,
        message: message.message,
        metadata: message.metadata,
        timestamp: message.timestamp,
      });
    }

    if (message.agentId) {
      websocketServer.emitToRoom(`agent:${message.agentId}`, 'activity:log', {
        eventType: message.eventType,
        specId: message.specId,
        taskId: message.taskId,
        agentId: message.agentId,
        message: message.message,
        metadata: message.metadata,
        timestamp: message.timestamp,
      });
    }

    // Always emit to global room
    websocketServer.emitToRoom('global', 'activity:log', {
      eventType: message.eventType,
      specId: message.specId,
      taskId: message.taskId,
      agentId: message.agentId,
      message: message.message,
      metadata: message.metadata,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle system alert
   */
  private async handleSystemAlert(message: SystemAlertMessage): Promise<void> {
    loggers.websocket.info({ message }, 'Handling system alert');

    // Broadcast to all clients
    websocketServer.broadcast('system:alert', {
      level: message.level,
      message: message.message,
      metadata: message.metadata,
      timestamp: message.timestamp,
    });
  }

  /**
   * Cleanup and unsubscribe from all events
   */
  cleanup(): void {
    if (!this.isInitialized) {
      return;
    }

    loggers.websocket.info('Cleaning up WebSocket event handlers');

    // Unsubscribe from all pub/sub channels
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];

    this.isInitialized = false;
  }
}

// Singleton instance
export const eventHandlers = new WebSocketEventHandlers();

// Initialize on module load
if (process.env.NODE_ENV !== 'test') {
  eventHandlers.initialize();
}

// Cleanup on shutdown
process.on('SIGTERM', () => {
  eventHandlers.cleanup();
});

process.on('SIGINT', () => {
  eventHandlers.cleanup();
});
