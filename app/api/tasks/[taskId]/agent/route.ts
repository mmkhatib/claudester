import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Task, Agent } from '@/backend/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    await connectDB();

    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Fetch the task
    const task = await Task.findById(taskId);

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Fetch the agent for this task
    const agent = await Agent.findOne({ currentTaskId: taskId });

    if (!agent) {
      return NextResponse.json({
        success: true,
        data: {
          agent: null,
          task: {
            status: task.status,
            completedAt: task.completedAt,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        agent: {
          agentId: agent.agentId,
          status: agent.status,
          output: agent.output,
          error: agent.error,
          workspacePath: agent.workspacePath,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        },
        task: {
          status: task.status,
          completedAt: task.completedAt,
          startedAt: task.startedAt,
          output: task.output,
          error: task.error,
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Error fetching agent status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch agent status',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
