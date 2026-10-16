# ECHO Twitch integration — phase 1

## Scope and intentional limits

This first integration is **read-only public Twitch data** from Helix, *not* Twitch account authorization. The user chooses a Twitch channel login (initially `controlled_drift`) and clicks **Fetch Twitch data**. ECHO retrieves:

- Current live/offline observation, stream title, game, viewer count, and observation time.
- Up to 20 currently available archived Twitch broadcasts (VODs).
- Up to 30 clips returned for the most recent 30-day window (ranked by Twitch, not necessarily newest).
- A retained, owner-private index of media items observed over time.

It does **not** create stream alerts, subscribe to EventSub, control OBS or Twitch, create clips, upload/publish anything, infer audience growth, or authenticate ownership of the selected channel. The local LIVE timer remains a manual instrument and must **not** be presented as actual Twitch stream status. Twitch may delete or expire VODs; this feed is not a complete historical archive.

## Current architecture

- Static GitHub Pages frontend: `echo-twitch.js`, `echo-twitch.css`, section on Overview.
- Authenticated Supabase Edge Function `echo-twitch` (`verify_jwt = true`) checks user JWT with `auth.getUser` and calls the Twitch API server-side.
- One authenticated user's tracked channel is stored in `public.echo_twitch_channels`; media records in `public.echo_twitch_media`.
- RLS only grants authenticated clients owner-scoped SELECT. Only Edge Function server credentials can write. ECHO's existing `echo_workspaces` records and unrelated ORBIT/GAIA data are untouched.
- A 90-second minimum per-user refresh interval is enforced at the API function. Refresh is currently initiated manually.
- No Twitch API secret or access token is stored in GitHub or client-side storage.

## One-time developer configuration needed

1. Using the Controlled Drift Twitch account, visit [Twitch Developer Console](https://dev.twitch.tv/console/apps) and register an application for ECHO. If a redirect URI is required for registration, use `https://reece1919.github.io/echo/`. This phase uses app-access tokens, not the redirect flow.
2. In Supabase project `zdurujqwhxqrwbhwzzxg`, navigate to [Edge Function Secrets](https://supabase.com/dashboard/project/zdurujqwhxqrwbhwzzxg/functions/secrets). Set:
   - `TWITCH_CLIENT_ID` — Twitch developer application client ID
   - `TWITCH_CLIENT_SECRET` — Twitch developer application secret
3. **Never paste Twitch secrets into ECHO, a GitHub issue, or chat.** Save only in Supabase Secrets. No paid OpenAI API is required.
4. Open ECHO while signed in through ORBIT. Choose channel `controlled_drift` and **Fetch Twitch data**.
5. Verify the returned public Twitch channel name, live/offline state at observation time, VOD and clip links. Reload ECHO and confirm the saved data is still visible.
6. Verify an unauthenticated request to the function is rejected, and another Supabase owner cannot see this user's records. Check the Supabase function logs if the API call fails.

## Definition of done

- [x] Source code, schema, isolated authenticated function, frontend view
- [x] Live database owner-only RLS and server-write-only grants verified
- [x] Edge Function deployed with JWT required
- [ ] Twitch application ID and secret added to protected backend secrets
- [ ] Real Twitch API response verified against Controlled Drift
- [ ] Browser sign-in, session reuse, reload, and cross-device acceptance tests
- [ ] Owner-authorized Twitch OAuth (future phase; required for privileged operations)
- [ ] Automatic polling or EventSub, Discord posting (future phases)

## Next deliberate iteration

Once this end-to-end public API feed is confirmed, implement **owner-authorized Twitch OAuth**, securely encrypted refresh token storage, EventSub stream-online/offline events with signature verification, and a canonical Broadcast/Session model. Design clip creation and Discord announcements only after authorization and event reliability are proven.
