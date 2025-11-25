import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec } from '@/backend/models';
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

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('SPEC_UPDATE');
  await connectDB();

  const { specId } = context.params;

  const spec = await Spec.findById(specId).populate('projectId', 'name description');

  if (!spec) {
    return notFoundError('Specification');
  }

  if (!spec.requirements || Object.keys(spec.requirements).length === 0) {
    return validationError(new Error('Requirements must be generated first'));
  }

  console.log('Generating design for spec:', spec.name);

  const projectContext = spec.projectId
    ? `Project: ${spec.projectId.name}\n${spec.projectId.description || ''}`
    : undefined;

  const design = await claudeClient.generateDesign(
    spec.name,
    spec.description || 'No description provided',
    spec.requirements,
    projectContext
  );

  spec.design = design;
  spec.currentPhase = 'TASKS';
  spec.progress = 50;
  await spec.save();

  await publishActivityLog({
    eventType: EventType.SPEC_UPDATED,
    specId: spec._id,
    message: `Design generated for: ${spec.name}`,
    metadata: { phase: 'TASKS' },
  });

  return successResponse(
    { design, spec },
    'Design generated successfully'
  );
});
