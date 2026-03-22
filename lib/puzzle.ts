import { SupabaseClient } from '@supabase/supabase-js';
import { UserPuzzle } from './types';
import { getRandomPainting } from './paintings';
import { toDateString } from './habits';

const TILES = 100; // 10×10 grid
const TILES_PER_HABIT = 2; // reveal/remove per habit completion

// ─── Tile helpers ────────────────────────────────────────────────────────────

export function revealRandomTiles(revealed: number[], count: number): number[] {
  const unrevealed = Array.from({ length: TILES }, (_, i) => i).filter(i => !revealed.includes(i));
  const shuffled = [...unrevealed].sort(() => Math.random() - 0.5);
  return [...revealed, ...shuffled.slice(0, count)];
}

export function removeRandomTiles(revealed: number[], count: number): number[] {
  if (revealed.length === 0) return [];
  const shuffled = [...revealed].sort(() => Math.random() - 0.5);
  return shuffled.slice(count);
}

export function puzzleProgress(revealed: number[]): number {
  return Math.round((revealed.length / TILES) * 100);
}

// ─── Supabase operations ─────────────────────────────────────────────────────

export async function fetchOrCreatePuzzle(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPuzzle> {
  const { data, error } = await supabase
    .from('user_puzzle')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

  if (data) return data as UserPuzzle;

  // Create first puzzle
  const painting = getRandomPainting();
  const { data: created, error: createErr } = await supabase
    .from('user_puzzle')
    .insert({
      user_id: userId,
      painting_id: painting.id,
      revealed_tiles: [],
      last_deduction_date: toDateString(new Date()),
      status: 'active',
    })
    .select('*')
    .single();

  if (createErr) throw createErr;
  return created as UserPuzzle;
}

export async function updatePuzzleTiles(
  supabase: SupabaseClient,
  puzzleId: string,
  newTiles: number[]
): Promise<void> {
  const { error } = await supabase
    .from('user_puzzle')
    .update({ revealed_tiles: newTiles, updated_at: new Date().toISOString() })
    .eq('id', puzzleId);
  if (error) throw error;
}

export async function completePuzzle(
  supabase: SupabaseClient,
  userId: string,
  reason: 'completed' | 'guessed'
): Promise<UserPuzzle> {
  const painting = getRandomPainting();
  const today = toDateString(new Date());

  const { data, error } = await supabase
    .from('user_puzzle')
    .update({
      painting_id: painting.id,
      revealed_tiles: [],
      last_deduction_date: today,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as UserPuzzle;
}

// ─── Missed-day deductions ────────────────────────────────────────────────────
// Called on puzzle page load. Looks at every day since last_deduction_date,
// counts unpaused habits that were NOT completed, removes 2 tiles per miss.

export async function applyMissedDeductions(
  supabase: SupabaseClient,
  userId: string,
  puzzle: UserPuzzle
): Promise<number[] | null> {
  const today = toDateString(new Date());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toDateString(d);
  })();

  const lastDate = puzzle.last_deduction_date;

  // Nothing to deduct if we already processed yesterday
  if (lastDate && lastDate >= yesterday) return null;

  // Fetch all active (non-paused) habits
  const { data: habits, error: hErr } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .eq('is_paused', false);
  if (hErr) throw hErr;

  const activeIds = (habits ?? []).map(h => h.id);
  if (activeIds.length === 0) {
    await supabase
      .from('user_puzzle')
      .update({ last_deduction_date: today })
      .eq('id', puzzle.id);
    return null;
  }

  // Walk from (lastDate + 1 day) through yesterday
  let tiles = [...puzzle.revealed_tiles];
  const startDate = lastDate
    ? (() => { const d = new Date(lastDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d; })()
    : (() => { const d = new Date(yesterday + 'T00:00:00'); return d; })();

  const endDate = new Date(yesterday + 'T00:00:00');

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = toDateString(current);

    const { data: completions, error: cErr } = await supabase
      .from('completions')
      .select('habit_id')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .in('habit_id', activeIds);
    if (cErr) throw cErr;

    const completedSet = new Set((completions ?? []).map(c => c.habit_id));
    const missedCount = activeIds.filter(id => !completedSet.has(id)).length;

    for (let i = 0; i < missedCount * TILES_PER_HABIT; i++) {
      if (tiles.length === 0) break;
      tiles = removeRandomTiles(tiles, 1);
    }

    current.setDate(current.getDate() + 1);
  }

  // Persist updated tiles + new deduction date
  const { error: updateErr } = await supabase
    .from('user_puzzle')
    .update({ revealed_tiles: tiles, last_deduction_date: today, updated_at: new Date().toISOString() })
    .eq('id', puzzle.id);
  if (updateErr) throw updateErr;

  return tiles;
}

export { TILES_PER_HABIT };
