-- Migration: Add status column to habits table
-- Values: 'active' | 'paused' | 'archived'
-- Existing rows: is_active = true  → 'active'
--               is_active = false → 'archived'

ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Backfill existing rows: active habits
UPDATE public.habits SET status = 'active' WHERE is_active = true AND status = 'active';

-- Backfill existing rows: archived habits
UPDATE public.habits SET status = 'archived' WHERE is_active = false AND status = 'active';
