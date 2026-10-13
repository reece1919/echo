# ECHO v4.0 — Controlled Drift operations

ECHO is a responsive, tablet-friendly companion and production manager for Controlled Drift.

### Workspaces
- **Overview** — plan upcoming gaming, golf, cooking, or worldbuilding broadcasts. One stream plan creates both a Studio item and an associated promotional campaign.
- **LIVE** — session timer, stream rundown, Twitch chat, notes, and timestamped highlight logger. Click **→ Studio** on a highlight to create a clip production task.
- **STUDIO** — track content from Idea through Published; edit target dates/titles and repurpose items across platforms. Publishing itself still happens on the actual platforms.
- **PROMOTE** — manually track campaign goals, channels, dates, and progress.
- **INSIGHTS** — production statistics from your ECHO records. **Not** live Twitch or YouTube audience analytics.
- **NOTES** — persistent talking points and scratchpad.

### ECHO Cloud (Supabase)
Supabase is optional. This site continues to work without logging in, saving to your browser locally. After signing in via an email magic link, open Settings → ECHO Cloud and choose **Upload this device** or **Restore cloud copy** to authorize initial transfer. Auto-sync is then enabled for that device.

Cloud save operations use optimistic revision checks: if two devices change the same cloud snapshot, ECHO stops rather than silently overwriting the other copy. The conflicted local data is retained. ECHO can fetch other-device updates when this device has no unsaved changes, generally within 30 seconds or on returning to the page. There are explicit pause controls and backup exports. This is a single-owner JSON workspace, not multi-user collaborative editing.

**Cloud setup:** Configure Supabase Auth allowed Site URL and Redirect URL as `https://reece1919.github.io/echo/`. See [Supabase setup](docs/SUPABASE_SETUP.md).

### Privacy
The GitHub Pages source is public. Cloud planning data is not stored in GitHub. The Supabase browser app uses only a public *publishable* key; row-level security restricts access to each user's own data. No OBS connection or social-media API credentials are required.

### Hosting
GitHub Pages: deploy the `main` branch from `/(root)`. No build process or backend server is required for the static dashboard.

### Not yet integrated
Native social scheduling/posting, YouTube/Twitch analytics, Todoist, automated video clipping, and media file storage.
