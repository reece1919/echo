# ECHO v4.2 — Supabase setup and validation

## Connected infrastructure
- Static frontend repository: https://github.com/reece1919/echo
- GitHub Pages: https://reece1919.github.io/echo/
- Dedicated Supabase project: https://supabase.com/dashboard/project/xkghwqticokunxuqwyrh
- Project region: us-west-1
- Supabase table: `public.echo_workspaces` (owner: `user_id`)
- RLS: enabled; four ownership-based policies; anonymous SELECT disallowed.
- Backend `revision bigint` column added to support optimistic concurrency.
- Supabase Security Advisor: no findings in latest check.
- The frontend contains only a **publishable** API key, not a service-role or secret key.

## Before your first cloud login
1. Ensure GitHub Pages is enabled at https://github.com/reece1919/echo/settings/pages — main, /(root).
2. Open https://supabase.com/dashboard/project/xkghwqticokunxuqwyrh/auth/url-configuration and set Site URL to `https://reece1919.github.io/echo/`.
3. Add the same address under Redirect URLs and save.
4. Reload the site after Pages finishes deployment. In ECHO open Settings → ECHO Cloud.
5. Enter your email and click Send magic sign-in link; follow the link back to ECHO. Supabase's built-in SMTP has a low email quota, so avoid repeated sign-in requests while testing.
5a. While signed in, optionally set a password of at least 12 characters under Settings → ECHO Cloud. Subsequent sessions can use **Sign in with password** without requesting another email. Depending on the Supabase authentication configuration, changing a password may require reauthentication.
6. **On the device containing the current notes/content**, choose **Upload this device**. This initializes the owner-specific cloud row and opts in to auto-sync for that device.
7. On another device, sign in with the same email and choose **Restore cloud copy** once. Automatic synchronization is then enabled there too.
8. Check Studio on both devices; add a non-sensitive test item on one, wait about 30 seconds, and verify it appears on the other. Navigate away from and back to ECHO if necessary to trigger a refresh.

## What syncs automatically
- Content production items and their status, planned streams, promotional campaigns, stream highlights, rundown checklist, notes, and platform shortcut settings.
- Automatic writes are debounced. Background comparisons are performed roughly every 30 seconds or on page reactivation.
- Each device must complete the first upload or restore **explicitly**. No silent first-time overwrite.
- Session timer and manual LIVE status stay local to the tablet/browser rather than being shared across devices.

## Resolving conflicts safely
ECHO requires the cloud record's revision to match the revision last read by the device. If they differ, automatic writes stop and the local version is preserved. To reconcile, choose:
- **Restore cloud copy** — use the newer cloud copy and resume syncing (replaces current device data), or
- **Upload this device** — explicitly replace the cloud copy with your current local version, or
- **Restore local safety copy** — recover the last device snapshot saved before restore or conflict; this pauses syncing.

**Before replacing either copy, also use ECHO's Download backup control.** Current sync is a versioned single-user workspace snapshot, *not* per-item merging or real-time collaborative editing.

## Product functions in v4
- Overview → Plan a broadcast generates a Studio record and promotional campaign.
- LIVE → highlight logging → **→ Studio** creates a clip-production item linked to its original timestamp.
- Studio cards: edit title/date, change stage, repurpose into a different platform-specific content record.
- Promote: campaign status tracking.
- Insights: only ECHO's own production metrics, not viewers, followers, views, or revenue.
- Calendar: monthly view across all production channels, filter by LIVE/STUDIO/PROMOTE, 30-day schedule and unscheduled queue, create/edit/reschedule activity, maintain linked campaign dates.

## What is NOT connected
- Twitch/YouTube social analytics
- Automated publishing or scheduling to Twitch/YouTube/Instagram/TikTok
- OBS, Todoist, media processing, thumbnail generation or automatic clip creation

## Validation scope
- Confirmed: front-end JavaScript syntax, stream-plan and repurpose smoke tests, mocked cloud upload/auto-save flow, DB schema, RLS, grant checks and Security Advisor.
- Not yet confirmed: real Magic Link email login, actual GitHub Pages rebuild after v4 commits, and cross-device integration with two browsers. Those must be tested from the hosted dashboard.
