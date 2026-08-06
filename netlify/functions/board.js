// netlify/functions/board.js
// The collaboration board — "needs help" and "available for work" posts.
//
// STORAGE: Netlify Blobs. No external database, no credentials to manage.
// Posts live in a single JSON document because the board is small and read
// far more often than written; when it outgrows that (past ~500 posts) split
// by kind or move to a real store.
//
// ENRICHMENT HAPPENS HERE, AT POST TIME — not in the browser. GitHub's
// unauthenticated API allows 60 requests/hour per IP. Enriching client-side
// would burn that in one page load of twenty cards and then show nothing for
// everyone. Enriching once at submit and storing the snapshot means the board
// renders instantly and never rate-limits.

import { getStore } from "@netlify/blobs";

const KEY = "posts";
const MAX_POSTS = 500;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, x-admin-key",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" },
  });

/* ── Helpers ─────────────────────────────────────────────── */

const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

async function ipHash(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}|${ip}|board`));
  return [...new Uint8Array(d)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const p = new URL(s);
    if (!/^https?:$/.test(p.protocol)) return null;
    if (!p.hostname.includes(".")) return null;
    return p.toString();
  } catch {
    return null;
  }
}

/* Pull a GitHub profile plus its most-starred repos. This is the single
   biggest reason to post — your work renders on the card automatically. */
async function githubSnapshot(handle) {
  const user = clean(handle, 40).replace(/^@/, "").replace(/^https?:\/\/(www\.)?github\.com\//i, "").split("/")[0];
  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(user)) return null;

  try {
    const headers = { accept: "application/vnd.github+json", "user-agent": "crewup-board" };
    const [uRes, rRes] = await Promise.all([
      fetch(`https://api.github.com/users/${user}`, { headers, signal: AbortSignal.timeout(6000) }),
      fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=updated`, { headers, signal: AbortSignal.timeout(6000) }),
    ]);
    if (!uRes.ok) return null;

    const u = await uRes.json();
    const repos = rRes.ok ? await rRes.json() : [];

    const top = (Array.isArray(repos) ? repos : [])
      .filter((r) => !r.fork)
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 3)
      .map((r) => ({
        name: clean(r.name, 60),
        desc: clean(r.description, 110),
        stars: r.stargazers_count || 0,
        lang: clean(r.language, 24),
        url: r.html_url,
      }));

    const langs = {};
    (Array.isArray(repos) ? repos : []).forEach((r) => {
      if (r.language && !r.fork) langs[r.language] = (langs[r.language] || 0) + 1;
    });

    return {
      user,
      name: clean(u.name, 60),
      bio: clean(u.bio, 160),
      avatar: u.avatar_url,
      followers: u.followers || 0,
      repos: u.public_repos || 0,
      url: u.html_url,
      langs: Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([l]) => l),
      top,
    };
  } catch {
    return null;
  }
}

/* Open Graph card for a portfolio or personal site. */
async function ogSnapshot(url) {
  const target = safeUrl(url);
  if (!target) return null;
  try {
    const res = await fetch(target, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; crewup-board/1.0)" },
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").includes("text/html")) return null;

    const html = (await res.text()).slice(0, 200000);
    const meta = (prop) => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']|` +
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
        "i"
      );
      const m = html.match(re);
      return m ? clean(m[1] || m[2], 200) : "";
    };
    const titleTag = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);

    let image = meta("og:image") || meta("twitter:image");
    if (image) { try { image = new URL(image, target).toString(); } catch { image = ""; } }

    return {
      url: target,
      host: new URL(target).hostname.replace(/^www\./, ""),
      title: meta("og:title") || (titleTag ? clean(titleTag[1], 120) : ""),
      desc: clean(meta("og:description") || meta("description"), 180),
      image: image || "",
    };
  } catch {
    return null;
  }
}

/* ── Handler ─────────────────────────────────────────────── */

export default async (req, context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const store = getStore("crewup-board");

  const read = async () => {
    try {
      return (await store.get(KEY, { type: "json" })) || [];
    } catch {
      return [];
    }
  };

  /* ── LIST ── */
  if (req.method === "GET") {
    const posts = await read();
    return json({ posts: posts.filter((p) => !p.hidden) });
  }

  /* ── DELETE (admin, or author within their session) ── */
  if (req.method === "DELETE") {
    const adminKey = Netlify.env.get("BOARD_ADMIN_KEY");
    if (!adminKey || req.headers.get("x-admin-key") !== adminKey) {
      return json({ error: "Not authorised" }, 401);
    }
    const { id } = await req.json().catch(() => ({}));
    const posts = await read();
    await store.setJSON(KEY, posts.filter((p) => p.id !== id));
    return json({ ok: true });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  /* ── CREATE ── */
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  // Spam gate 1: honeypot. Real people never fill a hidden field.
  if (clean(body.website, 10)) return json({ ok: true, id: "ignored" });

  // Spam gate 2: humans take more than three seconds to write a post.
  if (typeof body.elapsed === "number" && body.elapsed < 3000) {
    return json({ error: "That was too fast — try again." }, 429);
  }

  const kind = body.kind === "project" ? "project" : "person";
  const name = clean(body.name, 60);
  const title = clean(body.title, 110);
  const text = clean(body.body, 1200);

  if (!name || !title) return json({ error: "Name and title are required." }, 400);
  if (text.length < 20) return json({ error: "Tell us a bit more — 20 characters minimum." }, 400);

  // Spam gate 3: link stuffing.
  const linkCount = (text.match(/https?:\/\//gi) || []).length;
  if (linkCount > 2) return json({ error: "Too many links in the description." }, 400);

  const posts = await read();

  // Spam gate 4: rate limit per hashed IP per day.
  const who = await ipHash(context.ip || "0.0.0.0");
  const today = new Date().toISOString().slice(0, 10);
  const mine = posts.filter((p) => p.who === who && p.created.startsWith(today));
  if (mine.length >= 3) {
    return json({ error: "You've posted three times today — come back tomorrow." }, 429);
  }

  // Spam gate 5: exact duplicate.
  if (posts.some((p) => p.title === title && p.name === name)) {
    return json({ error: "That looks like a duplicate." }, 409);
  }

  // Enrichment — the reason posting here is worth more than posting elsewhere.
  const [github, og] = await Promise.all([
    body.github ? githubSnapshot(body.github) : null,
    body.portfolio ? ogSnapshot(body.portfolio) : null,
  ]);

  const post = {
    id: crypto.randomUUID(),
    kind,
    name,
    title,
    body: text,
    role: clean(body.role, 60),
    skills: (Array.isArray(body.skills) ? body.skills : String(body.skills || "").split(","))
      .map((s) => clean(s, 24)).filter(Boolean).slice(0, 8),
    availability: clean(body.availability, 40),
    location: clean(body.location, 40),
    contact: safeUrl(body.contact) || clean(body.contact, 120),
    links: (Array.isArray(body.links) ? body.links : []).map(safeUrl).filter(Boolean).slice(0, 4),
    github,
    og,
    who,
    created: new Date().toISOString(),
  };

  const next = [post, ...posts].slice(0, MAX_POSTS);
  await store.setJSON(KEY, next);

  return json({ ok: true, post });
};

export const config = { path: "/api/board" };
