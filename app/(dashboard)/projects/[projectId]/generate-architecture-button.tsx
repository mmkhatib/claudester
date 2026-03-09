'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { ProgressModal } from '@/components/ui/progress-modal';
import { AlertDialog } from '@/components/ui/alert-dialog';

export function GenerateArchitectureButton({ projectId }: { projectId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-architecture`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to generate architecture');
      
      setAlertDialog({
        open: true,
        title: 'Success',
        description: 'Architecture generated successfully!',
      });
      router.refresh();
    } catch (error) {
      console.error('Error generating architecture:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: 'Failed to generate architecture',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button onClick={handleGenerate} disabled={isGenerating}>
        <Sparkles className="h-4 w-4 mr-2" />
        {isGenerating ? 'Generating...' : 'Generate Architecture'}
      </Button>
      
      <ProgressModal
        open={isGenerating}
        title="Generating Architecture"
        description="AI is analyzing your project and creating architecture..."
      />
      
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        title={alertDialog.title}
        description={alertDialog.description}
      />
    </>
  );
}
