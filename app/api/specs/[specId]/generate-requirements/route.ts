import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec, Project } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
} from '@/lib/api-utils';
import { claudeClient } from '@/backend/services/claude-client';
import { publishActivityLog } from '@/lib/pubsub';
import { EventType } from '@/backend/models';
import { writeRequirements } from '@/backend/utils/workspace';
import { loggers } from '@/lib/logger';

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

  console.log('Generating requirements for spec:', spec.title);

  const projectContext = spec.projectId
    ? `Project: ${spec.projectId.name}\n${spec.projectId.description || ''}`
    : undefined;

  const requirements = await claudeClient.generateRequirements(
    spec.title,
    spec.description || 'No description provided',
    projectContext
  );

  spec.requirements = requirements;
  spec.currentPhase = 'DESIGN';
  spec.progress = 25;
  await spec.save();

  // Write requirements to file system
  const project = await Project.findById(spec.projectId);
  if (project && project.workspacePath) {
    try {
      const specId = spec.specNumber.toString().padStart(3, '0');
      await writeRequirements(project.workspacePath, specId, requirements);

      loggers.spec.info(
        { projectId: project._id, specId, workspacePath: project.workspacePath },
        'Wrote requirements to workspace file'
      );
    } catch (error) {
      loggers.spec.error({ error, projectId: project._id }, 'Failed to write requirements to file');
      // Don't fail the request, but log the error
    }
  }

  await publishActivityLog({
    eventType: EventType.SPEC_UPDATED,
    specId: spec._id,
    message: `Requirements generated for: ${spec.title}`,
    metadata: { phase: 'DESIGN', requirementsCount: requirements.functional.length },
  });

  return successResponse(
    { requirements, spec },
    'Requirements generated successfully'
  );
});
