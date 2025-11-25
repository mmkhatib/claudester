import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Bot,
  FileText,
  CheckSquare,
  Code,
  AlertCircle,
} from 'lucide-react';

export default function ActivityPage() {
  // TODO: Implement real-time activity feed via WebSocket
  const activities: any[] = [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'agent':
        return <Bot className="h-4 w-4" />;
      case 'spec':
        return <FileText className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'code':
        return <Code className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'agent':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400';
      case 'spec':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400';
      case 'task':
        return 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400';
      case 'code':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Activity Feed</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Real-time updates across all projects and agents
        </p>
      </div>

      {/* Activity Feed */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Activity className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recent activity</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Activity will appear here as agents work on tasks
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{activity.title}</h4>
                      {activity.badge && (
                        <Badge variant="secondary">{activity.badge}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {activity.description}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
