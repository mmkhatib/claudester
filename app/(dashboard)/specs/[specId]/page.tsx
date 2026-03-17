import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  FileText,
  Clock,
  FolderKanban,
} from 'lucide-react';
import { SpecActions } from './spec-actions';
import { SpecSections } from './spec-sections';
import { getBaseUrl } from '@/lib/config';
import { SpecLoadingProvider } from './spec-loading-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown.css';

interface PageProps {
  params: {
    specId: string;
  };
}

async function getSpec(specId: string) {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/specs/${specId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch (error) {
    console.error('Failed to fetch spec:', error);
    return null;
  }
}

async function getTasks(specId: string) {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/tasks?specId=${specId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.tasks || json.tasks || [];
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

export default async function SpecDetailPage({ params }: PageProps) {
  const spec = await getSpec(params.specId);

  if (!spec) {
    notFound();
  }

  const tasks = await getTasks(params.specId);

  // Compute blocking state
  const blockingSpecs = (spec.dependsOn || []).filter((dep: any) => dep.status !== 'COMPLETE');
  const isBlocked = blockingSpecs.length > 0;

  // Calculate progress based on task completion
  const taskProgress = tasks.length > 0
    ? Math.round((tasks.filter((t: any) => t.status === 'COMPLETED').length / tasks.length) * 100)
    : 0;

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
    <SpecLoadingProvider>
      <div className="space-y-6">
      {/* Back navigation */}
      <div>
        <Link href="/specs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Specs
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="h-8 w-8 text-zinc-400" />
            <span className="text-lg font-mono text-zinc-500 dark:text-zinc-400">
              #{String(spec.specNumber || 0).padStart(3, '0')}
            </span>
            <h1 className="text-3xl font-bold">{spec.title}</h1>
          </div>
          <div className="text-zinc-600 dark:text-zinc-400 mt-2 markdown-body bg-transparent">
            {spec.description ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {spec.description}
              </ReactMarkdown>
            ) : (
              <p className="text-sm">No description provided</p>
            )}
          </div>
          <div className="flex items-center space-x-4 mt-3">
            {spec.projectId && (
              <Link href={`/projects/${spec.projectId._id || spec.projectId}`}>
                <Button variant="outline" size="sm">
                  <FolderKanban className="h-3.5 w-3.5 mr-2" />
                  {spec.projectId.name || 'View Project'}
                </Button>
              </Link>
            )}
            <div className="flex items-center space-x-2">
              <Badge className={getPhaseColor(spec.currentPhase || spec.phase)}>
                {spec.currentPhase || spec.phase || 'REQUIREMENTS'}
              </Badge>
              {spec.priority && (
                <Badge className={getPriorityColor(spec.priority)}>
                  {spec.priority}
                </Badge>
              )}
              {spec.status && (
                <Badge variant="outline">
                  {spec.status.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <span className="text-sm text-zinc-500 flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Updated {spec.updatedAt ? getRelativeTime(spec.updatedAt) : 'recently'}
            </span>
          </div>
        </div>
        <SpecActions
          specId={spec._id}
          specName={spec.name || spec.title}
          currentPhase={spec.currentPhase || spec.phase || 'REQUIREMENTS'}
          hasRequirements={spec.requirements && Object.keys(spec.requirements).length > 0}
          hasDesign={!!spec.design}
          isBlocked={isBlocked}
        />
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-2xl font-bold">{taskProgress}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
          {tasks.length > 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              {tasks.filter((t: any) => t.status === 'COMPLETED').length} of {tasks.length} tasks completed
            </p>
          )}
        </CardContent>
      </Card>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 p-4 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-semibold text-orange-800 dark:text-orange-200">This spec is locked</p>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Complete these specs first:
            </p>
            <ul className="mt-1 space-y-0.5">
              {blockingSpecs.map((dep: any) => (
                <li key={dep._id}>
                  <a href={`/specs/${dep._id}`} className="text-sm font-mono text-orange-700 dark:text-orange-300 underline">
                    #{String(dep.specNumber).padStart(3,'0')} {dep.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Content sections - collapsible with persisted state */}
      <SpecSections spec={spec} tasks={tasks} isBlocked={isBlocked} />

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Spec Number</div>
              <div className="font-medium mt-1">#{spec.specNumber || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Status</div>
              <div className="font-medium mt-1">{spec.status || 'ACTIVE'}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Created</div>
              <div className="font-medium mt-1">
                {spec.createdAt ? new Date(spec.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Last Updated</div>
              <div className="font-medium mt-1">
                {spec.updatedAt ? new Date(spec.updatedAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </SpecLoadingProvider>
  );
}
