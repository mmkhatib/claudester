'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit, Play, Wand2 } from 'lucide-react';

interface SpecActionsProps {
  specId: string;
  specName: string;
  currentPhase: string;
  hasRequirements: boolean;
  hasDesign: boolean;
}

export function SpecActions({ specId, specName, currentPhase, hasRequirements, hasDesign }: SpecActionsProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const handleGenerateRequirementsAndDesign = async () => {
    if (isGenerating) return;

    const confirmed = confirm(`This will use AI to generate requirements and design for "${specName}". This may take a few minutes. Continue?`);
    if (!confirmed) return;

    setIsGenerating(true);

    try {
      // Generate requirements
      console.log('Generating requirements...');
      const reqRes = await fetch(`/api/specs/${specId}/generate-requirements`, {
        method: 'POST',
      });

      if (!reqRes.ok) {
        const error = await reqRes.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate requirements');
      }

      console.log('Requirements generated, generating design...');

      // Generate design
      const designRes = await fetch(`/api/specs/${specId}/generate-design`, {
        method: 'POST',
      });

      if (!designRes.ok) {
        const error = await designRes.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate design');
      }

      alert('Requirements and design generated successfully! The page will now reload.');
      router.refresh();
    } catch (error) {
      console.error('Error generating requirements and design:', error);
      alert(`Failed to generate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (isGeneratingTasks) return;

    const confirmed = confirm(`This will use AI to break down "${specName}" into implementation tasks. Continue?`);
    if (!confirmed) return;

    setIsGeneratingTasks(true);

    try {
      const res = await fetch(`/api/specs/${specId}/generate-tasks`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate tasks');
      }

      const data = await res.json();
      const count = data.count || data.data?.count || 0;

      alert(`Successfully generated ${count} task${count !== 1 ? 's' : ''}!`);
      router.refresh();
    } catch (error) {
      console.error('Error generating tasks:', error);
      alert(`Failed to generate tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const showGenerateRequirements = !hasRequirements || !hasDesign;
  const showGenerateTasks = hasRequirements && hasDesign && currentPhase !== 'COMPLETED';

  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline"
        onClick={() => router.push(`/specs/${specId}/edit`)}
      >
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>
      
      {showGenerateRequirements && (
        <Button
          onClick={handleGenerateRequirementsAndDesign}
          disabled={isGenerating}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Requirements & Design'}
        </Button>
      )}

      {showGenerateTasks && (
        <Button
          onClick={handleGenerateTasks}
          disabled={isGeneratingTasks}
        >
          <Play className="h-4 w-4 mr-2" />
          {isGeneratingTasks ? 'Generating Tasks...' : 'Generate Tasks'}
        </Button>
      )}
    </div>
  );
}
