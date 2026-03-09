'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, Maximize2, FilePlus, FileEdit, FileX, GitCommit } from 'lucide-react';
import { ProgressModal } from '@/components/ui/progress-modal';
import { io, Socket } from 'socket.io-client';

interface TaskOutputProps {
  taskId: string;
  initialOutput?: string;
  status: string;
  workspacePath?: string;
}

interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
}

export function TaskOutput({ taskId, initialOutput, status, workspacePath }: TaskOutputProps) {
  const [output, setOutput] = useState(initialOutput || '');
  const [showModal, setShowModal] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socketio',
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected for task:', taskId);
      socketInstance.emit('join:task', taskId);
    });

    socketInstance.on('task:output', (data: { taskId: string; output: string }) => {
      if (data.taskId === taskId) {
        setOutput(prev => prev + data.output);
      }
    });

    socketInstance.on('task:file-change', (data: { taskId: string; changes: FileChange[] }) => {
      if (data.taskId === taskId) {
        setFileChanges(data.changes);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [taskId]);

  const isRunning = status === 'IN_PROGRESS';

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <FilePlus className="h-4 w-4 text-green-500" />;
      case 'modified':
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case 'deleted':
        return <FileX className="h-4 w-4 text-red-500" />;
      default:
        return <FileCode className="h-4 w-4" />;
    }
  };

  if (!output && !isRunning && fileChanges.length === 0) {
    return null;
  }

  return (
    <>
      {fileChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5" />
              File Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fileChanges.map((change, index) => (
                <div key={index} className="flex items-center gap-2 text-sm font-mono p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                  {getFileIcon(change.type)}
                  <span className={
                    change.type === 'added' ? 'text-green-600 dark:text-green-400' :
                    change.type === 'modified' ? 'text-blue-600 dark:text-blue-400' :
                    'text-red-600 dark:text-red-400'
                  }>
                    {change.type}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">{change.path}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(output || isRunning) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Code Output
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                View Full Screen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-h-[400px] overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {output || 'Waiting for output...'}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <ProgressModal
        open={showModal}
        title="Task Code Output"
        description={isRunning ? "Live code generation (updates in real-time)" : "Generated code"}
        progress={[output || 'No output yet']}
        onDismiss={() => setShowModal(false)}
      />
    </>
  );
}
