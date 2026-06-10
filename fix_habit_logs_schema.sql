-- ============================================================
-- Loopzy — Fix habit_logs schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- The habit_logs table was created with only (id, created_at, habit_id, completed).
-- This migration adds the missing columns that the app requires:
--   user_id, date, note, updated_at
-- It also recreates the RLS policy so that user_id is the security anchor.
-- ============================================================

-- 1. Add missing columns
ALTER TABLE public.habit_logs
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS date       date,
  ADD COLUMN IF NOT EXISTS note       text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Change the primary key column type from uuid to text
--    The app uses composite text IDs like "log-<habitId>-<date>".
--    If the column is currently uuid, we need to alter it.
--    (This will only work if the table is empty or all existing IDs are valid text.)
ALTER TABLE public.habit_logs ALTER COLUMN id TYPE text USING id::text;

-- 3. Drop old RLS policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users manage their own logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.habit_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.habit_logs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.habit_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.habit_logs;

-- 4. Re-enable RLS and create the correct policy
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own logs"
  ON public.habit_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Create the reminders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reminders (
  id        text PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id  uuid,
  type      text NOT NULL DEFAULT 'daily',
  time      text NOT NULL,
  days      integer[] NOT NULL DEFAULT '{}',
  active    boolean NOT NULL DEFAULT true,
  title     text NOT NULL
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own reminders" ON public.reminders;

CREATE POLICY "Users manage their own reminders"
  ON public.reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Enable realtime for the tables (safe to re-run)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already added
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already added
END $$;
