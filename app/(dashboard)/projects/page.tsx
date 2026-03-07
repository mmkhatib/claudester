import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  FolderKanban,
  FileText,
  Clock,
  Users,
} from 'lucide-react';
import { ProjectActions } from './project-actions';

async function getProjects() {
  try {
    // Use environment variable for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const res = await fetch(`${baseUrl}/api/projects`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    // Unwrap the data from the standard API response
    const data = json.data || json;
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

async function getProjectStats(projectId: string) {
  try {
    // Use environment variable for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const [specsJson, tasksJson] = await Promise.all([
      fetch(`${baseUrl}/api/specs?projectId=${projectId}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { data: { specs: [], tasks: [] } }),
      fetch(`${baseUrl}/api/tasks?projectId=${projectId}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { data: { tasks: [] } }),
    ]);

    // Extract the arrays from the API response structure
    // Specs API returns: { data: { specs: [...], pagination: {...} } }
    // Tasks API returns: { data: { tasks: [...], total: ..., ... } }
    const specs = specsJson.data?.specs || [];
    const tasks = tasksJson.data?.tasks || [];

    return {
      specs: specs.length,
      tasks: tasks.length,
    };
  } catch (error) {
    return { specs: 0, tasks: 0 };
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

export default async function ProjectsPage() {
  const projects = await getProjects();

  // Fetch stats for all projects in parallel
  const projectsWithStats = await Promise.all(
    projects.map(async (project: any) => {
      const stats = await getProjectStats(project._id);
      return { ...project, stats };
    })
  );

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200';
      case 'planning':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
      case 'completed':
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage and organize your development projects
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
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
                placeholder="Search projects..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects grid */}
      {projectsWithStats.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FolderKanban className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Get started by creating your first project
              </p>
              <Link href="/projects/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projectsWithStats.map((project: any) => (
            <Card key={project._id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="h-8 w-8 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                        <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <CardTitle className="text-xl">
                        <Link href={`/projects/${project._id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                          {project.name}
                        </Link>
                      </CardTitle>
                    </div>
                    <CardDescription>{project.description || 'No description'}</CardDescription>
                  </div>
                  <ProjectActions projectId={project._id} projectName={project.name} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status badge */}
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(project.status)}`}>
                      {project.status?.toLowerCase() || 'active'}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-purple-100 dark:bg-purple-950 rounded flex items-center justify-center">
                        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{project.stats.specs}</p>
                        <p className="text-xs text-zinc-500">Specs</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{project.stats.tasks}</p>
                        <p className="text-xs text-zinc-500">Tasks</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center text-sm text-zinc-500">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {project.updatedAt ? getRelativeTime(project.updatedAt) : 'Recently'}
                    </div>
                    <Link href={`/projects/${project._id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
