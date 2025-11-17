'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, FileCode, Folder } from 'lucide-react';
import { useState } from 'react';

interface CoverageMetric {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  coverage?: CoverageMetric;
  children?: FileNode[];
  expanded?: boolean;
}

export function CoverageVisualization() {
  const [fileTree, setFileTree] = useState<FileNode[]>([
    {
      id: '1',
      name: 'src',
      type: 'directory',
      path: 'src',
      expanded: true,
      coverage: { statements: 78.5, branches: 65.3, functions: 82.1, lines: 76.8 },
      children: [
        {
          id: '1-1',
          name: 'auth',
          type: 'directory',
          path: 'src/auth',
          expanded: true,
          coverage: { statements: 85.2, branches: 72.5, functions: 90.0, lines: 83.1 },
          children: [
            {
              id: '1-1-1',
              name: 'register.ts',
              type: 'file',
              path: 'src/auth/register.ts',
              coverage: { statements: 92.0, branches: 80.0, functions: 100.0, lines: 90.5 },
            },
            {
              id: '1-1-2',
              name: 'login.ts',
              type: 'file',
              path: 'src/auth/login.ts',
              coverage: { statements: 78.5, branches: 65.0, functions: 80.0, lines: 75.8 },
            },
          ],
        },
        {
          id: '1-2',
          name: 'api',
          type: 'directory',
          path: 'src/api',
          expanded: false,
          coverage: { statements: 72.0, branches: 58.3, functions: 75.5, lines: 70.2 },
        },
        {
          id: '1-3',
          name: 'agents',
          type: 'directory',
          path: 'src/agents',
          expanded: false,
          coverage: { statements: 68.5, branches: 55.0, functions: 72.0, lines: 66.8 },
        },
      ],
    },
  ]);

  const toggleNode = (nodeId: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setFileTree(updateNode(fileTree));
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCoverageBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-600';
    if (percentage >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const paddingLeft = `${depth * 24}px`;

    return (
      <div key={node.id}>
        <div
          className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
          style={{ paddingLeft }}
          onClick={() => node.type === 'directory' && toggleNode(node.id)}
        >
          <div className="flex items-center space-x-2 flex-1">
            {node.type === 'directory' && (
              <span>
                {node.expanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                )}
              </span>
            )}
            {node.type === 'directory' ? (
              <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <FileCode className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            )}
            <span className="font-medium">{node.name}</span>
          </div>

          {node.coverage && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-zinc-600 dark:text-zinc-400">Statements</span>
                <span className={`font-medium ${getCoverageColor(node.coverage.statements)}`}>
                  {node.coverage.statements.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-600 dark:text-zinc-400">Branches</span>
                <span className={`font-medium ${getCoverageColor(node.coverage.branches)}`}>
                  {node.coverage.branches.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-600 dark:text-zinc-400">Functions</span>
                <span className={`font-medium ${getCoverageColor(node.coverage.functions)}`}>
                  {node.coverage.functions.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-600 dark:text-zinc-400">Lines</span>
                <span className={`font-medium ${getCoverageColor(node.coverage.lines)}`}>
                  {node.coverage.lines.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {node.expanded && node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  const overallCoverage = {
    statements: 78.5,
    branches: 65.3,
    functions: 82.1,
    lines: 76.8,
  };

  return (
    <div className="space-y-6">
      {/* Overall Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Coverage</CardTitle>
          <CardDescription>Code coverage across all files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(overallCoverage).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{key}</span>
                  <span className={`text-lg font-bold ${getCoverageColor(value)}`}>
                    {value.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getCoverageBgColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* File Explorer */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage by File</CardTitle>
          <CardDescription>Detailed coverage breakdown</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {fileTree.map((node) => renderNode(node))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
