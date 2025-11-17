import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub } from '@/lib/redis';
import { loggers } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import { verifyToken } from '@clerk/nextjs/server';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

class WebSocketServer {
  private io: SocketIOServer | null = null;
  private httpServer: HTTPServer | null = null;
  private isInitialized = false;

  /**
   * Initialize WebSocket server
   */
  async initialize(httpServer: HTTPServer): Promise<void> {
    if (this.isInitialized) {
      loggers.websocket.warn('WebSocket server already initialized');
      return;
    }

    this.httpServer = httpServer;
    const env = getEnv();

    // Create Socket.io server
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.NEXT_PUBLIC_APP_URL,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Set up Redis adapter for multi-instance support
    this.io.adapter(createAdapter(redisPub, redisSub));

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify Clerk token
        const payload = await verifyToken(token, {
          secretKey: env.CLERK_SECRET_KEY,
        });

        if (!payload) {
          return next(new Error('Invalid token'));
        }

        // Attach user info to socket
        socket.userId = payload.sub;
        socket.userRole = payload.role as string;

        loggers.websocket.debug(
          {
            userId: socket.userId,
            socketId: socket.id,
          },
          'Socket authenticated'
        );

        next();
      } catch (error) {
        loggers.websocket.error({ error }, 'Socket authentication failed');
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    this.isInitialized = true;

    loggers.websocket.info(
      {
        port: env.WEBSOCKET_PORT,
      },
      'WebSocket server initialized'
    );
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    loggers.websocket.info(
      {
        socketId: socket.id,
        userId: socket.userId,
      },
      'Client connected'
    );

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Handle room subscription
    socket.on('subscribe', (data: { room: string }) => {
      this.handleSubscribe(socket, data.room);
    });

    // Handle room unsubscription
    socket.on('unsubscribe', (data: { room: string }) => {
      this.handleUnsubscribe(socket, data.room);
    });

    // Handle ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      loggers.websocket.info(
        {
          socketId: socket.id,
          userId: socket.userId,
          reason,
        },
        'Client disconnected'
      );
    });

    // Handle errors
    socket.on('error', (error) => {
      loggers.websocket.error(
        {
          socketId: socket.id,
          userId: socket.userId,
          error,
        },
        'Socket error'
      );
    });

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle room subscription
   */
  private handleSubscribe(socket: AuthenticatedSocket, room: string): void {
    // Validate room format
    const validRoomPatterns = [
      /^project:[a-f0-9]{24}$/,
      /^spec:[a-f0-9]{24}$/,
      /^task:[a-f0-9]{24}$/,
      /^agent:[a-z0-9-]+$/,
      /^global$/,
    ];

    const isValid = validRoomPatterns.some((pattern) => pattern.test(room));

    if (!isValid) {
      loggers.websocket.warn(
        {
          socketId: socket.id,
          room,
        },
        'Invalid room name'
      );
      socket.emit('error', { message: 'Invalid room name' });
      return;
    }

    socket.join(room);

    loggers.websocket.debug(
      {
        socketId: socket.id,
        userId: socket.userId,
        room,
      },
      'Client subscribed to room'
    );

    socket.emit('subscribed', { room });
  }

  /**
   * Handle room unsubscription
   */
  private handleUnsubscribe(socket: AuthenticatedSocket, room: string): void {
    socket.leave(room);

    loggers.websocket.debug(
      {
        socketId: socket.id,
        userId: socket.userId,
        room,
      },
      'Client unsubscribed from room'
    );

    socket.emit('unsubscribed', { room });
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      loggers.websocket.error('WebSocket server not initialized');
      return;
    }

    this.io.to(room).emit(event, data);

    loggers.websocket.debug(
      {
        room,
        event,
      },
      'Emitted event to room'
    );
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    this.emitToRoom(`user:${userId}`, event, data);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: any): void {
    if (!this.io) {
      loggers.websocket.error('WebSocket server not initialized');
      return;
    }

    this.io.emit(event, data);

    loggers.websocket.debug(
      {
        event,
      },
      'Broadcasted event to all clients'
    );
  }

  /**
   * Get connected client count
   */
  async getClientCount(): Promise<number> {
    if (!this.io) {
      return 0;
    }

    const sockets = await this.io.fetchSockets();
    return sockets.length;
  }

  /**
   * Get room client count
   */
  async getRoomClientCount(room: string): Promise<number> {
    if (!this.io) {
      return 0;
    }

    const sockets = await this.io.in(room).fetchSockets();
    return sockets.length;
  }

  /**
   * Close WebSocket server
   */
  async close(): Promise<void> {
    if (!this.io) {
      return;
    }

    loggers.websocket.info('Closing WebSocket server');

    // Disconnect all clients
    this.io.disconnectSockets();

    // Close server
    await new Promise<void>((resolve) => {
      this.io!.close(() => {
        resolve();
      });
    });

    this.io = null;
    this.isInitialized = false;

    loggers.websocket.info('WebSocket server closed');
  }

  /**
   * Get server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const websocketServer = new WebSocketServer();
