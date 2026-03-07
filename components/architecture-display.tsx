'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code2, Layers, Database, FileCode, ChevronDown, ChevronRight } from 'lucide-react';
import { GenerateArchitectureButton } from '@/app/(dashboard)/projects/[projectId]/generate-architecture-button';

interface ProjectArchitecture {
  techStack: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    deployment?: string[];
  };
  patterns: string[];
  dataModel: string;
  conventions: {
    naming: string;
    fileStructure: string;
    codeStyle: string;
  };
}

interface ArchitectureDisplayProps {
  architecture?: ProjectArchitecture;
  projectId: string;
}

export function ArchitectureDisplay({ architecture, projectId }: ArchitectureDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasArchitecture = architecture && 
    (architecture.techStack.frontend?.length || 
     architecture.techStack.backend?.length || 
     architecture.patterns?.length);

  if (!hasArchitecture) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Project Architecture
          </CardTitle>
          <CardDescription>
            Generate a comprehensive architecture to ensure consistency across all features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateArchitectureButton projectId={projectId} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tech Stack */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('techStack')}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Tech Stack
            </div>
            {expandedSections.techStack ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.techStack && (
          <CardContent className="space-y-4">
            {architecture.techStack.frontend && architecture.techStack.frontend.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Frontend</div>
                <ul className="space-y-1">
                  {architecture.techStack.frontend.map((tech, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">▸</span>
                      <span>{tech}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {architecture.techStack.backend && architecture.techStack.backend.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Backend</div>
                <ul className="space-y-1">
                  {architecture.techStack.backend.map((tech, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-green-500 mt-1">▸</span>
                      <span>{tech}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {architecture.techStack.database && architecture.techStack.database.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Database</div>
                <ul className="space-y-1">
                  {architecture.techStack.database.map((tech, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-purple-500 mt-1">▸</span>
                      <span>{tech}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {architecture.techStack.deployment && architecture.techStack.deployment.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Deployment</div>
                <ul className="space-y-1">
                  {architecture.techStack.deployment.map((tech, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-orange-500 mt-1">▸</span>
                      <span>{tech}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Patterns */}
      {architecture.patterns.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('patterns')}>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Architectural Patterns
              </div>
              {expandedSections.patterns ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSections.patterns && (
            <CardContent>
              <ul className="space-y-2">
                {architecture.patterns.map((pattern, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Data Model */}
      {architecture.dataModel && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('dataModel')}>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Model
              </div>
              {expandedSections.dataModel ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSections.dataModel && (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {architecture.dataModel}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Conventions */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('conventions')}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Code Conventions
            </div>
            {expandedSections.conventions ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.conventions && (
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Naming</div>
              <p className="text-sm text-muted-foreground">{architecture.conventions.naming}</p>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">File Structure</div>
              <p className="text-sm text-muted-foreground">{architecture.conventions.fileStructure}</p>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Code Style</div>
              <p className="text-sm text-muted-foreground">{architecture.conventions.codeStyle}</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
