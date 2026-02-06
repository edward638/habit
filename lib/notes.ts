import { SupabaseClient } from '@supabase/supabase-js';
import { Note } from './types';

export async function fetchNotes(
  supabase: SupabaseClient,
  userId: string
): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addNote(
  supabase: SupabaseClient,
  userId: string,
  title: string
): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: userId, title, content: '' })
    .select('id, title, content, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateNote(
  supabase: SupabaseClient,
  noteId: number,
  updates: { title?: string; content?: string }
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId);

  if (error) throw error;
}

export async function deleteNote(
  supabase: SupabaseClient,
  noteId: number
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}
