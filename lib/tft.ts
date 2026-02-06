import { SupabaseClient } from '@supabase/supabase-js';
import {
  getChallengerLeague,
  getGrandmasterLeague,
  getMatchIdsByPuuid,
  getMatch,
  getAccountByPuuid,
  LeagueEntry,
  MatchDTO,
} from './riot-api';

// Types for TFT data
export interface TftSnapshot {
  id: number;
  snapshot_date: string;
  summoner_id: string;
  summoner_name: string;
  puuid: string;
  tier: string;
  lp: number;
  wins: number;
  losses: number;
}

export interface TopGainer {
  summoner_name: string;
  puuid: string;
  lp_gain: number;
  current_lp: number;
  previous_lp: number;
  tier: string;
}

export interface UnitAggregate {
  character_id: string;
  play_rate: number;
  avg_placement: number;
  sample_size: number;
}

export interface ItemAggregate {
  item_id: string;
  play_rate: number;
  avg_placement: number;
  sample_size: number;
}

// Helper to get today's date string (YYYY-MM-DD)
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Take a daily snapshot of Challenger and Grandmaster players
export async function takeDailySnapshot(supabase: SupabaseClient): Promise<number> {
  const today = getTodayString();

  // Check if we already have a snapshot for today
  const { count } = await supabase
    .from('tft_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('snapshot_date', today);

  if (count && count > 0) {
    console.log(`Snapshot for ${today} already exists, skipping`);
    return 0;
  }

  // Fetch Challenger and Grandmaster leagues
  const [challenger, grandmaster] = await Promise.all([
    getChallengerLeague(),
    getGrandmasterLeague(),
  ]);

  const entries: { tier: string; entry: LeagueEntry }[] = [
    ...challenger.entries.map(e => ({ tier: 'CHALLENGER', entry: e })),
    ...grandmaster.entries.map(e => ({ tier: 'GRANDMASTER', entry: e })),
  ];

  // Build snapshots - PUUID is now included directly in league entries
  const snapshots: Omit<TftSnapshot, 'id'>[] = entries.map(({ tier, entry }) => ({
    snapshot_date: today,
    summoner_id: entry.puuid, // Use PUUID as identifier (summonerId no longer in API)
    summoner_name: entry.puuid.substring(0, 8), // Placeholder - name not in API anymore
    puuid: entry.puuid,
    tier,
    lp: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses,
  }));

  // Batch insert
  if (snapshots.length > 0) {
    const { error } = await supabase.from('tft_snapshots').insert(snapshots);
    if (error) throw error;
  }

  console.log(`Inserted ${snapshots.length} snapshots for ${today}`);
  return snapshots.length;
}

// Find top LP gainers between two dates
export async function getTopLpGainers(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string,
  limit: number = 10
): Promise<TopGainer[]> {
  // Get snapshots for both dates
  const { data: fromSnapshots, error: fromErr } = await supabase
    .from('tft_snapshots')
    .select('*')
    .eq('snapshot_date', fromDate);

  const { data: toSnapshots, error: toErr } = await supabase
    .from('tft_snapshots')
    .select('*')
    .eq('snapshot_date', toDate);

  if (fromErr) throw fromErr;
  if (toErr) throw toErr;

  if (!fromSnapshots || !toSnapshots) return [];

  // Create map of previous LP by PUUID
  const previousLpMap = new Map<string, { lp: number; name: string }>();
  for (const snap of fromSnapshots) {
    previousLpMap.set(snap.puuid, { lp: snap.lp, name: snap.summoner_name });
  }

  // Calculate gains
  const gainers: TopGainer[] = [];
  for (const snap of toSnapshots) {
    const previous = previousLpMap.get(snap.puuid);
    if (previous) {
      const gain = snap.lp - previous.lp;
      if (gain > 0) {
        gainers.push({
          summoner_name: snap.summoner_name,
          puuid: snap.puuid,
          lp_gain: gain,
          current_lp: snap.lp,
          previous_lp: previous.lp,
          tier: snap.tier,
        });
      }
    }
  }

  // Sort by LP gain and take top N
  gainers.sort((a, b) => b.lp_gain - a.lp_gain);
  const topGainers = gainers.slice(0, limit);

  // Fetch real names for top gainers (only if they have placeholder names)
  for (const gainer of topGainers) {
    if (gainer.summoner_name.length <= 8 && !gainer.summoner_name.includes('#')) {
      try {
        const account = await getAccountByPuuid(gainer.puuid);
        gainer.summoner_name = `${account.gameName}#${account.tagLine}`;
      } catch {
        // Keep placeholder if lookup fails
      }
    }
  }

  return topGainers;
}

// Fetch and store matches for top gainers
export async function fetchMatchesForGainers(
  supabase: SupabaseClient,
  gainers: TopGainer[],
  matchesPerPlayer: number = 10
): Promise<number> {
  let totalMatches = 0;

  for (const gainer of gainers) {
    try {
      // Get recent match IDs
      const matchIds = await getMatchIdsByPuuid(gainer.puuid, matchesPerPlayer);

      for (const matchId of matchIds) {
        // Check if we already have this match
        const { data: existing } = await supabase
          .from('tft_matches')
          .select('id')
          .eq('match_id', matchId)
          .single();

        if (existing) continue;

        // Fetch and store the match
        const match = await getMatch(matchId);
        await storeMatch(supabase, match);
        totalMatches++;
      }
    } catch (error) {
      console.error(`Failed to fetch matches for ${gainer.summoner_name}:`, error);
    }
  }

  return totalMatches;
}

// Store a match and all its participants/units/items
async function storeMatch(supabase: SupabaseClient, match: MatchDTO): Promise<void> {
  const { metadata, info } = match;

  // Insert match
  const { error: matchErr } = await supabase.from('tft_matches').insert({
    match_id: metadata.match_id,
    game_datetime: new Date(info.game_datetime).toISOString(),
    game_length: info.game_length,
    game_version: info.game_version,
    queue_id: info.queue_id,
    tft_set_number: info.tft_set_number,
  });

  if (matchErr) {
    if (matchErr.code === '23505') return; // Duplicate, skip
    throw matchErr;
  }

  // Insert participants
  for (const participant of info.participants) {
    const { data: participantData, error: partErr } = await supabase
      .from('tft_match_participants')
      .insert({
        match_id: metadata.match_id,
        puuid: participant.puuid,
        placement: participant.placement,
        level: participant.level,
        gold_left: participant.gold_left,
        players_eliminated: participant.players_eliminated,
        total_damage_to_players: participant.total_damage_to_players,
        time_eliminated: participant.time_eliminated,
      })
      .select('id')
      .single();

    if (partErr) {
      console.error(`Failed to insert participant:`, partErr);
      continue;
    }

    // Insert units
    for (const unit of participant.units) {
      const { data: unitData, error: unitErr } = await supabase
        .from('tft_units')
        .insert({
          participant_id: participantData.id,
          character_id: unit.character_id,
          tier: unit.tier,
          rarity: unit.rarity,
        })
        .select('id')
        .single();

      if (unitErr) {
        console.error(`Failed to insert unit:`, unitErr);
        continue;
      }

      // Insert items
      if (unit.itemNames && unit.itemNames.length > 0) {
        const items = unit.itemNames.map(itemId => ({
          unit_id: unitData.id,
          item_id: itemId,
        }));

        const { error: itemErr } = await supabase.from('tft_items').insert(items);
        if (itemErr) {
          console.error(`Failed to insert items:`, itemErr);
        }
      }
    }
  }
}

// Compute and store daily aggregates
export async function computeDailyAggregates(supabase: SupabaseClient): Promise<void> {
  const today = getTodayString();

  // Get all recent matches (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: recentMatches, error: matchErr } = await supabase
    .from('tft_matches')
    .select('match_id')
    .gte('game_datetime', yesterday.toISOString());

  if (matchErr) throw matchErr;
  if (!recentMatches || recentMatches.length === 0) return;

  const matchIds = recentMatches.map(m => m.match_id);

  // Get all participants from these matches
  const { data: participants, error: partErr } = await supabase
    .from('tft_match_participants')
    .select(`
      id,
      match_id,
      placement,
      tft_units (
        character_id,
        tier,
        rarity,
        tft_items (
          item_id
        )
      )
    `)
    .in('match_id', matchIds);

  if (partErr) throw partErr;
  if (!participants) return;

  // Aggregate unit stats
  const unitStats = new Map<string, { placements: number[]; count: number }>();
  const itemStats = new Map<string, { placements: number[]; count: number }>();

  for (const participant of participants) {
    const units = (participant as any).tft_units || [];
    for (const unit of units) {
      const charId = unit.character_id;
      if (!unitStats.has(charId)) {
        unitStats.set(charId, { placements: [], count: 0 });
      }
      const stat = unitStats.get(charId)!;
      stat.placements.push(participant.placement);
      stat.count++;

      // Track items
      const items = unit.tft_items || [];
      for (const item of items) {
        const itemId = item.item_id;
        if (!itemStats.has(itemId)) {
          itemStats.set(itemId, { placements: [], count: 0 });
        }
        const itemStat = itemStats.get(itemId)!;
        itemStat.placements.push(participant.placement);
        itemStat.count++;
      }
    }
  }

  const totalGames = participants.length;

  // Prepare aggregates for insertion
  const aggregates: any[] = [];

  // Unit play rates and avg placements
  for (const [charId, stat] of unitStats) {
    const avgPlacement = stat.placements.reduce((a, b) => a + b, 0) / stat.placements.length;
    const playRate = (stat.count / totalGames) * 100;

    aggregates.push({
      aggregate_date: today,
      aggregate_type: 'unit_playrate',
      key: charId,
      value: playRate,
      sample_size: stat.count,
    });

    aggregates.push({
      aggregate_date: today,
      aggregate_type: 'unit_avg_placement',
      key: charId,
      value: avgPlacement,
      sample_size: stat.count,
    });
  }

  // Item play rates
  for (const [itemId, stat] of itemStats) {
    const avgPlacement = stat.placements.reduce((a, b) => a + b, 0) / stat.placements.length;
    const playRate = (stat.count / totalGames) * 100;

    aggregates.push({
      aggregate_date: today,
      aggregate_type: 'item_playrate',
      key: itemId,
      value: playRate,
      sample_size: stat.count,
    });

    aggregates.push({
      aggregate_date: today,
      aggregate_type: 'item_avg_placement',
      key: itemId,
      value: avgPlacement,
      sample_size: stat.count,
    });
  }

  // Upsert aggregates
  if (aggregates.length > 0) {
    const { error } = await supabase
      .from('tft_daily_aggregates')
      .upsert(aggregates, { onConflict: 'aggregate_date,aggregate_type,key' });

    if (error) throw error;
  }

  console.log(`Computed ${aggregates.length} aggregates for ${today}`);
}

// Fetch aggregates for dashboard
export async function fetchLatestAggregates(
  supabase: SupabaseClient
): Promise<{
  topUnits: UnitAggregate[];
  topItems: ItemAggregate[];
  gainers: TopGainer[];
}> {
  // Get most recent aggregate date
  const { data: latestDate } = await supabase
    .from('tft_daily_aggregates')
    .select('aggregate_date')
    .order('aggregate_date', { ascending: false })
    .limit(1)
    .single();

  if (!latestDate) {
    return { topUnits: [], topItems: [], gainers: [] };
  }

  const date = latestDate.aggregate_date;

  // Fetch unit aggregates
  const { data: unitPlayrates } = await supabase
    .from('tft_daily_aggregates')
    .select('*')
    .eq('aggregate_date', date)
    .eq('aggregate_type', 'unit_playrate')
    .order('value', { ascending: false })
    .limit(10);

  const { data: unitPlacements } = await supabase
    .from('tft_daily_aggregates')
    .select('*')
    .eq('aggregate_date', date)
    .eq('aggregate_type', 'unit_avg_placement');

  // Build unit aggregates
  const placementMap = new Map<string, number>();
  for (const p of unitPlacements || []) {
    placementMap.set(p.key, p.value);
  }

  const topUnits: UnitAggregate[] = (unitPlayrates || []).map(u => ({
    character_id: u.key,
    play_rate: u.value,
    avg_placement: placementMap.get(u.key) || 0,
    sample_size: u.sample_size,
  }));

  // Fetch item aggregates
  const { data: itemPlayrates } = await supabase
    .from('tft_daily_aggregates')
    .select('*')
    .eq('aggregate_date', date)
    .eq('aggregate_type', 'item_playrate')
    .order('value', { ascending: false })
    .limit(10);

  const { data: itemPlacements } = await supabase
    .from('tft_daily_aggregates')
    .select('*')
    .eq('aggregate_date', date)
    .eq('aggregate_type', 'item_avg_placement');

  const itemPlacementMap = new Map<string, number>();
  for (const p of itemPlacements || []) {
    itemPlacementMap.set(p.key, p.value);
  }

  const topItems: ItemAggregate[] = (itemPlayrates || []).map(i => ({
    item_id: i.key,
    play_rate: i.value,
    avg_placement: itemPlacementMap.get(i.key) || 0,
    sample_size: i.sample_size,
  }));

  // Get yesterday's date for LP gainers
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const gainers = await getTopLpGainers(supabase, yesterdayStr, date, 5);

  return { topUnits, topItems, gainers };
}
