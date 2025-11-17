import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec, Phase } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
  errorResponse,
  HttpStatus,
} from '@/lib/api-utils';
import { taskGenerator } from '@/backend/services/task-generator';

interface RouteContext {
  params: {
    specId: string;
  };
}

/**
 * POST /api/specs/[specId]/generate-tasks
 * Generate tasks from spec design document
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('TASK_CREATE');
  await connectDB();

  const { specId } = context.params;

  // Find spec
  const spec = await Spec.findById(specId);

  if (!spec) {
    return notFoundError('Spec');
  }

  // Verify spec is in TASKS phase or later
  if (spec.currentPhase === Phase.REQUIREMENTS) {
    return errorResponse(
      'Spec must be in DESIGN phase or later to generate tasks',
      'INVALID_PHASE',
      HttpStatus.BAD_REQUEST
    );
  }

  // Verify design is approved
  if (!spec.designApproved) {
    return errorResponse(
      'Design must be approved before generating tasks',
      'DESIGN_NOT_APPROVED',
      HttpStatus.BAD_REQUEST
    );
  }

  // Verify design document exists
  if (!spec.design || Object.keys(spec.design).length === 0) {
    return errorResponse(
      'Design document is empty',
      'EMPTY_DESIGN',
      HttpStatus.BAD_REQUEST
    );
  }

  // Generate tasks
  const taskCount = await taskGenerator.generateAndCreateTasks(specId);

  const updatedSpec = await Spec.findById(specId)
    .populate('projectId', 'name description');

  return successResponse(
    {
      spec: updatedSpec,
      taskCount,
    },
    `Generated ${taskCount} tasks successfully`
  );
});
