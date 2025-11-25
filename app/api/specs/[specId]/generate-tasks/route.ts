import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec, Task } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
  validationError,
} from '@/lib/api-utils';
import { claudeClient } from '@/backend/services/claude-client';
import { publishActivityLog } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

interface RouteContext {
  params: {
    specId: string;
  };
}

/**
 * POST /api/specs/[specId]/generate-tasks
 * Generate implementation tasks for a specification using AI
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('SPEC_UPDATE');
  await connectDB();

  const { specId } = context.params;

  const spec = await Spec.findById(specId);

  if (!spec) {
    return notFoundError('Specification');
  }

  if (!spec.requirements || Object.keys(spec.requirements).length === 0) {
    return validationError(new Error('Requirements must be generated first'));
  }

  if (!spec.design) {
    return validationError(new Error('Design must be generated first'));
  }

  console.log('Generating tasks for spec:', spec.name);

  const generatedTasks = await claudeClient.generateTasks(
    spec.name,
    spec.description || 'No description provided',
    spec.requirements,
    spec.design
  );

  console.log(`Generated ${generatedTasks.length} tasks`);

  // Create tasks in database
  const createdTasks = [];
  for (let index = 0; index < generatedTasks.length; index++) {
    const taskData = generatedTasks[index];

    // Generate a unique taskId
    const taskId = `${spec._id.toString().slice(-6)}-T${(index + 1).toString().padStart(3, '0')}`;

    const task = await Task.create({
      taskId,
      specId: spec._id,
      projectId: spec.projectId,
      title: taskData.title,
      name: taskData.title,
      description: taskData.description,
      type: 'DEVELOPMENT', // Default to DEVELOPMENT type
      status: 'PENDING',
      order: index,
      priority: 2, // Default priority
      estimatedHours: taskData.estimatedHours,
      acceptanceCriteria: taskData.acceptanceCriteria || [],
      dependencies: [], // Dependencies will be ObjectIds, not string array
      files: [],
    });

    createdTasks.push(task);

    await publishActivityLog({
      eventType: EventType.TASK_CREATED,
      taskId: task._id,
      specId: spec._id,
      message: `Task created: ${taskData.title}`,
      metadata: { estimatedHours: taskData.estimatedHours },
    });
  }

  // Update spec to IMPLEMENTATION phase
  spec.currentPhase = 'IMPLEMENTATION';
  spec.progress = 75; // 75% complete, ready for implementation
  await spec.save();

  await publishActivityLog({
    eventType: EventType.SPEC_UPDATED,
    specId: spec._id,
    message: `${createdTasks.length} tasks generated for: ${spec.name}`,
    metadata: { phase: 'IMPLEMENTATION', taskCount: createdTasks.length },
  });

  return successResponse(
    { tasks: createdTasks, count: createdTasks.length, spec },
    `Generated ${createdTasks.length} tasks successfully`
  );
});
