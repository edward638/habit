-- Art Coach tables

-- Projects (multi-session)
create table art_coach_projects (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  total_sessions int not null default 1,
  completed_sessions int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table art_coach_projects enable row level security;

create policy "Users can manage their own projects"
  on art_coach_projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_art_coach_projects_user on art_coach_projects(user_id);

-- Tasks (daily assignments)
create table art_coach_tasks (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id bigint references art_coach_projects(id) on delete set null,
  date date not null,
  title text not null,
  description text not null,
  medium text not null,
  focus_area text not null,
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal', 'challenge')),
  reference_source text,
  duration_minutes int not null default 30,
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  is_replacement boolean not null default false,
  created_at timestamptz default now()
);

alter table art_coach_tasks enable row level security;

create policy "Users can manage their own tasks"
  on art_coach_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_art_coach_tasks_user_date on art_coach_tasks(user_id, date);

-- Sessions (practice log entries)
create table art_coach_sessions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id bigint references art_coach_tasks(id) on delete cascade not null,
  duration_minutes int not null default 0,
  satisfaction_rating int check (satisfaction_rating between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

alter table art_coach_sessions enable row level security;

create policy "Users can manage their own sessions"
  on art_coach_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_art_coach_sessions_user on art_coach_sessions(user_id);
create index idx_art_coach_sessions_task on art_coach_sessions(task_id);
