import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getTopLpGainers,
  fetchMatchesForGainers,
  computeDailyAggregates,
} from '@/lib/tft';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role for cron jobs (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get today and yesterday dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    // Find top 10 LP gainers
    const gainers = await getTopLpGainers(supabase, yesterdayStr, todayStr, 10);

    if (gainers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No LP gainers found (may need snapshots from both days)',
        matches: 0,
      });
    }

    // Fetch matches for top gainers
    const matchCount = await fetchMatchesForGainers(supabase, gainers, 10);

    // Compute daily aggregates
    await computeDailyAggregates(supabase);

    return NextResponse.json({
      success: true,
      message: `Analysis complete`,
      gainersFound: gainers.length,
      matchesFetched: matchCount,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: String(error) },
      { status: 500 }
    );
  }
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Vercel cron configuration
export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';
