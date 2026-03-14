import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  Clock,
  FolderKanban,
  CheckCircle2,
  Circle,
  Lock,
  Layers,
  GitBranch,
} from 'lucide-react';
import { AnalyzeDependenciesButton } from './analyze-dependencies-button';

async function getSpecs() {
  try {
    // Use environment variable for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const res = await fetch(`${baseUrl}/api/specs`, { cache: 'no-store' });
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

async function getTasks(specId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const res = await fetch(`${baseUrl}/api/tasks?specId=${specId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.tasks || json.tasks || [];
  } catch (error) {
    return [];
  }
}

async function getProject(projectId: string) {
  if (!projectId) return null;

  try {
    // Use environment variable for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
    const res = await fetch(`${baseUrl}/api/projects/${projectId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    // Unwrap the data from the standard API response
    return json.data || json;
  } catch (error) {
    return null;
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

function getPhaseColor(phase: string) {
  switch (phase?.toUpperCase()) {
    case 'REQUIREMENTS': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200';
    case 'DESIGN': return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200';
    case 'TASKS': return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
    case 'IMPLEMENTATION': return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200';
    default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
  }
}

export default async function SpecsPage() {
  const specs = await getSpecs();

  // Sort specs by specNumber ascending
  const sortedSpecs = specs.sort((a: any, b: any) => (a.specNumber || 0) - (b.specNumber || 0));

  // Fetch project data and tasks for all specs in parallel
  const specsWithData = await Promise.all(
    sortedSpecs.map(async (spec: any) => {
      const [project, tasks] = await Promise.all([
        spec.projectId ? getProject(typeof spec.projectId === 'object' ? spec.projectId._id : spec.projectId) : null,
        getTasks(spec._id)
      ]);
      const taskProgress = tasks.length > 0
        ? Math.round((tasks.filter((t: any) => t.status === 'COMPLETED').length / tasks.length) * 100)
        : 0;
      return { ...spec, project, taskProgress, tasks };
    })
  );

  // Group by layer
  const foundation = specsWithData.filter((s: any) => s.layer === 'foundation');
  const recommended = specsWithData.filter((s: any) => s.layer === 'recommended');
  const optional = specsWithData.filter((s: any) => s.layer === 'optional');
  const uncategorized = specsWithData.filter((s: any) => !s.layer);

  // Determine which specs are blocked (any dependency not COMPLETE)
  const isBlocked = (spec: any) => {
    if (!spec.dependsOn?.length) return false;
    return spec.dependsOn.some((dep: any) => dep.status !== 'COMPLETE');
  };

  // Get unique project IDs for the analyze button
  const projectIds = [...new Set(specsWithData.map((s: any) => s.projectId?._id || s.projectId).filter(Boolean))];

  const layerConfig = {
    foundation: { label: 'Foundation', color: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200', border: 'border-red-200 dark:border-red-900', icon: '🏗️', desc: 'Must be built first — everything depends on this' },
    recommended: { label: 'Recommended', color: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-900', icon: '⚡', desc: 'Build after foundation — can be done in parallel' },
    optional: { label: 'Optional', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300', border: 'border-zinc-200 dark:border-zinc-700', icon: '✨', desc: 'Enhancement features — build in any order' },
  };

  const renderSpec = (spec: any, blocked: boolean) => {
    const card = (
      <Card className={`transition-colors ${blocked ? 'opacity-60 border-dashed' : 'hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {blocked && <Lock className="h-4 w-4 text-zinc-400 flex-shrink-0" />}
                <span className="text-xs font-mono text-zinc-500">#{String(spec.specNumber || 0).padStart(3, '0')}</span>
                <h3 className="font-semibold text-sm">{spec.title}</h3>
                {spec.layer && (
                  <Badge className={`text-xs ${layerConfig[spec.layer as keyof typeof layerConfig]?.color}`}>
                    {layerConfig[spec.layer as keyof typeof layerConfig]?.label}
                  </Badge>
                )}
                {blocked && <Badge variant="outline" className="text-xs text-zinc-500">Locked</Badge>}
              </div>

              {/* Dependencies */}
              {spec.dependsOn?.length > 0 && (
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  <GitBranch className="h-3 w-3 text-zinc-400" />
                  <span className="text-xs text-zinc-500">Depends on:</span>
                  {spec.dependsOn.map((dep: any) => (
                    <span key={dep._id} className={`text-xs px-1.5 py-0.5 rounded font-mono ${dep.status === 'COMPLETE' ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'}`}>
                      #{String(dep.specNumber).padStart(3, '0')} {dep.title}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  {spec.requirements && Object.keys(spec.requirements).length > 0 ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Circle className="h-3 w-3 text-zinc-400" />}
                  Req
                </div>
                <div className="flex items-center gap-1">
                  {spec.design ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Circle className="h-3 w-3 text-zinc-400" />}
                  Design
                </div>
                <div className="flex items-center gap-1">
                  {spec.tasks?.length > 0 ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Circle className="h-3 w-3 text-zinc-400" />}
                  Tasks
                </div>
                {spec.project && <><FolderKanban className="h-3 w-3" />{spec.project.name}</>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Badge className={getPhaseColor(spec.currentPhase || spec.phase)}>
                {spec.currentPhase || spec.phase || 'REQUIREMENTS'}
              </Badge>
              <span className="text-xs text-zinc-500">{spec.taskProgress}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );

    if (blocked) return <div key={spec._id} className="cursor-not-allowed">{card}</div>;
    return <Link key={spec._id} href={`/specs/${spec._id}`}>{card}</Link>;
  };

  const renderLayer = (specs: any[], layerKey: 'foundation' | 'recommended' | 'optional') => {
    if (!specs.length) return null;
    const cfg = layerConfig[layerKey];
    return (
      <div className={`rounded-lg border-2 ${cfg.border} p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.icon}</span>
          <div>
            <h2 className="font-bold text-base">{cfg.label} Layer</h2>
            <p className="text-xs text-zinc-500">{cfg.desc}</p>
          </div>
          <Badge className={`ml-auto ${cfg.color}`}>{specs.length} spec{specs.length !== 1 ? 's' : ''}</Badge>
        </div>
        <div className="space-y-2">
          {specs.map((spec: any) => renderSpec(spec, isBlocked(spec)))}
        </div>
      </div>
    );
  };

  const hasLayers = foundation.length > 0 || recommended.length > 0 || optional.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Specifications</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Manage feature specs across all projects</p>
        </div>
        <div className="flex items-center gap-2">
          {projectIds.length > 0 && (
            <AnalyzeDependenciesButton projectId={String(projectIds[0])} />
          )}
          <Link href="/specs/new">
            <Button><Plus className="h-4 w-4 mr-2" />New Spec</Button>
          </Link>
        </div>
      </div>

      {specsWithData.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <FileText className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No specifications yet</h3>
          <Link href="/specs/new"><Button><Plus className="h-4 w-4 mr-2" />Create Spec</Button></Link>
        </CardContent></Card>
      ) : hasLayers ? (
        <div className="space-y-6">
          {renderLayer(foundation, 'foundation')}
          {renderLayer(recommended, 'recommended')}
          {renderLayer(optional, 'optional')}
          {uncategorized.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500 flex items-center gap-1"><Layers className="h-4 w-4" /> Uncategorized — run "Analyze Dependencies" to categorize</p>
              {uncategorized.map((spec: any) => renderSpec(spec, false))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-dashed">
            <Layers className="h-4 w-4 text-zinc-400" />
            <p className="text-sm text-zinc-500">Run "Analyze Dependencies" to automatically categorize specs into build layers and detect dependencies.</p>
          </div>
          {specsWithData.map((spec: any) => renderSpec(spec, false))}
        </div>
      )}
    </div>
  );
}

