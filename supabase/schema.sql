-- ECHO / Controlled Drift: cloud workspace schema
-- Run against an ECHO-dedicated Supabase project, NOT the GAIA project.
-- One JSON workspace per signed-in user supports a lossless migration
-- from ECHO's existing localStorage data to private cloud sync.

create table if not exists public.echo_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Explicit Data API grants are required on new Supabase projects.
revoke all on table public.echo_workspaces from anon;
grant select, insert, update, delete on table public.echo_workspaces to authenticated;

alter table public.echo_workspaces enable row level security;

create policy "echo_workspace_read_own"
  on public.echo_workspaces for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "echo_workspace_insert_own"
  on public.echo_workspaces for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "echo_workspace_update_own"
  on public.echo_workspaces for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "echo_workspace_delete_own"
  on public.echo_workspaces for delete to authenticated
  using ( (select auth.uid()) = user_id );

comment on table public.echo_workspaces is
  'Private per-user ECHO workspace snapshot, protected by ownership-based RLS.';
