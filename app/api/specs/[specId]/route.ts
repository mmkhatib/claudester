import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec } from '@/backend/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { specId: string } }
) {
  try {
    await connectDB();

    const spec = await Spec.findById(params.specId).populate('projectId', 'name');
    
    if (!spec) {
      return NextResponse.json(
        { success: false, error: { message: 'Spec not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: spec });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message, code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
