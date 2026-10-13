# ECHO v4.3 — GAIA / ORBIT Shared Login

**Current configuration**: ECHO shares GAIA / ORBIT Supabase authentication. It no longer sends independent login emails or signs in against its old dedicated Supabase project.

## Projects and data
- GAIA / ORBIT / ECHO Auth project: `zdurujqwhxqrwbhwzzxg`
- ECHO's private table there: `public.echo_workspaces`
- ECHO legacy project `xkghwqticokunxuqwyrh`: preserved, no workspace records were present at cutover; no user data transferred from it.
- Table migration: [`supabase/shared-orbit-auth.sql`](../supabase/shared-orbit-auth.sql)
- Table RLS: ON; four select/insert/update/delete policies require `auth.uid() = user_id`. Anonymous users have no SELECT privilege. Separate GAIA/ORBIT/RUNE application tables are unchanged.
- Code only exposes the same publishable API key used by ORBIT, **never** a service-role key.
- ORBIT client and ECHO client both use the GAIA project, persistent browser storage, and PKCE auth flow.

## Sign-in walkthrough
1. Go to https://reece1919.github.io/orbit/ in the **same browser** you plan to use for ECHO, and sign in with the existing GAIA / ORBIT email and password. Complete any ORBIT security checks if requested.
2. Visit https://reece1919.github.io/echo/ and open Settings → ECHO Cloud.
3. You should see signed-in status. Otherwise click **I've signed in — check session**, or reload after returning from ORBIT.
4. On the device with your current ECHO planning data, choose **Upload this device**, then confirm. This creates the cloud workspace under your existing GAIA user ID.
5. On tablet or a different browser, sign in to ORBIT there, open ECHO and select **Restore cloud copy**. Automatic synchronization will then be enabled for that device.
6. Test by creating a throwaway Studio item on one device and waiting up to ~30 seconds, or returning to ECHO on the other device.
7. Use Download backup before a manual overwrite. If ECHO stops sync on revision mismatch, choose which version to keep (Upload this device or Restore cloud copy).

### Security and behavior
- This is shared **authentication**, not combined GAIA and ECHO data.
- Apps share a browser session because they're both hosted under `reece1919.github.io` and connect to the same Supabase project using the default project-specific local storage key.
- **A different browser or device still requires a login through ORBIT.**
- Sign out from ECHO is intentionally a **local** sign-out (other sessions/devices remain signed in) but shared dashboards **in this browser** will be signed out.
- No magic-link or email authentication is initiated by ECHO.
- Saved studio/calendar/promotion records are owner restricted. Timer and local LIVE state remain local.
- Changes made simultaneously on two devices can conflict; version checks prevent silent overwrites.

### Test status
- Confirmed: GAIA database table and four RLS policies, no anonymous read permission, matching GAIA project/publishable key to ORBIT, JavaScript syntax, simulated ORBIT-session recovery, simulated workspace upload, and browser-only signout.
- Still requires user-browser verification: ORBIT login → ECHO session reuse, ECHO cloud upload → second-device restore, automatic sync.
- The GAIA project's Security Advisor may report unrelated, existing notices for backend-only RLS tables and leaked-password checking. This does not indicate that ECHO's new RLS table lacks policies.
