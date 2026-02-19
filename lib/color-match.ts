import { SupabaseClient } from '@supabase/supabase-js';
import { ColorMatchScore } from './types';

export async function fetchColorMatchScores(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50
): Promise<ColorMatchScore[]> {
  const { data, error } = await supabase
    .from('color_match_scores')
    .select('id, target_color, input_color, score, delta_e, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function addColorMatchScore(
  supabase: SupabaseClient,
  userId: string,
  targetColor: string,
  inputColor: string,
  score: number,
  deltaE: number
): Promise<ColorMatchScore> {
  const { data, error } = await supabase
    .from('color_match_scores')
    .insert({
      user_id: userId,
      target_color: targetColor,
      input_color: inputColor,
      score,
      delta_e: deltaE,
    })
    .select('id, target_color, input_color, score, delta_e, created_at')
    .single();

  if (error) throw error;
  return data;
}

export function computeColorMatchStats(scores: ColorMatchScore[]) {
  if (scores.length === 0) return { averageScore: 0, bestScore: 0, totalAttempts: 0 };
  const avg = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
  const best = Math.max(...scores.map(s => s.score));
  return { averageScore: avg, bestScore: best, totalAttempts: scores.length };
}
