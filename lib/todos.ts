import { SupabaseClient } from '@supabase/supabase-js';
import { Todo } from './types';

export async function fetchTodos(
  supabase: SupabaseClient,
  userId: string
): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('id, title, completed, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addTodo(
  supabase: SupabaseClient,
  userId: string,
  title: string
): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .insert({ user_id: userId, title })
    .select('id, title, completed, created_at, completed_at')
    .single();

  if (error) throw error;
  return data;
}

export async function toggleTodo(
  supabase: SupabaseClient,
  todoId: number,
  currentlyCompleted: boolean
): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({
      completed: !currentlyCompleted,
      completed_at: currentlyCompleted ? null : new Date().toISOString(),
    })
    .eq('id', todoId);

  if (error) throw error;
}

export async function deleteTodo(
  supabase: SupabaseClient,
  todoId: number
): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId);

  if (error) throw error;
}

export async function updateTodo(
  supabase: SupabaseClient,
  todoId: number,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({ title })
    .eq('id', todoId);

  if (error) throw error;
}
