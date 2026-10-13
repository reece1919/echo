# ECHO → Todoist production workflows

Status: **feature branch** `feature/echo-todoist-pipeline`. This feature is intentionally isolated from `main` while another agent works on ECHO ↔ ORBIT changes.

## Existing connection reused
ECHO reuses **ORBIT's authenticated Todoist OAuth bridge** rather than asking for another OAuth approval or a personal API token. The bridge is hosted at `/functions/v1/orbit-todoist` in the shared GAIA Supabase project (`zdurujqwhxqrwbhwzzxg`). Tokens remain encrypted on the server and are never exposed to ECHO's GitHub Pages code.

The server currently requires a verified **AAL2 authenticator session** for all Todoist bridge requests, including connection status. ECHO will show an actionable message if verification is needed, without changing ORBIT's security policy.

## Studio workflow
Open **STUDIO → Todoist production workflow** and:
1. Check whether the ORBIT Todoist OAuth connection is available.
2. Choose a planned livestream, content item or promotional campaign.
3. Preview the generated steps and uncheck anything you don't need.
4. Click **Create selected Todoist tasks**, then confirm the task count.
5. The tasks are added through ORBIT's existing OAuth connection and tracked in ECHO.

**No tasks are created automatically or without confirmation.** This prevents experimental stream plans from filling the Todoist inbox.

For livestreams, the template includes stream preparation, announcement, broadcast/highlight capturing, clip review, and clip publishing. Regular content items generate production, assets/captions, and publishing tasks. Campaigns generate creative and launch tasks. The dates are derived from ECHO's target date; expired preparatory dates move to today, while unscheduled content generates tasks without a date.

## Duplicate protection
- Each step gets a stable marker in its Todoist **description**: `ECHO-TODOIST:<source>:<step>`.
- ECHO records returned Todoist task IDs in `todoistLinks`, part of its normal local and cloud workspace snapshot.
- Before sending any new tasks, ECHO pages through open Todoist tasks and searches for matching markers. Successful creates are recorded one by one, permitting recovery after a partial failure.
- If the Todoist task listing is too large or unavailable, ECHO refuses to create tasks rather than risk duplicates.
- Completed tasks no longer appear among open Todoist items. ECHO's saved links prevent repeat creation where the workspace is synced. **Don't delete or reset ECHO's local data before cloud sync, because links to already completed Todoist tasks could be lost.**
- ECHO does **not** automatically complete, reschedule, or delete tasks in Todoist when the source item changes. Once sent, Todoist tasks remain independent.

## Dependencies and authentication
- ECHO already shares the GAIA/ORBIT Supabase account and same-origin browser session.
- The `echo-cloud.js` module exposes only the initialized public Supabase client to the Todoist module; a second auth client is not created.
- The Todoist module never writes OAuth tokens into localStorage, GitHub or ECHO state.
- ORBIT's Todoist bridge accepts requests from `https://reece1919.github.io`; ECHO shares this origin, so no Todoist API secret or CORS change is needed.
- No Supabase SQL schema changes or new subscriptions are needed.

## Testing / safe release
- The code has been syntax checked.
- A mocked authenticated ORBIT/GAIA session returned connected status and created five Todoist tasks for a sample golf stream, with IDs tracked and proper source markers.
- **No real Todoist tasks have been created** during development.
- Before merging the pull request, coordinate with the agent changing ECHO ↔ ORBIT integration. Preserve the Todoist script tag and shared cloud client.
- After merging, open STUDIO, click Check connection, review the tasks for a disposable sample item, and create only after approving the prompt.
