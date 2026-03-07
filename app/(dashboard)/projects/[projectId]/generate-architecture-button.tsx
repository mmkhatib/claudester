'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function GenerateArchitectureButton({ projectId }: { projectId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-architecture`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to generate architecture');
      
      router.refresh();
    } catch (error) {
      console.error('Error generating architecture:', error);
      alert('Failed to generate architecture');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={isGenerating}>
      <Sparkles className="h-4 w-4 mr-2" />
      {isGenerating ? 'Generating...' : 'Generate Architecture'}
    </Button>
  );
}
