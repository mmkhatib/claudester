import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  FileText,
  Clock,
  FolderKanban,
  CheckCircle2,
  Circle,
} from 'lucide-react';

async function getSpecs() {
  try {
    // Use environment variable for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const res = await fetch(`${baseUrl}/api/specs`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    // API returns {success: true, data: {specs: [...], pagination: {...}}}
    const specs = json.data?.specs || json.specs || [];
    return Array.isArray(specs) ? specs : [];
  } catch (error) {
    console.error('Failed to fetch specs:', error);
    return [];
  }
}

async function getTasks(specId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const res = await fetch(`${baseUrl}/api/tasks?specId=${specId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.tasks || json.tasks || [];
  } catch (error) {
    return [];
  }
}

async function getProject(projectId: string) {
  if (!projectId) return null;

  try {
    // Use environment variable for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const res = await fetch(`${baseUrl}/api/projects/${projectId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    // Unwrap the data from the standard API response
    return json.data || json;
  } catch (error) {
    return null;
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
}

export default async function SpecsPage() {
  const specs = await getSpecs();

  // Sort specs by specNumber ascending
  const sortedSpecs = specs.sort((a: any, b: any) => (a.specNumber || 0) - (b.specNumber || 0));

  // Fetch project data and tasks for all specs in parallel
  const specsWithData = await Promise.all(
    sortedSpecs.map(async (spec: any) => {
      const [project, tasks] = await Promise.all([
        spec.projectId ? getProject(spec.projectId) : null,
        getTasks(spec._id)
      ]);
      
      // Calculate task-based progress
      const taskProgress = tasks.length > 0
        ? Math.round((tasks.filter((t: any) => t.status === 'COMPLETED').length / tasks.length) * 100)
        : 0;
      
      return { ...spec, project, taskProgress, tasks };
    })
  );

  const getPhaseColor = (phase: string) => {
    switch (phase?.toUpperCase()) {
      case 'REQUIREMENTS':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200';
      case 'DESIGN':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200';
      case 'TASKS':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
      case 'IMPLEMENTATION':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200';
      case 'COMPLETED':
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'P0':
      case 'HIGH':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200';
      case 'P1':
      case 'MEDIUM':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200';
      case 'P2':
      case 'LOW':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Specifications</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage feature specs across all projects
          </p>
        </div>
        <Link href="/specs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Spec
          </Button>
        </Link>
      </div>

      {/* Filters and search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="search"
                placeholder="Search specs..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Specs list */}
      {specsWithData.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FileText className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No specifications yet</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Create your first spec to get started
              </p>
              <Link href="/specs/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Spec
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {specsWithData.map((spec: any) => (
            <Link key={spec._id} href={`/specs/${spec._id}`}>
              <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-5 w-5 text-zinc-400" />
                        <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
                          #{String(spec.specNumber || 0).padStart(3, '0')}
                        </span>
                        <h3 className="text-lg font-semibold">{spec.title}</h3>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                        {spec.description || 'No description provided'}
                      </p>
                      
                      {/* Phase completion indicators */}
                      <div className="flex items-center gap-3 mb-3 text-xs">
                        <div className="flex items-center gap-1">
                          {spec.requirements && Object.keys(spec.requirements).length > 0 ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                          <span className="text-zinc-600 dark:text-zinc-400">Requirements</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {spec.design ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                          <span className="text-zinc-600 dark:text-zinc-400">Design</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {spec.tasks && spec.tasks.length > 0 ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                          <span className="text-zinc-600 dark:text-zinc-400">Tasks</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-zinc-500">
                        {spec.project && (
                          <>
                            <FolderKanban className="h-3.5 w-3.5" />
                            <span>{spec.project.name}</span>
                            <span>•</span>
                          </>
                        )}
                        <Clock className="h-3.5 w-3.5" />
                        <span>Updated {spec.updatedAt ? getRelativeTime(spec.updatedAt) : 'recently'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getPhaseColor(spec.phase)}>
                          {spec.phase || 'REQUIREMENTS'}
                        </Badge>
                        {spec.priority && (
                          <Badge className={getPriorityColor(spec.priority)}>
                            {spec.priority}
                          </Badge>
                        )}
                      </div>
                      {spec.status && (
                        <Badge variant="outline">
                          {spec.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-zinc-600 dark:text-zinc-400">Overall Progress</span>
                      <span className="font-medium">{spec.taskProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${spec.taskProgress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
