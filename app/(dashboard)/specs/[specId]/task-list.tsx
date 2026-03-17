'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Play, PlayCircle, Loader2, Eye, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { ProgressModal } from '@/components/ui/progress-modal';
import { io, Socket } from 'socket.io-client';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  type?: string;
  estimatedHours?: number;
  priority?: number;
  dependencies?: { _id: string; title: string; status: string; order: number }[];
}

const PRIORITY_LABELS: Record<number, string> = { 0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3' };
const PRIORITY_COLORS: Record<number, string> = {
  0: 'border-red-400 dark:border-red-600',
  1: 'border-orange-400 dark:border-orange-600',
  2: 'border-yellow-400 dark:border-yellow-600',
  3: 'border-zinc-300 dark:border-zinc-600',
};
const PRIORITY_BADGE: Record<number, string> = {
  0: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
  1: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
  2: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
  3: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
};

interface TaskListProps {
  tasks: Task[];
  specId: string;
  isBlocked?: boolean;
}

export function TaskList({ tasks, specId, isBlocked = false }: TaskListProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isStarting, setIsStarting] = useState(false);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [taskOutput, setTaskOutput] = useState<string>('');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showViewOutputModal, setShowViewOutputModal] = useState(false);
  const [viewOutputContent, setViewOutputContent] = useState<string>('');
  const [viewOutputTitle, setViewOutputTitle] = useState<string>('');
  const router = useRouter();
  
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socketio',
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected for task list');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(tasks.map(t => t._id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleViewTaskOutput = async (taskId: string, taskTitle: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (data.success && data.data?.output) {
        setViewOutputContent(data.data.output);
        setViewOutputTitle(`Task Output: ${taskTitle}`);
        setShowViewOutputModal(true);
      }
    } catch (error) {
      console.error('Error loading task output:', error);
    }
  };

  const handleStartTask = async (taskId: string) => {
    console.log('[TaskList] Starting task:', taskId);
    try {
      setStartingTaskId(taskId);
      setCurrentTaskId(taskId);
      setTaskOutput('Starting task...\n');
      setShowProgressModal(true);

      // Join task room
      if (socket) {
        console.log('[TaskList] Joining task room:', taskId);
        socket.emit('join:task', taskId);
        socket.on('task:output', (data: { taskId: string; output: string }) => {
          console.log('[TaskList] Received task output:', data);
          if (data.taskId === taskId) {
            setTaskOutput(prev => prev + data.output);
          }
        });
      }

      console.log('[TaskList] Calling API to start task');
      const response = await fetch(`/api/tasks/${taskId}/start`, {
        method: 'POST',
      });

      console.log('[TaskList] API response status:', response.status);
      const result = await response.json();
      console.log('[TaskList] API result:', result);

      if (!result.success) {
        setTaskOutput(prev => prev + `\n[ERROR] ${result.error}`);
        setTimeout(() => {
          setShowProgressModal(false);
          setAlertDialog({
            open: true,
            title: 'Error',
            description: `Failed to start task: ${result.error}`,
          });
        }, 2000);
        return;
      }

      setTaskOutput(prev => prev + `\nTask started! Agent ID: ${result.data.agent?.agentId || 'N/A'}\n`);
      setTimeout(() => router.refresh(), 1500);
    } catch (error) {
      console.error('[TaskList] Error starting task:', error);
      setTaskOutput(prev => prev + `\n[ERROR] ${error}`);
      setTimeout(() => {
        setShowProgressModal(false);
        setAlertDialog({
          open: true,
          title: 'Error',
          description: 'Failed to start task',
        });
      }, 2000);
    } finally {
      setStartingTaskId(null);
    }
  };

  const handleStartSelected = async () => {
    if (selectedTasks.size === 0) {
      setAlertDialog({
        open: true,
        title: 'No Selection',
        description: 'Please select at least one task',
      });
      return;
    }

    try {
      setIsStarting(true);
      const response = await fetch('/api/tasks/bulk-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: Array.from(selectedTasks),
          specId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setAlertDialog({
          open: true,
          title: 'Error',
          description: `Failed to start tasks: ${result.error}`,
        });
        return;
      }

      const { summary } = result.data;
      setAlertDialog({
        open: true,
        title: 'Tasks Started',
        description: `Task execution completed!\nTotal: ${summary.total}\nCompleted: ${summary.completedCount}\nFailed: ${summary.failedCount}\nQueued: ${summary.queuedCount}`,
      });

      setSelectedTasks(new Set());
      setTimeout(() => router.refresh(), 1500);
    } catch (error) {
      console.error('Error starting tasks:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: 'Failed to start tasks',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartAll = async () => {
    const allTaskIds = tasks.map(t => t._id);

    try {
      setIsStarting(true);
      const response = await fetch('/api/tasks/bulk-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: allTaskIds,
          specId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(`Failed to start tasks: ${result.error}`);
        return;
      }

      const { summary } = result.data;
      alert(
        `Task execution completed!\n` +
        `Total: ${summary.total}\n` +
        `Completed: ${summary.completedCount}\n` +
        `Failed: ${summary.failedCount}\n` +
        `Queued: ${summary.queuedCount}`
      );

      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      console.error('Error starting all tasks:', error);
      alert('Failed to start tasks');
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200';
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
    }
  };

  const allSelected = tasks.length > 0 && selectedTasks.size === tasks.length;
  const someSelected = selectedTasks.size > 0 && selectedTasks.size < tasks.length;

  return (
    <div className="space-y-4">
      {/* Blocked banner */}
      {isBlocked && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700 text-sm text-orange-800 dark:text-orange-200">
          🔒 Tasks are locked — complete all dependency specs before starting work.
        </div>
      )}
      {/* Action buttons */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all tasks"
            className="data-[state=indeterminate]:bg-zinc-300"
          />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {selectedTasks.size > 0
              ? `${selectedTasks.size} selected`
              : 'Select all'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartSelected}
            disabled={selectedTasks.size === 0 || isStarting || isBlocked}
            title={isBlocked ? 'Complete dependency specs first' : undefined}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Selected
              </>
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleStartAll}
            disabled={tasks.length === 0 || isStarting || isBlocked}
            title={isBlocked ? 'Complete dependency specs first' : undefined}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Start All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Task list grouped by priority */}
      <div className="space-y-6">
        {[0, 1, 2, 3].map(p => {
          const group = tasks.filter((t: Task) => (t.priority ?? 1) === p);
          if (group.length === 0) return null;
          return (
            <div key={p}>
              <div className={`flex items-center gap-2 mb-2 pb-1 border-b-2 ${PRIORITY_COLORS[p]}`}>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${PRIORITY_BADGE[p]}`}>{PRIORITY_LABELS[p]}</span>
                <span className="text-xs text-zinc-500">{group.length} task{group.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {group.map((task: Task, index: number) => {
                  const blockingDeps = (task.dependencies || []).filter(d => d.status !== 'COMPLETED');
                  const isTaskBlocked = !isBlocked && blockingDeps.length > 0;
                  const blockTitle = isTaskBlocked
                    ? `Waiting for: ${blockingDeps.map(d => d.title).join(', ')}`
                    : isBlocked ? 'Complete dependency specs first' : undefined;
                  return (
                    <div
                      key={task._id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                      onClick={() => router.push(`/tasks/${task._id}`)}
                    >
                      <Checkbox
                        checked={selectedTasks.has(task._id)}
                        onCheckedChange={(checked) => handleSelectTask(task._id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select task ${task.title}`}
                        className="mt-1"
                      />
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {tasks.indexOf(task) + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{task.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                            {task.status === 'COMPLETED' && (
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewTaskOutput(task._id, task.title); }}>
                                <Eye className="h-4 w-4 mr-1" />View Output
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleStartTask(task._id); }}
                              disabled={startingTaskId === task._id || task.status === 'COMPLETED' || isBlocked || isTaskBlocked}
                              title={blockTitle}
                            >
                              {startingTaskId === task._id ? <Loader2 className="h-4 w-4 animate-spin" /> : isTaskBlocked ? <Lock className="h-4 w-4 text-orange-400" /> : <Play className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        {isTaskBlocked && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Waiting for: {blockingDeps.map(d => d.title).join(', ')}
                          </p>
                        )}
                        {(task.dependencies && task.dependencies.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.dependencies.map(d => (
                              <span key={d._id} className={`text-xs px-1.5 py-0.5 rounded border ${d.status === 'COMPLETED' ? 'border-green-300 text-green-700 dark:text-green-400' : 'border-orange-300 text-orange-700 dark:text-orange-400'}`}>
                                {d.status === 'COMPLETED' ? '✓' : '○'} {d.title}
                              </span>
                            ))}
                          </div>
                        )}
                        {(task.estimatedHours || task.type) && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                            {task.estimatedHours && <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />{task.estimatedHours}h estimated</span>}
                            {task.type && <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{task.type}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        title={alertDialog.title}
        description={alertDialog.description}
      />

      <ProgressModal
        open={showProgressModal}
        title="Task Execution"
        description="Agent is working on the task... (You can dismiss and check task page for details)"
        progress={[taskOutput]}
        onDismiss={() => setShowProgressModal(false)}
      />

      <ProgressModal
        open={showViewOutputModal}
        title={viewOutputTitle}
        description="Task execution output"
        progress={[viewOutputContent]}
        onDismiss={() => setShowViewOutputModal(false)}
      />
    </div>
  );
}
