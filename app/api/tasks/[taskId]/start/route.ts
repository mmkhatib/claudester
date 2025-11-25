import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { taskExecutionService } from '@/backend/services/task-execution-service';

export async function POST(
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

    console.log(`[API] Starting task execution for task: ${taskId}`);

    // Start the task using the execution service
    const { agent, result } = await taskExecutionService.startTask(taskId);

    return NextResponse.json({
      success: true,
      data: {
        agent: {
          agentId: agent.agentId,
          status: agent.status,
          taskId: agent.currentTaskId,
        },
        task: {
          _id: taskId,
          status: result?.success ? 'COMPLETED' : 'IN_PROGRESS',
          startedAt: new Date(),
        },
        result: result ? {
          success: result.success,
          output: result.output,
          error: result.error,
          attempts: result.attempts,
        } : undefined,
      },
    });
  } catch (error: any) {
    console.error('[API] Error starting task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start task',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
