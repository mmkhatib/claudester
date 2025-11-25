'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewSpecPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectId: projectId || '',
    title: '',
    description: '',
    priority: 'P1',
  });

  useEffect(() => {
    if (projectId) {
      setFormData(prev => ({ ...prev, projectId }));
    }
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create spec');
      }

      const data = await response.json();
      console.log('Created spec:', data);

      // Handle different response structures
      const specId = data._id || data.data?._id || data.id;

      if (specId) {
        // Force a refresh before navigating
        router.refresh();
        router.push(`/specs/${specId}`);
      } else {
        // Fallback to specs list if no ID
        router.refresh();
        router.push('/specs');
      }
    } catch (error) {
      console.error('Error creating spec:', error);
      alert(`Failed to create spec: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const backUrl = projectId ? `/projects/${projectId}` : '/specs';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link href={backUrl}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {projectId ? 'Back to Project' : 'Back to Specs'}
          </Button>
        </Link>
      </div>

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Create New Specification</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Define a new feature specification
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Spec Details</CardTitle>
            <CardDescription>
              Provide information about the specification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., User Authentication System"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <p className="text-sm text-zinc-500">
                A clear, descriptive title for the specification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this specification will accomplish..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <p className="text-sm text-zinc-500">
                A brief overview of the specification scope and goals
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
              >
                <option value="P0">P0 - Critical</option>
                <option value="P1">P1 - High</option>
                <option value="P2">P2 - Medium</option>
              </select>
              <p className="text-sm text-zinc-500">
                P0 = Critical, P1 = High, P2 = Medium
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={backUrl}>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || !formData.projectId}>
              {loading ? 'Creating...' : 'Create Spec'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
