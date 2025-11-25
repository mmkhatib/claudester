import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  Activity,
  Zap,
  Clock,
  CheckSquare,
} from 'lucide-react';

async function getAgents() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    // Unwrap the data from the standard API response
    const data = json.data || json;
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return [];
  }
}

export default async function AgentsPage() {
  const agents = await getAgents();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'IDLE':
        return <Badge variant="secondary">Idle</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">Error</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-600">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage and monitor autonomous development agents
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </Link>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bot className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agents configured</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Create your first AI agent to start autonomous development
              </p>
              <Link href="/agents/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent: any) => (
            <Card key={agent._id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                      <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {agent.type || 'Development'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(agent.status)}
                </div>

                {agent.currentTask && (
                  <div className="mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      <CheckSquare className="h-4 w-4" />
                      <span>Current Task</span>
                    </div>
                    <p className="text-sm font-medium">
                      {agent.currentTask.title || 'Processing...'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Health
                    </div>
                    <span className="font-medium">
                      {agent.health !== undefined ? `${agent.health}%` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <div className="text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Tasks
                    </div>
                    <span className="font-medium">
                      {agent.completedTasks || 0}
                    </span>
                  </div>
                  <div>
                    <div className="text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Uptime
                    </div>
                    <span className="font-medium">
                      {agent.uptime || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <Link href={`/agents/${agent._id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
