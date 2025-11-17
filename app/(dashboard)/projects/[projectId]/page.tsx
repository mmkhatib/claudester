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

interface PageProps {
  params: {
    projectId: string;
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  // TODO: Fetch real data from API
  const project = {
    id: params.projectId,
    name: 'Platform Core',
    description: 'Core platform features and infrastructure',
    status: 'active',
    createdAt: '2024-11-10',
    updatedAt: '2 hours ago',
    members: [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ],
  };

  const specs = [
    {
      id: '1',
      title: 'User Authentication System',
      phase: 'DESIGN',
      status: 'IN_PROGRESS',
      progress: 50,
      updatedAt: '2 hours ago',
    },
    {
      id: '2',
      title: 'API Rate Limiting',
      phase: 'TASKS',
      status: 'IN_PROGRESS',
      progress: 75,
      updatedAt: '5 hours ago',
    },
    {
      id: '3',
      title: 'Database Migration System',
      phase: 'IMPLEMENTATION',
      status: 'IN_PROGRESS',
      progress: 90,
      updatedAt: '1 day ago',
    },
  ];

  const stats = {
    specs: { total: 5, completed: 2, inProgress: 3 },
    tasks: { total: 23, completed: 15, inProgress: 6, pending: 2 },
  };

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {project.description}
          </p>
          <div className="flex items-center space-x-4 mt-3">
            <Badge variant="outline" className="capitalize">
              {project.status}
            </Badge>
            <span className="text-sm text-zinc-500 flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Updated {project.updatedAt}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/specs/new?projectId=${project.id}`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Spec
            </Button>
          </Link>
          <Link href={`/projects/${project.id}/settings`}>
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
                <p className="text-3xl font-bold mt-2">{project.members.length}</p>
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
            <Link href={`/specs/new?projectId=${project.id}`}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Spec
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {specs.map((spec) => (
              <Link
                key={spec.id}
                href={`/specs/${spec.id}`}
                className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{spec.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Updated {spec.updatedAt}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{spec.phase}</Badge>
                    <Badge variant="secondary">{spec.status}</Badge>
                  </div>
                </div>
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
              </Link>
            ))}
          </div>
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
          <div className="space-y-3">
            {project.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-zinc-500">{member.email}</p>
                  </div>
                </div>
                <Badge variant="outline">Admin</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
