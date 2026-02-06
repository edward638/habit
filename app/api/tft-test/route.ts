import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getChallengerLeague,
  getGrandmasterLeague,
  getAccountByPuuid,
} from '@/lib/riot-api';
import {
  getTopLpGainers,
  fetchMatchesForGainers,
  computeDailyAggregates,
} from '@/lib/tft';

// Test endpoint for manual triggering - DELETE THIS IN PRODUCTION
// Usage:
//   /api/tft-test?action=snapshot&date=2025-02-04  (yesterday)
//   /api/tft-test?action=snapshot&date=2025-02-05  (today)
//   /api/tft-test?action=analyze

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const dateParam = searchParams.get('date');

  if (action === 'snapshot') {
    if (!dateParam) {
      return NextResponse.json({ error: 'date parameter required (YYYY-MM-DD)' }, { status: 400 });
    }

    try {
      // Check if snapshot already exists for this date
      const { count } = await supabase
        .from('tft_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', dateParam);

      if (count && count > 0) {
        return NextResponse.json({
          success: false,
          message: `Snapshot for ${dateParam} already exists (${count} records)`,
        });
      }

      // Fetch leagues
      const [challenger, grandmaster] = await Promise.all([
        getChallengerLeague(),
        getGrandmasterLeague(),
      ]);

      const entries = [
        ...challenger.entries.map(e => ({ tier: 'CHALLENGER', entry: e })),
        ...grandmaster.entries.map(e => ({ tier: 'GRANDMASTER', entry: e })),
      ];

      // For testing, capture top players (limit to 30 to save API calls for name lookups)
      const topEntries = entries
        .sort((a, b) => b.entry.leaguePoints - a.entry.leaguePoints)
        .slice(0, 30);

      // Fetch real names using Account API
      const snapshots: any[] = [];
      for (const { tier, entry } of topEntries) {
        let gameName = entry.puuid.substring(0, 8); // Fallback
        try {
          const account = await getAccountByPuuid(entry.puuid);
          gameName = `${account.gameName}#${account.tagLine}`;
        } catch (err) {
          console.error(`Failed to get name for ${entry.puuid}:`, err);
        }
        snapshots.push({
          snapshot_date: dateParam,
          summoner_id: entry.puuid,
          summoner_name: gameName,
          puuid: entry.puuid,
          tier,
          lp: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
        });
      }

      if (snapshots.length > 0) {
        const { error } = await supabase.from('tft_snapshots').insert(snapshots);
        if (error) throw error;
      }

      return NextResponse.json({
        success: true,
        message: `Snapshot complete for ${dateParam}`,
        playersRecorded: snapshots.length,
      });
    } catch (error) {
      console.error('Snapshot error:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  if (action === 'analyze') {
    try {
      // Get the two most recent snapshot dates
      const { data: dates } = await supabase
        .from('tft_snapshots')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false });

      const uniqueDates = [...new Set(dates?.map(d => d.snapshot_date))].slice(0, 2);

      if (uniqueDates.length < 2) {
        return NextResponse.json({
          success: false,
          message: `Need 2 snapshot dates, found ${uniqueDates.length}: ${uniqueDates.join(', ')}`,
        });
      }

      const [todayStr, yesterdayStr] = uniqueDates;

      // Find top LP gainers
      const gainers = await getTopLpGainers(supabase, yesterdayStr, todayStr, 10);

      if (gainers.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No LP gainers found between snapshots',
          dates: { from: yesterdayStr, to: todayStr },
        });
      }

      // Fetch matches (limit to 5 per player for testing)
      const matchCount = await fetchMatchesForGainers(supabase, gainers, 5);

      // Compute aggregates
      await computeDailyAggregates(supabase);

      return NextResponse.json({
        success: true,
        message: 'Analysis complete',
        dates: { from: yesterdayStr, to: todayStr },
        gainersFound: gainers.length,
        topGainer: gainers[0],
        matchesFetched: matchCount,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  return NextResponse.json({
    error: 'Invalid action. Use ?action=snapshot&date=YYYY-MM-DD or ?action=analyze',
  }, { status: 400 });
}

export const maxDuration = 300;
export const dynamic = 'force-dynamic';
