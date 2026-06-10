-- Run this once in the Supabase SQL Editor for the Loopzy project.
-- It makes public.habits.id database-generated so the frontend must not send custom IDs.

create extension if not exists pgcrypto;

alter table public.habits
alter column id set default gen_random_uuid();

