create table if not exists public.nursedoku_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb check (jsonb_typeof(progress) = 'object' and octet_length(progress::text) < 100000),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.nursedoku_progress enable row level security;
revoke all on public.nursedoku_progress from public, anon;
grant select, insert, update, delete on public.nursedoku_progress to authenticated;
create policy "Own progress only" on public.nursedoku_progress for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
