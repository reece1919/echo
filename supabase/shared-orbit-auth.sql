-- ECHO's shared ORBIT / GAIA backend, applied 2026-10-13
-- Supabase project: zdurujqwhxqrwbhwzzxg
-- ECHO application records stay isolated in their own owner-protected table.
-- This was applied separately without modifying GAIA, ORBIT, or RUNE tables.

create table if not exists public.echo_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint echo_workspaces_data_object check (jsonb_typeof(data) = 'object'),
  constraint echo_workspaces_revision_nonnegative check (revision >= 0)
);

alter table public.echo_workspaces enable row level security;
revoke all on table public.echo_workspaces from anon;
grant select, insert, update, delete on table public.echo_workspaces to authenticated;

create policy echo_select_own on public.echo_workspaces
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy echo_insert_own on public.echo_workspaces
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy echo_update_own on public.echo_workspaces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy echo_delete_own on public.echo_workspaces
  for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.echo_workspaces is 'Isolated ECHO production manager snapshots using GAIA/ORBIT Auth identity; owner-only RLS.';
