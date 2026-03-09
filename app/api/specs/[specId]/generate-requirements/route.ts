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
import { writeRequirements, createSpecDirectory } from '@/backend/utils/workspace';
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

  const spec = await Spec.findById(specId).populate('projectId', 'name description architecture');

  if (!spec) {
    return notFoundError('Specification');
  }

  console.log('Generating requirements for spec:', spec.title);

  const project = spec.projectId as any;
  const projectContext = project
    ? `Project: ${project.name}\n${project.description || ''}`
    : undefined;

  // Get related P0 specs for integration context
  const relatedSpecs = await Spec.find({
    projectId: spec.projectId,
    priority: 'P0',
    _id: { $ne: spec._id }
  }).select('name description').limit(5);

  const progressCallback = (text: string) => {
    if (global.io) {
      console.log('[API] Emitting progress to spec:', specId, 'text length:', text.length);
      global.io.to(`spec:${specId}`).emit('ai:progress', {
        type: 'requirements_generation',
        text,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('[API] No global.io available');
    }
  };

  const requirements = await claudeClient.generateRequirements(
    spec.title,
    spec.description || 'No description provided',
    projectContext,
    project?.architecture,
    relatedSpecs.map(s => ({ id: s._id.toString(), name: s.name, description: s.description })),
    progressCallback
  );

  spec.requirements = requirements;
  spec.currentPhase = 'DESIGN';
  spec.progress = 25;
  await spec.save();

  // Write requirements to file system
  const fullProject = await Project.findById(spec.projectId);
  if (fullProject && fullProject.workspacePath) {
    try {
      const specIdStr = spec.specNumber.toString().padStart(3, '0');
      
      // Create spec directory if it doesn't exist
      await createSpecDirectory(fullProject.workspacePath, specIdStr, spec);
      
      // Write requirements
      await writeRequirements(fullProject.workspacePath, specIdStr, requirements);

      loggers.spec.info(
        { projectId: fullProject._id, specId: specIdStr, workspacePath: fullProject.workspacePath },
        'Wrote requirements to workspace file'
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggers.spec.error({ errorMsg, projectId: fullProject._id }, 'Failed to write requirements to file');
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
