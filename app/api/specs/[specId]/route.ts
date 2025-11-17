import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Spec, Priority, SpecStatus, Phase } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  parseBody,
  withErrorHandling,
  validationError,
  notFoundError,
} from '@/lib/api-utils';
import { publishActivityLog, publishSpecUpdate } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

// Validation schemas
const UpdateSpecSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(SpecStatus).optional(),
  requirements: z.any().optional(),
  design: z.any().optional(),
  tasksDoc: z.any().optional(),
});

interface RouteContext {
  params: {
    specId: string;
  };
}

/**
 * GET /api/specs/[specId]
 * Get a single spec by ID
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('SPEC_VIEW');
  await connectDB();

  const { specId } = context.params;

  const spec = await Spec.findById(specId)
    .populate('projectId', 'name description');

  if (!spec) {
    return notFoundError('Spec');
  }

  return successResponse(spec);
});

/**
 * PATCH /api/specs/[specId]
 * Update a spec
 */
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('SPEC_UPDATE');
  await connectDB();

  const { specId } = context.params;
  const body = await parseBody(request);

  // Validate request body
  const validationResult = UpdateSpecSchema.safeParse(body);

  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  // Find spec
  const spec = await Spec.findById(specId);

  if (!spec) {
    return notFoundError('Spec');
  }

  const updates = validationResult.data;
  const changedFields: string[] = [];

  // Track what changed
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && JSON.stringify(spec[key]) !== JSON.stringify(value)) {
      spec[key] = value;
      changedFields.push(key);
    }
  });

  if (changedFields.length > 0) {
    await spec.save();

    // Publish updates
    await publishSpecUpdate({
      specId: spec._id.toString(),
      projectId: spec.projectId.toString(),
      phase: spec.currentPhase,
      status: spec.status,
      progress: spec.progress,
    });

    await publishActivityLog({
      eventType: EventType.SPEC_UPDATED,
      specId: spec._id.toString(),
      message: `Spec updated: ${changedFields.join(', ')}`,
      metadata: { changedFields, updates },
    });
  }

  const updatedSpec = await Spec.findById(specId)
    .populate('projectId', 'name description');

  return successResponse(updatedSpec, 'Spec updated successfully');
});

/**
 * DELETE /api/specs/[specId]
 * Delete a spec
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('SPEC_DELETE');
  await connectDB();

  const { specId } = context.params;

  const spec = await Spec.findById(specId);

  if (!spec) {
    return notFoundError('Spec');
  }

  // Soft delete by setting status to inactive
  spec.status = SpecStatus.ON_HOLD;
  await spec.save();

  await publishActivityLog({
    eventType: EventType.SPEC_UPDATED,
    specId: spec._id.toString(),
    message: `Spec deleted: ${spec.title}`,
  });

  return successResponse(
    { id: specId },
    'Spec deleted successfully'
  );
});
