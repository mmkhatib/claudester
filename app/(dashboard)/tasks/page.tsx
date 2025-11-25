import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckSquare,
  Search,
  Filter,
  Plus,
  Clock,
  User,
  Folder,
} from 'lucide-react';

async function getTasks() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tasks`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    // Unwrap the data from the standard API response
    const data = json.data || json;
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
}

export default async function TasksPage() {
  const tasks = await getTasks();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case 'BLOCKED':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge variant="destructive">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">Medium</Badge>;
      case 'LOW':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage and track all development tasks
          </p>
        </div>
        <Link href="/tasks/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="search"
                placeholder="Search tasks..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckSquare className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Get started by creating your first task
              </p>
              <Link href="/tasks/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <Card key={task._id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/tasks/${task._id}`}>
                        <h3 className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {task.title}
                        </h3>
                      </Link>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>

                    {task.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      {task.specId && (
                        <div className="flex items-center gap-1">
                          <Folder className="h-4 w-4" />
                          <span>Spec</span>
                        </div>
                      )}
                      {task.assignedAgent && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Assigned</span>
                        </div>
                      )}
                      {task.estimatedHours && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{task.estimatedHours}h estimated</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/tasks/${task._id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
