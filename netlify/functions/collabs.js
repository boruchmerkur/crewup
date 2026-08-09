// netlify/functions/collabs.js  →  /api/collabs
//
// A collab is a piece of work split by craft, with a public record of who
// brought which part. This function holds the LIVE ones. The first collab
// ships static in src/data.js and is not served from here — it has to survive
// this function being down, because it is the thing that explains the site.
// The client concatenates the two; both use the same shape.
//
// WHO MAY WRITE WHAT, and why it is split this way:
//   - Creating or editing a collab needs BOARD_ADMIN_KEY. A collab is a claim
//     about who did what, published under this site's name. Anonymous writes
//     to that would be a liability, not a feature.
//   - PROPOSING yourself for an opening is open to anyone, and is HELD until
//     released. Same posture as the board: containment, not moderation. A
//     proposal is a person offering work, so the cost of losing one to an
//     over-strict filter is higher than the cost of reviewing a bad one.
//
// The proposer sees their own held proposal (so it is not a void); everyone
// else sees only what has been released. `who` is the hashed-IP author token,
// is used for that check and for rate limiting, and never leaves the server.

import { getStore } from "@netlify/blobs";

const KEY = "collabs";
// Ids of collabs that live in src/data.js rather than here. Proposals against
// their openings are accepted and stored against a shell record.
const STATIC_IDS = new Set(["crewup-itself"]);
const MAX_COLLABS = 200;
const MAX_PROPOSALS = 60;      // per collab
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

async function ipHash(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}|${ip}|collabs`));
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

/* A commit ref is the evidence a log entry rests on. Store the bare sha and
   let the client build the URL, so the repo can move without rewriting data. */
const cleanRef = (v) => {
  const s = clean(v, 40).replace(/^.*\/commit\//, "");
  return /^[0-9a-f]{7,40}$/i.test(s) ? s.toLowerCase() : "";
};

/* Absent field means "not editing", never "delete". A publish that sends only
   {id, public:true} must not wipe the roles — that exact bug cost a whole
   composition on another project and is cheap to prevent here. */
const keep = (next, prev, fn) => (next === undefined ? prev : fn(next));

function cleanCollab(body, prev = {}) {
  const roles = keep(body.roles, prev.roles, (v) =>
    (Array.isArray(v) ? v : []).slice(0, 12).map((r) => ({
      craft: clean(r.craft, 48),
      who: clean(r.who, 80),
      kind: ["human", "ai", "both"].includes(r.kind) ? r.kind : "human",
      brought: clean(r.brought, 600),
    })).filter((r) => r.craft && r.who)
  );

  const log = keep(body.log, prev.log, (v) =>
    (Array.isArray(v) ? v : []).slice(0, 200).map((l) => ({
      at: clean(l.at, 10),
      craft: clean(l.craft, 48),
      what: clean(l.what, 300),
      ref: cleanRef(l.ref),
    })).filter((l) => l.what)
  );

  const openings = keep(body.openings, prev.openings, (v) =>
    (Array.isArray(v) ? v : []).slice(0, 12).map((o) => ({
      craft: clean(o.craft, 48),
      need: clean(o.need, 300),
    })).filter((o) => o.craft)
  );

  return {
    id: prev.id || crypto.randomUUID(),
    community: keep(body.community, prev.community, (v) => clean(v, 32).toLowerCase()) || "general",
    title: keep(body.title, prev.title, (v) => clean(v, 110)),
    one: keep(body.one, prev.one, (v) => clean(v, 240)),
    why: keep(body.why, prev.why, (v) => clean(v, 1400)),
    status: keep(body.status, prev.status, (v) => (["open", "active", "shipped"].includes(v) ? v : "open")) || "open",
    started: keep(body.started, prev.started, (v) => clean(v, 10)),
    repo: keep(body.repo, prev.repo, (v) => safeUrl(v)),
    roles: roles || [],
    log: log || [],
    openings: openings || [],
    proposals: prev.proposals || [],
    created: prev.created || new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

/* Strip anything a stranger should not see: the author tokens, and the held
   proposals that are not the caller's own. */
const publicView = (c, me) => ({
  ...c,
  proposals: (c.proposals || [])
    .filter((p) => !p.held || p.who === me)
    .map(({ who, ...rest }) => ({ ...rest, mine: who === me })),
});

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // Strong, not eventual: every write is read-modify-write on one list.
  const store = getStore({ name: "crewup-collabs", consistency: "strong" });
  const adminKey = Netlify.env.get("BOARD_ADMIN_KEY");
  const isAdmin = !!adminKey && req.headers.get("x-admin-key") === adminKey;
  const me = await ipHash(req.headers.get("x-nf-client-connection-ip") || "0.0.0.0");

  const read = async () => {
    try {
      return (await store.get(KEY, { type: "json" })) || [];
    } catch {
      return [];
    }
  };

  if (req.method === "GET") {
    const url = new URL(req.url);
    const wanted = clean(url.searchParams.get("community"), 32).toLowerCase();
    let all = await read();
    if (wanted) all = all.filter((c) => (c.community || "general") === wanted);
    return json({
      collabs: all.map((c) => (isAdmin ? c : publicView(c, me))),
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

  const act = clean(body.act, 20) || "save";
  const all = await read();

  /* ── Propose yourself for an opening — open to anyone, held ── */
  if (act === "propose") {
    if (clean(body.website, 10)) return json({ ok: true, id: "ignored" });          // honeypot
    if (typeof body.elapsed === "number" && body.elapsed < 3000) {
      return json({ error: "That was too fast — try again." }, 429);
    }
    const wantId = clean(body.id, 60);
    let i = all.findIndex((c) => c.id === wantId);

    /* The first collab ships static in data.js so it survives this function
       being down — but its openings are real and must be answerable. A
       proposal against one creates a shell record that exists only to hold
       proposals; the client merges it onto the static entry by id. */
    if (i === -1 && STATIC_IDS.has(wantId)) {
      all.unshift({ id: wantId, shell: true, community: "general", proposals: [], created: new Date().toISOString() });
      i = 0;
    }
    if (i === -1) return json({ error: "No such collab" }, 404);

    const name = clean(body.name, 60);
    const note = clean(body.note, 700);
    if (!name || !note) return json({ error: "A name and a line about what you'd bring." }, 400);
    if ((note.match(/https?:\/\//g) || []).length > 2) {
      return json({ error: "Two links maximum." }, 400);
    }

    const mine = (all[i].proposals || []).filter((p) => p.who === me);
    if (mine.length >= 3) return json({ error: "You've already proposed here today." }, 429);
    if (mine.some((p) => p.note === note)) return json({ ok: true, duplicate: true });
    if ((all[i].proposals || []).length >= MAX_PROPOSALS) {
      return json({ error: "This collab has all the proposals it can hold." }, 429);
    }

    all[i].proposals = [
      ...(all[i].proposals || []),
      {
        pid: crypto.randomUUID(),
        craft: clean(body.craft, 48),
        name,
        contact: safeUrl(body.contact) || clean(body.contact, 120),
        note,
        held: true,
        who: me,
        at: new Date().toISOString(),
      },
    ];
    await store.setJSON(KEY, all);
    return json({ ok: true, held: true });
  }

  /* ── Everything below is the author's desk ── */
  if (!isAdmin) return json({ error: "Not authorised" }, 401);

  if (act === "release" || act === "hide" || act === "remove") {
    const i = all.findIndex((c) => c.id === clean(body.id, 60));
    if (i === -1) return json({ error: "No such collab" }, 404);
    const pid = clean(body.pid, 60);
    all[i].proposals = (all[i].proposals || [])
      .filter((p) => !(act === "remove" && p.pid === pid))
      .map((p) => (p.pid === pid && act !== "remove" ? { ...p, held: act === "hide" } : p));
    await store.setJSON(KEY, all);
    return json({ ok: true });
  }

  if (act === "delete") {
    const id = clean(body.id, 60);
    await store.setJSON(KEY, all.filter((c) => c.id !== id));
    return json({ ok: true });
  }

  if (act === "save") {
    const id = clean(body.id, 60);
    const i = id ? all.findIndex((c) => c.id === id) : -1;
    const next = cleanCollab(body, i === -1 ? {} : all[i]);
    if (!next.title) return json({ error: "A collab needs a title." }, 400);

    if (i === -1) all.unshift(next);
    else all[i] = next;
    await store.setJSON(KEY, all.slice(0, MAX_COLLABS));
    return json({ ok: true, collab: publicView(next, me) });
  }

  return json({ error: "Unknown action" }, 400);
};

export const config = { path: "/api/collabs" };
