'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';

interface TestCase {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: {
    message: string;
    stack: string;
  };
}

interface TestSuite {
  id: string;
  name: string;
  path: string;
  tests: TestCase[];
  expanded: boolean;
}

export function TestResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'skipped'>('all');
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    {
      id: '1',
      name: 'Authentication Tests',
      path: 'src/auth/__tests__/register.test.ts',
      expanded: false,
      tests: [
        {
          id: '1-1',
          name: 'should hash password correctly',
          status: 'passed',
          duration: 45,
        },
        {
          id: '1-2',
          name: 'should create user in database',
          status: 'passed',
          duration: 120,
        },
        {
          id: '1-3',
          name: 'should validate email format',
          status: 'failed',
          duration: 38,
          error: {
            message: 'Expected email validation to fail for invalid format',
            stack: `Error: Expected email validation to fail for invalid format
    at Object.<anonymous> (src/auth/__tests__/register.test.ts:45:12)
    at Promise.then.completed (node_modules/jest-circus/build/utils.js:333:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (node_modules/jest-circus/build/utils.js:258:10)`,
          },
        },
        {
          id: '1-4',
          name: 'should reject duplicate emails',
          status: 'passed',
          duration: 95,
        },
      ],
    },
    {
      id: '2',
      name: 'API Endpoint Tests',
      path: 'src/api/__tests__/projects.test.ts',
      expanded: false,
      tests: [
        {
          id: '2-1',
          name: 'GET /api/projects returns all projects',
          status: 'passed',
          duration: 78,
        },
        {
          id: '2-2',
          name: 'POST /api/projects creates new project',
          status: 'passed',
          duration: 102,
        },
        {
          id: '2-3',
          name: 'PUT /api/projects/:id updates project',
          status: 'failed',
          duration: 65,
          error: {
            message: 'Expected status 200, received 500',
            stack: `Error: Expected status 200, received 500
    at Object.<anonymous> (src/api/__tests__/projects.test.ts:78:12)`,
          },
        },
      ],
    },
  ]);

  const toggleSuite = (suiteId: string) => {
    setTestSuites((suites) =>
      suites.map((suite) =>
        suite.id === suiteId ? { ...suite, expanded: !suite.expanded } : suite
      )
    );
  };

  const getStatusIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusBadge = (status: TestCase['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-600">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
    }
  };

  const filteredSuites = testSuites
    .map((suite) => ({
      ...suite,
      tests: suite.tests.filter((test) => {
        const matchesSearch =
          test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          suite.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || test.status === filter;
        return matchesSearch && matchesFilter;
      }),
    }))
    .filter((suite) => suite.tests.length > 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'passed', 'failed', 'skipped'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="space-y-4">
        {filteredSuites.map((suite) => (
          <Card key={suite.id}>
            <CardHeader>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSuite(suite.id)}
              >
                <div className="flex items-center space-x-3">
                  {suite.expanded ? (
                    <ChevronDown className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{suite.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {suite.path}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {suite.tests.filter((t) => t.status === 'passed').length}/
                    {suite.tests.length} passed
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {suite.expanded && (
              <CardContent>
                <div className="space-y-3">
                  {suite.tests.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{test.name}</p>
                            {test.error && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-start space-x-2 p-3 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                      {test.error.message}
                                    </p>
                                    <details className="mt-2">
                                      <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                                        Show stack trace
                                      </summary>
                                      <pre className="mt-2 text-xs overflow-x-auto p-2 bg-red-100 dark:bg-red-950/50 rounded">
                                        <code>{test.error.stack}</code>
                                      </pre>
                                    </details>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                          <span className="text-sm text-zinc-500">{test.duration}ms</span>
                          {getStatusBadge(test.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
