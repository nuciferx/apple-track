/**
 * Apple Track — Cloudflare Worker API
 *
 * Reads Screen Time data from Google Sheets and serves aggregated JSON.
 *
 * Secrets (set via: wrangler secret put <NAME>):
 *   GCP_SA_KEY  — full JSON of GCP service account key
 *   SHEET_ID    — Google Sheet ID
 */

export interface Env {
  GCP_SA_KEY: string;
  SHEET_ID: string;
}

// ── CORS ──────────────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function errorResponse(msg: string, status = 500, origin: string | null = null) {
  return jsonResponse({ error: msg }, status, origin);
}

// ── Google Sheets JWT auth ────────────────────────────────────────────────────

async function getGoogleToken(saKeyJson: string): Promise<string> {
  const decoded = atob(saKeyJson);
  const sa = JSON.parse(decoded);
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${header}.${payload}`;

  // Import RSA private key
  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${sig}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const { access_token } = await resp.json() as { access_token: string };
  return access_token;
}

// ── Read all rows from Sheet ──────────────────────────────────────────────────

interface SheetRow {
  source_hash: string;
  bundle_id: string;
  app_name: string;
  duration_secs: number;
  start_time: string;  // ISO string
  end_time: string;
  date_local: string;  // YYYY-MM-DD
}

async function getFirstSheetName(token: string, sheetId: string): Promise<string> {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await resp.json() as { sheets: { properties: { title: string } }[] };
  return data.sheets[0].properties.title;
}

async function fetchSheetRows(token: string, sheetId: string): Promise<SheetRow[]> {
  const sheetName = await getFirstSheetName(token, sheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:G`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) throw new Error(`Sheets API error: ${resp.status}`);

  const data = await resp.json() as { values?: string[][] };
  const rows = data.values ?? [];
  if (rows.length < 2) return [];

  // Skip header row
  return rows.slice(1).map((r) => ({
    source_hash: r[0] ?? "",
    bundle_id: r[1] ?? "",
    app_name: r[2] ?? "",
    duration_secs: Number(r[3]) || 0,
    start_time: r[4] ?? "",
    end_time: r[5] ?? "",
    date_local: r[6] ?? "",
  }));
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function aggregateByApp(rows: SheetRow[]) {
  const map = new Map<string, { app_name: string; bundle_id: string; total_secs: number; sessions: number }>();
  for (const r of rows) {
    if (!map.has(r.bundle_id)) {
      map.set(r.bundle_id, { app_name: r.app_name, bundle_id: r.bundle_id, total_secs: 0, sessions: 0 });
    }
    const e = map.get(r.bundle_id)!;
    e.total_secs += r.duration_secs;
    e.sessions += 1;
  }
  return [...map.values()].sort((a, b) => b.total_secs - a.total_secs);
}

function aggregateByDay(rows: SheetRow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.date_local, (map.get(r.date_local) ?? 0) + r.duration_secs);
  }
  return [...map.entries()]
    .map(([date, total_secs]) => ({ date, total_secs }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (path === "/health") {
      return jsonResponse({ status: "ok" }, 200, origin);
    }

    // Auth with Google
    let token: string;
    try {
      token = await getGoogleToken(env.GCP_SA_KEY);
    } catch (e) {
      return errorResponse(`Auth failed: ${e}`, 500, origin);
    }

    let allRows: SheetRow[];
    try {
      allRows = await fetchSheetRows(token, env.SHEET_ID);
    } catch (e) {
      return errorResponse(`Sheet read failed: ${e}`, 500, origin);
    }

    // GET /api/today
    if (path === "/api/today") {
      const today = todayLocal();
      const rows = allRows.filter((r) => r.date_local === today);
      const apps = aggregateByApp(rows);
      const total_secs = apps.reduce((s, a) => s + a.total_secs, 0);
      return jsonResponse({ date: today, total_secs, apps }, 200, origin);
    }

    // GET /api/week
    if (path === "/api/week") {
      const since = dateNDaysAgo(7);
      const rows = allRows.filter((r) => r.date_local >= since);
      const by_day = aggregateByDay(rows);
      const by_app = aggregateByApp(rows).slice(0, 10);
      const total_secs = by_day.reduce((s, d) => s + d.total_secs, 0);
      const avg_secs = by_day.length ? Math.round(total_secs / by_day.length) : 0;
      return jsonResponse({ since, total_secs, avg_secs, by_day, by_app }, 200, origin);
    }

    // GET /api/apps
    if (path === "/api/apps") {
      const since = dateNDaysAgo(30);
      const rows = allRows.filter((r) => r.date_local >= since);
      const apps = aggregateByApp(rows);
      return jsonResponse({ apps }, 200, origin);
    }

    return errorResponse("Not found", 404, origin);
  },
};
