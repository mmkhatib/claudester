import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Spec, Project, Priority } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import {
  successResponse,
  parseBody,
  parseSearchParams,
  withErrorHandling,
  validationError,
  notFoundError,
} from '@/lib/api-utils';
import { publishActivityLog } from '@/lib/pubsub';
import { EventType } from '@/backend/models';

// Validation schemas
const CreateSpecSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).optional().default(Priority.P1),
  requirements: z.any().optional(),
});

const ListSpecsSchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  phase: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

/**
 * GET /api/specs
 * List specs with filtering and pagination
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission('SPEC_VIEW');
  await connectDB();

  const params = parseSearchParams(request);
  const validationResult = ListSpecsSchema.safeParse(params);

  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { projectId, status, phase, page, limit } = validationResult.data;

  // Build query
  const query: any = {};

  if (projectId) {
    query.projectId = projectId;
  }

  if (status) {
    query.status = status;
  }

  if (phase) {
    query.currentPhase = phase;
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;

  const [specs, total] = await Promise.all([
    Spec.find(query)
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Spec.countDocuments(query),
  ]);

  return successResponse({
    specs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/specs
 * Create a new spec
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requirePermission('SPEC_CREATE');
  await connectDB();

  const body = await parseBody(request);

  // Validate request body
  const validationResult = CreateSpecSchema.safeParse(body);

  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { projectId, title, description, priority, requirements } = validationResult.data;

  // Verify project exists
  const project = await Project.findById(projectId);

  if (!project) {
    return notFoundError('Project');
  }

  // Get next spec number for this project
  const lastSpec = await Spec.findOne({ projectId })
    .sort({ specNumber: -1 })
    .select('specNumber');

  const specNumber = lastSpec ? lastSpec.specNumber + 1 : 1;

  // Create spec
  const spec = await Spec.create({
    projectId,
    specNumber,
    title,
    description,
    priority,
    requirements: requirements || {},
    currentPhase: 'REQUIREMENTS',
    status: 'ACTIVE',
    progress: 0,
  });

  const populatedSpec = await Spec.findById(spec._id)
    .populate('projectId', 'name');

  // Publish activity log
  await publishActivityLog({
    eventType: EventType.SPEC_CREATED,
    specId: spec._id,
    message: `Spec #${specNumber} created: ${title}`,
    metadata: { title, priority },
  });

  return successResponse(populatedSpec, 'Spec created successfully', 201);
});
