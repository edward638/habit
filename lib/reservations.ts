import { SupabaseClient } from '@supabase/supabase-js';
import { TrackedRestaurant, ReservationLogEntry } from './types';

export async function fetchTrackedRestaurants(
  supabase: SupabaseClient,
  userId: string
): Promise<TrackedRestaurant[]> {
  const { data, error } = await supabase
    .from('tracked_restaurants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addTrackedRestaurant(
  supabase: SupabaseClient,
  userId: string,
  restaurant: {
    name: string;
    cuisine?: string;
    release_day?: string;
    release_time?: string;
    target_dates?: string[];
    preferred_times?: string[];
    party_size?: number;
    notes?: string;
  }
): Promise<TrackedRestaurant> {
  const { data, error } = await supabase
    .from('tracked_restaurants')
    .insert({
      user_id: userId,
      name: restaurant.name,
      cuisine: restaurant.cuisine ?? null,
      release_day: restaurant.release_day ?? null,
      release_time: restaurant.release_time ?? null,
      target_dates: restaurant.target_dates ?? null,
      preferred_times: restaurant.preferred_times ?? ['5:30 PM', '7:30 PM'],
      party_size: restaurant.party_size ?? 2,
      notes: restaurant.notes ?? null,
      resy_notify_enabled: false,
      status: 'watching',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrackedRestaurant(
  supabase: SupabaseClient,
  restaurantId: number,
  updates: Partial<Omit<TrackedRestaurant, 'id' | 'user_id' | 'created_at'>>
): Promise<TrackedRestaurant> {
  const { data, error } = await supabase
    .from('tracked_restaurants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', restaurantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrackedRestaurant(
  supabase: SupabaseClient,
  restaurantId: number
): Promise<void> {
  const { error } = await supabase
    .from('tracked_restaurants')
    .delete()
    .eq('id', restaurantId);

  if (error) throw error;
}

export async function fetchReservationLog(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<ReservationLogEntry[]> {
  const { data, error } = await supabase
    .from('reservation_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function addLogEntry(
  supabase: SupabaseClient,
  userId: string,
  entry: {
    restaurant_id: number;
    event_type: 'spotted' | 'booked' | 'missed' | 'checked';
    target_date?: string;
    time_slot?: string;
    notes?: string;
  }
): Promise<ReservationLogEntry> {
  const { data, error } = await supabase
    .from('reservation_log')
    .insert({
      user_id: userId,
      restaurant_id: entry.restaurant_id,
      event_type: entry.event_type,
      target_date: entry.target_date ?? null,
      time_slot: entry.time_slot ?? null,
      notes: entry.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// NYC Hard-to-book restaurant suggestions with known release info
export const NYC_RESTAURANT_SUGGESTIONS = [
  {
    name: 'Carbone',
    cuisine: 'Italian',
    release_day: '30 days out',
    release_time: 'Midnight ET',
    notes: 'Extremely competitive. Set alarm for 11:59 PM.',
  },
  {
    name: 'Don Angie',
    cuisine: 'Italian',
    release_day: '30 days out',
    release_time: 'Midnight ET',
    notes: 'Same group as Carbone. Very hard to get.',
  },
  {
    name: '4 Charles Prime Rib',
    cuisine: 'Steakhouse',
    release_day: '14 days out',
    release_time: '10:00 AM ET',
    notes: 'Cozy Greenwich Village spot. Thursday releases.',
  },
  {
    name: 'Tatiana',
    cuisine: 'Russian-American',
    release_day: '14 days out',
    release_time: '12:00 PM ET',
    notes: 'At Lincoln Center. Trendy and scenic.',
  },
  {
    name: 'Torrisi',
    cuisine: 'Italian',
    release_day: '30 days out',
    release_time: 'Midnight ET',
    notes: 'Major Food Group restaurant. Tasting menu.',
  },
  {
    name: 'Le Bernardin',
    cuisine: 'French Seafood',
    release_day: '30 days out',
    release_time: '9:00 AM ET',
    notes: 'Michelin 3-star. Slightly easier than Carbone.',
  },
  {
    name: 'Atomix',
    cuisine: 'Korean Tasting',
    release_day: '28 days out',
    release_time: '12:00 PM ET',
    notes: 'Michelin 2-star. Korean fine dining.',
  },
  {
    name: 'Double Chicken Please',
    cuisine: 'Cocktail Bar',
    release_day: 'Walk-in preferred',
    release_time: 'N/A',
    notes: 'Limited Resy - mostly walk-in. LES speakeasy.',
  },
];
