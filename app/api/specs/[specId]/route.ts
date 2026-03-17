import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Spec } from '@/backend/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { specId: string } }
) {
  try {
    await connectDB();

    const spec = await Spec.findById(params.specId)
      .populate('projectId', 'name')
      .populate('dependsOn', 'specNumber title status');
    
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { specId: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    
    const spec = await Spec.findByIdAndUpdate(
      params.specId,
      { $set: body },
      { new: true }
    );
    
    if (!spec) {
      return NextResponse.json(
        { success: false, error: 'Spec not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: spec });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
