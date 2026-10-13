# ECHO — Supabase integration status (13 October 2026)

## Completed
- Dedicated Supabase project **ECHO** created under organization **reece1919**, region **us-west-1**.
- Project ID: `xkghwqticokunxuqwyrh`.
- Project API URL: `https://xkghwqticokunxuqwyrh.supabase.co`.
- Supabase reported a creation cost of **$0/month** (usage, quotas and future plan changes may still apply).
- Schema `supabase/schema.sql` applied successfully and verified.
- Table `public.echo_workspaces`: 4 ownership policies, RLS enabled, no anonymous SELECT permission.
- Supabase Security Advisor reported **no findings**.
- ECHO v3.1 browser interface now includes Supabase email magic-link sign-in and deliberate manual Upload/Restore controls.
- The browser code contains **only a publishable key**; no secrets or service role key.
- JavaScript syntax checked for both `index.html` and `echo-cloud.js`.

## Action required to activate sign-in
Open [ECHO Supabase Auth URL Configuration](https://supabase.com/dashboard/project/xkghwqticokunxuqwyrh/auth/url-configuration).
1. Set **Site URL** to `https://reece1919.github.io/echo/`.
2. Add `https://reece1919.github.io/echo/` under **Redirect URLs**, then save.
3. Make sure [GitHub Pages](https://github.com/reece1919/echo/settings/pages) uses branch `main` and folder `/(root)`. The repository is already public.
4. Open the hosted ECHO page, go to **Settings → ECHO Cloud**, enter your email and choose **Send sign-in link**.
5. Follow the link in your email back to ECHO. Choose **Upload this device** to create the first private cloud snapshot.
6. On your tablet, sign in with the same email and choose **Restore cloud copy** to transfer that snapshot.

**Important:** A successful test email sign-in and cross-device transfer have not yet been confirmed. ECHO does *not* automatically sync edits; first use manual upload/download. The session timer and manual stream-status runtime remain local. GitHub Pages is a static public website, but database records are accessible only to their authenticated owner under RLS.

---

## Original integration plan

## Current status
- ECHO GitHub repository: https://github.com/reece1919/echo
- GitHub Pages deployment is a separate step; verify in repository Settings → Pages.
- ECHO Supabase project created, schema applied, browser cloud client added.
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
