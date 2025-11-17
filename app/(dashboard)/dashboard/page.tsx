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

export default async function DashboardPage() {
  // TODO: Fetch real data from API
  const stats = {
    projects: { total: 5, active: 3 },
    specs: { total: 12, inProgress: 4, pending: 2 },
    tasks: { total: 45, completed: 28, inProgress: 10, pending: 7 },
    agents: { active: 2, idle: 3 },
  };

  const recentActivity = [
    {
      id: 1,
      type: 'spec',
      title: 'User Authentication System',
      status: 'Requirements approved',
      time: '2 hours ago',
    },
    {
      id: 2,
      type: 'task',
      title: 'Implement login endpoint',
      status: 'Completed',
      time: '3 hours ago',
    },
    {
      id: 3,
      type: 'agent',
      title: 'Development Agent #1',
      status: 'Started task execution',
      time: '4 hours ago',
    },
  ];

  const activeSpecs = [
    {
      id: '1',
      title: 'User Authentication System',
      phase: 'DESIGN',
      progress: 50,
      project: 'Platform Core',
    },
    {
      id: '2',
      title: 'Payment Integration',
      phase: 'TASKS',
      progress: 75,
      project: 'E-commerce Module',
    },
    {
      id: '3',
      title: 'Analytics Dashboard',
      phase: 'REQUIREMENTS',
      progress: 25,
      project: 'Analytics',
    },
  ];

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
            <div className="space-y-4">
              {activeSpecs.map((spec) => (
                <Link
                  key={spec.id}
                  href={`/specs/${spec.id}`}
                  className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{spec.title}</h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        {spec.project}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                      {spec.phase}
                    </span>
                  </div>
                  <div className="mt-3">
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
                </Link>
              ))}
            </div>
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
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                    {activity.type === 'spec' && <FileText className="h-4 w-4" />}
                    {activity.type === 'task' && <CheckSquare className="h-4 w-4" />}
                    {activity.type === 'agent' && <Bot className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {activity.status}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
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
