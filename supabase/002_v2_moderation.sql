-- Prepared migration. Not applied to production by the local V2 build.
begin;
create table if not exists public.kr_moderation (
 id uuid primary key,
 record jsonb not null check (jsonb_typeof(record) = 'object'),
 created_at timestamptz not null default now()
);
create index if not exists kr_moderation_created_at_idx on public.kr_moderation (created_at desc);
alter table public.kr_moderation enable row level security;
revoke all on public.kr_moderation from anon, authenticated;
grant select, insert on public.kr_moderation to service_role;
comment on table public.kr_moderation is 'Server-only reports, evidence and temporary moderation actions. No automatic permanent bans.';
commit;
