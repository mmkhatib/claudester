import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Task, Agent, TaskStatus, AgentStatus } from '@/backend/models';

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    await connectDB();

    const { taskId } = params;

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only allow cancelling tasks that are in progress or pending
    if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.PENDING) {
      return NextResponse.json(
        { error: `Cannot cancel task with status: ${task.status}` },
        { status: 400 }
      );
    }

    // Update task status
    task.status = TaskStatus.CANCELLED;
    task.error = 'Task cancelled by user';
    await task.save();

    // If there's an associated agent, cancel it too
    if (task.agentId) {
      const agent = await Agent.findById(task.agentId);
      if (agent && agent.status === AgentStatus.RUNNING) {
        agent.status = AgentStatus.FAILED;
        agent.error = 'Task cancelled by user';
        await agent.save();
      }
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task._id,
        status: task.status,
      },
    });
  } catch (error) {
    console.error('Error cancelling task:', error);
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    );
  }
}
