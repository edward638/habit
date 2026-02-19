import { SupabaseClient } from '@supabase/supabase-js';
import { Quote } from './types';

export const PRESET_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
];

export async function fetchQuotes(
  supabase: SupabaseClient,
  userId: string
): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('id, text, author, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchRandomQuote(
  supabase: SupabaseClient,
  userId: string
): Promise<Quote | null> {
  const { data, error } = await supabase
    .from('quotes')
    .select('id, text, author, created_at')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)];
}

export async function addQuote(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  author: string
): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .insert({ user_id: userId, text, author })
    .select('id, text, author, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuote(
  supabase: SupabaseClient,
  quoteId: number,
  updates: { text?: string; author?: string }
): Promise<void> {
  const { error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', quoteId);

  if (error) throw error;
}

export async function deleteQuote(
  supabase: SupabaseClient,
  quoteId: number
): Promise<void> {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId);

  if (error) throw error;
}

export async function seedQuotesIfEmpty(
  supabase: SupabaseClient,
  userId: string
): Promise<Quote[]> {
  const { count, error: countError } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) throw countError;

  if (count === 0) {
    const rows = PRESET_QUOTES.map(q => ({
      user_id: userId,
      text: q.text,
      author: q.author,
    }));
    const { data, error } = await supabase
      .from('quotes')
      .insert(rows)
      .select('id, text, author, created_at');

    if (error) throw error;
    return data ?? [];
  }

  return [];
}
