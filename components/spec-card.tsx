import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Lock, GitBranch } from 'lucide-react';

export const LAYER_CONFIG = {
  foundation: { label: 'Foundation', color: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200', border: 'border-red-200 dark:border-red-900', icon: '🏗️', desc: 'Must be built first — everything depends on this' },
  recommended: { label: 'Recommended', color: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-900', icon: '⚡', desc: 'Build after foundation — can be done in parallel' },
  optional: { label: 'Optional', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300', border: 'border-zinc-200 dark:border-zinc-700', icon: '✨', desc: 'Enhancement features — build in any order' },
} as const;

export const PHASE_COLOR: Record<string, string> = {
  REQUIREMENTS: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200',
  DESIGN: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200',
  TASKS: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200',
  IMPLEMENTATION: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200',
  COMPLETED: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
};

export function getPhaseColor(phase: string) {
  return PHASE_COLOR[phase?.toUpperCase()] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
}

export function isSpecBlocked(spec: any) {
  return spec.dependsOn?.some((dep: any) => dep.status !== 'COMPLETE');
}

export function SpecCard({ spec, compact = false }: { spec: any; compact?: boolean }) {
  const blocked = isSpecBlocked(spec);
  const layer = spec.layer as keyof typeof LAYER_CONFIG | undefined;
  const phase = spec.currentPhase || spec.phase || 'REQUIREMENTS';

  const inner = (
    <div className={`p-${compact ? '3' : '4'} rounded-lg border transition-colors ${
      blocked
        ? 'opacity-60 border-dashed border-zinc-300 dark:border-zinc-700 cursor-not-allowed'
        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {blocked && <Lock className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />}
            <span className="text-xs font-mono text-zinc-500">#{String(spec.specNumber || 0).padStart(3, '0')}</span>
            <span className={`font-semibold ${compact ? 'text-sm' : 'text-base'} truncate`}>{spec.title || spec.name}</span>
          </div>

          {/* Dependencies */}
          {spec.dependsOn?.length > 0 && (
            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
              <GitBranch className="h-3 w-3 text-zinc-400" />
              <span className="text-xs text-zinc-500">Needs:</span>
              {spec.dependsOn.map((dep: any) => (
                <span key={dep._id} className={`text-xs px-1.5 py-0.5 rounded font-mono ${dep.status === 'COMPLETE' ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'}`}>
                  #{String(dep.specNumber).padStart(3, '0')} {dep.title}
                </span>
              ))}
            </div>
          )}

          {!compact && (
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                {spec.requirements && Object.keys(spec.requirements).length > 0 ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Circle className="h-3 w-3 text-zinc-400" />}
                Req
              </span>
              <span className="flex items-center gap-1">
                {spec.design ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Circle className="h-3 w-3 text-zinc-400" />}
                Design
              </span>
              <span className="flex items-center gap-1">
                {spec.tasks?.length > 0 ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Circle className="h-3 w-3 text-zinc-400" />}
                Tasks
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge className={getPhaseColor(phase)}>{phase}</Badge>
          {layer && <Badge className={`text-xs ${LAYER_CONFIG[layer].color}`}>{LAYER_CONFIG[layer].icon} {LAYER_CONFIG[layer].label}</Badge>}
          {blocked && <Badge variant="outline" className="text-xs">Locked</Badge>}
        </div>
      </div>
    </div>
  );

  if (blocked) return <div key={spec._id}>{inner}</div>;
  return <Link key={spec._id} href={`/specs/${spec._id}`}>{inner}</Link>;
}

export function SpecLayerGroup({ specs, layerKey }: { specs: any[]; layerKey: keyof typeof LAYER_CONFIG }) {
  if (!specs.length) return null;
  const cfg = LAYER_CONFIG[layerKey];
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
        {specs.map((spec: any) => <SpecCard key={spec._id} spec={spec} />)}
      </div>
    </div>
  );
}
