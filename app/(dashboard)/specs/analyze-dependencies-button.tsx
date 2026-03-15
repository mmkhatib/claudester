'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Layers, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AnalyzeDependenciesButton({ projectId }: { projectId: string }) {
  const [state, setState] = useState<'idle' | 'started' | 'done'>('idle');
  const router = useRouter();

  const handleAnalyze = async () => {
    setState('started');
    await fetch(`/api/projects/${projectId}/analyze-dependencies`, { method: 'POST' });
    // Poll for results — refresh after 35s when Claude should be done
    setTimeout(() => {
      router.refresh();
      setState('done');
      setTimeout(() => setState('idle'), 3000);
    }, 35000);
  };

  return (
    <Button variant="outline" onClick={handleAnalyze} disabled={state !== 'idle'}>
      {state === 'idle' && <><Layers className="h-4 w-4 mr-2" />Analyze Dependencies</>}
      {state === 'started' && <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing... (~35s)</>}
      {state === 'done' && <><CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />Done!</>}
    </Button>
  );
}
