import { io, Socket } from 'socket.io-client';
import { getEnv } from './env';

export type SocketEvent =
  | 'spec:update'
  | 'task:update'
  | 'agent:update'
  | 'test:result'
  | 'activity:log'
  | 'system:alert';

export interface SocketEventData {
  'spec:update': {
    specId: string;
    projectId: string;
    phase?: string;
    status?: string;
    progress?: number;
    timestamp: Date;
  };
  'task:update': {
    taskId: string;
    specId: string;
    status: string;
    agentId?: string;
    timestamp: Date;
  };
  'agent:update': {
    agentId: string;
    status: string;
    taskId?: string;
    cpuUsage?: number;
    memoryUsage?: number;
    timestamp: Date;
  };
  'test:result': {
    taskId: string;
    specId: string;
    suite: string;
    name: string;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
    duration?: number;
    error?: string;
    timestamp: Date;
  };
  'activity:log': {
    eventType: string;
    specId?: string;
    taskId?: string;
    agentId?: string;
    message: string;
    metadata?: any;
    timestamp: Date;
  };
  'system:alert': {
    level: 'info' | 'warning' | 'error';
    message: string;
    metadata?: any;
    timestamp: Date;
  };
}

class SocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second

  /**
   * Initialize socket connection
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    const env = getEnv();

    this.socket = io(env.NEXT_PUBLIC_APP_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[Socket] Connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      this.socket!.on('connected', () => {
        resolve();
      });

      this.socket!.on('connect_error', (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Subscribe to a room
   */
  subscribe(room: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Socket not connected'));
      }

      this.socket.emit('subscribe', { room });

      this.socket.once('subscribed', (data: { room: string }) => {
        if (data.room === room) {
          resolve();
        }
      });

      this.socket.once('error', reject);

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Subscribe timeout')), 5000);
    });
  }

  /**
   * Unsubscribe from a room
   */
  unsubscribe(room: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Socket not connected'));
      }

      this.socket.emit('unsubscribe', { room });

      this.socket.once('unsubscribed', (data: { room: string }) => {
        if (data.room === room) {
          resolve();
        }
      });

      this.socket.once('error', reject);

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Unsubscribe timeout')), 5000);
    });
  }

  /**
   * Listen to an event
   */
  on<T extends SocketEvent>(
    event: T,
    handler: (data: SocketEventData[T]) => void
  ): () => void {
    if (!this.socket) {
      console.warn('[Socket] Cannot listen to event - socket not connected');
      return () => {};
    }

    this.socket.on(event as any, handler as any);

    // Return cleanup function
    return () => {
      this.socket?.off(event as any, handler as any);
    };
  }

  /**
   * Listen to an event once
   */
  once<T extends SocketEvent>(
    event: T,
    handler: (data: SocketEventData[T]) => void
  ): void {
    if (!this.socket) {
      console.warn('[Socket] Cannot listen to event - socket not connected');
      return;
    }

    this.socket.once(event as any, handler as any);
  }

  /**
   * Remove event listener
   */
  off<T extends SocketEvent>(
    event: T,
    handler?: (data: SocketEventData[T]) => void
  ): void {
    if (!this.socket) {
      return;
    }

    if (handler) {
      this.socket.off(event as any, handler as any);
    } else {
      this.socket.off(event as any);
    }
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
export const socketClient = new SocketClient();
