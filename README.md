# ECHO v4.3 — Controlled Drift Operations

ECHO is a tablet-friendly LIVE companion and production manager for Controlled Drift.

## Unified identity with ORBIT and GAIA
**ECHO now uses the same GAIA Supabase Auth account as ORBIT.** You do not need to create another ECHO account, wait on ECHO magic-link email quotas, or manage a second ECHO password.

- Open [ORBIT](https://reece1919.github.io/orbit/) and sign in with your usual GAIA / ORBIT credentials.
- Return to [ECHO](https://reece1919.github.io/echo/) on the **same browser**.
- Under Settings → ECHO Cloud, ECHO normally recognizes that session automatically. If necessary, choose **I've signed in — check session** or refresh the page.
- For the first connection, on the device holding your current ECHO notes and plans, click **Upload this device**. This preserves local work and initializes your private cloud copy. On another device, sign into ORBIT on that device, then choose **Restore cloud copy** in ECHO.
- Subsequent edits are automatically synchronized with optimistic version checks. If devices conflict, ECHO pauses saving rather than overwriting silently; it retains a local safety snapshot.
- Signing out in ECHO will sign out of this shared account **on the current browser**, including other dashboards that use the same Supabase session.

GAIA, ORBIT, and ECHO have **separate application tables**, restricted by owner-specific RLS policies. ECHO uses `public.echo_workspaces` on the existing GAIA Supabase project (ref `zdurujqwhxqrwbhwzzxg`). The original standalone ECHO Supabase project (ref `xkghwqticokunxuqwyrh`) remains unchanged as a legacy project; it has **zero saved workspace rows** at cutover. No legacy remote data needed migration; browser-local content is preserved.

Supabase authentication is **shared only when apps have access to the same session storage**, such as the `reece1919.github.io` origin. Different browsers/devices still require signing in through ORBIT separately. This integrates sign-in identity, **not** a public data-sharing permission.

## Workspaces
- **Overview** — plan future broadcasts and generate linked promotions.
- **LIVE** — manual stream timer, stream rundown, Twitch chat, highlights with **→ Studio** clip planning.
- **STUDIO** — content ideas, statuses, editing, multi-platform repurposing.
- **CALENDAR** — schedule streams, videos/posts and promotions, modify dates and linked campaign dates, view unscheduled work.
- **PROMOTE** — organize promotions and track their progress.
- **INSIGHTS** — activity based only on ECHO records (not actual social analytics).
- **NOTES** — persistent talking points and scratchpad.

## Data and privacy
ECHO is hosted from this public GitHub repository; private planning records never enter GitHub. Only a **publishable** Supabase API key is present in the browser. Row-level security restricts user-owned records. The legacy separate ECHO backend is not queried.

Cloud sync excludes the live-session timer and stream-status runtime, which remain local to each device. No OBS connection is required. Social scheduling, direct social posting, platform analytics, and Todoist automation remain future integrations.

## Deployment
GitHub Pages: `main` branch, `/(root)`. No build step needed. See [Supabase setup](docs/SUPABASE_SETUP.md) for the shared login setup and test procedure, or [the shared-table migration](supabase/shared-orbit-auth.sql).
