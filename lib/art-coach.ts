import { SupabaseClient } from '@supabase/supabase-js';
import { ArtCoachTask, ArtCoachProject } from './types';

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns false for Monday (1) and Tuesday (2) */
export function isPracticeDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 1 && day !== 2;
}

/** Like computeStreaks but skips Mon/Tue when checking consecutive days */
export function computeArtStreaks(
  completionDates: string[],
  today: string
): { current: number; longest: number } {
  if (completionDates.length === 0) return { current: 0, longest: 0 };

  const dateSet = new Set(completionDates);

  // Find the previous practice day (skip Mon/Tue)
  function prevPracticeDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    do {
      d.setDate(d.getDate() - 1);
    } while (!isPracticeDay(d));
    return toDateString(d);
  }

  // Current streak: start from today or previous practice day
  let current = 0;
  let cursor = today;

  // If today is not a practice day, start from the last practice day
  const todayDate = new Date(today + 'T00:00:00');
  if (!isPracticeDay(todayDate)) {
    cursor = prevPracticeDay(today);
  }

  // If cursor day not completed, try previous practice day (haven't missed yet today)
  if (!dateSet.has(cursor)) {
    cursor = prevPracticeDay(cursor);
  }

  while (dateSet.has(cursor)) {
    current++;
    cursor = prevPracticeDay(cursor);
  }

  // Longest streak: sort dates and walk through, skipping non-practice gaps
  const sorted = [...completionDates].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    // Check if sorted[i] is the next practice day after sorted[i-1]
    const expected = sorted[i - 1];
    let next = expected;
    // Walk forward to next practice day
    const d = new Date(expected + 'T00:00:00');
    do {
      d.setDate(d.getDate() + 1);
    } while (!isPracticeDay(d));
    next = toDateString(d);

    if (sorted[i] === next) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  return { current, longest };
}

export async function fetchTaskForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<ArtCoachTask | null> {
  // Get the most recent task for this date (replacement takes priority)
  const { data, error } = await supabase
    .from('art_coach_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('is_replacement', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const task = data[0];
  // Fetch project if linked
  let project: ArtCoachProject | null = null;
  if (task.project_id) {
    const { data: proj } = await supabase
      .from('art_coach_projects')
      .select('*')
      .eq('id', task.project_id)
      .single();
    project = proj;
  }

  return {
    id: task.id,
    project_id: task.project_id,
    date: task.date,
    title: task.title,
    description: task.description,
    medium: task.medium,
    focus_area: task.focus_area,
    difficulty: task.difficulty,
    reference_source: task.reference_source,
    duration_minutes: task.duration_minutes,
    completed: task.completed,
    completed_at: task.completed_at,
    notes: task.notes,
    is_replacement: task.is_replacement,
    created_at: task.created_at,
    project,
  };
}

export async function fetchRecentTasks(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 10
): Promise<ArtCoachTask[]> {
  const { data, error } = await supabase
    .from('art_coach_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<ArtCoachProject[]> {
  const { data, error } = await supabase
    .from('art_coach_projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveGeneratedTask(
  supabase: SupabaseClient,
  userId: string,
  task: {
    date: string;
    title: string;
    description: string;
    medium: string;
    focus_area: string;
    difficulty: 'easy' | 'normal' | 'challenge';
    reference_source?: string | null;
    duration_minutes: number;
    is_replacement: boolean;
    project_id?: number | null;
  }
): Promise<ArtCoachTask> {
  const { data, error } = await supabase
    .from('art_coach_tasks')
    .insert({
      user_id: userId,
      project_id: task.project_id ?? null,
      date: task.date,
      title: task.title,
      description: task.description,
      medium: task.medium,
      focus_area: task.focus_area,
      difficulty: task.difficulty,
      reference_source: task.reference_source ?? null,
      duration_minutes: task.duration_minutes,
      is_replacement: task.is_replacement,
    })
    .select('*')
    .single();
  if (error) throw error;
  return {
    ...data,
    project: null,
  };
}

export async function completeTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: number,
  notes?: string | null,
  satisfactionRating?: number | null
): Promise<void> {
  const { data: task, error: tErr } = await supabase
    .from('art_coach_tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', taskId)
    .select('project_id')
    .single();
  if (tErr) throw tErr;

  // Log session
  const { error: sErr } = await supabase
    .from('art_coach_sessions')
    .insert({
      user_id: userId,
      task_id: taskId,
      duration_minutes: 0,
      satisfaction_rating: satisfactionRating ?? null,
      notes: notes ?? null,
    });
  if (sErr) throw sErr;

  // Update project progress if linked
  if (task.project_id) {
    const { data: project } = await supabase
      .from('art_coach_projects')
      .select('completed_sessions, total_sessions')
      .eq('id', task.project_id)
      .single();

    if (project) {
      const newCompleted = project.completed_sessions + 1;
      const newStatus = newCompleted >= project.total_sessions ? 'completed' : 'active';
      await supabase
        .from('art_coach_projects')
        .update({
          completed_sessions: newCompleted,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.project_id);
    }
  }
}

export async function uncompleteTask(
  supabase: SupabaseClient,
  taskId: number
): Promise<void> {
  const { error } = await supabase
    .from('art_coach_tasks')
    .update({
      completed: false,
      completed_at: null,
    })
    .eq('id', taskId);
  if (error) throw error;

  // Remove the session log
  await supabase
    .from('art_coach_sessions')
    .delete()
    .eq('task_id', taskId);
}

export async function fetchArtStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{ currentStreak: number; longestStreak: number; totalCompleted: number }> {
  const { data, error } = await supabase
    .from('art_coach_tasks')
    .select('date')
    .eq('user_id', userId)
    .eq('completed', true);
  if (error) throw error;

  const completedDates = [...new Set((data ?? []).map(t => t.date))];
  const today = toDateString(new Date());
  const streaks = computeArtStreaks(completedDates, today);

  return {
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    totalCompleted: completedDates.length,
  };
}

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  description: string,
  totalSessions: number
): Promise<ArtCoachProject> {
  const { data, error } = await supabase
    .from('art_coach_projects')
    .insert({
      user_id: userId,
      title,
      description,
      total_sessions: totalSessions,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
