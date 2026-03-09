'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, Maximize2 } from 'lucide-react';
import { ProgressModal } from '@/components/ui/progress-modal';
import { io, Socket } from 'socket.io-client';

interface TaskOutputProps {
  taskId: string;
  initialOutput?: string;
  status: string;
}

export function TaskOutput({ taskId, initialOutput, status }: TaskOutputProps) {
  const [output, setOutput] = useState(initialOutput || '');
  const [showModal, setShowModal] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

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

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [taskId]);

  const isRunning = status === 'IN_PROGRESS';

  if (!output && !isRunning) {
    return null;
  }

  return (
    <>
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
