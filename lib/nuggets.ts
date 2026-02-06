import { SupabaseClient } from '@supabase/supabase-js';
import { NuggetCount, NuggetChangelogEntry } from './types';

export async function fetchNuggetCount(
  supabase: SupabaseClient
): Promise<NuggetCount> {
  const { data, error } = await supabase
    .from('nugget_count')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchNuggetChangelog(
  supabase: SupabaseClient,
  limit = 50
): Promise<NuggetChangelogEntry[]> {
  const { data, error } = await supabase
    .from('nugget_changelog')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function checkIsEditor(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('nugget_editors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

export async function updateNuggetCount(
  supabase: SupabaseClient,
  changeAmount: number,
  note: string | null,
  userEmail: string | null
): Promise<NuggetCount> {
  // Get current count
  const current = await fetchNuggetCount(supabase);
  const newCount = current.count + changeAmount;

  // Update the count
  const { error: updateError } = await supabase
    .from('nugget_count')
    .update({ count: newCount, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (updateError) throw updateError;

  // Insert changelog entry
  const { error: logError } = await supabase
    .from('nugget_changelog')
    .insert({
      previous_count: current.count,
      new_count: newCount,
      change_amount: changeAmount,
      note: note?.trim() || null,
      changed_by_email: userEmail,
    });

  if (logError) throw logError;

  return { ...current, count: newCount, updated_at: new Date().toISOString() };
}
