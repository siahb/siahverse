-- Run in a connected Supabase project's SQL editor after Auth is configured.
create table if not exists public.nursedoku_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.nursedoku_progress enable row level security;
revoke all on public.nursedoku_progress from anon;
grant select, insert, update, delete on public.nursedoku_progress to authenticated;
drop policy if exists "Own progress only" on public.nursedoku_progress;
create policy "Own progress only" on public.nursedoku_progress for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
