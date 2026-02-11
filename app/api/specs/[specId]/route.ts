import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec, Project } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
} from '@/lib/api-utils';
import { readRequirements, readDesign, readTasks } from '@/backend/utils/workspace';
import { loggers } from '@/lib/logger';

interface RouteContext {
  params: {
    specId: string;
  };
}

/**
 * GET /api/specs/[specId]
 * Get a single specification by ID
 * Reads spec content from workspace files if available, falls back to database
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
    return notFoundError('Specification');
  }

  // Try to read spec content from workspace files
  const project = await Project.findById(spec.projectId);
  if (project && project.workspacePath) {
    try {
      const specIdFormatted = spec.specNumber.toString().padStart(3, '0');

      // Try to read from files, fall back to database if files don't exist
      const requirementsFromFile = await readRequirements(project.workspacePath, specIdFormatted);
      const designFromFile = await readDesign(project.workspacePath, specIdFormatted);
      const tasksFromFile = await readTasks(project.workspacePath, specIdFormatted);

      // Create enhanced spec object with file content if available
      const enhancedSpec = spec.toObject();
      if (requirementsFromFile) {
        enhancedSpec.requirements = requirementsFromFile;
        loggers.spec.debug({ specId: spec._id }, 'Loaded requirements from file');
      }
      if (designFromFile) {
        enhancedSpec.design = designFromFile;
        loggers.spec.debug({ specId: spec._id }, 'Loaded design from file');
      }
      if (tasksFromFile) {
        enhancedSpec.tasks = tasksFromFile;
        loggers.spec.debug({ specId: spec._id }, 'Loaded tasks from file');
      }

      return successResponse(enhancedSpec);
    } catch (error) {
      loggers.spec.error({ error, specId: spec._id }, 'Error reading spec files, falling back to database');
      // Fall through to return database version
    }
  }

  return successResponse(spec);
});
