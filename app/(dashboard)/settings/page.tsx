import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Settings, Save, Key, Database, Zap } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Configure your Claudester platform
        </p>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <CardDescription>
            Configure API keys for external services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anthropic-key">Anthropic API Key</Label>
            <Input
              id="anthropic-key"
              type="password"
              placeholder="sk-ant-..."
              defaultValue={process.env.ANTHROPIC_API_KEY ? '••••••••••••••••' : ''}
            />
            <p className="text-xs text-zinc-500">
              Required for AI-powered code generation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clerk-key">Clerk Publishable Key</Label>
            <Input
              id="clerk-key"
              type="text"
              placeholder="pk_..."
              defaultValue={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'your_clerk_publishable_key'
                ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                : ''}
            />
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Database Configuration</CardTitle>
          </div>
          <CardDescription>
            MongoDB and Redis connection settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mongodb-uri">MongoDB URI</Label>
            <Input
              id="mongodb-uri"
              placeholder="mongodb://localhost:27017/claudester"
              defaultValue={process.env.MONGODB_URI || ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redis-host">Redis Host</Label>
              <Input
                id="redis-host"
                placeholder="localhost"
                defaultValue={process.env.REDIS_HOST || 'localhost'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redis-port">Redis Port</Label>
              <Input
                id="redis-port"
                placeholder="6379"
                defaultValue={process.env.REDIS_PORT || '6379'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <CardTitle>Agent Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure autonomous agent behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-agents">Maximum Concurrent Agents</Label>
            <Input
              id="max-agents"
              type="number"
              placeholder="5"
              defaultValue="5"
            />
            <p className="text-xs text-zinc-500">
              Maximum number of agents that can run simultaneously
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-model">Default AI Model</Label>
            <select
              id="default-model"
              className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
            >
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      {/* Warning */}
      <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Settings changes require restarting the application to take effect.
            Environment variables should be configured in your <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env</code> file.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
