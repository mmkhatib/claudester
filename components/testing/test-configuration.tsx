'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export function TestConfiguration() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Runner Configuration</CardTitle>
          <CardDescription>Configure test execution settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="test-framework">Test Framework</Label>
              <select
                id="test-framework"
                className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              >
                <option>Jest</option>
                <option>Vitest</option>
                <option>Mocha</option>
                <option>Jasmine</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-timeout">Test Timeout (ms)</Label>
              <Input id="test-timeout" type="number" defaultValue="5000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-workers">Max Workers</Label>
              <Input id="max-workers" type="number" defaultValue="4" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retry-failed">Retry Failed Tests</Label>
              <Input id="retry-failed" type="number" defaultValue="2" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="collect-coverage" defaultChecked />
              <Label htmlFor="collect-coverage" className="font-normal">
                Collect coverage by default
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="parallel-tests" defaultChecked />
              <Label htmlFor="parallel-tests" className="font-normal">
                Run tests in parallel
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="watch-mode" />
              <Label htmlFor="watch-mode" className="font-normal">
                Enable watch mode
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="verbose-output" />
              <Label htmlFor="verbose-output" className="font-normal">
                Verbose output
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coverage Configuration</CardTitle>
          <CardDescription>Configure code coverage settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="coverage-provider">Coverage Provider</Label>
              <select
                id="coverage-provider"
                className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              >
                <option>v8</option>
                <option>babel</option>
                <option>istanbul</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverage-threshold">Coverage Threshold (%)</Label>
              <Input id="coverage-threshold" type="number" defaultValue="80" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverage-include">Include Patterns</Label>
            <Textarea
              id="coverage-include"
              placeholder="src/**/*.{ts,tsx}"
              rows={3}
              defaultValue="src/**/*.{ts,tsx}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverage-exclude">Exclude Patterns</Label>
            <Textarea
              id="coverage-exclude"
              placeholder="**/__tests__/**&#10;**/*.test.{ts,tsx}"
              rows={3}
              defaultValue={'**/__tests__/**\n**/*.test.{ts,tsx}\n**/node_modules/**'}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Test environment configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="env-vars">Environment Variables (KEY=VALUE format)</Label>
            <Textarea
              id="env-vars"
              placeholder="NODE_ENV=test&#10;API_URL=http://localhost:3000"
              rows={5}
              defaultValue={'NODE_ENV=test\nAPI_URL=http://localhost:3000'}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
