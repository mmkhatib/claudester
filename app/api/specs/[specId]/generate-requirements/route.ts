import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
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

  console.log('Generating requirements for spec:', spec.name);

  const projectContext = spec.projectId
    ? `Project: ${spec.projectId.name}\n${spec.projectId.description || ''}`
    : undefined;

  const requirements = await claudeClient.generateRequirements(
    spec.name,
    spec.description || 'No description provided',
    projectContext
  );

  spec.requirements = requirements;
  spec.currentPhase = 'DESIGN';
  spec.progress = 25;
  await spec.save();

  await publishActivityLog({
    eventType: EventType.SPEC_UPDATED,
    specId: spec._id,
    message: `Requirements generated for: ${spec.name}`,
    metadata: { phase: 'DESIGN', requirementsCount: requirements.functional.length },
  });

  return successResponse(
    { requirements, spec },
    'Requirements generated successfully'
  );
});
