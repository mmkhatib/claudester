'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Activity, Zap, AlertCircle } from 'lucide-react';
import { useWebSocketValue } from '@/lib/websocket/hooks';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'paused';
  currentTask?: string;
  progress?: number;
  health: number;
  memory: number;
  cpu: number;
}

export function AgentStatusPanel() {
  const agents = useWebSocketValue<Agent[]>('agents:status', [
    {
      id: '1',
      name: 'Development Agent #1',
      status: 'active',
      currentTask: 'Implementing user authentication',
      progress: 65,
      health: 98,
      memory: 45,
      cpu: 32,
    },
    {
      id: '2',
      name: 'Development Agent #2',
      status: 'active',
      currentTask: 'Writing unit tests',
      progress: 40,
      health: 100,
      memory: 38,
      cpu: 28,
    },
    {
      id: '3',
      name: 'Development Agent #3',
      status: 'idle',
      health: 100,
      memory: 12,
      cpu: 5,
    },
  ]);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-zinc-400';
      case 'error':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-zinc-400';
    }
  };

  const getStatusBadgeVariant = (status: Agent['status']): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600 dark:text-green-400';
    if (health >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Agent Status</span>
            </CardTitle>
            <CardDescription>Real-time agent health and activity</CardDescription>
          </div>
          <Badge variant="secondary">
            {agents.filter((a) => a.status === 'active').length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
                  <div>
                    <h4 className="font-medium">{agent.name}</h4>
                    {agent.currentTask && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {agent.currentTask}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(agent.status)}>
                  {agent.status.toUpperCase()}
                </Badge>
              </div>

              {agent.progress !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
                    <span className="font-medium">{agent.progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="flex items-center space-x-1 text-zinc-600 dark:text-zinc-400 mb-1">
                    <Activity className="h-3 w-3" />
                    <span>Health</span>
                  </div>
                  <span className={`font-medium ${getHealthColor(agent.health)}`}>
                    {agent.health}%
                  </span>
                </div>
                <div>
                  <div className="text-zinc-600 dark:text-zinc-400 mb-1">Memory</div>
                  <span className="font-medium">{agent.memory}%</span>
                </div>
                <div>
                  <div className="text-zinc-600 dark:text-zinc-400 mb-1">CPU</div>
                  <span className="font-medium">{agent.cpu}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
