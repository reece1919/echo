-- ECHO Twitch read-only integration. Only the Edge Function service role writes Twitch observations.
create table if not exists public.echo_twitch_channels (
  user_id uuid primary key references auth.users(id) on delete cascade,
  channel_login text not null check (channel_login ~ '^[A-Za-z0-9_]{3,25}$'),
  broadcaster_id text not null,
  display_name text not null,
  profile_image_url text,
  live_data jsonb,
  last_synced timestamptz not null default now()
);
create table if not exists public.echo_twitch_media (
  user_id uuid not null references public.echo_twitch_channels(user_id) on delete cascade,
  kind text not null check (kind in ('video', 'clip')),
  twitch_id text not null,
  title text not null,
  url text not null,
  thumbnail_url text,
  created_at timestamptz not null,
  view_count bigint not null default 0,
  duration text,
  game_name text,
  last_seen timestamptz not null default now(),
  primary key (user_id,kind,twitch_id)
);
create index if not exists echo_twitch_media_recent on public.echo_twitch_media(user_id,kind,created_at desc);
alter table public.echo_twitch_channels enable row level security;
alter table public.echo_twitch_media enable row level security;
revoke all on public.echo_twitch_channels from anon,authenticated;
revoke all on public.echo_twitch_media from anon,authenticated;
grant select on public.echo_twitch_channels, public.echo_twitch_media to authenticated;
create policy echo_twitch_channels_read_own on public.echo_twitch_channels
for select to authenticated using ((select auth.uid())=user_id);
create policy echo_twitch_media_read_own on public.echo_twitch_media
for select to authenticated using ((select auth.uid())=user_id);
comment on table public.echo_twitch_channels is 'Read-only public Twitch observations; server writes only; not an OAuth account link.';
comment on table public.echo_twitch_media is 'Observed VOD and clip metadata, server-only writes; not complete broadcast history.';
