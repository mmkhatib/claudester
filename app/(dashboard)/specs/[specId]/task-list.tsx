'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Play, PlayCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AlertDialog } from '@/components/ui/alert-dialog';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  type?: string;
  estimatedHours?: number;
}

interface TaskListProps {
  tasks: Task[];
  specId: string;
}

export function TaskList({ tasks, specId }: TaskListProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isStarting, setIsStarting] = useState(false);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const router = useRouter();
  
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

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

  const handleStartTask = async (taskId: string) => {
    try {
      setStartingTaskId(taskId);
      const response = await fetch(`/api/tasks/${taskId}/start`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success) {
        setAlertDialog({
          open: true,
          title: 'Error',
          description: `Failed to start task: ${result.error}`,
        });
        return;
      }

      setAlertDialog({
        open: true,
        title: 'Success',
        description: `Task started successfully! Agent ID: ${result.data.agent.agentId}`,
      });
      setTimeout(() => router.refresh(), 1500);
    } catch (error) {
      console.error('Error starting task:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: 'Failed to start task',
      });
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
            disabled={selectedTasks.size === 0 || isStarting}
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
            disabled={tasks.length === 0 || isStarting}
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

      {/* Task list */}
      <div className="space-y-3">
        {tasks.map((task: Task, index: number) => (
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
                  {index + 1}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {task.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartTask(task._id);
                    }}
                    disabled={startingTaskId === task._id || task.status === 'COMPLETED'}
                  >
                    {startingTaskId === task._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {(task.estimatedHours || task.type) && (
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                  {task.estimatedHours && (
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {task.estimatedHours}h estimated
                    </span>
                  )}
                  {task.type && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                      {task.type}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        title={alertDialog.title}
        description={alertDialog.description}
      />
    </div>
  );
}
