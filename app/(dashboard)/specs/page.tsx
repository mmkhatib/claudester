import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Layers } from 'lucide-react';
import { AnalyzeDependenciesButton } from './analyze-dependencies-button';
import { SpecCard, SpecLayerGroup, SpecPriorityGroup, LAYER_CONFIG } from '@/components/spec-card';

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

  const layerConfig = LAYER_CONFIG;

  const renderSpec = (spec: any, blocked: boolean) => <SpecCard key={spec._id} spec={spec} />;

  const renderLayer = (specs: any[], layerKey: 'foundation' | 'recommended' | 'optional') => (
    <SpecLayerGroup key={layerKey} specs={specs} layerKey={layerKey} />
  );

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
              <SpecPriorityGroup specs={uncategorized} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-dashed">
            <Layers className="h-4 w-4 text-zinc-400" />
            <p className="text-sm text-zinc-500">Run "Analyze Dependencies" to automatically categorize specs into build layers and detect dependencies.</p>
          </div>
          <SpecPriorityGroup specs={specsWithData} />
        </div>
      )}
    </div>
  );
}

