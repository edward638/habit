create table if not exists amex_balance (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  points integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table amex_balance enable row level security;

drop policy if exists "Users manage own amex balance" on amex_balance;
create policy "Users manage own amex balance" on amex_balance for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists amex_balance_user_id_idx on amex_balance(user_id);
