import { NextRequest, NextResponse } from 'next/server';
import { searchSymptoms } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repertoryId = parseInt(searchParams.get('repertoryId') || '1', 10);
    const query = searchParams.get('q') || '';
    const catIdParam = searchParams.get('catId');
    const categoryId = catIdParam ? parseInt(catIdParam, 10) : undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const symptoms = searchSymptoms(repertoryId, query, categoryId, limit);
    return NextResponse.json({ success: true, count: symptoms.length, symptoms });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
