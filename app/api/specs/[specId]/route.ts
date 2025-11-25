import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
} from '@/lib/api-utils';

interface RouteContext {
  params: {
    specId: string;
  };
}

/**
 * GET /api/specs/[specId]
 * Get a single specification by ID
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

  return successResponse(spec);
});
