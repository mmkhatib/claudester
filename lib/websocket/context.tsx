'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

interface WebSocketContextType {
  status: WebSocketStatus;
  send: (message: WebSocketMessage) => void;
  subscribe: (type: string, callback: (data: any) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function WebSocketProvider({
  children,
  url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  autoConnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
}: WebSocketProviderProps) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const subscribers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const messageQueue = useRef<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setStatus('connecting');

    try {
      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('[WebSocket] Connected');
        setStatus('connected');
        reconnectAttempts.current = 0;

        // Send queued messages
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift();
          if (message) {
            socket.send(JSON.stringify(message));
          }
        }
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          // Notify subscribers
          const typeSubscribers = subscribers.current.get(message.type);
          if (typeSubscribers) {
            typeSubscribers.forEach((callback) => {
              try {
                callback(message.data);
              } catch (error) {
                console.error('[WebSocket] Subscriber error:', error);
              }
            });
          }

          // Notify wildcard subscribers
          const wildcardSubscribers = subscribers.current.get('*');
          if (wildcardSubscribers) {
            wildcardSubscribers.forEach((callback) => {
              try {
                callback(message);
              } catch (error) {
                console.error('[WebSocket] Wildcard subscriber error:', error);
              }
            });
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setStatus('error');
      };

      socket.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setStatus('disconnected');
        ws.current = null;

        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`[WebSocket] Reconnecting... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
          setStatus('error');
        }
      };

      ws.current = socket;
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      setStatus('error');
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setStatus('disconnected');
    reconnectAttempts.current = 0;
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(messageWithTimestamp));
    } else {
      // Queue message for later
      messageQueue.current.push(messageWithTimestamp);
      console.warn('[WebSocket] Message queued (not connected)');
    }
  }, []);

  const subscribe = useCallback((type: string, callback: (data: any) => void) => {
    if (!subscribers.current.has(type)) {
      subscribers.current.set(type, new Set());
    }

    subscribers.current.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeSubscribers = subscribers.current.get(type);
      if (typeSubscribers) {
        typeSubscribers.delete(callback);
        if (typeSubscribers.size === 0) {
          subscribers.current.delete(type);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  const value: WebSocketContextType = {
    status,
    send,
    subscribe,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
