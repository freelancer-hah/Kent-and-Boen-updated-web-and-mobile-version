import { NextRequest, NextResponse } from 'next/server';
import { calculateRepertorization } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repertoryId = parseInt(body.repertoryId || '1', 10);
    const symIds = Array.isArray(body.symptomIds) ? body.symptomIds.map(Number) : [];
    const intensityWeights = body.intensityWeights || {};

    if (symIds.length === 0) {
      return NextResponse.json({
        success: true,
        remedies: [],
        totalSymptoms: 0,
        matchedRemediesCount: 0,
        durationMs: 0,
      });
    }

    const result = calculateRepertorization(repertoryId, symIds, intensityWeights);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
