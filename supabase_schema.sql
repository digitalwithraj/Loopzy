-- ============================================================
-- Loopzy — Supabase Schema
-- Run this in the Supabase SQL Editor (once)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. HELPER: check whether an email is registered in auth.users
-- Used by the login form to show "Account not found" vs
-- "Incorrect password" instead of the generic Supabase error.
-- ─────────────────────────────────────────────────────────────
create or replace function check_email_exists(email_to_check text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from auth.users where email = email_to_check
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  avatar      text not null default 'av-calm',
  primary_goal text not null default '',
  onboarding_completed boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- 2. HABITS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  category        text not null default 'Mind',
  frequency       text not null default 'daily',
  custom_days     text[] not null default '{}',
  reminder_time   text not null default '08:00',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.habits
alter column id set default gen_random_uuid();


alter table public.habits enable row level security;

create policy "Users manage their own habits"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. HABIT LOGS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.habit_logs (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  habit_id    uuid not null references public.habits(id) on delete cascade,
  date        date not null,
  completed   boolean not null default false,
  note        text,
  updated_at  timestamptz not null default now()
);

alter table public.habit_logs enable row level security;

create policy "Users manage their own logs"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. REMINDERS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id        text primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  habit_id  uuid,
  type      text not null default 'daily',
  time      text not null,
  days      integer[] not null default '{}',
  active    boolean not null default true,
  title     text not null
);

alter table public.reminders enable row level security;

create policy "Users manage their own reminders"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. ENABLE REALTIME (run after creating tables)
-- ─────────────────────────────────────────────────────────────
-- Go to: Supabase Dashboard → Database → Replication
-- Enable Realtime for: habits, habit_logs, reminders
--
-- Or run these commands:
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_logs;
alter publication supabase_realtime add table public.reminders;
