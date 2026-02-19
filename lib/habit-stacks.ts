import { SupabaseClient } from '@supabase/supabase-js';
import { HabitStack, HabitStackStep } from './types';
import { computeStreaks, toDateString } from './habits';

export async function fetchStacksForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<HabitStack[]> {
  // Fetch stacks
  const { data: stacks, error: sErr } = await supabase
    .from('habit_stacks')
    .select('id, name, time_label, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (sErr) throw sErr;
  if (!stacks || stacks.length === 0) return [];

  // Fetch all steps for user's stacks
  const { data: steps, error: stErr } = await supabase
    .from('habit_stack_steps')
    .select('id, stack_id, label, linked_habit_id, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (stErr) throw stErr;

  // Fetch step completions for the selected date
  const { data: dateCompletions, error: dcErr } = await supabase
    .from('habit_stack_step_completions')
    .select('step_id, completed_at')
    .eq('user_id', userId)
    .eq('date', date);
  if (dcErr) throw dcErr;

  // Fetch ALL step completions for streak calculation
  const { data: allCompletions, error: acErr } = await supabase
    .from('habit_stack_step_completions')
    .select('stack_id, date')
    .eq('user_id', userId);
  if (acErr) throw acErr;

  const dateCompletionMap = new Map(
    (dateCompletions ?? []).map(c => [c.step_id, c.completed_at])
  );

  // Group steps by stack
  const stepsByStack = new Map<number, HabitStackStep[]>();
  for (const step of steps ?? []) {
    const stackSteps = stepsByStack.get(step.stack_id) ?? [];
    stackSteps.push({
      id: step.id,
      stack_id: step.stack_id,
      label: step.label,
      linked_habit_id: step.linked_habit_id,
      sort_order: step.sort_order,
      completed: dateCompletionMap.has(step.id),
      completedAt: dateCompletionMap.get(step.id) ?? null,
    });
    stepsByStack.set(step.stack_id, stackSteps);
  }

  // Count steps per stack and completions per (stack, date) for streaks
  const stepCountByStack = new Map<number, number>();
  for (const [stackId, stackSteps] of stepsByStack) {
    stepCountByStack.set(stackId, stackSteps.length);
  }

  // Group all completions by (stack_id, date) and count
  const completionCountByStackDate = new Map<string, number>();
  for (const c of allCompletions ?? []) {
    const key = `${c.stack_id}:${c.date}`;
    completionCountByStackDate.set(key, (completionCountByStackDate.get(key) ?? 0) + 1);
  }

  const today = toDateString(new Date());

  return stacks.map(stack => {
    const stackSteps = stepsByStack.get(stack.id) ?? [];
    const stepCount = stackSteps.length;
    const allCompleted = stepCount > 0 && stackSteps.every(s => s.completed);

    // Compute streak: find dates where all steps were completed
    const fullyCompletedDates: string[] = [];
    if (stepCount > 0) {
      const seenDates = new Set<string>();
      for (const c of allCompletions ?? []) {
        if (c.stack_id === stack.id) {
          seenDates.add(c.date);
        }
      }
      for (const d of seenDates) {
        const key = `${stack.id}:${d}`;
        if ((completionCountByStackDate.get(key) ?? 0) >= stepCount) {
          fullyCompletedDates.push(d);
        }
      }
    }

    const streaks = computeStreaks(fullyCompletedDates, today);

    return {
      id: stack.id,
      name: stack.name,
      time_label: stack.time_label,
      created_at: stack.created_at,
      steps: stackSteps,
      allCompleted,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
    };
  });
}

export async function addStack(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  timeLabel?: string
): Promise<{ id: number; name: string; time_label: string | null; created_at: string }> {
  const { data, error } = await supabase
    .from('habit_stacks')
    .insert({
      user_id: userId,
      name,
      time_label: timeLabel ?? null,
    })
    .select('id, name, time_label, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updateStack(
  supabase: SupabaseClient,
  stackId: number,
  updates: { name?: string; time_label?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('habit_stacks')
    .update(updates)
    .eq('id', stackId);
  if (error) throw error;
}

export async function deleteStack(
  supabase: SupabaseClient,
  stackId: number
): Promise<void> {
  const { error } = await supabase
    .from('habit_stacks')
    .delete()
    .eq('id', stackId);
  if (error) throw error;
}

export async function addStep(
  supabase: SupabaseClient,
  userId: string,
  stackId: number,
  label: string,
  linkedHabitId?: number,
  sortOrder?: number
): Promise<HabitStackStep> {
  // If no sort order provided, get the max and add 10
  let order = sortOrder;
  if (order === undefined) {
    const { data: existing } = await supabase
      .from('habit_stack_steps')
      .select('sort_order')
      .eq('stack_id', stackId)
      .order('sort_order', { ascending: false })
      .limit(1);
    order = existing && existing.length > 0 ? existing[0].sort_order + 10 : 0;
  }

  const { data, error } = await supabase
    .from('habit_stack_steps')
    .insert({
      stack_id: stackId,
      user_id: userId,
      label,
      linked_habit_id: linkedHabitId ?? null,
      sort_order: order,
    })
    .select('id, stack_id, label, linked_habit_id, sort_order')
    .single();
  if (error) throw error;

  return {
    ...data,
    completed: false,
    completedAt: null,
  };
}

export async function deleteStep(
  supabase: SupabaseClient,
  stepId: number
): Promise<void> {
  const { error } = await supabase
    .from('habit_stack_steps')
    .delete()
    .eq('id', stepId);
  if (error) throw error;
}

export async function toggleStepCompletion(
  supabase: SupabaseClient,
  userId: string,
  stepId: number,
  stackId: number,
  date: string,
  currentlyCompleted: boolean
): Promise<string | null> {
  if (currentlyCompleted) {
    const { error } = await supabase
      .from('habit_stack_step_completions')
      .delete()
      .eq('step_id', stepId)
      .eq('date', date);
    if (error) throw error;
    return null;
  } else {
    const { data, error } = await supabase
      .from('habit_stack_step_completions')
      .upsert(
        { step_id: stepId, stack_id: stackId, user_id: userId, date },
        { onConflict: 'step_id,date' }
      )
      .select('completed_at')
      .single();
    if (error) throw error;
    return data.completed_at;
  }
}
