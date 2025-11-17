import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Spec, Phase } from '@/backend/models';
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
import { publishActivityLog, publishSpecUpdate } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

// Validation schema
const ApprovePhaseSchema = z.object({
  phase: z.nativeEnum(Phase),
  comments: z.string().optional(),
});

interface RouteContext {
  params: {
    specId: string;
  };
}

/**
 * POST /api/specs/[specId]/approve
 * Approve current phase and move to next phase
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('SPEC_APPROVE');
  await connectDB();

  const { specId } = context.params;
  const body = await parseBody(request);

  // Validate request body
  const validationResult = ApprovePhaseSchema.safeParse(body);

  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { phase, comments } = validationResult.data;

  // Find spec
  const spec = await Spec.findById(specId);

  if (!spec) {
    return notFoundError('Spec');
  }

  // Verify current phase matches
  if (spec.currentPhase !== phase) {
    return errorResponse(
      `Spec is in ${spec.currentPhase} phase, cannot approve ${phase} phase`,
      'PHASE_MISMATCH',
      HttpStatus.BAD_REQUEST
    );
  }

  // Verify phase hasn't been approved already
  const approvalField = `${phase.toLowerCase()}Approved` as keyof typeof spec;
  if (spec[approvalField]) {
    return errorResponse(
      `${phase} phase already approved`,
      'ALREADY_APPROVED',
      HttpStatus.BAD_REQUEST
    );
  }

  // Approve current phase
  const approvalDateField = `${phase.toLowerCase()}ApprovedAt` as keyof typeof spec;
  spec[approvalField] = true as any;
  spec[approvalDateField] = new Date() as any;

  // Determine next phase
  const phaseOrder = [Phase.REQUIREMENTS, Phase.DESIGN, Phase.TASKS, Phase.IMPLEMENTATION];
  const currentIndex = phaseOrder.indexOf(phase);
  const nextPhase = currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : null;

  if (nextPhase) {
    spec.currentPhase = nextPhase;

    // Update progress based on phase
    const progressByPhase = {
      [Phase.REQUIREMENTS]: 25,
      [Phase.DESIGN]: 50,
      [Phase.TASKS]: 75,
      [Phase.IMPLEMENTATION]: 100,
    };
    spec.progress = progressByPhase[nextPhase] || 0;
  } else {
    // All phases complete
    spec.progress = 100;
    spec.status = 'COMPLETE';
  }

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
    eventType: EventType.SPEC_APPROVED,
    specId: spec._id.toString(),
    message: `${phase} phase approved${nextPhase ? `, moved to ${nextPhase}` : ''}`,
    metadata: {
      approvedPhase: phase,
      nextPhase,
      comments,
      approvedBy: (user._id as any).toString(),
    },
  });

  const updatedSpec = await Spec.findById(specId)
    .populate('projectId', 'name description');

  return successResponse(
    updatedSpec,
    `${phase} phase approved successfully`
  );
});
