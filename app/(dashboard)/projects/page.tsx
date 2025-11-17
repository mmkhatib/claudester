import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  MoreVertical,
  FolderKanban,
  FileText,
  Clock,
  Users,
} from 'lucide-react';

export default async function ProjectsPage() {
  // TODO: Fetch real data from API
  const projects = [
    {
      id: '1',
      name: 'Platform Core',
      description: 'Core platform features and infrastructure',
      specs: 5,
      tasks: 23,
      members: 4,
      status: 'active',
      updatedAt: '2 hours ago',
    },
    {
      id: '2',
      name: 'E-commerce Module',
      description: 'Shopping cart, checkout, and payment integration',
      specs: 3,
      tasks: 15,
      members: 2,
      status: 'active',
      updatedAt: '5 hours ago',
    },
    {
      id: '3',
      name: 'Analytics',
      description: 'User analytics and reporting dashboard',
      specs: 2,
      tasks: 8,
      members: 3,
      status: 'planning',
      updatedAt: '1 day ago',
    },
    {
      id: '4',
      name: 'Mobile App',
      description: 'React Native mobile application',
      specs: 4,
      tasks: 18,
      members: 3,
      status: 'active',
      updatedAt: '3 days ago',
    },
  ];

  const statusColors = {
    active: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200',
    planning: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200',
    completed: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                      <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-xl">
                      <Link href={`/projects/${project.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                        {project.name}
                      </Link>
                    </CardTitle>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Status badge */}
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[project.status as keyof typeof statusColors]}`}>
                    {project.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-950 rounded flex items-center justify-center">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{project.specs}</p>
                      <p className="text-xs text-zinc-500">Specs</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center">
                      <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{project.tasks}</p>
                      <p className="text-xs text-zinc-500">Tasks</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-orange-100 dark:bg-orange-950 rounded flex items-center justify-center">
                      <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{project.members}</p>
                      <p className="text-xs text-zinc-500">Members</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center text-sm text-zinc-500">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Updated {project.updatedAt}
                  </div>
                  <Link href={`/projects/${project.id}`}>
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

      {/* Empty state (shown when no projects) */}
      {projects.length === 0 && (
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
      )}
    </div>
  );
}
