import { NextRequest, NextResponse } from 'next/server';
import { getRemediesList, getRemedyDetails } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repertoryId = parseInt(searchParams.get('repertoryId') || '1', 10);
    const remIdParam = searchParams.get('remId');
    const search = searchParams.get('search') || '';

    if (remIdParam) {
      const details = getRemedyDetails(repertoryId, parseInt(remIdParam, 10));
      if (!details) {
        return NextResponse.json({ success: false, error: 'Remedy not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, ...details });
    }

    const remedies = getRemediesList(repertoryId, search, 100);
    return NextResponse.json({ success: true, count: remedies.length, remedies });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
