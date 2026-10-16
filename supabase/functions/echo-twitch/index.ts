// ECHO Twitch read-only integration. Twitch developer credentials stay in Edge Function secrets.
// This tracks publicly available channel data; it does NOT authorize or manage a Twitch account.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const PROJECT_URL = Deno.env.get("SUPABASE_URL") || "";
const SECRET_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || "";
const TWITCH_ID = Deno.env.get("TWITCH_CLIENT_ID") || "";
const TWITCH_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET") || "";
const ALLOWED_ORIGINS = new Set(["https://reece1919.github.io", "http://localhost:8000", "http://127.0.0.1:8000"]);
const db = PROJECT_URL && SECRET_KEY ? createClient(PROJECT_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null;
let twitchAppToken: { value: string; expires: number } | null = null;

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}
function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}
async function token(): Promise<string> {
  if (twitchAppToken && twitchAppToken.expires > Date.now() + 60_000) return twitchAppToken.value;
  const request = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: TWITCH_ID, client_secret: TWITCH_SECRET, grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(12000),
  });
  if (!request.ok) throw Error("Twitch developer credentials were rejected.");
  const result = await request.json();
  if (!result.access_token || !Number(result.expires_in)) throw Error("Twitch did not return a usable app token.");
  twitchAppToken = { value: result.access_token, expires: Date.now() + Number(result.expires_in) * 1000 };
  return twitchAppToken.value;
}
async function helix(path: string, params: Record<string, string>, bearer: string): Promise<any[]> {
  const url = new URL("https://api.twitch.tv/helix/" + path);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + bearer, "Client-Id": TWITCH_ID },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw Error("Twitch API returned HTTP " + response.status + ".");
  const result = await response.json();
  if (!Array.isArray(result.data)) throw Error("Twitch API returned an unexpected response.");
  return result.data;
}
async function snapshot(userId: string) {
  if (!db) throw Error("Server configuration unavailable");
  const [channelResult, mediaResult] = await Promise.all([
    db.from("echo_twitch_channels").select("channel_login,broadcaster_id,display_name,profile_image_url,live_data,last_synced").eq("user_id", userId).maybeSingle(),
    db.from("echo_twitch_media").select("kind,twitch_id,title,url,thumbnail_url,created_at,view_count,duration,game_name").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
  ]);
  if (channelResult.error) throw channelResult.error;
  if (mediaResult.error) throw mediaResult.error;
  return { tracking: !!channelResult.data, channel: channelResult.data, media: mediaResult.data || [],
    configured: !!(TWITCH_ID && TWITCH_SECRET), authorized: false };
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, 403, { error: "Origin not allowed" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "POST required" });
  if (!db) return json(req, 503, { error: "Backend not configured" });
  const jwt = (req.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!jwt) return json(req, 401, { error: "Sign in through ORBIT first." });
  const { data: identity, error: authError } = await db.auth.getUser(jwt);
  if (authError || !identity.user) return json(req, 401, { error: "Session expired. Sign in through ORBIT." });
  const userId = identity.user.id;
  let input: any;
  try { input = await req.json(); } catch { return json(req, 400, { error: "JSON request required." }); }
  const action = String(input?.action || "status");
  if (!["status", "refresh", "disconnect"].includes(action)) return json(req, 400, { error: "Unknown action" });
  try {
    if (action === "status") return json(req, 200, await snapshot(userId));
    if (action === "disconnect") {
      const { error } = await db.from("echo_twitch_channels").delete().eq("user_id", userId);
      if (error) throw error;
      return json(req, 200, await snapshot(userId));
    }
    const login = String(input?.channel || "controlled_drift").trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,25}$/.test(login)) return json(req, 400, { error: "Enter a valid Twitch channel name." });
    if (!TWITCH_ID || !TWITCH_SECRET) return json(req, 503, {
      code: "TWITCH_NOT_CONFIGURED",
      error: "Twitch developer application not configured. Add TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET to Supabase Edge Function secrets.",
    });
    const existing = await snapshot(userId);
    if (existing.channel?.channel_login === login && Date.now() - Date.parse(existing.channel.last_synced) < 90_000) {
      return json(req, 200, { ...existing, from_cache: true });
    }
    const bearer = await token();
    const users = await helix("users", { login }, bearer);
    const profile = users[0];
    if (!profile?.id) return json(req, 404, { error: "Twitch channel not found." });
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();
    const [streams, videos, clips] = await Promise.all([
      helix("streams", { user_id: profile.id, first: "1" }, bearer),
      helix("videos", { user_id: profile.id, type: "archive", first: "20" }, bearer),
      helix("clips", { broadcaster_id: profile.id, started_at: thirtyDaysAgo, ended_at: now.toISOString(), first: "30" }, bearer),
    ]);
    // Switching tracked channels must never mingle media from two different channels.
    if (existing.channel && existing.channel.broadcaster_id !== profile.id) {
      const { error: clearError } = await db.from("echo_twitch_media").delete().eq("user_id", userId);
      if (clearError) throw clearError;
    }
    const { error: channelError } = await db.from("echo_twitch_channels").upsert({
      user_id: userId, channel_login: profile.login.toLowerCase(), broadcaster_id: profile.id,
      display_name: profile.display_name, profile_image_url: profile.profile_image_url || null,
      live_data: streams[0] ? {
        id: streams[0].id, title: streams[0].title, game_name: streams[0].game_name,
        viewer_count: streams[0].viewer_count, started_at: streams[0].started_at,
      } : null,
      last_synced: now.toISOString(),
    }, { onConflict: "user_id" });
    if (channelError) throw channelError;
    const rows = [
      ...videos.map(v => ({
        user_id: userId, kind: "video", twitch_id: v.id, title: v.title || "Untitled VOD",
        url: v.url, thumbnail_url: v.thumbnail_url || null, created_at: v.created_at,
        view_count: v.view_count || 0, duration: v.duration || null, game_name: null, last_seen: now.toISOString(),
      })),
      ...clips.map(c => ({
        user_id: userId, kind: "clip", twitch_id: c.id, title: c.title || "Untitled clip",
        url: c.url, thumbnail_url: c.thumbnail_url || null, created_at: c.created_at,
        view_count: c.view_count || 0, duration: c.duration == null ? null : String(c.duration),
        game_name: c.game_name || null, last_seen: now.toISOString(),
      })),
    ];
    if (rows.length) {
      const { error: mediaError } = await db.from("echo_twitch_media").upsert(rows, { onConflict: "user_id,kind,twitch_id" });
      if (mediaError) throw mediaError;
    }
    return json(req, 200, { ...await snapshot(userId), from_cache: false });
  } catch (error) {
    console.error("echo-twitch request failed", error instanceof Error ? error.message : "Unknown failure");
    return json(req, 502, { error: "Twitch synchronization failed. Check the backend logs and try again." });
  }
});
