import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import { Agent, Task, AgentType } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import { agentSpawner } from '@/backend/services/agent-spawner';
import {
  successResponse,
  parseBody,
  parseSearchParams,
  withErrorHandling,
  validationError,
  notFoundError,
  errorResponse,
  HttpStatus,
} from '@/lib/api-utils';

// Validation schemas
const ListAgentsSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  taskId: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

const CreateAgentSchema = z.object({
  taskId: z.string(),
  agentType: z.nativeEnum(AgentType).optional().default(AgentType.DEVELOPMENT),
});

/**
 * GET /api/agents
 * List all agents with filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission('AGENT_VIEW');
  await connectDB();

  const params = parseSearchParams(request);
  const validationResult = ListAgentsSchema.safeParse(params);

  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { status, type, taskId, page, limit } = validationResult.data;

  // Build query
  const query: any = {};

  if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (taskId) {
    query.taskId = taskId;
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;

  const [agents, total] = await Promise.all([
    Agent.find(query)
      .populate('taskId', 'description type status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Agent.countDocuments(query),
  ]);

  // Get active agents from spawner
  const activeAgents = agentSpawner.getAllAgents();

  return successResponse({
    agents,
    activeAgents: activeAgents.map((a) => ({
      agentId: a.agentId,
      taskId: a.taskId,
      startTime: a.startTime,
      runtime: Date.now() - a.startTime.getTime(),
    })),
    stats: {
      total,
      active: agentSpawner.getActiveAgentCount(),
      maxConcurrent: agentSpawner['maxConcurrentAgents'],
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/agents
 * Spawn a new agent for a task
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  await requirePermission('AGENT_START');
  await connectDB();

  const body = await parseBody(request);

  // Validate request body
  const validationResult = CreateAgentSchema.safeParse(body);

  if (!validationResult.success) {
    return validationError(validationResult.error);
  }

  const { taskId, agentType } = validationResult.data;

  // Check if can spawn agent
  if (!agentSpawner.canSpawnAgent()) {
    return errorResponse(
      'Maximum concurrent agents reached',
      'MAX_AGENTS_REACHED',
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  // Get task
  const task = await Task.findById(taskId).populate('specId');

  if (!task) {
    return notFoundError('Task');
  }

  // Check if task already has an agent
  const existingAgent = await Agent.findOne({
    taskId,
    status: { $in: ['IDLE', 'RUNNING'] },
  });

  if (existingAgent) {
    return errorResponse(
      'Task already has an active agent',
      'AGENT_EXISTS',
      HttpStatus.CONFLICT
    );
  }

  // Spawn agent
  try {
    const agentId = await agentSpawner.spawnAgent({
      taskId,
      agentType,
      workspacePath: '',  // Will be created by spawner
      files: task.files || [],
      description: task.description,
      acceptanceCriteria: task.acceptanceCriteria || [],
    });

    const agent = await Agent.findOne({ agentId })
      .populate('taskId', 'description type status');

    return successResponse(agent, 'Agent spawned successfully', 201);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to spawn agent',
      'SPAWN_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});
