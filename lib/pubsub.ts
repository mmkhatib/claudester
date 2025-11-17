import { redisPub, redisSub } from './redis';
import { loggers } from './logger';
import type { EventType } from '@/backend/models';

// PubSub channels
export enum Channel {
  SPEC_UPDATES = 'spec:updates',
  TASK_UPDATES = 'task:updates',
  AGENT_UPDATES = 'agent:updates',
  TEST_RESULTS = 'test:results',
  ACTIVITY_LOG = 'activity:log',
  SYSTEM_ALERTS = 'system:alerts',
}

// Message types
export interface SpecUpdateMessage {
  type: 'SPEC_UPDATE';
  specId: string;
  projectId: string;
  phase?: string;
  status?: string;
  progress?: number;
  timestamp: Date;
}

export interface TaskUpdateMessage {
  type: 'TASK_UPDATE';
  taskId: string;
  specId: string;
  projectId?: string;
  status?: string;
  progress?: number;
  agentId?: string;
  assignedTo?: string;
  timestamp: Date;
}

export interface AgentUpdateMessage {
  type: 'AGENT_UPDATE';
  agentId: string;
  status: string;
  taskId?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  timestamp: Date;
}

export interface TestResultMessage {
  type: 'TEST_RESULT';
  taskId: string;
  specId: string;
  suite: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration?: number;
  error?: string;
  timestamp: Date;
}

export interface ActivityLogMessage {
  type: 'ACTIVITY_LOG';
  eventType: EventType;
  specId?: string;
  taskId?: string;
  agentId?: string;
  message: string;
  metadata?: any;
  timestamp: Date;
}

export interface SystemAlertMessage {
  type: 'SYSTEM_ALERT';
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata?: any;
  timestamp: Date;
}

export type PubSubMessage =
  | SpecUpdateMessage
  | TaskUpdateMessage
  | AgentUpdateMessage
  | TestResultMessage
  | ActivityLogMessage
  | SystemAlertMessage;

// Publish functions
export async function publishSpecUpdate(message: Omit<SpecUpdateMessage, 'type' | 'timestamp'>) {
  const fullMessage: SpecUpdateMessage = {
    type: 'SPEC_UPDATE',
    ...message,
    timestamp: new Date(),
  };

  await redisPub.publish(Channel.SPEC_UPDATES, JSON.stringify(fullMessage));
}

export async function publishTaskUpdate(message: Omit<TaskUpdateMessage, 'type' | 'timestamp'>) {
  const fullMessage: TaskUpdateMessage = {
    type: 'TASK_UPDATE',
    ...message,
    timestamp: new Date(),
  };

  await redisPub.publish(Channel.TASK_UPDATES, JSON.stringify(fullMessage));
}

export async function publishAgentUpdate(message: Omit<AgentUpdateMessage, 'type' | 'timestamp'>) {
  const fullMessage: AgentUpdateMessage = {
    type: 'AGENT_UPDATE',
    ...message,
    timestamp: new Date(),
  };

  await redisPub.publish(Channel.AGENT_UPDATES, JSON.stringify(fullMessage));
}

export async function publishTestResult(message: Omit<TestResultMessage, 'type' | 'timestamp'>) {
  const fullMessage: TestResultMessage = {
    type: 'TEST_RESULT',
    ...message,
    timestamp: new Date(),
  };

  await redisPub.publish(Channel.TEST_RESULTS, JSON.stringify(fullMessage));
}

export async function publishActivityLog(message: Omit<ActivityLogMessage, 'type' | 'timestamp'>) {
  const fullMessage: ActivityLogMessage = {
    type: 'ACTIVITY_LOG',
    ...message,
    timestamp: new Date(),
  };

  await redisPub.publish(Channel.ACTIVITY_LOG, JSON.stringify(fullMessage));
}

export async function publishSystemAlert(message: Omit<SystemAlertMessage, 'type' | 'timestamp'>) {
  const fullMessage: SystemAlertMessage = {
    type: 'SYSTEM_ALERT',
    ...message,
    timestamp: new Date(),
  };

  await redisPub.publish(Channel.SYSTEM_ALERTS, JSON.stringify(fullMessage));
}

// Subscribe handlers
export type MessageHandler<T = PubSubMessage> = (message: T) => void | Promise<void>;

const subscribers = new Map<string, Set<MessageHandler>>();

export function subscribe(channel: Channel, handler: MessageHandler): () => void {
  // Initialize subscriber set for this channel
  if (!subscribers.has(channel)) {
    subscribers.set(channel, new Set());

    // Subscribe to Redis channel
    redisSub.subscribe(channel, (err) => {
      if (err) {
        loggers.redis.error({ channel, error: err }, 'Failed to subscribe to channel');
      } else {
        loggers.redis.debug({ channel }, 'Subscribed to channel');
      }
    });
  }

  // Add handler
  const handlers = subscribers.get(channel)!;
  handlers.add(handler);

  // Return unsubscribe function
  return () => {
    handlers.delete(handler);

    // If no more handlers, unsubscribe from Redis
    if (handlers.size === 0) {
      subscribers.delete(channel);
      redisSub.unsubscribe(channel);
      loggers.redis.debug({ channel }, 'Unsubscribed from channel');
    }
  };
}

// Handle incoming messages
redisSub.on('message', async (channel: string, message: string) => {
  const handlers = subscribers.get(channel as Channel);

  if (!handlers || handlers.size === 0) {
    return;
  }

  try {
    const parsedMessage: PubSubMessage = JSON.parse(message);

    // Call all handlers
    await Promise.all(
      Array.from(handlers).map(handler =>
        Promise.resolve(handler(parsedMessage))
      )
    );
  } catch (error) {
    loggers.redis.error({ channel, error }, 'Error processing message');
  }
});

// Typed subscription helpers
export function subscribeToSpecUpdates(handler: MessageHandler<SpecUpdateMessage>) {
  return subscribe(Channel.SPEC_UPDATES, handler as MessageHandler);
}

export function subscribeToTaskUpdates(handler: MessageHandler<TaskUpdateMessage>) {
  return subscribe(Channel.TASK_UPDATES, handler as MessageHandler);
}

export function subscribeToAgentUpdates(handler: MessageHandler<AgentUpdateMessage>) {
  return subscribe(Channel.AGENT_UPDATES, handler as MessageHandler);
}

export function subscribeToTestResults(handler: MessageHandler<TestResultMessage>) {
  return subscribe(Channel.TEST_RESULTS, handler as MessageHandler);
}

export function subscribeToActivityLog(handler: MessageHandler<ActivityLogMessage>) {
  return subscribe(Channel.ACTIVITY_LOG, handler as MessageHandler);
}

export function subscribeToSystemAlerts(handler: MessageHandler<SystemAlertMessage>) {
  return subscribe(Channel.SYSTEM_ALERTS, handler as MessageHandler);
}

// Cleanup
export async function unsubscribeAll(): Promise<void> {
  const channels = Array.from(subscribers.keys());

  if (channels.length > 0) {
    await redisSub.unsubscribe(...channels);
    subscribers.clear();
    loggers.redis.info('Unsubscribed from all channels');
  }
}
