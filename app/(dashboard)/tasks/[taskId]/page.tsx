import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { Task, Agent, Spec } from '@/backend/models';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, FileCode } from 'lucide-react';
import Link from 'next/link';
import { TaskActions } from './task-actions';
import { TaskOutput } from './task-output';

interface PageProps {
  params: {
    taskId: string;
  };
}

async function getTaskDetails(taskId: string) {
  await connectDB();

  const task = await Task.findById(taskId)
    .populate('specId')
    .populate('projectId')
    .lean();

  if (!task) {
    return null;
  }

  // Find the latest agent for this task
  const agent = await Agent.findOne({ currentTaskId: taskId })
    .sort({ createdAt: -1 })
    .lean();

  return {
    task,
    agent,
  };
}

export default async function TaskDetailPage({ params }: PageProps) {
  const data = await getTaskDetails(params.taskId);

  if (!data) {
    notFound();
  }

  const { task, agent } = data;
  const spec = task.specId as any;

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-zinc-500" />;
      case 'IN_PROGRESS':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200';
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200';
      case 'CANCELLED':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/specs/${spec._id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Spec
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{task.title}</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Spec: {spec?.name || 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusIcon(task.status)}
          <Badge className={getStatusColor(task.status)}>
            {task.status}
          </Badge>
          <TaskActions taskId={params.taskId} status={task.status} />
        </div>
      </div>

      {/* Task Details */}
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {task.description || 'No description provided'}
            </p>
          </div>

          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Acceptance Criteria</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {task.acceptanceCriteria.map((criteria: string, index: number) => (
                  <li key={index}>{criteria}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Type</p>
              <p className="font-medium">{task.type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Estimated Hours</p>
              <p className="font-medium">{task.estimatedHours || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Started</p>
              <p className="font-medium">
                {task.startedAt
                  ? new Date(task.startedAt).toLocaleString()
                  : 'Not started'}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Completed</p>
              <p className="font-medium">
                {task.completedAt
                  ? new Date(task.completedAt).toLocaleString()
                  : 'Not completed'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Error (if no agent or agent has no error) */}
      {task.error && (!agent || !agent.error) && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-900 dark:text-red-200">Task Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <pre className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                {task.error}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Status */}
      {agent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5" />
              Agent Status
            </CardTitle>
            <CardDescription>
              Agent ID: {agent.agentId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Workspace</p>
                <p className="font-mono text-sm mt-1">
                  {agent.workspacePath || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Created</p>
                <p className="text-sm mt-1">
                  {new Date(agent.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Last Updated</p>
                <p className="text-sm mt-1">
                  {new Date(agent.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {agent.error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">Error</h4>
                <pre className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                  {agent.error}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Output - Live Streaming */}
      <TaskOutput 
        taskId={params.taskId} 
        initialOutput={task.output || agent?.output}
        status={task.status}
        workspacePath={agent?.workspacePath}
      />

      {/* Generated Files */}
      {agent && agent.workspacePath && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Workspace
            </CardTitle>
            <CardDescription>
              Files are written to this directory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded bg-zinc-100 dark:bg-zinc-900 font-mono text-sm">
              {agent.workspacePath}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
