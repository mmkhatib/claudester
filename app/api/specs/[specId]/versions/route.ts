import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Spec } from '@/backend/models';
import { requirePermission, getCurrentDBUser } from '@/lib/auth';
import {
  successResponse,
  parseBody,
  withErrorHandling,
  validationError,
  notFoundError,
} from '@/lib/api-utils';
import { specVersioning } from '@/backend/services/spec-versioning';

const CreateVersionSchema = z.object({
  changeDescription: z.string().min(1).max(500),
});

const RestoreVersionSchema = z.object({
  version: z.number().int().positive(),
});

interface RouteContext {
  params: {
    specId: string;
  };
}

/**
 * GET /api/specs/[specId]/versions
 * Get all versions for a spec
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('SPEC_VIEW');
  await connectDB();

  const { specId } = context.params;

  const spec = await Spec.findById(specId);
  if (!spec) {
    return notFoundError('Spec');
  }

  const history = await specVersioning.getVersionHistory(specId);

  return successResponse(history);
});

/**
 * POST /api/specs/[specId]/versions
 * Create a new version snapshot
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('SPEC_UPDATE');
  await connectDB();

  const { specId } = context.params;
  const body = await parseBody(request);

  const validationResult = CreateVersionSchema.safeParse(body);
  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { changeDescription } = validationResult.data;

  const spec = await Spec.findById(specId);
  if (!spec) {
    return notFoundError('Spec');
  }

  const version = await specVersioning.createVersion(
    specId,
    changeDescription,
    (user._id as any).toString()
  );

  return successResponse(
    { version },
    'Version created successfully',
    201
  );
});

/**
 * PUT /api/specs/[specId]/versions
 * Restore to a specific version
 */
export const PUT = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  const user = await requirePermission('SPEC_UPDATE');
  await connectDB();

  const { specId } = context.params;
  const body = await parseBody(request);

  const validationResult = RestoreVersionSchema.safeParse(body);
  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { version } = validationResult.data;

  const spec = await Spec.findById(specId);
  if (!spec) {
    return notFoundError('Spec');
  }

  await specVersioning.restoreVersion(
    specId,
    version,
    (user._id as any).toString()
  );

  const updatedSpec = await Spec.findById(specId)
    .populate('projectId', 'name description');

  return successResponse(
    updatedSpec,
    `Restored to version ${version} successfully`
  );
});
