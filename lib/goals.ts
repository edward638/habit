import { SupabaseClient } from '@supabase/supabase-js';
import { Goal } from './types';

export async function fetchGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, target, current, unit, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addGoal(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  target: number,
  unit: string
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: userId, title, target, current: 0, unit })
    .select('id, title, target, current, unit, created_at, completed_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateGoalProgress(
  supabase: SupabaseClient,
  goalId: number,
  newCurrent: number,
  target: number
): Promise<void> {
  const updates: { current: number; completed_at?: string | null } = {
    current: newCurrent,
  };

  // Mark as completed if target reached
  if (newCurrent >= target) {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }

  const { error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId);

  if (error) throw error;
}

export async function deleteGoal(
  supabase: SupabaseClient,
  goalId: number
): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);

  if (error) throw error;
}

export async function updateGoal(
  supabase: SupabaseClient,
  goalId: number,
  updates: { title?: string; target?: number; unit?: string }
): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId);

  if (error) throw error;
}
