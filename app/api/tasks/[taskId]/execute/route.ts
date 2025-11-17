import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Task, TaskStatus, Agent, AgentStatus } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
  errorResponse,
  HttpStatus,
} from '@/lib/api-utils';
import { publishActivityLog, publishTaskUpdate } from '@/lib/pubsub';
import { EventType } from '@/backend/models';
import { agentSpawner } from '@/backend/services/agent-spawner';
import { taskQueue } from '@/backend/queues/task-queue';

interface RouteContext {
  params: {
    taskId: string;
  };
}

/**
 * POST /api/tasks/[taskId]/execute
 * Start task execution
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('TASK_EXECUTE');
  await connectDB();

  const { taskId } = context.params;

  const task = await Task.findById(taskId)
    .populate('specId')
    .populate('projectId');

  if (!task) {
    return notFoundError('Task');
  }

  // Validate task status
  if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.PENDING) {
    return errorResponse(
      `Task is ${task.status} and cannot be executed`,
      'INVALID_STATUS',
      HttpStatus.BAD_REQUEST
    );
  }

  // Check dependencies are completed
  if (task.dependencies && task.dependencies.length > 0) {
    const dependencies = await Task.find({
      _id: { $in: task.dependencies },
    }).select('status');

    const incompleteDeps = dependencies.filter(
      (dep) => dep.status !== TaskStatus.COMPLETED
    );

    if (incompleteDeps.length > 0) {
      task.status = TaskStatus.BLOCKED;
      await task.save();

      return errorResponse(
        `Task has ${incompleteDeps.length} incomplete dependencies`,
        'DEPENDENCIES_NOT_MET',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // If task doesn't have an agent, we'll just mark it as in progress
  // The actual agent spawning happens when the task queue processes the task

  // Update task status
  task.status = TaskStatus.IN_PROGRESS;
  task.startedAt = new Date();
  await task.save();

  // Add to task queue for processing
  await taskQueue.addTask({
    taskId: task._id.toString(),
    specId: task.specId._id.toString(),
    projectId: task.projectId?._id.toString(),
    type: task.type,
    priority: task.priority,
  });

  // Publish updates
  await publishTaskUpdate({
    taskId: task._id.toString(),
    specId: task.specId._id.toString(),
    projectId: task.projectId?._id.toString(),
    status: task.status,
    progress: task.progress,
  });

  await publishActivityLog({
    eventType: EventType.TASK_UPDATED,
    taskId: task._id.toString(),
    specId: task.specId._id.toString(),
    message: `Task execution started`,
    metadata: {
      startedBy: (user._id as any).toString(),
      agentId: task.agentId?.toString(),
    },
  });

  const updatedTask = await Task.findById(taskId)
    .populate('specId', 'title currentPhase')
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email')
    .populate('agentId', 'status type');

  return successResponse(updatedTask, 'Task execution started');
});

/**
 * DELETE /api/tasks/[taskId]/execute
 * Stop task execution
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('TASK_EXECUTE');
  await connectDB();

  const { taskId } = context.params;

  const task = await Task.findById(taskId);
  if (!task) {
    return notFoundError('Task');
  }

  if (task.status !== TaskStatus.IN_PROGRESS) {
    return errorResponse(
      `Task is not in progress`,
      'INVALID_STATUS',
      HttpStatus.BAD_REQUEST
    );
  }

  // Stop agent if assigned
  if (task.agentId) {
    const agent = await Agent.findById(task.agentId);
    if (agent && agent.processId) {
      try {
        await agentSpawner.stopAgent(agent._id.toString());
      } catch (error: any) {
        // Log but don't fail the request
        console.error('Failed to stop agent:', error);
      }
    }
  }

  // Update task status
  task.status = TaskStatus.ASSIGNED;
  await task.save();

  await publishTaskUpdate({
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    projectId: task.projectId?.toString(),
    status: task.status,
  });

  await publishActivityLog({
    eventType: EventType.TASK_UPDATED,
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    message: 'Task execution stopped',
    metadata: {
      stoppedBy: (user._id as any).toString(),
    },
  });

  return successResponse(task, 'Task execution stopped');
});
