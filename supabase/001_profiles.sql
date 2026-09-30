-- Run once in a dedicated Supabase project's SQL Editor.
create table if not exists public.kr_profiles (
 id text primary key check (id ~ '^[a-f0-9]{64}$'),
 name text not null,
 progress jsonb not null,
 settings jsonb not null default '{"quality":"auto","muted":false}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.kr_profiles enable row level security;
revoke all on public.kr_profiles from anon, authenticated;
grant select, insert, update on public.kr_profiles to service_role;
-- Only the game server holds the secret key. Browsers cannot read/write this table.
