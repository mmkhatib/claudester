'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface TestRun {
  id: string;
  timestamp: string;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  branch?: string;
  commit?: string;
}

export function TestHistory() {
  const testRuns: TestRun[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      duration: 245,
      totalTests: 245,
      passed: 230,
      failed: 12,
      skipped: 3,
      coverage: 78.5,
      branch: 'main',
      commit: 'a8c15bd',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      duration: 238,
      totalTests: 242,
      passed: 240,
      failed: 2,
      skipped: 0,
      coverage: 79.2,
      branch: 'main',
      commit: 'c6d0c0e',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      duration: 220,
      totalTests: 235,
      passed: 232,
      failed: 3,
      skipped: 0,
      coverage: 76.8,
      branch: 'feature/testing',
      commit: 'b5a3f21',
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      duration: 215,
      totalTests: 230,
      passed: 228,
      failed: 2,
      skipped: 0,
      coverage: 75.5,
      branch: 'main',
      commit: '9d8e2c1',
    },
  ];

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getCoverageTrend = (currentRun: TestRun, index: number) => {
    if (index >= testRuns.length - 1) return null;
    const previousRun = testRuns[index + 1];
    const diff = currentRun.coverage - previousRun.coverage;
    if (Math.abs(diff) < 0.1) return null;
    return diff > 0 ? 'up' : 'down';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Run History</CardTitle>
              <CardDescription>Recent test executions and trends</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testRuns.map((run, index) => {
              const passRate = (run.passed / run.totalTests) * 100;
              const coverageTrend = getCoverageTrend(run, index);

              return (
                <div
                  key={run.id}
                  className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatTimestamp(run.timestamp)}</span>
                          {run.branch && (
                            <Badge variant="secondary" className="text-xs">
                              {run.branch}
                            </Badge>
                          )}
                          {run.commit && (
                            <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                              {run.commit}
                            </code>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          Duration: {run.duration}s
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {run.passed}
                        </span>
                      </div>
                      {run.failed > 0 && (
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {run.failed}
                          </span>
                        </div>
                      )}
                      {run.skipped > 0 && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            {run.skipped}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-zinc-600 dark:text-zinc-400">Pass Rate</span>
                        <span
                          className={`font-medium ${
                            passRate >= 95
                              ? 'text-green-600 dark:text-green-400'
                              : passRate >= 80
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {passRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            passRate >= 95
                              ? 'bg-green-600'
                              : passRate >= 80
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${passRate}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-zinc-600 dark:text-zinc-400">Coverage</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">{run.coverage.toFixed(1)}%</span>
                          {coverageTrend === 'up' && (
                            <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                          )}
                          {coverageTrend === 'down' && (
                            <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            run.coverage >= 80
                              ? 'bg-green-600'
                              : run.coverage >= 60
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${run.coverage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
