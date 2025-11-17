'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlayCircle, StopCircle, Search, Filter } from 'lucide-react';
import { useState } from 'react';

interface TestSuite {
  id: string;
  name: string;
  path: string;
  testCount: number;
  selected: boolean;
}

export function TestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    {
      id: '1',
      name: 'Authentication Tests',
      path: 'src/auth/__tests__',
      testCount: 42,
      selected: false,
    },
    {
      id: '2',
      name: 'API Endpoint Tests',
      path: 'src/api/__tests__',
      testCount: 68,
      selected: false,
    },
    {
      id: '3',
      name: 'Database Tests',
      path: 'src/db/__tests__',
      testCount: 35,
      selected: false,
    },
    {
      id: '4',
      name: 'Agent Manager Tests',
      path: 'src/agents/__tests__',
      testCount: 28,
      selected: false,
    },
    {
      id: '5',
      name: 'Spec Processor Tests',
      path: 'src/spec/__tests__',
      testCount: 51,
      selected: false,
    },
    {
      id: '6',
      name: 'Frontend Component Tests',
      path: 'components/__tests__',
      testCount: 21,
      selected: false,
    },
  ]);

  const handleToggleSuite = (id: string) => {
    setTestSuites((suites) =>
      suites.map((suite) =>
        suite.id === id ? { ...suite, selected: !suite.selected } : suite
      )
    );
  };

  const handleSelectAll = () => {
    const allSelected = testSuites.every((s) => s.selected);
    setTestSuites((suites) =>
      suites.map((suite) => ({ ...suite, selected: !allSelected }))
    );
  };

  const handleRunTests = () => {
    setIsRunning(true);
    // Simulate test execution
    setTimeout(() => {
      setIsRunning(false);
    }, 5000);
  };

  const selectedCount = testSuites.filter((s) => s.selected).length;
  const totalTests = testSuites
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + s.testCount, 0);

  const filteredSuites = testSuites.filter(
    (suite) =>
      suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suite.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Test Suite Selection */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Test Suites</CardTitle>
                <CardDescription>
                  Select test suites to run
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {testSuites.every((s) => s.selected) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search test suites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredSuites.map((suite) => (
                <div
                  key={suite.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    suite.selected
                      ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                  onClick={() => handleToggleSuite(suite.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={suite.selected}
                        onChange={() => handleToggleSuite(suite.id)}
                        className="h-4 w-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <h4 className="font-medium">{suite.name}</h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {suite.path}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{suite.testCount} tests</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Configuration */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Run Configuration</CardTitle>
            <CardDescription>Configure test execution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Selected Suites</Label>
              <div className="text-2xl font-bold">
                {selectedCount} {selectedCount === 1 ? 'suite' : 'suites'}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {totalTests} total tests
              </p>
            </div>

            <div className="space-y-2">
              <Label>Test Mode</Label>
              <select className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <option>Run All</option>
                <option>Run Failed Only</option>
                <option>Run Changed Only</option>
                <option>Watch Mode</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Coverage</Label>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="coverage" defaultChecked />
                <label htmlFor="coverage" className="text-sm">
                  Collect coverage
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parallel Execution</Label>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="parallel" defaultChecked />
                <label htmlFor="parallel" className="text-sm">
                  Run tests in parallel
                </label>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              {!isRunning ? (
                <Button
                  className="w-full"
                  onClick={handleRunTests}
                  disabled={selectedCount === 0}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run Tests
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => setIsRunning(false)}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Tests
                </Button>
              )}
            </div>

            {isRunning && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-600 dark:text-zinc-400">Running...</span>
                  <span className="font-medium">45%</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 animate-pulse"
                    style={{ width: '45%' }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Running authentication tests...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
