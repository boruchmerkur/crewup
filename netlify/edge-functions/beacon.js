/* ═══════════════════════════════════════════════════════════════
   EDGE FUNCTION — /api/beacon

   Receives an analytics event from the browser, enriches it with
   data only available at the edge (country, city, IP hash, bot
   detection), and forwards it to your DreamSite dashboard.

   ── SETUP ──────────────────────────────────────────────────────
   In Netlify:  Site settings → Environment variables

     DREAMSITE_ENDPOINT   https://dreamsitedesign.com/api/ingest
     DREAMSITE_TOKEN      (a shared secret; sent as a Bearer token)

   If DREAMSITE_ENDPOINT is unset, the function still returns 204
   and simply logs to the Netlify function log — so the site works
   before the dashboard is wired up.
   ═══════════════════════════════════════════════════════════════ */

/* Hash the IP rather than store it. Gives you unique-visitor counts
   without holding a personal identifier. Salt rotates daily, so the
   hash can't be used to follow someone across days. */
async function hashIp(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}|${day}|crewup`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

const BOT = /bot|crawl|spider|slurp|bing|baidu|yandex|duckduck|facebookexternalhit|headless|lighthouse|preview/i;

export default async (request, context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const ua = request.headers.get("user-agent") || "";
  const isBot = BOT.test(ua);

  const record = {
    ...body,
    // Edge-only enrichment — none of this is available client-side.
    country: context.geo?.country?.code || null,
    region: context.geo?.subdivision?.code || null,
    city: context.geo?.city || null,
    tz: context.geo?.timezone || null,
    visitor: await hashIp(context.ip || "0.0.0.0"),
    ua,
    bot: isBot,
    edge: context.server?.region || null,
    received: new Date().toISOString(),
  };

  const endpoint = Netlify.env.get("DREAMSITE_ENDPOINT");
  const token = Netlify.env.get("DREAMSITE_TOKEN");

  if (!endpoint) {
    // Not wired up yet — visible in Netlify's function logs.
    console.log("[beacon]", JSON.stringify(record));
    return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } });
  }

  // Bots are counted but not forwarded, to keep the dashboard clean.
  if (isBot) {
    return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } });
  }

  // Fire and forget — never make the visitor wait on analytics.
  context.waitUntil(
    fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(record),
    }).catch((e) => console.log("[beacon] forward failed:", e.message))
  );

  return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } });
};

export const config = { path: "/api/beacon" };
