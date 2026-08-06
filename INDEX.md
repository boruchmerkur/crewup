# INDEX — Collab

Every file in this zip, what it does, and whether you'll ever need to open it.

**Start here:** `README.md` to deploy · `src/data.js` to change content ·
`ART-PROMPTS.md` for the Midjourney set.

---

## Read these first

| File | Lines | What it's for |
|---|---|---|
| `README.md` | 160 | Deploy steps, DreamSite analytics wiring, payload shapes, event table, custom domain checklist |
| `ART-PROMPTS.md` | 265 | Midjourney 8.1 prompt pack — 17 images, style-code workflow, filenames the site expects |
| `INDEX.md` | — | This file |

---

## Content — where you'll spend your time

| File | Lines | What it's for |
|---|---|---|
| `src/data.js` | 348 | **All site content.** 30 RSS sources, 12 playbook practices, 30 tools, 22 glossary terms, the colour palette, the collaboration keyword list. Edit this and nothing else for 90% of changes. |

Four exports worth knowing:

- `SOURCES` — the feed list. **Adding one means two edits:** here, *and* `ALLOWED_HOSTS` in `netlify/edge-functions/feed.js`. Miss the second and the new feed 403s.
- `PLAYBOOK` — practices. Each needs `name, family, heat, one, when, how[], pitfalls[], metric`. `family` must be one of Live / Async / Flow / Community / Recovery / Foundations or the art slot won't resolve.
- `TOOLS` — grouped by category. Add a group and it renders automatically.
- `GLOSSARY` — flat `{term, def}` list, rendered in array order.

---

## Application code

| File | Lines | What it's for |
|---|---|---|
| `src/App.jsx` | 635 | Shell, routing, all seven views, keyboard shortcuts, filtering and sort logic |
| `src/Art.jsx` | 275 | Visual atmosphere — aurora, grain, dot grid, canvas node field, art slots, gradient avatars, presence strip |
| `src/lib.js` | 136 | Feed fetching and RSS/Atom parsing, relevance scoring, relative time, trending terms, OPML export, saved-list hook |
| `src/analytics.js` | 74 | Interaction-event beacon. Deliberately does **not** send pageviews — lily counts those server-side |
| `src/styles.css` | 105 | Global styles, hover states, animations, responsive breakpoints, reduced-motion overrides |
| `src/main.jsx` | 11 | Entry point |

Routing note: real paths (`/playbook`), not hash fragments. That's load-bearing —
a fragment never reaches the server, so hash routing would have made every
server-side pageview record as `/`.

---

## Server-side (Netlify)

| File | Lines | What it's for |
|---|---|---|
| `netlify/edge-functions/lily-edge.js` | 128 | **Pageview counter.** Runs on `/*`, inspects headers only, never touches the response body. Hashes IP with a daily-rotating salt, discards it, POSTs coarse fields to `/api/lily` |
| `netlify/functions/lily-collect.js` | 62 | **Collector** at `/api/lily`. Relays coarse counts to `dreamsitedesign.com/api/lily` |
| `netlify/edge-functions/feed.js` | 71 | **RSS proxy** at `/api/feed`. Host-allowlisted, 15-min CDN cache, hour of stale-while-revalidate |
| `netlify/edge-functions/beacon.js` | 100 | **Interaction events** at `/api/beacon`. Adds geo and device at the edge, forwards to `DREAMSITE_ENDPOINT` |

**These require a build step.** A drag-and-drop upload publishes them as static
JavaScript files instead of deploying them — the site works, nothing is counted.
Use `netlify deploy --prod` or connect git.

Known gap, flagged not fixed: `lily-collect.js` has open CORS and no auth, so
anyone can POST fabricated events. Nothing leaks outward; your numbers are
spoofable. Fix belongs on the ingest side.

---

## Config

| File | What it's for |
|---|---|
| `netlify.toml` | Build command, `LILY_SITE = "collab"`, functions directory, edge-function registrations, security headers. **No `[[redirects]]` rule** — deliberate; one would shadow `/api/lily` |
| `public/_redirects` | SPA catch-all. Single source of truth — the duplicate in `netlify.toml` was removed because two catch-alls made shadowing likelier |
| `public/_headers` | Immutable caching on `/assets/*`, no-cache on `index.html`, security headers |
| `vite.config.js` | Build config. Rarely touched |
| `package.json` | `npm run dev` · `npm run build` · `npm run preview` |
| `package-lock.json` | Pinned deps. Commit it, don't edit it |

---

## Static assets

| File | What it's for |
|---|---|
| `index.html` | HTML shell, meta tags, Open Graph, JSON-LD |
| `public/favicon.svg` | Violet-to-mint "C" mark |
| `public/og.svg` | Social card placeholder — replace with prompt E from `ART-PROMPTS.md` |
| `public/robots.txt` | Allows all, disallows `/api/` |
| `public/sitemap.xml` | Six real paths |
| `public/art/README.txt` | Filenames and dimensions for the Midjourney renders |
| `public/art/` | Empty. Drop renders here — every slot falls back to a CSS gradient, so add them one at a time |

---

## Before you go live

Four placeholders still read `collab.example`:

1. `index.html` — canonical link and `og:image`
2. `public/robots.txt` — the sitemap line
3. `public/sitemap.xml` — all six `<loc>` values
4. `README.md` — example URLs (cosmetic)

Then set `DREAMSITE_ENDPOINT` and `DREAMSITE_TOKEN` in Netlify, and verify
`POST /api/lily` returns 200 or 405.

---

## Numbers

25 files · ~2,300 lines excluding the lockfile · 197KB JS bundle, 65KB gzipped ·
no runtime dependencies beyond React.
