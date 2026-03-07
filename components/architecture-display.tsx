'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code2, Layers, Database, FileCode } from 'lucide-react';
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Tech Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {architecture.techStack.frontend && architecture.techStack.frontend.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Frontend</div>
              <div className="flex flex-wrap gap-2">
                {architecture.techStack.frontend.map((tech, i) => (
                  <Badge key={i} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>
          )}
          {architecture.techStack.backend && architecture.techStack.backend.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Backend</div>
              <div className="flex flex-wrap gap-2">
                {architecture.techStack.backend.map((tech, i) => (
                  <Badge key={i} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>
          )}
          {architecture.techStack.database && architecture.techStack.database.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Database</div>
              <div className="flex flex-wrap gap-2">
                {architecture.techStack.database.map((tech, i) => (
                  <Badge key={i} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>
          )}
          {architecture.techStack.deployment && architecture.techStack.deployment.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Deployment</div>
              <div className="flex flex-wrap gap-2">
                {architecture.techStack.deployment.map((tech, i) => (
                  <Badge key={i} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patterns */}
      {architecture.patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Architectural Patterns
            </CardTitle>
          </CardHeader>
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
        </Card>
      )}

      {/* Data Model */}
      {architecture.dataModel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {architecture.dataModel}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conventions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Code Conventions
          </CardTitle>
        </CardHeader>
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
      </Card>
    </div>
  );
}
