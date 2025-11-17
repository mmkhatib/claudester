import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Agent } from '@/backend/models';
import { requirePermission } from '@/lib/auth';
import { agentSpawner } from '@/backend/services/agent-spawner';
import {
  successResponse,
  withErrorHandling,
  notFoundError,
  errorResponse,
  HttpStatus,
} from '@/lib/api-utils';

interface RouteContext {
  params: {
    agentId: string;
  };
}

/**
 * GET /api/agents/[agentId]
 * Get agent details
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('AGENT_VIEW');
  await connectDB();

  const { agentId } = context.params;

  const agent = await Agent.findOne({ agentId })
    .populate('taskId', 'description type status acceptanceCriteria');

  if (!agent) {
    return notFoundError('Agent');
  }

  // Get runtime info from spawner if agent is active
  const spawnedAgent = agentSpawner.getAgent(agentId);
  const runtime = spawnedAgent
    ? {
        isActive: true,
        startTime: spawnedAgent.startTime,
        runtime: Date.now() - spawnedAgent.startTime.getTime(),
        processId: spawnedAgent.process.pid,
      }
    : { isActive: false };

  return successResponse({
    ...agent.toObject(),
    runtime,
  });
});

/**
 * DELETE /api/agents/[agentId]
 * Stop an agent
 */
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  context: RouteContext
) => {
  await requirePermission('AGENT_STOP');
  await connectDB();

  const { agentId } = context.params;

  const agent = await Agent.findOne({ agentId });

  if (!agent) {
    return notFoundError('Agent');
  }

  // Check if agent is active
  const spawnedAgent = agentSpawner.getAgent(agentId);

  if (!spawnedAgent) {
    return errorResponse(
      'Agent is not running',
      'AGENT_NOT_RUNNING',
      HttpStatus.BAD_REQUEST
    );
  }

  // Stop the agent
  try {
    await agentSpawner.stopAgent(agentId, 'user request');

    return successResponse(
      { agentId },
      'Agent stopped successfully'
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to stop agent',
      'STOP_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});
