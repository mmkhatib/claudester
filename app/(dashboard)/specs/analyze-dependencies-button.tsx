'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Layers, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AnalyzeDependenciesButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze-dependencies`, { method: 'POST' });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleAnalyze} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
      {loading ? 'Analyzing...' : 'Analyze Dependencies'}
    </Button>
  );
}
