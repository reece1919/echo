# ECHO — Controlled Drift Operations Hub

**ECHO v3.0** is a tablet-first multi-channel management dashboard. It is designed for a **side-by-side split-screen workflow**: use your existing OBS controller for scenes/audio, and use ECHO for stream organization and Twitch shortcuts. No OBS connection or paid API is needed.


## ECHO 3.0: Controlled Drift operations hub

ECHO now has **Overview, Stream, Chat, Content, Promotions and Notes** workspaces. The Content studio tracks ideas, formats, target dates and status from Idea to Published. Promotions tracks campaign goals, platforms, deadlines and status. Both export to CSV. A JSON backup/restore feature in Settings transfers data manually between browsers and devices. It does **not** automatically sync data.

**Important:** ECHO is currently a local-first organizer. It does not send social posts, schedule publications on platform servers, pull real-time platform analytics, or log into third-party accounts. It opens external creators' dashboards to complete those actions. Its stream status and timer are manual; it does not control OBS. Data is in browser localStorage, not GitHub or a centralized database.

No build step is required. To host with GitHub Pages: repository Settings → Pages → Deploy from a branch → main → /(root). With GitHub Free, the repository must be **public** to publish GitHub Pages.

## Streaming functions retained

- Manually sets the stream session to **Ready / Live / BRB / Ended** and provides an independent session timer. These do **not** show actual Twitch/OBS broadcast status or duration.
- Tracks an editable stream rundown/checklist.
- Keeps a highlight/moment log with manual elapsed timestamps; these do **not** create Twitch stream markers or clips.
- Launches Twitch Stream Manager, popout chat, Twitch clip page, YouTube Studio, and an optional custom URL.
- Attempts to embed Twitch chat on an HTTPS-hosted page. Twitch may restrict embedded chat and/or login in some browsers; use the popout shortcut as a fallback.
- Saves talking points, scratch notes, settings, and rundown in browser local storage, with text exports for moments and notes.

## Branding

- **Name:** ECHO
- **Parent:** Controlled Drift
- **GitHub repository:** `echo`
- **Suggested Pages URL:** `https://reece1919.github.io/echo/` (valid only after you publish it)
- **Release:** v3.0

## Publish to GitHub Pages

1. Create a new **public** repository named **`echo`** under your GitHub account. You do not need another paid hosting service.
2. Upload `index.html`, `favicon.svg`, `manifest.webmanifest`, `.nojekyll`, and `README.md` from this archive to the repository **root** on the `main` branch. Do not upload only the ZIP.
3. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**. Select `main`, `/(root)` and save.
4. Open the Pages URL on your tablet, then open your existing OBS controller in split-screen.
5. Use ECHO’s **Settings** to configure the Twitch channel (default `controlled_drift`), YouTube link and optional custom shortcut.

### Privacy and persistence

Your data is stored in **localStorage in each browser**, not in GitHub. It will **not sync across browsers, tablets or computers**. Use the built-in export buttons for backups of notes/moments. Data saved on a local `file://` copy generally will not transfer to the GitHub-hosted site automatically.

The GitHub Pages website is public. Do **not** add OAuth tokens, OBS secrets, stream keys, or private personal information to the repository. This app does not require any of these.

### Technical notes

- Works as static HTML, CSS, and JavaScript. No build step, framework, API token, server or WebSocket is needed.
- Layout adapts to narrow split-screen with a vertical column and Dashboard / Chat / Notes tabs.
- The Twitch iframe requires an HTTPS page and matches Twitch's `parent` parameter to the actual page hostname.
- The storage key is intentionally unchanged from Stream Command v2.0 to preserve existing browser data if upgrading on the same site origin.