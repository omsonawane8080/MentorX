create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text not null,
  target_role text not null default 'AI/ML + GenAI Engineer with DSA backup',
  daily_hours numeric(4, 1) not null default 6,
  timeline_months int not null default 4,
  mentor_language text not null default 'hinglish',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_number int not null,
  week_number int not null,
  title text not null,
  skill_area text not null,
  description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null,
  title text not null,
  topic text not null,
  skill_area text not null,
  estimated_minutes int not null default 60,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  source text not null default 'system' check (source in ('system', 'mentor', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  study_minutes int not null default 0,
  notes text,
  blockers text,
  completion_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  questions jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  selected_answers jsonb not null,
  wrong_topics jsonb not null default '[]'::jsonb,
  score int not null default 0,
  total int not null default 0,
  explanations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  feedback text not null,
  weak_areas jsonb not null default '[]'::jsonb,
  next_day_suggestions jsonb not null default '[]'::jsonb,
  readiness_score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentor_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_type text not null,
  description text not null,
  milestones jsonb not null default '[]'::jsonb,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  github_url text,
  deploy_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
drop trigger if exists set_roadmap_items_updated_at on public.roadmap_items;
drop trigger if exists set_daily_tasks_updated_at on public.daily_tasks;
drop trigger if exists set_daily_logs_updated_at on public.daily_logs;
drop trigger if exists set_quizzes_updated_at on public.quizzes;
drop trigger if exists set_mentor_reviews_updated_at on public.mentor_reviews;
drop trigger if exists set_projects_updated_at on public.projects;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_roadmap_items_updated_at
before update on public.roadmap_items
for each row execute function public.set_updated_at();

create trigger set_daily_tasks_updated_at
before update on public.daily_tasks
for each row execute function public.set_updated_at();

create trigger set_daily_logs_updated_at
before update on public.daily_logs
for each row execute function public.set_updated_at();

create trigger set_quizzes_updated_at
before update on public.quizzes
for each row execute function public.set_updated_at();

create trigger set_mentor_reviews_updated_at
before update on public.mentor_reviews
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.roadmap_items enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.mentor_reviews enable row level security;
alter table public.mentor_questions enable row level security;
alter table public.projects enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "roadmap_items_select_own" on public.roadmap_items;
drop policy if exists "roadmap_items_insert_own" on public.roadmap_items;
drop policy if exists "roadmap_items_update_own" on public.roadmap_items;
drop policy if exists "roadmap_items_delete_own" on public.roadmap_items;
drop policy if exists "daily_tasks_select_own" on public.daily_tasks;
drop policy if exists "daily_tasks_insert_own" on public.daily_tasks;
drop policy if exists "daily_tasks_update_own" on public.daily_tasks;
drop policy if exists "daily_tasks_delete_own" on public.daily_tasks;
drop policy if exists "daily_logs_select_own" on public.daily_logs;
drop policy if exists "daily_logs_insert_own" on public.daily_logs;
drop policy if exists "daily_logs_update_own" on public.daily_logs;
drop policy if exists "daily_logs_delete_own" on public.daily_logs;
drop policy if exists "quizzes_select_own" on public.quizzes;
drop policy if exists "quizzes_insert_own" on public.quizzes;
drop policy if exists "quizzes_update_own" on public.quizzes;
drop policy if exists "quizzes_delete_own" on public.quizzes;
drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_update_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_delete_own" on public.quiz_attempts;
drop policy if exists "mentor_reviews_select_own" on public.mentor_reviews;
drop policy if exists "mentor_reviews_insert_own" on public.mentor_reviews;
drop policy if exists "mentor_reviews_update_own" on public.mentor_reviews;
drop policy if exists "mentor_reviews_delete_own" on public.mentor_reviews;
drop policy if exists "mentor_questions_select_own" on public.mentor_questions;
drop policy if exists "mentor_questions_insert_own" on public.mentor_questions;
drop policy if exists "mentor_questions_update_own" on public.mentor_questions;
drop policy if exists "mentor_questions_delete_own" on public.mentor_questions;
drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = user_id);

create policy "roadmap_items_select_own" on public.roadmap_items
for select using (auth.uid() = user_id);
create policy "roadmap_items_insert_own" on public.roadmap_items
for insert with check (auth.uid() = user_id);
create policy "roadmap_items_update_own" on public.roadmap_items
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "roadmap_items_delete_own" on public.roadmap_items
for delete using (auth.uid() = user_id);

create policy "daily_tasks_select_own" on public.daily_tasks
for select using (auth.uid() = user_id);
create policy "daily_tasks_insert_own" on public.daily_tasks
for insert with check (auth.uid() = user_id);
create policy "daily_tasks_update_own" on public.daily_tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_tasks_delete_own" on public.daily_tasks
for delete using (auth.uid() = user_id);

create policy "daily_logs_select_own" on public.daily_logs
for select using (auth.uid() = user_id);
create policy "daily_logs_insert_own" on public.daily_logs
for insert with check (auth.uid() = user_id);
create policy "daily_logs_update_own" on public.daily_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_logs_delete_own" on public.daily_logs
for delete using (auth.uid() = user_id);

create policy "quizzes_select_own" on public.quizzes
for select using (auth.uid() = user_id);
create policy "quizzes_insert_own" on public.quizzes
for insert with check (auth.uid() = user_id);
create policy "quizzes_update_own" on public.quizzes
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quizzes_delete_own" on public.quizzes
for delete using (auth.uid() = user_id);

create policy "quiz_attempts_select_own" on public.quiz_attempts
for select using (auth.uid() = user_id);
create policy "quiz_attempts_insert_own" on public.quiz_attempts
for insert with check (auth.uid() = user_id);
create policy "quiz_attempts_update_own" on public.quiz_attempts
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quiz_attempts_delete_own" on public.quiz_attempts
for delete using (auth.uid() = user_id);

create policy "mentor_reviews_select_own" on public.mentor_reviews
for select using (auth.uid() = user_id);
create policy "mentor_reviews_insert_own" on public.mentor_reviews
for insert with check (auth.uid() = user_id);
create policy "mentor_reviews_update_own" on public.mentor_reviews
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mentor_reviews_delete_own" on public.mentor_reviews
for delete using (auth.uid() = user_id);

create policy "mentor_questions_select_own" on public.mentor_questions
for select using (auth.uid() = user_id);
create policy "mentor_questions_insert_own" on public.mentor_questions
for insert with check (auth.uid() = user_id);
create policy "mentor_questions_update_own" on public.mentor_questions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mentor_questions_delete_own" on public.mentor_questions
for delete using (auth.uid() = user_id);

create policy "projects_select_own" on public.projects
for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
for delete using (auth.uid() = user_id);
