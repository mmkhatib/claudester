'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, PlayCircle } from 'lucide-react';
import { useWebSocketValue } from '@/lib/websocket/hooks';

interface TestResult {
  id: string;
  name: string;
  status: 'running' | 'passed' | 'failed' | 'pending';
  duration?: number;
  error?: string;
  suite: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  running: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

export function LiveTestResults() {
  const testResults = useWebSocketValue<TestResult[]>('tests:results', [
    {
      id: '1',
      name: 'should hash password correctly',
      status: 'passed',
      duration: 45,
      suite: 'auth/register',
    },
    {
      id: '2',
      name: 'should create user in database',
      status: 'passed',
      duration: 120,
      suite: 'auth/register',
    },
    {
      id: '3',
      name: 'should validate email format',
      status: 'running',
      suite: 'auth/register',
    },
    {
      id: '4',
      name: 'should reject duplicate emails',
      status: 'pending',
      suite: 'auth/register',
    },
    {
      id: '5',
      name: 'should enforce password requirements',
      status: 'pending',
      suite: 'auth/register',
    },
  ]);

  const summary = useWebSocketValue<TestSummary>('tests:summary', {
    total: 5,
    passed: 2,
    failed: 0,
    running: 1,
    coverage: {
      statements: 78,
      branches: 65,
      functions: 82,
      lines: 76,
    },
  });

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'running':
        return <PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <PlayCircle className="h-5 w-5" />
              <span>Live Test Results</span>
            </CardTitle>
            <CardDescription>Real-time test execution and coverage</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-green-600">
              {summary.passed} Passed
            </Badge>
            {summary.failed > 0 && (
              <Badge variant="destructive">{summary.failed} Failed</Badge>
            )}
            {summary.running > 0 && (
              <Badge variant="secondary">{summary.running} Running</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Coverage Summary */}
        {summary.coverage && (
          <div className="mb-4 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <h4 className="font-medium mb-3">Code Coverage</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(summary.coverage).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400 capitalize">
                      {key}
                    </span>
                    <span className={`font-medium ${getCoverageColor(value)}`}>
                      {value}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        value >= 80
                          ? 'bg-green-600'
                          : value >= 60
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Results */}
        <div className="space-y-2">
          {testResults.map((test) => (
            <div
              key={test.id}
              className={`p-3 rounded-lg border transition-colors ${
                test.status === 'running'
                  ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">{getStatusIcon(test.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{test.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{test.suite}</p>
                    </div>
                    {test.duration && (
                      <span className="text-xs text-zinc-500 ml-2">{test.duration}ms</span>
                    )}
                  </div>
                  {test.error && (
                    <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                      <code className="text-xs text-red-600 dark:text-red-400">
                        {test.error}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
