alter table public.habits
add column if not exists custom_days jsonb not null default '[]'::jsonb;
