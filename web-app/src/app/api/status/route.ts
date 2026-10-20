import { NextResponse } from 'next/server';
import { getLocalDb, supabase } from '@/lib/db';

export async function GET() {
  let localDbOk = false;
  let localStats = { symptoms: 0, remedies: 0, links: 0 };
  let supabaseOk = false;
  let supabaseMessage = '';

  try {
    const db = getLocalDb();
    const symCount = db.prepare('SELECT count(*) as count FROM symptoms').get() as { count: number };
    const remCount = db.prepare('SELECT count(*) as count FROM remedies').get() as { count: number };
    const linkCount = db.prepare('SELECT count(*) as count FROM remedy_symptoms').get() as { count: number };
    localDbOk = true;
    localStats = { symptoms: symCount.count, remedies: remCount.count, links: linkCount.count };
  } catch (err: unknown) {
    localDbOk = false;
  }

  try {
    const { data, error } = await supabase.from('repertories').select('id, name').limit(1);
    if (!error && data) {
      supabaseOk = true;
      supabaseMessage = 'Connected to Supabase project';
    } else {
      supabaseOk = false;
      supabaseMessage = error ? error.message : 'Tables not yet initialized on Supabase';
    }
  } catch (err: unknown) {
    supabaseOk = false;
    supabaseMessage = err instanceof Error ? err.message : 'Could not reach Supabase';
  }

  return NextResponse.json({
    success: true,
    localDb: {
      connected: localDbOk,
      ...localStats,
    },
    supabase: {
      connected: supabaseOk,
      projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      message: supabaseMessage,
    },
  });
}
