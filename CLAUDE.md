# Crewup — project context

You are picking this up mid-flight. The site is **built and working**; what is
not done is getting it deployed in a way that activates the server-side half.
Read "Immediate task" first.

Domain: **crewup.dev** (registered at GoDaddy, not yet pointed).
Repo: `github.com/boruchmerkur/crewup`.

---

## Immediate task

Every deploy so far has been a Netlify drag-and-drop. Drop does not run a build,
and **Netlify v2 functions only bundle during a build**. So all six functions
have been published as inert static JavaScript files. The site renders; every
`/api/*` route 404s.

Consequences right now: no analytics recorded, board posts cannot be saved, the
feed falls back to flaky public CORS proxies, and thumbnails load direct from
third-party CDNs instead of the cached proxy.

**The fix, in order:**

1. Push this repo to GitHub if it isn't already there.
2. Netlify → Add new site → Import an existing project → GitHub → `crewup`.
   It reads `netlify.toml` and self-configures. Deploy.
3. Set environment variables (table below).
4. Point the domain (below).
5. Run the verification checks (below).

Alternatively `netlify deploy --prod --build` from this directory — the
`--build` flag is what matters and is easy to omit.

### Verification — do not skip

| Check | Expect | If wrong |
|---|---|---|
| `GET /api/lily` | **405** | 404 = build didn't run |
| `GET /api/board` | JSON `{"posts":[]}` | 404 = same |
| Netlify → Functions | `board`, `lily-collect` | absent = same |
| Netlify → Edge Functions | `feed`, `img`, `beacon`, `lily-edge` | |
| `/playbook` direct | loads | 404 = `_redirects` missing from publish dir |
| Feed page header | `~28/30 live` | `0/30` = feed proxy down |
| URL pasted in Slack | unfurls with hero photo | no image = OG tags |

Tell = if `https://crewup.dev/netlify/functions/board.js` returns raw
JavaScript, the `netlify/` folder is being served as website content. That is
the drag-and-drop failure mode.

### Environment variables

Netlify → Site configuration → Environment variables.

| Key | Purpose | Without it |
|---|---|---|
| `DREAMSITE_ENDPOINT` | dashboard ingest URL for interaction events | events logged to function log only |
| `DREAMSITE_TOKEN` | bearer secret for the above | endpoint unauthenticated |
| `BOARD_ADMIN_KEY` | authorises board post deletion | cannot moderate |

`LILY_SITE` is already `crewup` in `netlify.toml`. Do not duplicate it here.
It must match the domain's first label — the dashboard keys rows on that.

### Domain

Netlify → Domains → Add `crewup.dev` → **Set up Netlify DNS**. Paste the four
nameservers into GoDaddy → Nameservers → Change → "I'll use my own nameservers."

`.dev` is HSTS-preloaded: browsers refuse plain HTTP outright, so before the
certificate provisions you get a hard security error, not a warning. Expected;
wait 10–15 minutes.

---

## What this is

A collaboration lab for developers. Eight sections:

| Section | Source of content |
|---|---|
| Home | hero + featured feed strip + stats |
| Feed | 30 live RSS sources, list or grid |
| Board | user posts — "needs help" / "needs work" |
| Playbook | 12 practices, static, in `src/data.js` |
| Toolbox | 30 tools, static |
| Glossary | 22 terms, static |
| Sources | feed directory + OPML export |
| Saved | localStorage reading list |

The static sections are deliberate: if every feed and function goes down, there
is still ~8,000 words of real content. Don't "simplify" that away.

---

## Planned direction — read before adding features

The owner intends Crewup to become **core software that hosts multiple
communities**, not one site. The first sub-community is a network of Jewish AI
coders, planned as a branch inside Crewup rather than a separate deployment.

**The next structural task, agreed but not started:** add a `community` field to
the board data model *before* real posts exist. Right now every post lands in
one undifferentiated blob store key (`crewup-board` → `posts`). Adding the field
now is trivial; adding it after fifty posts means a migration and retroactively
guessing where orphans belong.

The same applies to `SOURCES` in `src/data.js` — feed lists want to be
per-community, or a sub-community inherits 30 general engineering feeds it never
asked for.

Do this before promoting the board anywhere.

---

## Architecture

```
src/
  data.js       ALL editable content: SOURCES, PLAYBOOK, TOOLS, GLOSSARY,
                palette, collaboration keyword list, USE_IMG_PROXY toggle
  App.jsx       shell, routing, all views, FeaturedFeed, keyboard shortcuts
  Board.jsx     board view + composer + enriched post cards
  Art.jsx       backdrop (aurora/grain/dots), canvas node field, FeedThumb,
                ArtSlot, gradient avatars, HeaderArt
  lib.js        RSS/Atom parsing, thumbnail extraction, scoring, OPML, saved
  analytics.js  interaction beacon — deliberately does NOT send pageviews
  styles.css    global, responsive, reduced-motion

netlify/edge-functions/
  lily-edge.js  pageview counter on /*, hashes IP daily, POSTs /api/lily
  feed.js       /api/feed — RSS proxy, host-allowlisted, 15min CDN cache
  img.js        /api/img — image proxy, SSRF-guarded, 3MB cap
  beacon.js     /api/beacon — interaction events, geo-enriched

netlify/functions/
  lily-collect.js  /api/lily — relays coarse counts to dreamsitedesign.com
  board.js         /api/board — Netlify Blobs storage + GitHub/OG enrichment

public/art/     hero.jpg, texture.jpg, header-board.jpg, header-toolbox.jpg,
                og.jpg — Midjourney renders. Missing files fall back to CSS
                gradients, so slots can be filled one at a time.
```

Routing uses **real paths** (`/playbook`), not hash fragments. This is
load-bearing: a fragment never reaches the server, so hash routing would make
every server-side pageview record as `/`. Don't change it.

---

## Gotchas that have already bitten

1. **Adding a feed source needs TWO edits** — `SOURCES` in `src/data.js` *and*
   the hostname in `ALLOWED_HOSTS` in `netlify/edge-functions/feed.js`. Miss the
   second and the feed 403s silently.

2. **No `[[redirects]]` rule for `/api/lily`** in `netlify.toml`. `lily-collect`
   is a v2 function claiming that path itself; a redirect shadows it and every
   beacon 404s. Also no `node_bundler = "esbuild"` — that's v1 and breaks v2
   functions with "missing handler."

3. **The SPA catch-all lives only in `public/_redirects`.** It was duplicated in
   `netlify.toml` once; two catch-alls made shadowing `/api/*` far easier.

4. **Never `querySelector` a namespaced XML tag.** `querySelector("content:encoded")`
   throws SyntaxError — CSS parses `:encoded` as a pseudo-class — and kills the
   entire feed parse. Use `getElementsByTagName`. This shipped once.

5. **Pageviews are counted server-side by lily only.** `analytics.js`
   deliberately omits a `pageview` event. If you add one back, every number on
   the dashboard doubles.

6. **The image proxy degrades.** `FeedThumb` tries proxy → direct → source
   favicon → gradient, and remembers a dead proxy for the session. Don't
   "simplify" it to trust `/api/img`; on a non-built deploy that blanks every
   thumbnail.

7. `lily-collect.js` has open CORS and no auth — anyone can POST fabricated
   events and they relay as trusted. Not a data leak, but the numbers are
   spoofable. The fix belongs on the dreamsitedesign.com ingest side (shared
   secret in the relay header). Flagged, not done.

---

## Board spam posture

Five gates: honeypot field, 3-second minimum on the form, max 2 links in the
body, 3 posts per hashed-IP per day, exact-duplicate rejection. Plus
`BOARD_ADMIN_KEY` for authenticated deletes.

That is containment, not moderation. A public unmoderated board will eventually
carry something unwanted. If it gets traction, add a review queue — deliberately
omitted so far because nothing appearing until approval kills a new board's
momentum.

Post enrichment (GitHub repos, OG preview) happens **server-side at submit
time**, not in the browser. GitHub's unauthenticated API allows 60 req/hour per
IP; enriching client-side would exhaust that on one page load of twenty cards.
Don't move it.

---

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Functions don't run under `vite dev`. Use `netlify dev` if you need
`/api/*` locally.

## Owner preferences

Terse communication, often voice-to-text. Wants honest pushback, not
agreement. Prefers momentum over clarification questions — make a reasonable
call and state the assumption rather than asking. Deploys have repeatedly failed
on the build-step issue, so verify rather than assume a deploy worked.
