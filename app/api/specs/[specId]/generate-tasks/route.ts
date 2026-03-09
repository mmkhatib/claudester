import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec, Task, Project } from '@/backend/models';
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
import { writeTasks } from '@/backend/utils/workspace';
import { loggers } from '@/lib/logger';

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

  const spec = await Spec.findById(specId).populate('projectId', 'name description architecture');

  if (!spec) {
    return notFoundError('Specification');
  }

  if (!spec.requirements || Object.keys(spec.requirements).length === 0) {
    return validationError(new Error('Requirements must be generated first'));
  }

  if (!spec.design) {
    return validationError(new Error('Design must be generated first'));
  }

  console.log('Generating tasks for spec:', spec.title);

  const project = spec.projectId as any;

  // Get related specs with their status
  const relatedSpecs = await Spec.find({
    projectId: spec.projectId,
    _id: { $ne: spec._id }
  }).select('name status').limit(10);

  const progressCallback = (text: string) => {
    if (global.io) {
      global.io.to(`spec:${specId}`).emit('ai:progress', {
        type: 'tasks_generation',
        text,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const generatedTasks = await claudeClient.generateTasks(
    spec.title,
    spec.description || 'No description provided',
    spec.requirements,
    spec.design,
    project?.architecture,
    relatedSpecs.map(s => ({ 
      id: s._id.toString(), 
      name: s.name, 
      status: s.status 
    })),
    progressCallback
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

  // Write tasks to file system
  const fullProject = await Project.findById(spec.projectId);
  if (fullProject && fullProject.workspacePath) {
    try {
      const specId = spec.specNumber.toString().padStart(3, '0');
      // Convert task documents to plain objects for writeTasks
      const taskData = {
        tasks: generatedTasks,
        summary: {
          totalTasks: createdTasks.length,
          totalEstimatedHours: createdTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
        },
      };
      await writeTasks(fullProject.workspacePath, specId, taskData);

      loggers.spec.info(
        { projectId: fullProject._id, specId, workspacePath: fullProject.workspacePath },
        'Wrote tasks to workspace file'
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggers.spec.error({ errorMsg, projectId: fullProject._id }, 'Failed to write tasks to file');
      // Don't fail the request, but log the error
    }
  }

  await publishActivityLog({
    eventType: EventType.SPEC_UPDATED,
    specId: spec._id,
    message: `${createdTasks.length} tasks generated for: ${spec.title}`,
    metadata: { phase: 'IMPLEMENTATION', taskCount: createdTasks.length },
  });

  return successResponse(
    { tasks: createdTasks, count: createdTasks.length, spec },
    `Generated ${createdTasks.length} tasks successfully`
  );
});
