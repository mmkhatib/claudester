'use client';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, FileText } from 'lucide-react';
import { TaskList } from './task-list';

interface SpecSectionsProps {
  spec: any;
  tasks: any[];
}

export function SpecSections({ spec, tasks }: SpecSectionsProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Requirements */}
      <CollapsibleSection
        title="Requirements"
        description="Functional and technical requirements"
        storageKey={`spec-${spec._id}-requirements-collapsed`}
        defaultCollapsed={false}
      >
        {spec.requirements && Object.keys(spec.requirements).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(spec.requirements).map(([key, value]: [string, any]) => {
              const items = Array.isArray(value) ? value : [value];
              return (
                <div key={key}>
                  <h3 className="font-semibold text-lg mb-3 capitalize">
                    {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((item: any, index: number) => (
                      <li key={index} className="flex gap-3">
                        <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">
                          {typeof item === 'string' ? item : JSON.stringify(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckSquare className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No requirements defined yet
            </p>
          </div>
        )}
      </CollapsibleSection>

      {/* Design */}
      <CollapsibleSection
        title="Design"
        description="Technical architecture and design specifications"
        storageKey={`spec-${spec._id}-design-collapsed`}
        defaultCollapsed={false}
      >
        {spec.design ? (
          <div className="space-y-6">
            {typeof spec.design === 'object' ? (
              <>
                {spec.design.architecture && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Architecture</h3>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {spec.design.architecture}
                    </p>
                  </div>
                )}

                {spec.design.dataModel && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Data Model</h3>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {spec.design.dataModel}
                    </p>
                  </div>
                )}

                {spec.design.apiEndpoints && spec.design.apiEndpoints.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">API Endpoints</h3>
                    <ul className="space-y-2">
                      {spec.design.apiEndpoints.map((endpoint: string, index: number) => (
                        <li key={index} className="flex gap-3">
                          <span className="text-green-600 dark:text-green-400 mt-1">→</span>
                          <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                            {endpoint}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {spec.design.uiComponents && spec.design.uiComponents.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">UI Components</h3>
                    <ul className="space-y-2">
                      {spec.design.uiComponents.map((component: string, index: number) => (
                        <li key={index} className="flex gap-3">
                          <span className="text-purple-600 dark:text-purple-400 mt-1">▪</span>
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {component}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {spec.design}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No design specifications yet
            </p>
          </div>
        )}
      </CollapsibleSection>

      {/* Tasks */}
      <CollapsibleSection
        title="Tasks"
        description="Implementation tasks for this specification"
        storageKey={`spec-${spec._id}-tasks-collapsed`}
        defaultCollapsed={false}
        badge={
          tasks.length > 0 ? (
            <Badge variant="secondary">{tasks.length} tasks</Badge>
          ) : null
        }
      >
        {tasks.length > 0 ? (
          <TaskList tasks={tasks} specId={spec._id} />
        ) : (
          <div className="text-center py-8">
            <CheckSquare className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No tasks created yet
            </p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
