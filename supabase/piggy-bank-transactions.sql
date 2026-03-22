create table if not exists piggy_bank_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount_cents integer not null,       -- positive = earn, negative = deduct/withdraw
  type text not null,                  -- 'habit_complete' | 'habit_missed' | 'withdrawal' | 'deduction'
  note text,                           -- habit name or purchase description
  created_at timestamptz default now()
);

alter table piggy_bank_transactions enable row level security;

drop policy if exists "Users manage own transactions" on piggy_bank_transactions;
create policy "Users manage own transactions" on piggy_bank_transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists piggy_bank_transactions_user_id_idx on piggy_bank_transactions(user_id, created_at desc);
