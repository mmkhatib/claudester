import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  CheckSquare,
  Users,
  Settings,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { GenerateSpecsButton } from './generate-specs-button';

interface PageProps {
  params: {
    projectId: string;
  };
}

async function getProject(projectId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    // Unwrap the data from the standard API response
    return json.data || json;
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return null;
  }
}

async function getProjectSpecs(projectId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/specs?projectId=${projectId}`, { cache: 'no-store' });
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

async function getProjectTasks(projectId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/tasks?projectId=${projectId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    // API returns {success: true, data: {tasks: [...], pagination: {...}}}
    const tasks = json.data?.tasks || json.tasks || [];
    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
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

export default async function ProjectDetailPage({ params }: PageProps) {
  const [project, specs, tasks] = await Promise.all([
    getProject(params.projectId),
    getProjectSpecs(params.projectId),
    getProjectTasks(params.projectId),
  ]);

  if (!project) {
    notFound();
  }

  const stats = {
    specs: {
      total: specs.length,
      completed: specs.filter((s: any) => s.phase === 'COMPLETED').length,
      inProgress: specs.filter((s: any) => s.phase === 'IMPLEMENTATION' || s.phase === 'TASKS').length,
    },
    tasks: {
      total: tasks.length,
      completed: tasks.filter((t: any) => t.status === 'COMPLETED').length,
      inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
      pending: tasks.filter((t: any) => t.status === 'PENDING').length,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {project.description || 'No description'}
          </p>
          <div className="flex items-center space-x-4 mt-3">
            <Badge variant="outline" className="capitalize">
              {project.status?.toLowerCase() || 'active'}
            </Badge>
            <span className="text-sm text-zinc-500 flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Updated {project.updatedAt ? getRelativeTime(project.updatedAt) : 'recently'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/specs/new?projectId=${project._id}`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Spec
            </Button>
          </Link>
          <Link href={`/projects/${project._id}/settings`}>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Total Specs
                </p>
                <p className="text-3xl font-bold mt-2">{stats.specs.total}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {stats.specs.completed} completed
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Total Tasks
                </p>
                <p className="text-3xl font-bold mt-2">{stats.tasks.total}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {stats.tasks.completed} completed
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Team Members
                </p>
                <p className="text-3xl font-bold mt-2">{project.teamMembers?.length || 0}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Active collaborators
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Specs list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Specifications</CardTitle>
              <CardDescription>
                Feature specs for this project
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <GenerateSpecsButton projectId={project._id.toString()} />
              <Link href={`/specs/new?projectId=${project._id}`}>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Spec
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {specs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                No specs yet. Generate specs automatically with AI or create them manually.
              </p>
              <div className="flex items-center justify-center gap-3">
                <GenerateSpecsButton projectId={project._id.toString()} />
                <Link href={`/specs/new?projectId=${project._id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manually
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {specs.map((spec: any) => (
                <Link
                  key={spec._id}
                  href={`/specs/${spec._id}`}
                  className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium">{spec.name || spec.title}</h3>
                      <p className="text-sm text-zinc-500 mt-1 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Updated {spec.updatedAt ? getRelativeTime(spec.updatedAt) : 'recently'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{spec.phase || 'REQUIREMENTS'}</Badge>
                      {spec.status && <Badge variant="secondary">{spec.status}</Badge>}
                    </div>
                  </div>
                  {spec.progress !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
                        <span className="font-medium">{spec.progress}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${spec.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                People working on this project
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!project.teamMembers || project.teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No team members yet.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {project.teamMembers.length} team {project.teamMembers.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
