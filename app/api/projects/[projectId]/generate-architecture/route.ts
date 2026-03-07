import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/backend/models/Project';
import { claudeClient } from '@/backend/services/claude-client';
import { loggers } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectDB();

    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    loggers.api.info({ projectId: params.projectId }, 'Generating project architecture');

    const architecture = await claudeClient.generateProjectArchitecture(
      project.name,
      project.description
    );

    project.architecture = architecture;
    await project.save();

    loggers.api.info({ projectId: params.projectId }, 'Architecture generated successfully');

    return NextResponse.json({ architecture });
  } catch (error: any) {
    loggers.api.error({ error, projectId: params.projectId }, 'Failed to generate architecture');
    return NextResponse.json(
      { error: 'Failed to generate architecture', details: error.message },
      { status: 500 }
    );
  }
}
