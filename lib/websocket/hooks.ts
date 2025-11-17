'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './context';

/**
 * Subscribe to a specific WebSocket message type
 */
export function useWebSocketSubscription<T = any>(
  type: string,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(type, callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subscribe, ...deps]);
}

/**
 * Subscribe to a message type and store the latest value
 */
export function useWebSocketValue<T = any>(type: string, initialValue: T): T {
  const [value, setValue] = useState<T>(initialValue);

  useWebSocketSubscription(type, (data: T) => {
    setValue(data);
  });

  return value;
}

/**
 * Send messages with a helper hook
 */
export function useWebSocketSend() {
  const { send, status } = useWebSocket();

  const sendMessage = useCallback(
    (type: string, data: any) => {
      send({ type, data });
    },
    [send]
  );

  return {
    send: sendMessage,
    isConnected: status === 'connected',
    status,
  };
}

/**
 * Monitor WebSocket connection status
 */
export function useWebSocketStatus() {
  const { status, connect, disconnect } = useWebSocket();

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    hasError: status === 'error',
    connect,
    disconnect,
  };
}
