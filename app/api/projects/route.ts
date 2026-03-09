import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Project } from '@/backend/models';
import { getCurrentDBUser, requirePermission } from '@/lib/auth';
import {
  successResponse,
  parseBody,
  withErrorHandling,
  validationError,
} from '@/lib/api-utils';
import {
  generateWorkspacePath,
  initializeProjectWorkspace,
} from '@/backend/utils/workspace';

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  workspacePath: z.string().min(1, 'Workspace path is required'),
});

/**
 * GET /api/projects
 * List all projects for the current user
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission('PROJECT_VIEW');
  await connectDB();

  const user = await getCurrentDBUser();

  console.log('GET /api/projects - User ID:', user?._id);

  // Get projects owned by user or that user has access to
  const projects = await Project.find({
    $or: [
      { ownerId: user!._id },
      { teamMembers: user!._id },
    ],
  })
    .populate('ownerId', 'name email avatar')
    .sort({ updatedAt: -1 });

  console.log('GET /api/projects - Found projects:', projects.length);

  return successResponse(projects);
});

/**
 * POST /api/projects
 * Create a new project
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requirePermission('PROJECT_CREATE');
  await connectDB();

  const body = await parseBody(request);

  // Validate request body
  const validationResult = CreateProjectSchema.safeParse(body);

  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { name, description, workspacePath: customWorkspacePath } = validationResult.data;

  console.log('POST /api/projects - Creating project for user ID:', user._id);

  // Use custom workspace path if provided, otherwise generate one
  const workspacePath = customWorkspacePath && customWorkspacePath.trim() !== ''
    ? customWorkspacePath
    : generateWorkspacePath(name, user._id.toString());

  // Initialize project workspace directory structure FIRST
  // Create a temporary project object for workspace initialization
  const tempProject = {
    _id: 'temp',
    name,
    description: description || '',
  };
  
  try {
    await initializeProjectWorkspace(workspacePath, tempProject as any);
    console.log('POST /api/projects - Workspace initialized successfully');
  } catch (error) {
    console.error('Failed to initialize workspace:', error);
    throw new Error(`Cannot create project: ${error instanceof Error ? error.message : 'Failed to create workspace folder'}`);
  }

  // Create project in database only after workspace is created
  const project = await Project.create({
    name,
    description,
    ownerId: user._id,
    teamMembers: [user._id],
    workspacePath,
  });

  console.log('POST /api/projects - Created project:', project._id, 'Workspace:', workspacePath);

  const populatedProject = await Project.findById(project._id)
    .populate('ownerId', 'name email avatar');

  return successResponse(populatedProject, 'Project created successfully', 201);
});
