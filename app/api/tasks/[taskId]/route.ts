import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Task, TaskStatus, TaskType } from '@/backend/models';
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

// Validation schema for updating a task
const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  type: z.nativeEnum(TaskType).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  estimatedHours: z.number().positive().optional(),
  actualHours: z.number().positive().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  result: z.any().optional(),
  error: z.string().optional(),
});

interface RouteContext {
  params: {
    taskId: string;
  };
}

/**
 * GET /api/tasks/[taskId]
 * Get a single task by ID
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('TASK_VIEW');
  await connectDB();

  const { taskId } = context.params;

  const task = await Task.findById(taskId)
    .populate('specId', 'title description currentPhase')
    .populate('projectId', 'name description')
    .populate('assignedTo', 'name email')
    .populate('agentId', 'status type workspaceDir')
    .populate('createdBy', 'name email')
    .populate('dependencies', 'title status type');

  if (!task) {
    return notFoundError('Task');
  }

  return successResponse(task);
});

/**
 * PATCH /api/tasks/[taskId]
 * Update a task
 */
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('TASK_UPDATE');
  await connectDB();

  const { taskId } = context.params;
  const body = await parseBody(request);

  // Validate request body
  const validationResult = UpdateTaskSchema.safeParse(body);
  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const updates = validationResult.data;

  // Find task
  const task = await Task.findById(taskId);
  if (!task) {
    return notFoundError('Task');
  }

  // Validate dependencies if provided
  if (updates.dependencies && updates.dependencies.length > 0) {
    const depTasks = await Task.find({
      _id: { $in: updates.dependencies },
      specId: task.specId,
    });

    if (depTasks.length !== updates.dependencies.length) {
      return errorResponse(
        'One or more dependency tasks not found or in different spec',
        'INVALID_DEPENDENCIES',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Track what changed
  const changedFields: string[] = [];
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && JSON.stringify((task as any)[key]) !== JSON.stringify(value)) {
      (task as any)[key] = value;
      changedFields.push(key);
    }
  });

  if (changedFields.length === 0) {
    return successResponse(task, 'No changes made');
  }

  await task.save();

  // Publish updates
  await publishTaskUpdate({
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    projectId: task.projectId?.toString(),
    status: task.status,
    progress: task.progress,
  });

  await publishActivityLog({
    eventType: EventType.TASK_UPDATED,
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    message: `Task updated: ${changedFields.join(', ')}`,
    metadata: {
      changedFields,
      updatedBy: (user._id as any).toString(),
    },
  });

  const updatedTask = await Task.findById(taskId)
    .populate('specId', 'title currentPhase')
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email')
    .populate('agentId', 'status type');

  return successResponse(updatedTask, 'Task updated successfully');
});

/**
 * DELETE /api/tasks/[taskId]
 * Delete a task (soft delete)
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('TASK_DELETE');
  await connectDB();

  const { taskId } = context.params;

  const task = await Task.findById(taskId);
  if (!task) {
    return notFoundError('Task');
  }

  // Check if task has dependents
  const dependents = await Task.find({
    dependencies: taskId,
  }).select('title');

  if (dependents.length > 0) {
    return errorResponse(
      `Cannot delete task: ${dependents.length} other task(s) depend on it`,
      'HAS_DEPENDENTS',
      HttpStatus.BAD_REQUEST
    );
  }

  // Soft delete
  task.status = TaskStatus.CANCELLED;
  await task.save();

  await publishActivityLog({
    eventType: EventType.TASK_UPDATED,
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    message: `Task deleted: ${task.title}`,
    metadata: {
      deletedBy: (user._id as any).toString(),
    },
  });

  return successResponse(
    { taskId, title: task.title },
    'Task deleted successfully'
  );
});
