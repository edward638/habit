import type { SupabaseClient } from '@supabase/supabase-js';
import type { PiggyBank, PiggyBankTransaction } from './types';

export const DOLLARS_PER_HABIT = 5;
const CENTS_PER_HABIT = DOLLARS_PER_HABIT * 100;

export async function fetchOrCreatePiggyBank(
  supabase: SupabaseClient,
  userId: string
): Promise<PiggyBank> {
  const { data, error } = await supabase
    .from('piggy_bank')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    const { data: created, error: createError } = await supabase
      .from('piggy_bank')
      .insert({ user_id: userId, balance_cents: 0 })
      .select('*')
      .single();
    if (createError) throw createError;
    return created as PiggyBank;
  }
  if (error) throw error;
  return data as PiggyBank;
}

async function logTransaction(
  supabase: SupabaseClient,
  userId: string,
  amountCents: number,
  type: PiggyBankTransaction['type'],
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from('piggy_bank_transactions')
    .insert({ user_id: userId, amount_cents: amountCents, type, note: note ?? null });
  if (error) throw error;
}

export async function addHabitEarning(
  supabase: SupabaseClient,
  userId: string,
  habitName?: string
): Promise<number> {
  const bank = await fetchOrCreatePiggyBank(supabase, userId);
  const newBalance = bank.balance_cents + CENTS_PER_HABIT;
  const { error } = await supabase
    .from('piggy_bank')
    .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
  await logTransaction(supabase, userId, CENTS_PER_HABIT, 'habit_complete', habitName);
  return newBalance;
}

export async function removeHabitEarning(
  supabase: SupabaseClient,
  userId: string,
  habitName?: string
): Promise<number> {
  const bank = await fetchOrCreatePiggyBank(supabase, userId);
  const newBalance = bank.balance_cents - CENTS_PER_HABIT;
  const { error } = await supabase
    .from('piggy_bank')
    .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
  await logTransaction(supabase, userId, -CENTS_PER_HABIT, 'habit_missed', habitName);
  return newBalance;
}

export async function withdraw(
  supabase: SupabaseClient,
  userId: string,
  amountCents: number,
  description: string
): Promise<number> {
  const bank = await fetchOrCreatePiggyBank(supabase, userId);
  const newBalance = bank.balance_cents - amountCents;
  const { error } = await supabase
    .from('piggy_bank')
    .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
  await logTransaction(supabase, userId, -amountCents, 'withdrawal', description);
  return newBalance;
}

export async function fetchTransactions(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<PiggyBankTransaction[]> {
  const { data, error } = await supabase
    .from('piggy_bank_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PiggyBankTransaction[];
}

export interface PiggyBankStats {
  totalEarnedCents: number;
  totalDeductedCents: number;
  totalWithdrawnCents: number;
  habitsCompleted: number;
  habitsMissed: number;
}

export async function fetchStats(
  supabase: SupabaseClient,
  userId: string
): Promise<PiggyBankStats> {
  const { data, error } = await supabase
    .from('piggy_bank_transactions')
    .select('amount_cents, type')
    .eq('user_id', userId);
  if (error) throw error;

  const rows = (data ?? []) as { amount_cents: number; type: string }[];
  return {
    totalEarnedCents: rows.filter(r => r.type === 'habit_complete').reduce((s, r) => s + r.amount_cents, 0),
    totalDeductedCents: rows.filter(r => r.type === 'habit_missed' || r.type === 'deduction').reduce((s, r) => s + Math.abs(r.amount_cents), 0),
    totalWithdrawnCents: rows.filter(r => r.type === 'withdrawal').reduce((s, r) => s + Math.abs(r.amount_cents), 0),
    habitsCompleted: rows.filter(r => r.type === 'habit_complete').length,
    habitsMissed: rows.filter(r => r.type === 'habit_missed' || r.type === 'deduction').length,
  };
}

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

export function getTodayDateString(): string {
  return localDateString(new Date());
}

export function needsDeduction(bank: PiggyBank): boolean {
  const yesterday = getYesterdayDateString();
  return bank.last_deduction_date !== yesterday;
}

export async function getYesterdayMissedHabits(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: number; name: string }[]> {
  const yesterday = getYesterdayDateString();
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_paused', false);
  if (habitsError) throw habitsError;
  if (!habits || habits.length === 0) return [];

  const habitIds = habits.map((h: { id: number }) => h.id);
  const { data: completions, error: compError } = await supabase
    .from('habit_completions')
    .select('habit_id')
    .in('habit_id', habitIds)
    .eq('completed_date', yesterday);
  if (compError) throw compError;

  const completedIds = new Set((completions ?? []).map((c: { habit_id: number }) => c.habit_id));
  return (habits as { id: number; name: string }[]).filter(h => !completedIds.has(h.id));
}

export async function applyMissedDeductions(
  supabase: SupabaseClient,
  userId: string,
  missedHabits: { id: number; name: string }[]
): Promise<number> {
  const bank = await fetchOrCreatePiggyBank(supabase, userId);
  const yesterday = getYesterdayDateString();
  const deduction = missedHabits.length * CENTS_PER_HABIT;
  const newBalance = bank.balance_cents - deduction;

  const { error } = await supabase
    .from('piggy_bank')
    .update({
      balance_cents: newBalance,
      last_deduction_date: yesterday,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;

  // Log one transaction per missed habit
  for (const h of missedHabits) {
    await logTransaction(supabase, userId, -CENTS_PER_HABIT, 'habit_missed', h.name);
  }

  return newBalance;
}

export async function markDeductionDone(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const yesterday = getYesterdayDateString();
  const { error } = await supabase
    .from('piggy_bank')
    .update({ last_deduction_date: yesterday, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

export function formatBalance(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainingCents = abs % 100;
  const formatted = remainingCents === 0
    ? `$${dollars}`
    : `$${dollars}.${String(remainingCents).padStart(2, '0')}`;
  return cents < 0 ? `-${formatted}` : formatted;
}
