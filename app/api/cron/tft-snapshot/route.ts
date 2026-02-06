import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { takeDailySnapshot } from '@/lib/tft';

export async function GET(request: Request) {
  // Use service role for cron jobs (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await takeDailySnapshot(supabase);
    return NextResponse.json({
      success: true,
      message: `Snapshot complete: ${count} players recorded`,
    });
  } catch (error) {
    console.error('Snapshot error:', error);
    return NextResponse.json(
      { error: 'Snapshot failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Vercel cron configuration
export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';
