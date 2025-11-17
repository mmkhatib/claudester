'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Bot,
  CheckSquare,
  Code,
  Pause,
  Play,
  Square,
  Zap,
} from 'lucide-react';
import { AgentStatusPanel } from '@/components/monitor/agent-status-panel';
import { TaskProgressTracker } from '@/components/monitor/task-progress-tracker';
import { LiveCodePreview } from '@/components/monitor/live-code-preview';
import { LiveTestResults } from '@/components/monitor/live-test-results';
import { ActivityFeed } from '@/components/monitor/activity-feed';
import { DevelopmentControlPanel } from '@/components/monitor/development-control-panel';
import { WebSocketProvider } from '@/lib/websocket/context';
import { useWebSocketStatus } from '@/lib/websocket/hooks';

function MonitorContent() {
  const { status, isConnected } = useWebSocketStatus();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Monitor</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Live monitoring of agents, tasks, and test execution
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {status === 'connected' && 'Connected'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'disconnected' && 'Disconnected'}
              {status === 'error' && 'Connection Error'}
            </span>
          </div>
          <DevelopmentControlPanel />
        </div>
      </div>

      {/* Main monitoring grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Agent status and tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Status Panel */}
          <AgentStatusPanel />

          {/* Task Progress Tracker */}
          <TaskProgressTracker />

          {/* Live Test Results */}
          <LiveTestResults />
        </div>

        {/* Right column - Code preview and activity */}
        <div className="space-y-6">
          {/* Live Code Preview */}
          <LiveCodePreview />

          {/* Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  return (
    <WebSocketProvider autoConnect={true}>
      <MonitorContent />
    </WebSocketProvider>
  );
}
