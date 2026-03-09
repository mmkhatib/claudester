'use client';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, FileText, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { TaskList } from './task-list';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSpecLoading } from './spec-loading-context';
import 'github-markdown-css/github-markdown.css';

interface SpecSectionsProps {
  spec: any;
  tasks: any[];
}

function generateRequirementsSummary(requirements: any): string {
  if (!requirements || Object.keys(requirements).length === 0) {
    return 'No requirements defined yet';
  }
  
  const keys = Object.keys(requirements);
  const totalItems = keys.reduce((sum, key) => {
    const value = requirements[key];
    return sum + (Array.isArray(value) ? value.length : 1);
  }, 0);
  
  return `${keys.length} requirement ${keys.length === 1 ? 'category' : 'categories'} with ${totalItems} total ${totalItems === 1 ? 'item' : 'items'}`;
}

function generateDesignSummary(design: any): string {
  if (!design) {
    return 'No design specifications yet';
  }
  
  if (typeof design === 'string') {
    return design.slice(0, 150) + (design.length > 150 ? '...' : '');
  }
  
  const parts = [];
  if (design.architecture) parts.push('architecture');
  if (design.dataModel) parts.push('data model');
  if (design.apiEndpoints?.length) parts.push(`${design.apiEndpoints.length} API endpoints`);
  if (design.uiComponents?.length) parts.push(`${design.uiComponents.length} UI components`);
  
  return parts.length > 0 ? `Includes ${parts.join(', ')}` : 'Design specifications available';
}

function generateTasksSummary(tasks: any[]): string {
  if (tasks.length === 0) {
    return 'No tasks created yet';
  }
  
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const pending = tasks.filter(t => t.status === 'PENDING').length;
  
  const parts = [];
  if (completed > 0) parts.push(`${completed} completed`);
  if (inProgress > 0) parts.push(`${inProgress} in progress`);
  if (pending > 0) parts.push(`${pending} pending`);
  
  return `${tasks.length} total ${tasks.length === 1 ? 'task' : 'tasks'}: ${parts.join(', ')}`;
}

export function SpecSections({ spec, tasks }: SpecSectionsProps) {
  const { isGeneratingRequirements, isGeneratingDesign, isGeneratingTasks } = useSpecLoading();
  const hasRequirements = spec.requirements && Object.keys(spec.requirements).length > 0;
  const hasDesign = !!spec.design;
  const hasTasks = tasks.length > 0;

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Requirements */}
      <CollapsibleSection
        title="Requirements"
        description="Functional and technical requirements"
        storageKey={`spec-${spec._id}-requirements-collapsed`}
        defaultCollapsed={false}
        summary={generateRequirementsSummary(spec.requirements)}
        statusIcon={
          isGeneratingRequirements ? (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          ) : hasRequirements ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-zinc-400" />
          )
        }
      >
        {isGeneratingRequirements ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Generating requirements...</span>
          </div>
        ) : spec.requirements && Object.keys(spec.requirements).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(spec.requirements).map(([key, value]: [string, any]) => {
              const items = Array.isArray(value) ? value : [value];
              return (
                <div key={key}>
                  <h3 className="font-semibold text-lg mb-3 capitalize">
                    {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="markdown-body bg-transparent">
                    <ul>
                      {items.map((item: any, index: number) => (
                        <li key={index}>
                          {typeof item === 'string' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {item.replace(/`([^`]+)`/g, '`$1`').replace(/'([^']+)'/g, '`$1`')}
                            </ReactMarkdown>
                          ) : (
                            JSON.stringify(item)
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
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
        summary={generateDesignSummary(spec.design)}
        statusIcon={
          isGeneratingDesign ? (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          ) : hasDesign ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-zinc-400" />
          )
        }
      >
        {isGeneratingDesign ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Generating design...</span>
          </div>
        ) : spec.design ? (
          <div className="space-y-6">
            {typeof spec.design === 'object' ? (
              <>
                {spec.design.architecture && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Architecture</h3>
                    <div className="markdown-body bg-transparent">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {spec.design.architecture}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {spec.design.dataModel && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Data Model</h3>
                    <div className="markdown-body bg-transparent">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {spec.design.dataModel}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {spec.design.apiEndpoints && spec.design.apiEndpoints.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">API Endpoints</h3>
                    <div className="space-y-2">
                      {spec.design.apiEndpoints.map((endpoint: string, index: number) => (
                        <div key={index} className="flex gap-3">
                          <span className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0">→</span>
                          <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {endpoint}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {spec.design.uiComponents && spec.design.uiComponents.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">UI Components</h3>
                    <div className="space-y-3">
                      {spec.design.uiComponents.map((component: string, index: number) => (
                        <div key={index} className="markdown-body bg-transparent">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {component}
                          </ReactMarkdown>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="markdown-body bg-transparent">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {spec.design}
                </ReactMarkdown>
              </div>
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
        summary={generateTasksSummary(tasks)}
        statusIcon={
          isGeneratingTasks ? (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          ) : hasTasks ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-zinc-400" />
          )
        }
        badge={
          tasks.length > 0 ? (
            <Badge variant="secondary">{tasks.length} tasks</Badge>
          ) : null
        }
      >
        {isGeneratingTasks ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Generating tasks...</span>
          </div>
        ) : tasks.length > 0 ? (
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
