import { SupabaseClient } from '@supabase/supabase-js';
import { HabitWithStatus } from './types';

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return toDateString(date) === toDateString(now);
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateString(date) === toDateString(yesterday);
}

export function computeStreaks(
  completionDates: string[],
  today: string
): { current: number; longest: number } {
  if (completionDates.length === 0) return { current: 0, longest: 0 };

  const dateSet = new Set(completionDates);

  // Current streak: start from today, or yesterday if today not yet completed
  // (the user hasn't missed today yet — they just haven't done it yet)
  const todayDate = new Date(today + 'T00:00:00');
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateString(yesterdayDate);

  let current = 0;
  let startDate: Date | null = null;
  if (dateSet.has(today)) {
    startDate = todayDate;
  } else if (dateSet.has(yesterday)) {
    startDate = yesterdayDate;
  }
  if (startDate) {
    const d = new Date(startDate);
    while (dateSet.has(toDateString(d))) {
      current++;
      d.setDate(d.getDate() - 1);
    }
  }

  // Longest streak: sort all dates, walk through counting consecutive days
  const sorted = [...completionDates].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / 86_400_000
    );
    if (diffDays === 1) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  return { current, longest };
}

export async function fetchHabitsForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<HabitWithStatus[]> {
  const { data: habits, error: hErr } = await supabase
    .from('habits')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (hErr) throw hErr;

  const { data: completions, error: cErr } = await supabase
    .from('completions')
    .select('habit_id, completed_at')
    .eq('user_id', userId)
    .eq('date', date);

  if (cErr) throw cErr;

  // Fetch all completion dates for streak calculation
  const { data: allCompletions, error: acErr } = await supabase
    .from('completions')
    .select('habit_id, date')
    .eq('user_id', userId);
  if (acErr) throw acErr;

  const completionMap = new Map(
    (completions ?? []).map(c => [c.habit_id, c.completed_at])
  );

  // Group all completion dates by habit
  const completionsByHabit = new Map<number, string[]>();
  for (const c of allCompletions ?? []) {
    const arr = completionsByHabit.get(c.habit_id) ?? [];
    arr.push(c.date);
    completionsByHabit.set(c.habit_id, arr);
  }

  const today = toDateString(new Date());

  return (habits ?? []).map(h => {
    const streaks = computeStreaks(completionsByHabit.get(h.id) ?? [], today);
    return {
      id: h.id,
      name: h.name,
      created_at: h.created_at,
      completed: completionMap.has(h.id),
      completedAt: completionMap.get(h.id) ?? null,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
    };
  });
}

export async function addHabit(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<number> {
  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteHabit(
  supabase: SupabaseClient,
  habitId: number
): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId);
  if (error) throw error;
}

export async function updateHabit(
  supabase: SupabaseClient,
  habitId: number,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ name })
    .eq('id', habitId);
  if (error) throw error;
}

export async function toggleCompletion(
  supabase: SupabaseClient,
  userId: string,
  habitId: number,
  date: string,
  currentlyCompleted: boolean
): Promise<string | null> {
  if (currentlyCompleted) {
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('date', date);
    if (error) throw error;
    return null;
  } else {
    const { data, error } = await supabase
      .from('completions')
      .upsert(
        { habit_id: habitId, user_id: userId, date },
        { onConflict: 'habit_id,date' }
      )
      .select('completed_at')
      .single();
    if (error) throw error;
    return data.completed_at;
  }
}
