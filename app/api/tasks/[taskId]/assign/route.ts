import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Task, TaskStatus, Agent, AgentStatus } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  parseBody,
  withErrorHandling,
  validationError,
  notFoundError,
  errorResponse,
  HttpStatus,
} from '@/lib/api-utils';
import { publishActivityLog, publishTaskUpdate } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

const AssignTaskSchema = z.object({
  agentId: z.string().optional(),
  userId: z.string().optional(),
}).refine(
  (data) => data.agentId || data.userId,
  { message: 'Either agentId or userId must be provided' }
);

interface RouteContext {
  params: {
    taskId: string;
  };
}

/**
 * POST /api/tasks/[taskId]/assign
 * Assign a task to an agent or user
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('TASK_UPDATE');
  await connectDB();

  const { taskId } = context.params;
  const body = await parseBody(request);

  // Validate request body
  const validationResult = AssignTaskSchema.safeParse(body);
  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { agentId, userId } = validationResult.data;

  // Find task
  const task = await Task.findById(taskId);
  if (!task) {
    return notFoundError('Task');
  }

  // Check if task is already assigned
  if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.BLOCKED) {
    return errorResponse(
      `Task is currently ${task.status} and cannot be reassigned`,
      'INVALID_STATUS',
      HttpStatus.BAD_REQUEST
    );
  }

  // If assigning to agent, validate agent exists and is available
  if (agentId) {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return notFoundError('Agent');
    }

    if (agent.status !== AgentStatus.IDLE && agent.status !== AgentStatus.ACTIVE) {
      return errorResponse(
        `Agent is ${agent.status} and cannot accept new tasks`,
        'AGENT_UNAVAILABLE',
        HttpStatus.BAD_REQUEST
      );
    }

    task.agentId = agentId as any;
    task.assignedTo = undefined;
  } else if (userId) {
    task.assignedTo = userId as any;
    task.agentId = undefined;
  }

  task.status = TaskStatus.ASSIGNED;
  await task.save();

  // Publish updates
  await publishTaskUpdate({
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    projectId: task.projectId?.toString(),
    status: task.status,
    agentId: agentId,
    assignedTo: userId,
  });

  await publishActivityLog({
    eventType: EventType.TASK_UPDATED,
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    message: agentId
      ? `Task assigned to agent ${agentId}`
      : `Task assigned to user`,
    metadata: {
      agentId,
      userId,
      assignedBy: (user._id as any).toString(),
    },
  });

  const updatedTask = await Task.findById(taskId)
    .populate('specId', 'title currentPhase')
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email')
    .populate('agentId', 'status type');

  return successResponse(updatedTask, 'Task assigned successfully');
});

/**
 * DELETE /api/tasks/[taskId]/assign
 * Unassign a task
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('TASK_UPDATE');
  await connectDB();

  const { taskId } = context.params;

  const task = await Task.findById(taskId);
  if (!task) {
    return notFoundError('Task');
  }

  // Cannot unassign if task is in progress
  if (task.status === TaskStatus.IN_PROGRESS) {
    return errorResponse(
      'Cannot unassign task that is in progress',
      'INVALID_STATUS',
      HttpStatus.BAD_REQUEST
    );
  }

  const wasAssignedTo = task.assignedTo?.toString();
  const wasAssignedAgent = task.agentId?.toString();

  task.assignedTo = undefined;
  task.agentId = undefined;
  task.status = TaskStatus.PENDING;
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
    message: 'Task unassigned',
    metadata: {
      previousAssignee: wasAssignedTo || wasAssignedAgent,
      unassignedBy: (user._id as any).toString(),
    },
  });

  return successResponse(task, 'Task unassigned successfully');
});
