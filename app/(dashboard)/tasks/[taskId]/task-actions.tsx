'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';

interface TaskActionsProps {
  taskId: string;
  status: string;
}

export function TaskActions({ taskId, status }: TaskActionsProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  const handleStartTask = async () => {
    try {
      setIsStarting(true);
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

      setTimeout(() => router.refresh(), 500);
    } catch (error) {
      console.error('Error starting task:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: 'Failed to start task',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const confirmCancelTask = async () => {
    setShowCancelConfirm(false);
    
    try {
      setIsCancelling(true);
      const response = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success) {
        setAlertDialog({
          open: true,
          title: 'Error',
          description: `Failed to cancel task: ${result.error}`,
        });
        return;
      }

      setTimeout(() => router.refresh(), 500);
    } catch (error) {
      console.error('Error cancelling task:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: 'Failed to cancel task',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const canStart = status === 'PENDING' || status === 'FAILED' || status === 'CANCELLED';
  const isRunning = status === 'IN_PROGRESS';
  const isCompleted = status === 'COMPLETED';

  return (
    <div className="flex items-center gap-2">
      {canStart && (
        <Button
          onClick={handleStartTask}
          disabled={isStarting}
          size="sm"
        >
          {isStarting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Task
            </>
          )}
        </Button>
      )}

      {isRunning && (
        <>
          <Button
            onClick={() => setShowCancelConfirm(true)}
            variant="destructive"
            size="sm"
            disabled={isCancelling}
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Task
              </>
            )}
          </Button>
          <Button
            onClick={() => router.refresh()}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </>
      )}

      {isCompleted && (
        <Button
          onClick={handleStartTask}
          variant="outline"
          size="sm"
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Restarting...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Run Again
            </>
          )}
        </Button>
      )}
      
      <ConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel Task"
        description="Are you sure you want to cancel this task?"
        confirmLabel="Cancel Task"
        variant="destructive"
        onConfirm={confirmCancelTask}
        loading={isCancelling}
      />
      
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        title={alertDialog.title}
        description={alertDialog.description}
      />
    </div>
  );
}
