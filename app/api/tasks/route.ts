import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Task, TaskStatus, TaskType } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  parseBody,
  parseSearchParams,
  withErrorHandling,
  validationError,
  errorResponse,
  HttpStatus,
} from '@/lib/api-utils';
import { publishActivityLog } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

// Validation schema for creating a task
const CreateTaskSchema = z.object({
  specId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  type: z.nativeEnum(TaskType),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.PENDING),
  priority: z.number().int().min(0).max(10).optional().default(5),
  estimatedHours: z.number().positive().optional(),
  acceptanceCriteria: z.array(z.string()).optional().default([]),
  dependencies: z.array(z.string()).optional().default([]),
  files: z.array(z.string()).optional().default([]),
  order: z.number().int().min(0).optional().default(0),
});

/**
 * GET /api/tasks
 * List tasks with optional filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission('TASK_VIEW');
  await connectDB();

  const params = parseSearchParams(request);
  const {
    specId,
    projectId,
    status,
    type,
    assignedTo,
    limit = '50',
    offset = '0',
  } = params;

  // Build filter
  const filter: any = {};
  if (specId) filter.specId = specId;
  if (projectId) filter.projectId = projectId;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (assignedTo) filter.assignedTo = assignedTo;

  const limitNum = parseInt(limit as string, 10);
  const offsetNum = parseInt(offset as string, 10);

  // Get tasks with pagination
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .limit(limitNum)
      .skip(offsetNum)
      .populate('specId', 'title currentPhase')
      .populate('projectId', 'name')
      .populate('assignedTo', 'name email')
      .populate('agentId', 'status type')
      .lean(),
    Task.countDocuments(filter),
  ]);

  return successResponse({
    tasks,
    total,
    limit: limitNum,
    offset: offsetNum,
    hasMore: offsetNum + tasks.length < total,
  });
});

/**
 * POST /api/tasks
 * Create a new task
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requirePermission('TASK_CREATE');
  await connectDB();

  const body = await parseBody(request);

  // Validate request body
  const validationResult = CreateTaskSchema.safeParse(body);
  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const data = validationResult.data;

  // Validate dependencies exist and are in the same spec
  if (data.dependencies && data.dependencies.length > 0) {
    const depTasks = await Task.find({
      _id: { $in: data.dependencies },
      specId: data.specId,
    });

    if (depTasks.length !== data.dependencies.length) {
      return errorResponse(
        'One or more dependency tasks not found or in different spec',
        'INVALID_DEPENDENCIES',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Create task
  const task = await Task.create({
    ...data,
    createdBy: (user._id as any).toString(),
  });

  // Populate references
  const populatedTask = await Task.findById(task._id)
    .populate('specId', 'title currentPhase')
    .populate('projectId', 'name')
    .populate('createdBy', 'name email');

  await publishActivityLog({
    eventType: EventType.TASK_CREATED,
    taskId: task._id.toString(),
    specId: data.specId,
    message: `Task created: ${data.title}`,
    metadata: {
      type: data.type,
      priority: data.priority,
      createdBy: (user._id as any).toString(),
    },
  });

  return successResponse(
    populatedTask,
    'Task created successfully',
    201
  );
});
