// netlify/functions/preview.js  →  /api/preview
//
// Roughly a fifth of feed items arrive with no picture, because the FEED
// carries none — the article itself has an og:image, the syndicated copy just
// doesn't mention it. Eight of the thirty sources ship no images at all
// (Stack Overflow Blog, The Changelog, Honeycomb, VS Code, Linear, FOSS Force,
// and the two aggregators). This fetches the article page server-side, reads
// the social preview tag out of its <head>, and caches the answer.
//
// WHY SERVER-SIDE. Doing it in the browser would mean every visitor fetching
// dozens of publisher pages on page load — slow, rate-limited, and it hands
// each visitor's IP to every publisher, which is the exact thing /api/img was
// built to avoid. Here it happens once per article, ever, for everybody.
//
// Only the <head> is read: the response is consumed in chunks and abandoned
// as soon as </head> appears or the cap is hit, so a 4MB article costs about
// 30KB of transfer.
//
// Failures are cached too. A page with no og:image will never have one on the
// next poll either, and re-fetching it hourly for nothing is the kind of quiet
// waste nobody notices until the bill.

import { getStore } from "@netlify/blobs";

const MAX_URLS = 14;              // per request
const HEAD_CAP = 96 * 1024;       // stop reading after this much HTML
const FETCH_MS = 4000;      // per publisher
const BUDGET_MS = 7000;     // for the whole request, well inside the function limit
const HIT_TTL = 30 * 24 * 3600 * 1000;   // a found image is good for a month
const MISS_TTL = 7 * 24 * 3600 * 1000;   // a miss is rechecked after a week

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json", "cache-control": "public, max-age=600" },
  });

/* Same guard as the image proxy: this takes a URL from the page, so it must
   never be usable to read cloud metadata or anything else internal. */
const BLOCKED_HOST = /^(localhost|.*\.local|.*\.internal|metadata\..*)$/i;
const BLOCKED_IP = new RegExp(
  "^(127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.|169\\.254\\.|0\\.|::1$|f[cd][0-9a-f]{2}:)",
  "i"
);

function safe(u) {
  let p;
  try {
    p = new URL(String(u));
  } catch {
    return null;
  }
  if (!/^https?:$/.test(p.protocol)) return null;
  if (!p.hostname.includes(".")) return null;
  if (BLOCKED_HOST.test(p.hostname) || BLOCKED_IP.test(p.hostname)) return null;
  return p;
}

async function keyFor(url) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return "p_" + [...new Uint8Array(d)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Read only as far as the head. Publishers put og:* at the top; anyone who
   doesn't wasn't going to give us a usable image anyway. */
async function readHead(res, deadline) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const dec = new TextDecoder("utf-8", { fatal: false });
  let html = "";
  try {
    while (html.length < HEAD_CAP) {
      if (Date.now() > deadline) break;
      const { done, value } = await raced(reader.read(), Math.max(250, deadline - Date.now()));
      if (!value && !done) break;               // the read itself stalled
      if (done) break;
      html += dec.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
  } finally {
    try { await reader.cancel(); } catch { /* already closed */ }
  }
  return html;
}

const META = [
  /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
];

const JUNK = /1x1|\bpixel\b|spacer|blank|transparent|\btrack\b|beacon|gravatar|avatar|sprite/i;

async function lookOnce(url) {
  const p = safe(url);
  if (!p) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_MS);
  try {
    const res = await fetch(p.toString(), {
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        // Our own identity, not the visitor's. No referrer, no cookies.
        "user-agent": "crewup-preview/1.0 (+https://crewup.dev)",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en",
      },
    });
    if (!res.ok) return null;
    if (!/text\/html|application\/xhtml/i.test(res.headers.get("content-type") || "")) return null;

    const html = await readHead(res, Date.now() + FETCH_MS);
    for (const re of META) {
      const m = html.match(re);
      if (!m) continue;
      let raw = m[1].trim().replace(/&amp;/g, "&");
      if (!raw || JUNK.test(raw)) continue;
      try {
        const abs = new URL(raw, res.url || p.toString());
        if (!/^https?:$/.test(abs.protocol)) continue;
        return abs.toString();
      } catch {
        /* malformed content attribute */
      }
    }
    return null;
  } catch {
    return null;      // timeout, DNS, TLS, redirect loop — all the same to us
  } finally {
    clearTimeout(t);
  }
}

/* AbortController was not enough on its own — a publisher that accepts the
   connection and then stalls left the read pending, the function ran past its
   limit, and the CALLER GOT NOTHING. Since the lookups run in parallel, one
   such host took the whole batch down with it, which is why several sources
   stayed blank no matter how often they were retried.

   So every lookup also races a timer, and the request as a whole stops at a
   budget. A lookup that ran out of time resolves to `undefined` rather than
   `null`: null means "asked, nothing there" and gets cached, undefined means
   "never got an answer" and must not be. */
function raced(promise, ms) {
  let timer;
  const bell = new Promise((res) => { timer = setTimeout(() => res(undefined), ms); });
  // clearTimeout is NOT optional here. A Node function is not finalised until
  // its event loop drains, so a timer left pending holds the whole response
  // hostage — every call, including cache hits that had already finished their
  // work, hung until the platform killed it and the caller got nothing at all.
  return Promise.race([promise, bell]).finally(() => clearTimeout(timer));
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const store = getStore({ name: "crewup-preview" });   // eventual is fine: it is a cache
  const now = Date.now();

  let urls = [];
  if (req.method === "GET") {
    const u = new URL(req.url).searchParams.get("url");
    if (u) urls = [u];
  } else if (req.method === "POST") {
    try {
      const b = await req.json();
      urls = Array.isArray(b.urls) ? b.urls : [];
    } catch {
      return json({ error: "Bad request" }, 400);
    }
  } else {
    return json({ error: "Method not allowed" }, 405);
  }

  urls = [...new Set(urls.filter((u) => typeof u === "string").map((u) => u.trim()))].slice(0, MAX_URLS);
  if (!urls.length) return json({ previews: {} });

  const out = {};
  await raced(Promise.all(
    urls.map(async (url) => {
      const key = await keyFor(url);
      try {
        const hit = await store.get(key, { type: "json" });
        if (hit) {
          const age = now - (hit.at || 0);
          const fresh = hit.image ? age < HIT_TTL : age < MISS_TTL;
          if (fresh) { out[url] = hit.image; return; }
        }
      } catch { /* cold cache */ }

      const image = await raced(lookOnce(url), FETCH_MS + 500);
      if (image === undefined) return;          // timed out: report nothing, cache nothing
      out[url] = image;
      try {
        await store.setJSON(key, { image, at: now });
      } catch { /* a cache write failing must not fail the request */ }
    })
  ), BUDGET_MS);

  // Whatever resolved in time. The rest are simply absent from the map, and
  // the client leaves those items on their gradient — a partial answer beats
  // a dead request.
  return json({ previews: out });
};

export const config = { path: "/api/preview" };
