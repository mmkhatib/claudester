import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { taskExecutionService } from '@/backend/services/task-execution-service';
import { Task } from '@/backend/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { taskIds, specId } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task IDs array is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Starting bulk task execution for ${taskIds.length} tasks`);

    // If specId is provided, validate that all tasks belong to the spec
    if (specId) {
      const tasks = await Task.find({ _id: { $in: taskIds }, specId });
      if (tasks.length !== taskIds.length) {
        return NextResponse.json(
          { success: false, error: 'Some tasks do not belong to the specified spec' },
          { status: 400 }
        );
      }
    }

    // Start tasks sequentially using the execution service
    const result = await taskExecutionService.startTasksSequentially(taskIds, specId);

    return NextResponse.json({
      success: true,
      data: {
        completed: result.completed,
        failed: result.failed,
        queued: result.queued,
        summary: {
          total: taskIds.length,
          completedCount: result.completed.length,
          failedCount: result.failed.length,
          queuedCount: result.queued.length,
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Error in bulk task execution:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start tasks',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
