import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  FileText,
  CheckSquare,
  Bot,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
} from 'lucide-react';

async function getStats() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const [projectsJson, specsJson, tasksJson, agentsJson] = await Promise.all([
      fetch(`${baseUrl}/api/projects`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { data: [] }),
      fetch(`${baseUrl}/api/specs`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { data: [] }),
      fetch(`${baseUrl}/api/tasks`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { data: [] }),
      fetch(`${baseUrl}/api/agents`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { data: [] }),
    ]);

    // Unwrap the data from the standard API response
    const projects = Array.isArray(projectsJson.data) ? projectsJson.data : (Array.isArray(projectsJson) ? projectsJson : []);
    const specs = Array.isArray(specsJson.data) ? specsJson.data : (Array.isArray(specsJson) ? specsJson : []);
    const tasks = Array.isArray(tasksJson.data) ? tasksJson.data : (Array.isArray(tasksJson) ? tasksJson : []);
    const agents = Array.isArray(agentsJson.data) ? agentsJson.data : (Array.isArray(agentsJson) ? agentsJson : []);

    return {
      projects: {
        total: projects.length,
        active: projects.filter((p: any) => p.status === 'ACTIVE').length,
      },
      specs: {
        total: specs.length,
        inProgress: specs.filter((s: any) => s.phase === 'TASKS' || s.phase === 'IMPLEMENTATION').length,
        pending: specs.filter((s: any) => s.phase === 'REQUIREMENTS').length,
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter((t: any) => t.status === 'COMPLETED').length,
        inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        pending: tasks.filter((t: any) => t.status === 'PENDING').length,
      },
      agents: {
        active: agents.filter((a: any) => a.status === 'ACTIVE').length,
        idle: agents.filter((a: any) => a.status === 'IDLE').length,
      },
    };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return {
      projects: { total: 0, active: 0 },
      specs: { total: 0, inProgress: 0, pending: 0 },
      tasks: { total: 0, completed: 0, inProgress: 0, pending: 0 },
      agents: { active: 0, idle: 0 },
    };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  // Fetch real recent specs (active ones)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let activeSpecs: any[] = [];

  try {
    const specs = await fetch(`${baseUrl}/api/specs`, { cache: 'no-store' });
    if (specs.ok) {
      const json = await specs.json();
      // API returns {success: true, data: {specs: [...], pagination: {...}}}
      const allSpecs = json.data?.specs || json.specs || [];
      activeSpecs = allSpecs
        .filter((s: any) => s.phase !== 'COMPLETED')
        .slice(0, 3);
    }
  } catch (error) {
    console.error('Failed to fetch specs:', error);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Overview of your development platform
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Spec
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Projects
                </p>
                <p className="text-3xl font-bold mt-2">{stats.projects.total}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {stats.projects.active} active
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Specs
                </p>
                <p className="text-3xl font-bold mt-2">{stats.specs.total}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {stats.specs.inProgress} in progress
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
                  Tasks
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
                  Agents
                </p>
                <p className="text-3xl font-bold mt-2">{stats.agents.active}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {stats.agents.idle} idle
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 dark:bg-orange-950 rounded-lg flex items-center justify-center">
                <Bot className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active specs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Specs</CardTitle>
              <Link href="/specs">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Specs currently in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeSpecs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  No active specs. Create a new spec to get started.
                </p>
                <Link href="/specs/new">
                  <Button size="sm" className="mt-3">Create Spec</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSpecs.map((spec) => {
                  const progress = spec.progress || 0;
                  return (
                    <Link
                      key={spec._id}
                      href={`/specs/${spec._id}`}
                      className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium">{spec.name || spec.title}</h3>
                          {spec.projectId && (
                            <p className="text-sm text-zinc-500 mt-1">
                              Project ID: {spec.projectId}
                            </p>
                          )}
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                          {spec.phase}
                        </span>
                      </div>
                      {progress > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link href="/activity">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Latest updates across your projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Activity feed will show real-time updates from agents
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/projects/new">
              <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                <FolderKanban className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
                <h3 className="font-medium mb-1">Create Project</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Start a new development project
                </p>
              </div>
            </Link>

            <Link href="/specs/new">
              <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-3" />
                <h3 className="font-medium mb-1">New Spec</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Define requirements for a new feature
                </p>
              </div>
            </Link>

            <Link href="/agents">
              <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                <Bot className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-3" />
                <h3 className="font-medium mb-1">Monitor Agents</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  View agent status and performance
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
