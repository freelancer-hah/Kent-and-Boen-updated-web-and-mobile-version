import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repertoryId = parseInt(searchParams.get('repertoryId') || '1', 10);
    const categories = getCategories(repertoryId);
    return NextResponse.json({ success: true, categories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
