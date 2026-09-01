// netlify/functions/showcase.js  →  /api/showcase
//
// Things people made. Anyone can submit; nothing appears until it is released.
//
// WHY HELD RATHER THAN OPEN: a public list of links with pictures is the most
// spammable surface on any site, and unlike the board — where a bad post is
// visibly a bad post — a showcase entry looks legitimate by construction. The
// gates below are containment, not moderation; the review queue is the actual
// defence.
//
// NO IMAGE IS STORED OR UPLOADED. An entry is a URL, and the picture comes
// from that page's own og:image via /api/preview, which already fetches and
// caches exactly that. So there is no upload endpoint to abuse, no storage to
// fill, and a project that changes its screenshot updates here for free.
//
// The submitter sees their own held entry so it is not a void. `who` is the
// daily-hashed IP, used for that and for rate limiting, and never leaves here.

import { getStore } from "@netlify/blobs";

const KEY = "entries";
const MAX = 400;
const KINDS = ["widget", "app", "tool", "site"];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-admin-key",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" },
  });

const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function safeUrl(u) {
  let s = String(u ?? "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const p = new URL(s);
    if (!/^https?:$/.test(p.protocol)) return null;
    if (!p.hostname.includes(".")) return null;
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(p.hostname)) return null;
    p.hash = "";
    return p.toString();
  } catch {
    return null;
  }
}

// Same project submitted twice with different tracking parameters is the same
// project. Compared on host + path only.
const sameThing = (a, b) => {
  try {
    const x = new URL(a), y = new URL(b);
    return x.hostname.replace(/^www\./, "") === y.hostname.replace(/^www\./, "")
      && x.pathname.replace(/\/$/, "") === y.pathname.replace(/\/$/, "");
  } catch {
    return a === b;
  }
};

async function whoHash(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}|${ip}|showcase`));
  return [...new Uint8Array(d)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const publicView = (e, me) => {
  const { who, ...rest } = e;
  return { ...rest, mine: who === me };
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const store = getStore({ name: "crewup-showcase", consistency: "strong" });
  const adminKey = Netlify.env.get("BOARD_ADMIN_KEY");
  const isAdmin = !!adminKey && req.headers.get("x-admin-key") === adminKey;
  const me = await whoHash(req.headers.get("x-nf-client-connection-ip") || "0.0.0.0");

  const read = async () => {
    try {
      return (await store.get(KEY, { type: "json" })) || [];
    } catch {
      return [];
    }
  };

  if (req.method === "GET") {
    const all = await read();
    const kind = clean(new URL(req.url).searchParams.get("kind"), 12);
    const visible = all.filter((e) => !e.held || e.who === me || isAdmin);
    const filtered = kind && KINDS.includes(kind) ? visible.filter((e) => e.kind === kind) : visible;
    return json({
      entries: filtered
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(b.at) - new Date(a.at))
        .map((e) => (isAdmin ? e : publicView(e, me))),
      pending: isAdmin ? all.filter((e) => e.held).length : undefined,
      admin: isAdmin,
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const act = clean(body.act, 16) || "submit";
  const all = await read();

  if (act === "submit") {
    if (clean(body.website, 10)) return json({ ok: true });                       // honeypot
    if (typeof body.elapsed === "number" && body.elapsed < 3000) {
      return json({ error: "That was too fast — try again." }, 429);
    }

    const url = safeUrl(body.url);
    const title = clean(body.title, 70);
    const blurb = clean(body.blurb, 300);
    if (!url) return json({ error: "That link doesn't look right." }, 400);
    if (!title) return json({ error: "It needs a name." }, 400);
    if (!blurb) return json({ error: "One line on what it does, please." }, 400);
    if ((blurb.match(/https?:\/\//g) || []).length > 0) {
      return json({ error: "Keep links out of the description — the entry already has one." }, 400);
    }

    if (all.some((e) => sameThing(e.url, url))) {
      return json({ error: "That one is already here." }, 409);
    }
    const mine = all.filter((e) => e.who === me && Date.now() - new Date(e.at).getTime() < 86400000);
    if (mine.length >= 3) return json({ error: "Three a day is the limit." }, 429);

    const entry = {
      id: crypto.randomUUID(),
      title,
      url,
      blurb,
      kind: KINDS.includes(body.kind) ? body.kind : "app",
      maker: clean(body.maker, 50),
      held: true,
      featured: false,
      who: me,
      at: new Date().toISOString(),
    };
    await store.setJSON(KEY, [entry, ...all].slice(0, MAX));
    return json({ ok: true, held: true, entry: publicView(entry, me) });
  }

  /* ── the author's desk ── */
  if (!isAdmin) return json({ error: "Not authorised" }, 401);

  const id = clean(body.id, 60);
  const i = all.findIndex((e) => e.id === id);

  if (act === "release" || act === "hide") {
    if (i === -1) return json({ error: "No such entry" }, 404);
    all[i].held = act === "hide";
    await store.setJSON(KEY, all);
    return json({ ok: true });
  }
  if (act === "feature") {
    if (i === -1) return json({ error: "No such entry" }, 404);
    all[i].featured = !all[i].featured;
    await store.setJSON(KEY, all);
    return json({ ok: true, featured: all[i].featured });
  }
  if (act === "remove") {
    await store.setJSON(KEY, all.filter((e) => e.id !== id));
    return json({ ok: true });
  }

  /* Add straight to the list, already released. For seeding the shelf so it is
     not empty on the day it launches. */
  if (act === "add") {
    const url = safeUrl(body.url);
    const title = clean(body.title, 70);
    if (!url || !title) return json({ error: "Needs a title and a link." }, 400);
    if (all.some((e) => sameThing(e.url, url))) return json({ error: "Already here." }, 409);
    const entry = {
      id: crypto.randomUUID(),
      title,
      url,
      blurb: clean(body.blurb, 300),
      kind: KINDS.includes(body.kind) ? body.kind : "app",
      maker: clean(body.maker, 50),
      held: false,
      featured: !!body.featured,
      who: "seed",
      at: new Date().toISOString(),
    };
    await store.setJSON(KEY, [entry, ...all].slice(0, MAX));
    return json({ ok: true, entry: publicView(entry, me) });
  }

  return json({ error: "Unknown action" }, 400);
};

export const config = { path: "/api/showcase" };
