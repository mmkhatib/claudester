import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec, Project } from '@/backend/models';
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
import { writeDesign } from '@/backend/utils/workspace';
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

  if (!spec.requirements || Object.keys(spec.requirements).length === 0) {
    return validationError(new Error('Requirements must be generated first'));
  }

  console.log('Generating design for spec:', spec.title);

  const project = spec.projectId as any;
  const projectContext = project
    ? `Project: ${project.name}\n${project.description || ''}`
    : undefined;

  // Get related P0 specs with their designs
  const relatedSpecs = await Spec.find({
    projectId: spec.projectId,
    priority: 'P0',
    _id: { $ne: spec._id },
    design: { $exists: true }
  }).select('title description design').limit(5);

  const progressCallback = (text: string) => {
    if (global.io) {
      global.io.to(`spec:${specId}`).emit('ai:progress', {
        type: 'design_generation',
        text,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const design = await claudeClient.generateDesign(
    spec.title,
    spec.description || 'No description provided',
    spec.requirements,
    projectContext,
    project?.architecture,
    relatedSpecs.map(s => ({ 
      id: s._id.toString(), 
      name: s.title, 
      description: s.description,
      design: s.design 
    })),
    progressCallback
  );

  spec.design = design;
  spec.currentPhase = 'TASKS';
  spec.progress = 50;
  await spec.save();

  // Write design to file system
  const fullProject = await Project.findById(spec.projectId);
  if (fullProject && fullProject.workspacePath) {
    try {
      const specId = spec.specNumber.toString().padStart(3, '0');
      await writeDesign(fullProject.workspacePath, specId, design);

      loggers.spec.info(
        { projectId: fullProject._id, specId, workspacePath: fullProject.workspacePath },
        'Wrote design to workspace file'
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggers.spec.error({ errorMsg, projectId: fullProject._id }, 'Failed to write design to file');
      // Don't fail the request, but log the error
    }
  }

  await publishActivityLog({
    eventType: EventType.SPEC_UPDATED,
    specId: spec._id,
    message: `Design generated for: ${spec.title}`,
    metadata: { phase: 'TASKS' },
  });

  return successResponse(
    { design, spec },
    'Design generated successfully'
  );
});
