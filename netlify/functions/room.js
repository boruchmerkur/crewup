// netlify/functions/room.js  →  /api/room
//
// A room is a chat plus one shared code buffer.
//
// WHY THERE IS A DRIVER RATHER THAN FREE SIMULTANEOUS EDITING:
// this stack has no persistent connections — a serverless function cannot hold
// a socket — so clients poll. Under polling, two people typing into one buffer
// means last-write-wins, and last-write-wins on a text field silently destroys
// whatever the other person just typed. The honest options were operational
// transform against a revision log (a large amount of machinery, and wrong at
// 2-second latency anyway) or an explicit keyboard.
//
// The explicit keyboard is also what this site's own playbook argues for:
// driver types, navigator thinks ahead, swap on a timer. So the pad has one
// driver at a time, the claim expires on its own, and anyone can take it once
// it lapses. Nobody is ever locked out by someone closing their laptop.
//
// Writes are guarded by revision: a patch carries the rev it was based on, and
// a stale patch is refused rather than applied. That is what makes the driver
// real instead of advisory.
//
// No accounts, per the site's stated rules: a display name is chosen in the
// browser and sent with each message. The only server-side identity is a
// daily-rehashed IP, used for rate limiting and to recognise the driver. It is
// never returned to any client.

import { getStore } from "@netlify/blobs";

const MAX_MSGS = 250;            // per room, oldest dropped
const MAX_MSG_LEN = 800;
const MAX_PAD = 60000;           // ~60KB of code is plenty; refuses beyond
const MSG_TTL_MS = 24 * 60 * 60 * 1000;
const DRIVER_MS = 8 * 60 * 1000; // a claim lapses after 8 idle minutes
const PRESENCE_MS = 45 * 1000;   // "here now" window
const RATE = { msgs: 25, perMs: 60 * 1000 };

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

const clean = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const slug = (v) => clean(v, 32).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") || "lobby";

async function whoHash(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}|${ip}|room`));
  return [...new Uint8Array(d)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const blank = (name) => ({
  name,
  msgs: [],
  pad: {
    text:
      "// Shared pad. Whoever holds the keyboard types; everyone else sees it\n" +
      "// within a couple of seconds. Take it when it's free.\n\n",
    lang: "javascript",
    rev: 0,
    driver: null,      // { who, name, until }
    updated: null,
  },
  seen: {},            // who -> last ping (presence)
  created: new Date().toISOString(),
});

/* Presence and driver both expire on read, so a client that vanished mid-turn
   never holds anything hostage. */
function decay(room, now) {
  for (const [w, t] of Object.entries(room.seen || {})) {
    if (now - new Date(t).getTime() > PRESENCE_MS) delete room.seen[w];
  }
  const d = room.pad.driver;
  if (d && new Date(d.until).getTime() < now) room.pad.driver = null;
  room.msgs = (room.msgs || []).filter((m) => now - new Date(m.at).getTime() < MSG_TTL_MS);
  return room;
}

const publicRoom = (room, since) => ({
  name: room.name,
  msgs: (room.msgs || []).filter((m) => m.n > since).map(({ who, ...m }) => m),
  pad: {
    text: room.pad.text,
    lang: room.pad.lang,
    rev: room.pad.rev,
    driver: room.pad.driver ? { name: room.pad.driver.name, until: room.pad.driver.until } : null,
    updated: room.pad.updated,
  },
  here: Object.keys(room.seen || {}).length,
  cursor: (room.msgs || []).reduce((m, x) => Math.max(m, x.n), 0),
});

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const store = getStore({ name: "crewup-rooms", consistency: "strong" });
  const url = new URL(req.url);
  const who = await whoHash(req.headers.get("x-nf-client-connection-ip") || "0.0.0.0");
  const now = Date.now();

  const load = async (name) => {
    let r;
    try {
      r = await store.get(name, { type: "json" });
    } catch {
      r = null;
    }
    return decay(r || blank(name), now);
  };

  if (req.method === "GET") {
    const name = slug(url.searchParams.get("room"));
    const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;
    const room = await load(name);

    // A read also refreshes presence, so simply having the tab open counts.
    room.seen = { ...(room.seen || {}), [who]: new Date(now).toISOString() };
    await store.setJSON(name, room);

    return json({
      ...publicRoom(room, since),
      youDrive: !!(room.pad.driver && room.pad.driver.who === who),
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const name = slug(body.room);
  const act = clean(body.act, 16);
  const room = await load(name);
  const nick = clean(body.name, 28) || "someone";

  room.seen = { ...(room.seen || {}), [who]: new Date(now).toISOString() };

  if (act === "say") {
    if (clean(body.website, 10)) return json({ ok: true });                    // honeypot
    const text = clean(body.text, MAX_MSG_LEN);
    if (!text) return json({ error: "Nothing to send." }, 400);
    if ((text.match(/https?:\/\//g) || []).length > 2) {
      return json({ error: "Two links maximum." }, 400);
    }
    const recent = (room.msgs || []).filter((m) => m.who === who && now - new Date(m.at).getTime() < RATE.perMs);
    if (recent.length >= RATE.msgs) return json({ error: "Slow down a moment." }, 429);
    if (recent.length && recent[recent.length - 1].text === text) return json({ ok: true });

    const n = (room.msgs || []).reduce((m, x) => Math.max(m, x.n), 0) + 1;
    room.msgs = [...(room.msgs || []), { n, name: nick, text, at: new Date(now).toISOString(), who }].slice(-MAX_MSGS);
    await store.setJSON(name, room);
    return json({ ok: true, n });
  }

  /* Take the keyboard. Free if nobody holds it or the hold lapsed; the current
     driver may also extend their own turn by claiming again. */
  if (act === "claim") {
    const d = room.pad.driver;
    if (d && d.who !== who) return json({ error: `${d.name} has the keyboard.`, driver: { name: d.name, until: d.until } }, 409);
    room.pad.driver = { who, name: nick, until: new Date(now + DRIVER_MS).toISOString() };
    await store.setJSON(name, room);
    return json({ ok: true, driver: { name: nick, until: room.pad.driver.until } });
  }

  if (act === "release") {
    if (room.pad.driver && room.pad.driver.who === who) room.pad.driver = null;
    await store.setJSON(name, room);
    return json({ ok: true });
  }

  /* Only the driver may write, and only against the revision they last saw.
     A stale patch is refused rather than merged — refusing is recoverable,
     silently overwriting someone's paragraph is not. */
  if (act === "patch") {
    const d = room.pad.driver;
    if (!d || d.who !== who) return json({ error: "You don't have the keyboard." }, 403);
    if (typeof body.rev === "number" && body.rev !== room.pad.rev) {
      return json({ error: "The pad moved on — pull the latest.", rev: room.pad.rev }, 409);
    }
    const text = String(body.text ?? "");
    if (text.length > MAX_PAD) return json({ error: "That pad is too large." }, 413);

    room.pad.text = text;
    if (body.lang) room.pad.lang = clean(body.lang, 20);
    room.pad.rev += 1;
    room.pad.updated = new Date(now).toISOString();
    room.pad.driver = { ...d, until: new Date(now + DRIVER_MS).toISOString() };   // typing extends the turn
    await store.setJSON(name, room);
    return json({ ok: true, rev: room.pad.rev });
  }

  if (act === "ping") {
    await store.setJSON(name, room);
    return json({ ok: true });
  }

  /* Site-owner moderation. Same key as the board. */
  const adminKey = Netlify.env.get("BOARD_ADMIN_KEY");
  if (adminKey && req.headers.get("x-admin-key") === adminKey) {
    if (act === "delete") {
      room.msgs = (room.msgs || []).filter((m) => m.n !== body.n);
      await store.setJSON(name, room);
      return json({ ok: true });
    }
    if (act === "clear") {
      await store.setJSON(name, blank(name));
      return json({ ok: true });
    }
  }

  return json({ error: "Unknown action" }, 400);
};

export const config = { path: "/api/room" };
