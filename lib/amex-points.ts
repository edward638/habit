import { SupabaseClient } from '@supabase/supabase-js';
import { AmexBalance } from './types';

export async function getBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<AmexBalance | null> {
  const { data, error } = await supabase
    .from('amex_balance')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }
  return data;
}

export async function upsertBalance(
  supabase: SupabaseClient,
  userId: string,
  points: number
): Promise<AmexBalance> {
  const { data, error } = await supabase
    .from('amex_balance')
    .upsert(
      { user_id: userId, points, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
