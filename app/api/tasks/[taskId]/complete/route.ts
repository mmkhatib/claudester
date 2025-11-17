import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Task, TaskStatus } from '@/backend/models';
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

const CompleteTaskSchema = z.object({
  result: z.any().optional(),
  actualHours: z.number().positive().optional(),
  notes: z.string().optional(),
});

interface RouteContext {
  params: {
    taskId: string;
  };
}

/**
 * POST /api/tasks/[taskId]/complete
 * Mark a task as completed
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
  const validationResult = CompleteTaskSchema.safeParse(body);
  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { result, actualHours, notes } = validationResult.data;

  const task = await Task.findById(taskId);
  if (!task) {
    return notFoundError('Task');
  }

  // Validate task status
  if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.ASSIGNED) {
    return errorResponse(
      `Task is ${task.status} and cannot be marked as completed`,
      'INVALID_STATUS',
      HttpStatus.BAD_REQUEST
    );
  }

  // Update task
  task.status = TaskStatus.COMPLETED;
  task.completedAt = new Date();
  task.progress = 100;

  if (result !== undefined) {
    task.result = result;
  }

  if (actualHours !== undefined) {
    task.actualHours = actualHours;
  }

  await task.save();

  // Check if this unblocks any dependent tasks
  const dependentTasks = await Task.find({
    dependencies: taskId,
    status: TaskStatus.BLOCKED,
  });

  // Check each dependent task to see if all dependencies are now complete
  for (const depTask of dependentTasks) {
    const deps = await Task.find({
      _id: { $in: depTask.dependencies },
    }).select('status');

    const allComplete = deps.every((d) => d.status === TaskStatus.COMPLETED);

    if (allComplete) {
      depTask.status = TaskStatus.PENDING;
      await depTask.save();

      await publishTaskUpdate({
        taskId: depTask._id.toString(),
        specId: depTask.specId.toString(),
        projectId: depTask.projectId?.toString(),
        status: depTask.status,
      });
    }
  }

  // Publish updates
  await publishTaskUpdate({
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    projectId: task.projectId?.toString(),
    status: task.status,
    progress: task.progress,
  });

  await publishActivityLog({
    eventType: EventType.TASK_COMPLETED,
    taskId: task._id.toString(),
    specId: task.specId.toString(),
    message: `Task completed: ${task.title}`,
    metadata: {
      actualHours,
      notes,
      completedBy: (user._id as any).toString(),
      unblockedTasks: dependentTasks
        .filter((t) => t.status === TaskStatus.PENDING)
        .map((t) => t._id.toString()),
    },
  });

  const updatedTask = await Task.findById(taskId)
    .populate('specId', 'title currentPhase')
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email')
    .populate('agentId', 'status type');

  return successResponse(
    updatedTask,
    `Task completed successfully${dependentTasks.length > 0 ? `, unblocked ${dependentTasks.length} dependent task(s)` : ''}`
  );
});
