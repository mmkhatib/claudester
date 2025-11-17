'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { socketClient, type SocketEvent, type SocketEventData } from '@/lib/socket-client';

/**
 * Hook to manage WebSocket connection
 */
export function useSocket() {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let mounted = true;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (!token || !mounted) return;

        await socketClient.connect(token);
        if (mounted) {
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Connection failed'));
          setIsConnected(false);
        }
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      socketClient.disconnect();
      setIsConnected(false);
    };
  }, [isSignedIn, getToken]);

  return {
    isConnected,
    error,
    socket: socketClient,
  };
}

/**
 * Hook to subscribe to a room
 */
export function useSocketRoom(room: string | null) {
  const { isConnected } = useSocket();
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isConnected || !room) {
      return;
    }

    let mounted = true;

    const subscribeToRoom = async () => {
      try {
        await socketClient.subscribe(room);
        if (mounted) {
          setSubscribed(true);
        }
      } catch (error) {
        console.error(`Failed to subscribe to room ${room}:`, error);
        if (mounted) {
          setSubscribed(false);
        }
      }
    };

    subscribeToRoom();

    return () => {
      mounted = false;
      if (room) {
        socketClient.unsubscribe(room).catch((error) => {
          console.error(`Failed to unsubscribe from room ${room}:`, error);
        });
      }
      setSubscribed(false);
    };
  }, [isConnected, room]);

  return { subscribed };
}

/**
 * Hook to listen to socket events
 */
export function useSocketEvent<T extends SocketEvent>(
  event: T,
  handler: (data: SocketEventData[T]) => void,
  deps: any[] = []
) {
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const cleanup = socketClient.on(event, handler);

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, event, ...deps]);
}

/**
 * Hook to subscribe to spec updates
 */
export function useSpecUpdates(
  specId: string | null,
  onUpdate: (data: SocketEventData['spec:update']) => void
) {
  useSocketRoom(specId ? `spec:${specId}` : null);
  useSocketEvent('spec:update', onUpdate, [specId]);
}

/**
 * Hook to subscribe to task updates
 */
export function useTaskUpdates(
  taskId: string | null,
  onUpdate: (data: SocketEventData['task:update']) => void
) {
  useSocketRoom(taskId ? `task:${taskId}` : null);
  useSocketEvent('task:update', onUpdate, [taskId]);
}

/**
 * Hook to subscribe to agent updates
 */
export function useAgentUpdates(
  agentId: string | null,
  onUpdate: (data: SocketEventData['agent:update']) => void
) {
  useSocketRoom(agentId ? `agent:${agentId}` : null);
  useSocketEvent('agent:update', onUpdate, [agentId]);
}

/**
 * Hook to subscribe to activity logs
 */
export function useActivityLog(
  room: string | null,
  onLog: (data: SocketEventData['activity:log']) => void
) {
  useSocketRoom(room);
  useSocketEvent('activity:log', onLog, [room]);
}

/**
 * Hook to subscribe to system alerts
 */
export function useSystemAlerts(
  onAlert: (data: SocketEventData['system:alert']) => void
) {
  useSocketEvent('system:alert', onAlert);
}

/**
 * Hook to subscribe to global updates
 */
export function useGlobalUpdates() {
  const { subscribed } = useSocketRoom('global');
  const [specs, setSpecs] = useState<SocketEventData['spec:update'][]>([]);
  const [tasks, setTasks] = useState<SocketEventData['task:update'][]>([]);
  const [agents, setAgents] = useState<SocketEventData['agent:update'][]>([]);

  useSocketEvent('spec:update', (data) => {
    setSpecs((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
  });

  useSocketEvent('task:update', (data) => {
    setTasks((prev) => [data, ...prev].slice(0, 50));
  });

  useSocketEvent('agent:update', (data) => {
    setAgents((prev) => [data, ...prev].slice(0, 50));
  });

  return {
    subscribed,
    specs,
    tasks,
    agents,
  };
}
