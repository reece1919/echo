# ECHO — Supabase integration plan

## Current status
- ECHO GitHub repository: https://github.com/reece1919/echo
- GitHub Pages deployment is a separate step; verify in repository Settings → Pages.
- No ECHO Supabase project has been created or connected yet.
- GAIA's existing Supabase project is intentionally untouched.
- ECHO currently stores its work locally in the browser and can export/restore JSON backups.

## Deployment sequence
1. Confirm the Supabase organization, region, and project cost before creating a dedicated ECHO project.
2. Create the ECHO Supabase project.
3. Apply `supabase/schema.sql` to that **ECHO** project.
4. Verify that RLS is enabled and that `anon` has no table privileges.
5. Configure Supabase Auth (email OTP or magic link). Allow redirect URL `https://reece1919.github.io/echo/`. Choose account registration policy intentionally.
6. Retrieve the **project URL** and **publishable** key. Never use a service role or secret key in GitHub Pages.
7. Integrate a Supabase browser client into ECHO, with explicit first-time migration from local device data; do not silently replace existing local data.
8. Verify cloud read/write under the signed-in user, confirm unauthenticated requests cannot read data, and test two devices.

## Proposed data model
A single `public.echo_workspaces` table keyed by `user_id` saves ECHO's management workspace as JSON. This is intentionally the safest first migration from ECHO's established local-storage format. Later versions can normalize content, campaigns, calendars and analytics into dedicated RLS tables without losing the originals.

## What sync includes initially
Content planner, campaigns, stream notes, rundown, highlights, and app links/settings. Live timer/stream runtime state should stay local to avoid conflicting controls across devices. Cloud synchronization will require authenticated sign-in and deliberate first-time data migration. Separate browsers do not automatically inherit a login.

## Data safety
- The GitHub Pages **code** is public. Management data should **never** live in the Git repository.
- Row Level Security checks the owner against `auth.uid()` for read/write/delete.
- Do not use `user_metadata` in authorization rules.
- Initial sync requires backup and explicit choice to upload the current device or download existing cloud data.
- Workspaces are per-user; this is not a multi-user collaboration design yet.
- Last-write-wins snapshot syncing can cause conflicts when editing on two devices simultaneously. Before enabling automated sync, add either server-side revision checks or per-record updates.
- A public app is not equivalent to public data. Protect all database tables and storage buckets before enabling access.

## Upcoming Supabase changes
New tables created in the public schema are not automatically exposed to Data API on new projects. The migration intentionally includes explicit GRANT statements for authenticated requests. See https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

## Future phases
- Separate content, publication and campaign records with individual update timestamps
- Media asset storage with private buckets and ownership policies
- Approved publishing integrations (YouTube, Twitch, Instagram, TikTok) via OAuth and server-side Edge Functions
- Reporting and scheduled campaign reminders, without exposing provider tokens in the browser
