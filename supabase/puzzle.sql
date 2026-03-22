-- Feature: Pause habits
alter table habits add column if not exists is_paused boolean not null default false;

-- Feature: Artwork puzzle
create table if not exists user_puzzle (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  painting_id   text        not null,
  revealed_tiles integer[]  not null default '{}',
  -- tracks the last date deductions were applied (so missed days are caught on next open)
  last_deduction_date date,
  status        text        not null default 'active', -- 'active' | 'completed' | 'guessed'
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id)  -- one active puzzle per user
);

alter table user_puzzle enable row level security;

create policy "Users manage own puzzle"
  on user_puzzle for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
