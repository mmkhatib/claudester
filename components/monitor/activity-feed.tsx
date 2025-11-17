'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Bot, Code, CheckSquare, FileText, AlertCircle, Filter } from 'lucide-react';
import { useWebSocketValue } from '@/lib/websocket/hooks';
import { useState } from 'react';

type ActivityType = 'agent' | 'code' | 'task' | 'test' | 'spec' | 'error';

interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  agentId?: string;
  severity?: 'info' | 'warning' | 'error';
}

export function ActivityFeed() {
  const activities = useWebSocketValue<ActivityEvent[]>('activity:feed', [
    {
      id: '1',
      type: 'agent',
      title: 'Agent #1 started task',
      description: 'Implementing user registration endpoint',
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      agentId: '1',
      severity: 'info',
    },
    {
      id: '2',
      type: 'code',
      title: 'Code change detected',
      description: 'Modified src/auth/register.ts',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      severity: 'info',
    },
    {
      id: '3',
      type: 'test',
      title: 'Test passed',
      description: 'should hash password correctly',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      severity: 'info',
    },
    {
      id: '4',
      type: 'agent',
      title: 'Agent #2 started task',
      description: 'Writing unit tests for authentication',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      agentId: '2',
      severity: 'info',
    },
    {
      id: '5',
      type: 'task',
      title: 'Task completed',
      description: 'Set up authentication system',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      severity: 'info',
    },
    {
      id: '6',
      type: 'code',
      title: 'Code change detected',
      description: 'Created src/auth/hash.ts',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      severity: 'info',
    },
    {
      id: '7',
      type: 'spec',
      title: 'Spec updated',
      description: 'User Authentication System - Phase updated to TASKS',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      severity: 'info',
    },
  ]);

  const [filter, setFilter] = useState<ActivityType | 'all'>('all');

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'agent':
        return <Bot className="h-4 w-4" />;
      case 'code':
        return <Code className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'test':
        return <Activity className="h-4 w-4" />;
      case 'spec':
        return <FileText className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'agent':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400';
      case 'code':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400';
      case 'task':
        return 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400';
      case 'test':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400';
      case 'spec':
        return 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400';
      case 'error':
        return 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter((a) => a.type === filter);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Activity Feed</span>
            </CardTitle>
            <CardDescription>Real-time event stream</CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All
          </Badge>
          {(['agent', 'code', 'task', 'test', 'spec'] as ActivityType[]).map((type) => (
            <Badge
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setFilter(type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 ${getActivityColor(
                  activity.type
                )}`}
              >
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {activity.description}
                  </p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
