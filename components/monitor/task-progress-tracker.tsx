'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Clock, ArrowRight } from 'lucide-react';
import { useWebSocketValue } from '@/lib/websocket/hooks';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  dependencies?: string[];
  assignedAgent?: string;
  estimatedTime?: string;
  elapsedTime?: string;
}

export function TaskProgressTracker() {
  const tasks = useWebSocketValue<Task[]>('tasks:progress', [
    {
      id: '1',
      title: 'Set up authentication system',
      status: 'completed',
      progress: 100,
      assignedAgent: 'Development Agent #1',
      elapsedTime: '15m',
    },
    {
      id: '2',
      title: 'Implement user registration endpoint',
      status: 'in_progress',
      progress: 65,
      dependencies: ['1'],
      assignedAgent: 'Development Agent #1',
      estimatedTime: '20m',
      elapsedTime: '12m',
    },
    {
      id: '3',
      title: 'Write authentication tests',
      status: 'in_progress',
      progress: 40,
      dependencies: ['2'],
      assignedAgent: 'Development Agent #2',
      estimatedTime: '25m',
      elapsedTime: '8m',
    },
    {
      id: '4',
      title: 'Create user profile page',
      status: 'pending',
      dependencies: ['2'],
      estimatedTime: '30m',
    },
    {
      id: '5',
      title: 'Add password reset functionality',
      status: 'pending',
      dependencies: ['1', '2'],
      estimatedTime: '20m',
    },
  ]);

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950';
      case 'pending':
        return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
      default:
        return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '↻';
      case 'failed':
        return '✗';
      case 'pending':
        return '○';
      default:
        return '○';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5" />
              <span>Task Progress</span>
            </CardTitle>
            <CardDescription>Real-time task execution and dependencies</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="default">
              {tasks.filter((t) => t.status === 'in_progress').length} In Progress
            </Badge>
            <Badge variant="secondary">
              {tasks.filter((t) => t.status === 'completed').length} Completed
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div key={task.id}>
              <div
                className={`p-4 rounded-lg border transition-colors ${
                  task.status === 'in_progress'
                    ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start space-x-3 flex-1">
                    <div
                      className={`flex items-center justify-center h-6 w-6 rounded-full text-sm font-medium ${getStatusColor(
                        task.status
                      )}`}
                    >
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.assignedAgent && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {task.assignedAgent}
                        </p>
                      )}
                      {task.dependencies && task.dependencies.length > 0 && (
                        <div className="flex items-center space-x-1 mt-1 text-xs text-zinc-500">
                          <span>Depends on:</span>
                          {task.dependencies.map((depId, i) => (
                            <span key={depId}>
                              Task #{depId}
                              {i < task.dependencies!.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {task.elapsedTime && (
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{task.elapsedTime}</span>
                      </span>
                    )}
                    {task.estimatedTime && !task.elapsedTime && (
                      <span className="text-xs">~{task.estimatedTime}</span>
                    )}
                  </div>
                </div>

                {task.progress !== undefined && task.status === 'in_progress' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
                      <span className="font-medium">{task.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {index < tasks.length - 1 && task.dependencies && (
                <div className="flex justify-center py-1">
                  <ArrowRight className="h-4 w-4 text-zinc-400 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
