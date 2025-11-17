'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PlayCircle,
  RotateCcw,
  Settings,
  FileCode,
  TrendingUp,
} from 'lucide-react';
import { TestRunner } from '@/components/testing/test-runner';
import { TestResults } from '@/components/testing/test-results';
import { CoverageVisualization } from '@/components/testing/coverage-visualization';
import { TestHistory } from '@/components/testing/test-history';
import { TestConfiguration } from '@/components/testing/test-configuration';
import { useState } from 'react';

type Tab = 'runner' | 'results' | 'coverage' | 'history' | 'config';

export default function TestingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('runner');

  const stats = {
    totalTests: 245,
    passed: 230,
    failed: 12,
    skipped: 3,
    coverage: {
      statements: 78.5,
      branches: 65.3,
      functions: 82.1,
      lines: 76.8,
    },
    lastRun: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testing Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Run tests, view coverage, and debug failures
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Rerun Failed
          </Button>
          <Button>
            <PlayCircle className="h-4 w-4 mr-2" />
            Run All Tests
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Total Tests
                </p>
                <p className="text-3xl font-bold mt-2">{stats.totalTests}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                <FileCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Passed
                </p>
                <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">
                  {stats.passed}
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  {((stats.passed / stats.totalTests) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Failed
                </p>
                <p className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">
                  {stats.failed}
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  {((stats.failed / stats.totalTests) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✗</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Coverage
                </p>
                <p className="text-3xl font-bold mt-2">
                  {stats.coverage.statements.toFixed(1)}%
                </p>
                <p className="text-sm text-zinc-500 mt-1">Statements</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'runner', label: 'Test Runner' },
            { id: 'results', label: 'Results' },
            { id: 'coverage', label: 'Coverage' },
            { id: 'history', label: 'History' },
            { id: 'config', label: 'Configuration' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'runner' && <TestRunner />}
        {activeTab === 'results' && <TestResults />}
        {activeTab === 'coverage' && <CoverageVisualization />}
        {activeTab === 'history' && <TestHistory />}
        {activeTab === 'config' && <TestConfiguration />}
      </div>
    </div>
  );
}
