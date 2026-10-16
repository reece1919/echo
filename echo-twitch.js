/* ECHO 5.0: actual read-only Twitch API data, not a manually simulated live status.
   Tracks public channel data. No Twitch account permissions or credentials are held in the browser. */
(() => {
  "use strict";
  const root = document.getElementById("twitchIntegration");
  if (!root) return;
  const $ = id => document.getElementById(id);
  const SUPABASE_URL = "https://zdurujqwhxqrwbhwzzxg.supabase.co";
  const KEY = "sb_publishable_Xa0DTx_PbvtynbiQN6_xNQ_l1D55vzK";
  const ENDPOINT = SUPABASE_URL + "/functions/v1/echo-twitch";
  let db = null, busy = false, latest = null;
  const status = $("twStatus"), channel = $("twChannel"), refresh = $("twRefresh");
  const remove = $("twDisconnect"), details = $("twDetails"), media = $("twMedia");
  function report(message) { status.textContent = message; }
  function setBusy(value) {
    busy = value; refresh.disabled = value; remove.disabled = value;
    refresh.textContent = value ? "Refreshing…" : "Fetch Twitch data";
  }
  function client() {
    if (window.ORBITAuth?.client) return window.ORBITAuth.client;
    if (window.GAIA_CLOUD?.client) return window.GAIA_CLOUD.client;
    if (!db && window.supabase?.createClient) {
      db = window.supabase.createClient(SUPABASE_URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" }
      });
    }
    return db;
  }
  async function request(action, extra = {}) {
    const auth = client();
    if (!auth) throw Error("Supabase is unavailable. Reload ECHO.");
    const { data, error } = await auth.auth.getSession();
    if (error || !data?.session?.access_token) throw Error("Sign in through ORBIT, then return to ECHO.");
    const response = await fetch(ENDPOINT, {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", apikey: KEY,
        Authorization: "Bearer " + data.session.access_token },
      body: JSON.stringify({ action, ...extra })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(result.error || "Twitch backend returned HTTP " + response.status);
    return result;
  }
  function row(tag, cls, content) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = String(content);
    return node;
  }
  function validTwitchURL(value) {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && (u.hostname === "twitch.tv" || u.hostname.endsWith(".twitch.tv"))
        ? u.href : null;
    } catch { return null; }
  }
  function render(data) {
    latest = data;
    details.replaceChildren(); media.replaceChildren();
    const linked = !!data.tracking && !!data.channel;
    remove.hidden = !linked;
    if (linked) {
      channel.value = data.channel.channel_login;
      const stamp = data.channel.last_synced ? new Date(data.channel.last_synced).toLocaleString() : "Unknown";
      const live = data.channel.live_data;
      details.append(row("strong", "tw-live " + (live ? "on" : ""), live ? "LIVE ON TWITCH" : "Offline at last check"));
      details.append(row("span", "tw-muted", "@" + data.channel.channel_login + " · Last checked " + stamp));
      if (live) {
        details.append(row("div", "", (live.title || "Untitled stream") + " · " +
          (live.game_name || "Uncategorized") + " · " + Number(live.viewer_count || 0).toLocaleString() + " viewers at last check"));
      }
      const twitchLink = row("a", "", "Open Twitch channel ↗");
      twitchLink.href = "https://www.twitch.tv/" + encodeURIComponent(data.channel.channel_login);
      twitchLink.target = "_blank"; twitchLink.rel = "noopener noreferrer";
      details.append(twitchLink);
      const items = Array.isArray(data.media) ? data.media : [];
      for (const [kind, label] of [["video", "Recent archived broadcasts"], ["clip", "Clips observed"]]) {
        const section = row("section", "tw-media-group");
        section.append(row("h3", "", label));
        const group = items.filter(item => item.kind === kind).slice(0, 8);
        if (!group.length) section.append(row("p", "tw-muted", "No " + (kind === "video" ? "archived VODs" : "clips") + " available yet."));
        for (const item of group) {
          const box = row("div", "tw-media-row");
          const href = validTwitchURL(item.url);
          if (href) {
            const link = row("a", "", item.title || "Untitled");
            link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer";
            box.append(link);
          } else box.append(row("span", "", item.title || "Untitled"));
          const day = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";
          box.append(row("small", "tw-muted", [day, Number(item.view_count || 0).toLocaleString() + " views"].filter(Boolean).join(" · ")));
          section.append(box);
        }
        media.append(section);
      }
      report("Public Twitch data recorded. This is not OAuth authorization and cannot post or control your channel.");
    } else {
      details.append(row("p", "tw-muted", "No Twitch channel has been synchronized yet."));
      report(data.configured ? "Ready to fetch public Twitch data." :
        "Setup required: register an ECHO Twitch developer app and store its client ID and secret in Supabase.");
    }
    refresh.disabled = !data.configured;
    if (!data.configured) {
      const link = row("a", "tw-setup-link", "Set up Twitch developer credentials ↗");
      link.href = "https://dev.twitch.tv/console/apps"; link.target = "_blank"; link.rel = "noopener noreferrer";
      details.append(link);
    }
  }
  async function load() {
    if (busy) return;
    report("Loading saved Twitch data…");
    try { render(await request("status")); }
    catch (error) { report(error.message || "Could not load Twitch status."); }
  }
  refresh.addEventListener("click", async () => {
    if (busy) return;
    const login = channel.value.trim().replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{3,25}$/.test(login)) {
      report("Enter a valid Twitch channel name."); channel.focus(); return;
    }
    setBusy(true); report("Retrieving channel, streams, VODs and clips from Twitch…");
    try { render(await request("refresh", { channel: login })); }
    catch (error) { report(error.message || "Twitch sync failed."); }
    finally { setBusy(false); refresh.disabled = latest ? !latest.configured : false; }
  });
  remove.addEventListener("click", async () => {
    if (busy || !confirm("Remove the saved public Twitch channel and its cached VOD/clip metadata from ECHO? This does not affect Twitch.")) return;
    setBusy(true);
    try { render(await request("disconnect")); }
    catch (error) { report(error.message || "Could not remove the tracked channel."); }
    finally { setBusy(false); refresh.disabled = latest ? !latest.configured : false; }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !busy && latest === null) void load();
  });
  void load();
})();
