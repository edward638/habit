-- Piggy bank: tracks user's accumulated balance from habit completions
create table if not exists piggy_bank (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  balance_cents integer not null default 0,  -- stored in cents to avoid float issues
  last_deduction_date date,                  -- date when last deduction was applied
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table piggy_bank enable row level security;

drop policy if exists "Users manage own piggy bank" on piggy_bank;
create policy "Users manage own piggy bank" on piggy_bank for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
