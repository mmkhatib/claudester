'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog } from '@/components/ui/alert-dialog';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workspacePath: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dirHandle, setDirHandle] = useState<any>(null);
  
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  const handleFolderSelect = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        setDirHandle(handle);
        // Show a placeholder path since we can't get the real one
        setFormData({ ...formData, workspacePath: `[Selected: ${handle.name}]` });
      } catch (err) {
        console.log('Folder selection cancelled');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If user browsed for a folder, create it directly using File System Access API
      if (dirHandle) {
        const projectSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // Create project folder
        const projectFolder = await dirHandle.getDirectoryHandle(projectSlug, { create: true });
        
        // Create .claudester structure
        const claudesterFolder = await projectFolder.getDirectoryHandle('.claudester', { create: true });
        const specsFolder = await claudesterFolder.getDirectoryHandle('specs', { create: true });
        const contextFolder = await claudesterFolder.getDirectoryHandle('context', { create: true });
        
        // Create config.json
        const configFile = await claudesterFolder.getFileHandle('config.json', { create: true });
        const configWritable = await configFile.createWritable();
        await configWritable.write(JSON.stringify({
          version: '1.0.0',
          projectName: formData.name,
          createdAt: new Date().toISOString(),
        }, null, 2));
        await configWritable.close();
        
        // Create project-context.md
        const contextFile = await contextFolder.getFileHandle('project-context.md', { create: true });
        const contextWritable = await contextFile.createWritable();
        await contextWritable.write(`# ${formData.name}\n\n${formData.description || 'No description provided.'}`);
        await contextWritable.close();
        
        // Now create in database with a placeholder path
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            workspacePath: `browser-fs:${dirHandle.name}/${projectSlug}`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create project');
        }
      } else {
        // User typed a path manually
        const projectSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const fullWorkspacePath = formData.workspacePath.endsWith('/') 
          ? `${formData.workspacePath}${projectSlug}`
          : `${formData.workspacePath}/${projectSlug}`;
        
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            workspacePath: fullWorkspacePath,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create project');
        }
      }

      // Redirect to projects list
      router.push('/projects');
      router.refresh();
    } catch (error) {
      console.error('Error creating project:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        description: `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Set up a new development project
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Provide basic information about your project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., E-commerce Platform"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-sm text-zinc-500">
                A clear, descriptive name for your project
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and goals of this project..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <p className="text-sm text-zinc-500">
                A brief overview of what this project will accomplish
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspacePath">Parent Workspace Folder *</Label>
              <div className="flex gap-2">
                <Input
                  id="workspacePath"
                  placeholder="/Users/username/workspace/projects or click Browse"
                  value={formData.workspacePath}
                  onChange={(e) => {
                    setFormData({ ...formData, workspacePath: e.target.value });
                    setDirHandle(null); // Clear browse selection if typing
                  }}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFolderSelect}
                  className="shrink-0"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Browse to select a folder (browser will create files directly) or type an absolute path for server-side creation.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/projects">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </CardFooter>
        </Card>
      </form>
      
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        title={alertDialog.title}
        description={alertDialog.description}
      />
    </div>
  );
}
