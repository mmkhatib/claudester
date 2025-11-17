'use client';

import { Button } from '@/components/ui/button';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { useWebSocketSend } from '@/lib/websocket/hooks';
import { useState } from 'react';

type ControlState = 'running' | 'paused' | 'stopped';

export function DevelopmentControlPanel() {
  const [state, setState] = useState<ControlState>('running');
  const { send, isConnected } = useWebSocketSend();

  const handlePlay = () => {
    send('control:play', {});
    setState('running');
  };

  const handlePause = () => {
    send('control:pause', {});
    setState('paused');
  };

  const handleStop = () => {
    send('control:stop', {});
    setState('stopped');
  };

  const handleRestart = () => {
    send('control:restart', {});
    setState('running');
  };

  return (
    <div className="flex items-center space-x-2">
      {state === 'running' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePause}
          disabled={!isConnected}
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          disabled={!isConnected}
        >
          <Play className="h-4 w-4 mr-2" />
          Resume
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleStop}
        disabled={!isConnected || state === 'stopped'}
      >
        <Square className="h-4 w-4 mr-2" />
        Stop
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRestart}
        disabled={!isConnected}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Restart
      </Button>
    </div>
  );
}
