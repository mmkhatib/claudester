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
} from 'lucide-react';

export default async function SpecsPage() {
  // TODO: Fetch real data from API
  const specs = [
    {
      id: '1',
      title: 'User Authentication System',
      description: 'Implement secure user authentication with JWT and OAuth',
      phase: 'DESIGN',
      status: 'IN_PROGRESS',
      priority: 'P0',
      progress: 50,
      project: { id: '1', name: 'Platform Core' },
      updatedAt: '2 hours ago',
    },
    {
      id: '2',
      title: 'Payment Integration',
      description: 'Integrate Stripe payment processing',
      phase: 'TASKS',
      status: 'IN_PROGRESS',
      priority: 'P1',
      progress: 75,
      project: { id: '2', name: 'E-commerce Module' },
      updatedAt: '5 hours ago',
    },
    {
      id: '3',
      title: 'Analytics Dashboard',
      description: 'Build comprehensive analytics and reporting',
      phase: 'REQUIREMENTS',
      status: 'PENDING_APPROVAL',
      priority: 'P1',
      progress: 25,
      project: { id: '3', name: 'Analytics' },
      updatedAt: '1 day ago',
    },
    {
      id: '4',
      title: 'Push Notifications',
      description: 'Implement real-time push notifications',
      phase: 'IMPLEMENTATION',
      status: 'IN_PROGRESS',
      priority: 'P2',
      progress: 90,
      project: { id: '4', name: 'Mobile App' },
      updatedAt: '3 hours ago',
    },
  ];

  const phaseColors = {
    REQUIREMENTS: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200',
    DESIGN: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200',
    TASKS: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200',
    IMPLEMENTATION: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200',
  };

  const priorityColors = {
    P0: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200',
    P1: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200',
    P2: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200',
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
      <div className="space-y-4">
        {specs.map((spec) => (
          <Link key={spec.id} href={`/specs/${spec.id}`}>
            <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-lg font-semibold">{spec.title}</h3>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                      {spec.description}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-zinc-500">
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span>{spec.project.name}</span>
                      <span>•</span>
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated {spec.updatedAt}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={phaseColors[spec.phase as keyof typeof phaseColors]}>
                        {spec.phase}
                      </Badge>
                      <Badge className={priorityColors[spec.priority as keyof typeof priorityColors]}>
                        {spec.priority}
                      </Badge>
                    </div>
                    <Badge variant="outline">
                      {spec.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Overall Progress</span>
                    <span className="font-medium">{spec.progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${spec.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {specs.length === 0 && (
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
      )}
    </div>
  );
}
