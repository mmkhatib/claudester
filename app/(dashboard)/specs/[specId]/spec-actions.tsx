'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit, Play, Wand2, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { ProgressModal } from '@/components/ui/progress-modal';
import { useSpecLoading } from './spec-loading-context';
import { io, Socket } from 'socket.io-client';

interface SpecActionsProps {
  specId: string;
  specName: string;
  currentPhase: string;
  hasRequirements: boolean;
  hasDesign: boolean;
  isBlocked?: boolean;
}

export function SpecActions({ specId, specName, currentPhase, hasRequirements, hasDesign, isBlocked = false }: SpecActionsProps) {
  const router = useRouter();
  const { setGeneratingRequirements, setGeneratingDesign, setGeneratingTasks } = useSpecLoading();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState<string>('');
  const [progressType, setProgressType] = useState<string>('');
  const [textBuffer, setTextBuffer] = useState<string>('');
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isAnalyzingTasks, setIsAnalyzingTasks] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showViewOutputModal, setShowViewOutputModal] = useState(false);
  const [viewOutputContent, setViewOutputContent] = useState<string>('');
  const [viewOutputTitle, setViewOutputTitle] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSections, setResetSections] = useState({
    requirements: false,
    design: false,
    tasks: false,
  });
  
  // Confirmation dialogs
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showTasksConfirm, setShowTasksConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Alert dialogs
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  // WebSocket connection
  useEffect(() => {
    const socketInstance = io({
      path: '/api/socketio',
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      socketInstance.emit('join:spec', specId);
    });

    socketInstance.on('ai:progress', (data: { type: string; text: string }) => {
      setProgressType(data.type);
      
      // Buffer text and update UI every 100ms or every 50 characters
      setTextBuffer(prev => {
        const newBuffer = prev + data.text;
        
        // Clear existing timer
        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current);
        }
        
        // Update immediately if buffer is large enough
        if (newBuffer.length >= 50) {
          setStreamingText(current => current + newBuffer);
          return '';
        }
        
        // Otherwise, set timer to flush buffer
        bufferTimerRef.current = setTimeout(() => {
          setStreamingText(current => current + newBuffer);
          setTextBuffer('');
        }, 100);
        
        return newBuffer;
      });
    });

    setSocket(socketInstance);

    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
      socketInstance.disconnect();
    };
  }, [specId]);

  const handleGenerateRequirementsAndDesign = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setShowGenerateConfirm(false);
    setStreamingText('');
    setShowProgressModal(true);
    
    try {
      // Generate requirements only if they don't exist
      if (!hasRequirements) {
        setGeneratingRequirements(true);
        setProgress(['Starting requirements generation...']);
        setProgressType('requirements_generation');
        
        console.log('Generating requirements...');
        const reqRes = await fetch(`/api/specs/${specId}/generate-requirements`, {
          method: 'POST',
        });

        if (!reqRes.ok) {
          const error = await reqRes.json().catch(() => ({}));
          const errorMsg = error.error || error.message || 'Failed to generate requirements';
          throw new Error(errorMsg);
        }
        
        setGeneratingRequirements(false);
      }

      // Generate design
      setGeneratingDesign(true);
      setProgressType('design_generation');
      setProgress(['Starting design generation...']);
      setStreamingText('');
      console.log('Generating design...');

      const designRes = await fetch(`/api/specs/${specId}/generate-design`, {
        method: 'POST',
      });

      console.log('Design response status:', designRes.status, designRes.statusText);

      if (!designRes.ok) {
        const errorData = await designRes.json().catch((e) => {
          console.error('Failed to parse error JSON:', e);
          return {};
        });
        console.log('Design error data:', errorData);
        const errorMsg = errorData.error || errorData.message || JSON.stringify(errorData) || 'Failed to generate design';
        throw new Error(errorMsg);
      }

      const designData = await designRes.json();
      console.log('Design generated successfully:', designData);

      setGeneratingDesign(false);
      
      // Auto-refresh to show new content
      setTimeout(() => {
        router.refresh();
      }, 500);
      
      setAlertDialog({
        open: true,
        title: 'Success',
        description: 'Requirements and design generated successfully!',
      });
    } catch (error) {
      console.error('Error generating requirements and design:', error);
      setGeneratingRequirements(false);
      setGeneratingDesign(false);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try to extract any error message from the object
        const err = error as any;
        errorMessage = err.message || err.error || err.statusText || JSON.stringify(error);
      }
      
      console.log('Parsed error message:', errorMessage);
      
      setAlertDialog({
        open: true,
        title: 'Error',
        description: `Failed to generate: ${errorMessage}`,
      });
    } finally {
      setIsGenerating(false);
      setProgress([]);
      setProgressType('');
      setStreamingText('');
      setShowProgressModal(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (isGeneratingTasks) return;

    setIsGeneratingTasks(true);
    setShowTasksConfirm(false);
    setGeneratingTasks(true);
    setProgressType('tasks_generation');
    setProgress(['Starting tasks generation...']);
    setStreamingText('');
    setShowProgressModal(true);

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

      setGeneratingTasks(false);
      setAlertDialog({
        open: true,
        title: 'Success',
        description: `Successfully generated ${count} task${count !== 1 ? 's' : ''}!`,
      });
      setTimeout(() => router.refresh(), 1500);
    } catch (error) {
      console.error('Error generating tasks:', error);
      setGeneratingTasks(false);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: `Failed to generate tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsGeneratingTasks(false);
      setShowProgressModal(false);
    }
  };

  const handleViewOutput = async () => {
    try {
      const res = await fetch(`/api/specs/${specId}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const spec = data.data;
        let content = '';
        
        if (spec.requirements) {
          content += '# Requirements\n\n';
          content += `## Functional Requirements\n${spec.requirements.functional?.map((r: string) => `- ${r}`).join('\n') || 'None'}\n\n`;
          content += `## Technical Requirements\n${spec.requirements.technical?.map((r: string) => `- ${r}`).join('\n') || 'None'}\n\n`;
          content += `## Constraints\n${spec.requirements.constraints?.map((r: string) => `- ${r}`).join('\n') || 'None'}\n\n`;
          content += `## Acceptance Criteria\n${spec.requirements.acceptanceCriteria?.map((r: string) => `- ${r}`).join('\n') || 'None'}\n\n`;
        }
        
        if (spec.design) {
          content += '# Design\n\n';
          content += `## Architecture\n${spec.design.architecture || 'Not specified'}\n\n`;
          content += `## Data Model\n${spec.design.dataModel || 'Not specified'}\n\n`;
          content += `## API Endpoints\n${spec.design.apiEndpoints?.map((e: string) => `- ${e}`).join('\n') || 'None'}\n\n`;
          content += `## UI Components\n${spec.design.uiComponents?.map((c: string) => `- ${c}`).join('\n') || 'None'}\n\n`;
        }
        
        setViewOutputContent(content);
        setViewOutputTitle(`Generated Output: ${specName}`);
        setShowViewOutputModal(true);
      }
    } catch (error) {
      console.error('Error fetching spec output:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: 'Failed to load generated output',
      });
    }
  };

  const showGenerateRequirements = !hasRequirements || !hasDesign;
  const showGenerateTasks = hasRequirements && hasDesign && currentPhase !== 'COMPLETED';

  const handleAnalyzeTasks = async () => {
    setIsAnalyzingTasks(true);
    try {
      await fetch(`/api/specs/${specId}/analyze-tasks`, { method: 'POST' });
      router.refresh();
    } finally {
      setIsAnalyzingTasks(false);
    }
  };
  const showViewOutput = hasRequirements || hasDesign;

  const handleReset = async () => {
    const sectionsToReset = Object.entries(resetSections)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (sectionsToReset.length === 0) {
      setAlertDialog({
        open: true,
        title: 'No Selection',
        description: 'Please select at least one section to reset',
      });
      return;
    }

    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setIsResetting(true);
    setShowResetConfirm(false);

    try {
      const updates: any = {};
      if (resetSections.requirements) updates.requirements = null;
      if (resetSections.design) updates.design = null;
      if (resetSections.tasks) updates.tasksDoc = null;

      const res = await fetch(`/api/specs/${specId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to reset sections');

      // If tasks were reset, also delete the task records
      if (resetSections.tasks) {
        await fetch(`/api/tasks?specId=${specId}`, {
          method: 'DELETE',
        });
      }

      setAlertDialog({
        open: true,
        title: 'Success',
        description: 'Sections reset successfully!',
      });
      setShowResetModal(false);
      setResetSections({ requirements: false, design: false, tasks: false });
      setTimeout(() => router.refresh(), 1500);
    } catch (error) {
      console.error('Error resetting sections:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: 'Failed to reset sections',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleViewRequirements = async () => {
    try {
      const res = await fetch(`/api/specs/${specId}`);
      const data = await res.json();
      if (data.data?.requirements) {
        const reqText = typeof data.data.requirements === 'string' 
          ? data.data.requirements 
          : JSON.stringify(data.data.requirements, null, 2);
        setViewOutputContent(reqText);
        setViewOutputTitle('Requirements');
        setShowViewOutputModal(true);
      }
    } catch (error) {
      console.error('Error loading requirements:', error);
    }
  };

  const handleViewDesign = async () => {
    try {
      const res = await fetch(`/api/specs/${specId}`);
      const data = await res.json();
      if (data.data?.design) {
        const designText = typeof data.data.design === 'string' 
          ? data.data.design 
          : JSON.stringify(data.data.design, null, 2);
        setViewOutputContent(designText);
        setViewOutputTitle('Design');
        setShowViewOutputModal(true);
      }
    } catch (error) {
      console.error('Error loading design:', error);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
      <Button 
        variant="outline"
        onClick={() => router.push(`/specs/${specId}/edit`)}
      >
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>

      <Button 
        variant="outline"
        onClick={() => setShowResetModal(true)}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
      
      {showGenerateRequirements && (
        <Button
          onClick={() => setShowGenerateConfirm(true)}
          disabled={isGenerating || isBlocked}
          title={isBlocked ? 'Spec is locked — complete dependencies first' : undefined}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : 
           hasRequirements && !hasDesign ? 'Generate Design' :
           !hasRequirements ? 'Generate Requirements & Design' :
           'Regenerate Requirements & Design'}
        </Button>
      )}

      {showGenerateTasks && (
        <Button
          onClick={() => setShowTasksConfirm(true)}
          disabled={isGeneratingTasks || isBlocked}
          title={isBlocked ? 'Spec is locked — complete dependencies first' : undefined}
        >
          <Play className="h-4 w-4 mr-2" />
          {isGeneratingTasks ? 'Generating Tasks...' : 'Generate Tasks'}
        </Button>
      )}

      {!showGenerateTasks && !isBlocked && (
        <Button
          variant="outline"
          onClick={handleAnalyzeTasks}
          disabled={isAnalyzingTasks}
          title="Re-analyze task priorities and dependencies without touching code or status"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {isAnalyzingTasks ? 'Analyzing...' : 'Analyze Tasks'}
        </Button>
      )}
    </div>

    <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Spec Sections</DialogTitle>
          <DialogDescription>
            Select which sections you want to reset. This will permanently delete the selected data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reset-requirements"
              checked={resetSections.requirements}
              onCheckedChange={(checked) =>
                setResetSections({ ...resetSections, requirements: checked as boolean })
              }
            />
            <label
              htmlFor="reset-requirements"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Requirements
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reset-design"
              checked={resetSections.design}
              onCheckedChange={(checked) =>
                setResetSections({ ...resetSections, design: checked as boolean })
              }
            />
            <label
              htmlFor="reset-design"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Design
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reset-tasks"
              checked={resetSections.tasks}
              onCheckedChange={(checked) =>
                setResetSections({ ...resetSections, tasks: checked as boolean })
              }
            />
            <label
              htmlFor="reset-tasks"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Tasks
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
            {isResetting ? 'Resetting...' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialogs */}
    <ConfirmationDialog
      open={showGenerateConfirm}
      onOpenChange={setShowGenerateConfirm}
      title="Generate Requirements & Design"
      description={`This will use AI to generate requirements and design for "${specName}". This may take a few minutes. Continue?`}
      confirmLabel="Generate"
      onConfirm={handleGenerateRequirementsAndDesign}
      loading={isGenerating}
    />

    <ConfirmationDialog
      open={showTasksConfirm}
      onOpenChange={setShowTasksConfirm}
      title="Generate Tasks"
      description={`This will use AI to break down "${specName}" into implementation tasks. Continue?`}
      confirmLabel="Generate"
      onConfirm={handleGenerateTasks}
      loading={isGeneratingTasks}
    />

    <ConfirmationDialog
      open={showResetConfirm}
      onOpenChange={setShowResetConfirm}
      title="Confirm Reset"
      description={`Are you sure you want to reset: ${Object.entries(resetSections).filter(([_, v]) => v).map(([k]) => k).join(', ')}? This action cannot be undone.`}
      confirmLabel="Reset"
      variant="destructive"
      onConfirm={confirmReset}
      loading={isResetting}
    />

    {/* Alert Dialog */}
    <AlertDialog
      open={alertDialog.open}
      onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
      title={alertDialog.title}
      description={alertDialog.description}
    />

    {/* Progress Modal */}
    <ProgressModal
      open={showProgressModal}
      title={
        progressType === 'requirements_generation' ? 'Generating Requirements' :
        progressType === 'design_generation' ? 'Generating Design' :
        progressType === 'tasks_generation' ? 'Generating Tasks' :
        'Generating...'
      }
      description="AI is analyzing and creating content... (You can dismiss this and generation will continue in background)"
      progress={streamingText ? [streamingText] : progress}
      onDismiss={() => setShowProgressModal(false)}
    />

    {/* Show reopen button when generating but modal is dismissed */}
    {(isGenerating || isGeneratingTasks) && !showProgressModal && (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setShowProgressModal(true)} size="lg">
          <Wand2 className="h-4 w-4 mr-2" />
          View Progress
        </Button>
      </div>
    )}

    {/* View Output Modal */}
    <ProgressModal
      open={showViewOutputModal}
      title={viewOutputTitle}
      description="Generated content from AI"
      progress={[viewOutputContent]}
      onDismiss={() => setShowViewOutputModal(false)}
    />
    </>
  );
}
