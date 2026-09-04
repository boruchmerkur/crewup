# Brief for a chat building widgets for crewup.dev

Hand this to the chat that builds them. It is written to be read cold.

---

## What is wanted

Small, self-contained interactive things that live on **crewup.dev**, a site
about **vibe coding** — writing software with a model and reviewing what comes
back. The audience is developers. The site's own summary of itself:

> Most code is now written by a machine. The hard part moved to the seam.

A widget here is not a decoration. It should do one useful thing in under
thirty seconds, with no signup, and be worth linking to on its own.

---

## Hard constraints — read before designing anything

**1. It must be a single HTML file, or a page in the existing React app.**
Two ways in, pick one:

- **Standalone**: one `.html` file dropped into `public/w/<name>/index.html`,
  reachable at `crewup.dev/w/<name>`. Inline CSS and JS. No build step.
- **In-app**: a `.jsx` component in `src/`, added to `VIEWS` in `src/App.jsx`.
  Use this only if it needs the site's nav and shell.

Standalone is preferred for anything experimental.

**2. The Content-Security-Policy is strict and will silently break you.**
The site-wide policy is:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
https://fonts.googleapis.com; img-src 'self' data: https:;
connect-src 'self' https://api.allorigins.win https://corsproxy.io
https://api.codetabs.com; frame-ancestors 'none'
```

What that means in practice:

- **No inline `<script>` and no CDN scripts.** `script-src 'self'` blocks both.
  A standalone widget needs its JS in a **separate `.js` file next to it**, or
  its path needs its own header block in `public/_headers` (there is a working
  example there for `/run.html`).
- **No `fetch` to arbitrary hosts.** `connect-src` is an allowlist. If the
  widget needs data from elsewhere, it goes through a Netlify function on this
  origin, not directly.
- **Inline styles are fine.** `style-src` permits `'unsafe-inline'`.
- **Images from any https host are fine**, but prefer `/api/img?url=…` (see
  below) so the visitor's browser does not contact third parties.

**3. No third-party requests from the visitor's browser.** This is a stated
house rule on the home page, not a preference. Route images through
`/api/img?url=<encoded>`; route feeds through `/api/feed?url=<encoded>`
(allowlisted hosts only — adding a host is **two edits**, the source list *and*
`ALLOWED_HOSTS` in `netlify/edge-functions/feed.js`).

**4. No accounts, no personal data.** The site has no login and does not want
one. Per-visitor state goes in `localStorage` under a `crewup:` prefix.

**5. `prefers-reduced-motion` must be respected.** Anything that animates on
its own stops under it. The site's global CSS already kills transitions; a
widget with its own animation loop must check the media query itself.

---

## Dimensions and layout

The widget is dropped into a dark page at 1280px max content width with 28px
gutters (16px below 560px).

| | |
|---|---|
| **Design width** | 1100px content, and it must reflow to **320px** |
| **Card / hero art** | **16:10**, e.g. 1600×1000 |
| **Feed thumbnails** | **16:9** — most og:images are 1200×630, so anything squarer crops badly |
| **Gallery tiles** | 1:1 is acceptable where captions overlay |
| **Touch targets** | 44px minimum |
| **Never** | a fixed pixel width on any container; the page must not scroll sideways |

Grid children need `min-width: 0`. The default is `auto`, which refuses to
shrink below its content and silently widens the whole document — this has
broken the site twice.

---

## Palette and type — copy these exactly

```
--bg      #101010   page ground (neutral, NOT blue-black)
--panel   #0A0A0B   cards and raised surfaces
--line    #24242A   hairlines and borders
--hover   #17171B   hover surface
--text    #E8E6E3   primary text        15.2:1
--dim     #939AA8   body and secondary   6.7:1
--faint   #7E8494   metadata             5.1:1
--link    #A78BFA   any text that is a link or accent   7.0:1

accents   violet #7C3AED   mint #34D399   amber #F59E0B
          sky #38BDF8      rose #FB7185   lime #A3E635
```

**Brand violet `#7C3AED` is 3.3:1 on the ground — never use it for text.** It
is for fills, dots and borders. Text that wants to look violet uses `#A78BFA`.

```
display   'Space Grotesk', sans-serif     headings, -0.02em tracking
body      'Inter', -apple-system, sans-serif
mono      'JetBrains Mono', ui-monospace  labels, counters, metadata
```

House style: an oversized display voice against small monospaced metadata.
Uppercase mono labels at 9–10px with ~0.08em letter-spacing. Do not track
uppercase text wide beyond that.

**4.5:1 is a hard floor for every piece of text.** Not a guideline. Measure it
rather than eyeballing it.

---

## Interaction, in one line

Hover states must respond to where the cursor actually is. The site's buttons
track the pointer with `--mx`/`--my` custom properties and put a radial
highlight under it. A hover state that looks identical wherever you entered
the element reads as a decade old.

---

## What already exists — reuse, do not rebuild

| endpoint | what it does |
|---|---|
| `/api/img?url=` | image proxy. SSRF-guarded, 3MB cap, CDN cached |
| `/api/preview?url=` or POST `{urls:[]}` | reads a page's og:image server-side, caches 30 days |
| `/api/feed?url=` | RSS/Atom proxy, host-allowlisted, 15min edge cache |
| `/api/room` | chat + a shared pad with one keyboard at a time |
| `/api/board`, `/api/collabs`, `/api/showcase` | held-until-released user submissions |

There is also a working **sandboxed JS runner** at `public/run.html`: an iframe
with `sandbox="allow-scripts"` and no `allow-same-origin`, with its own CSP
allowing `unsafe-eval` and `default-src 'none'` so code inside has no network
at all. If a widget needs to execute user code, use that pattern — do not
invent a new one.

---

## Ideas that fit this site

Ordered by how well they match what crewup is about. Not a requirement.

1. **Review-debt estimator** — paste a repo URL, get a rough share of commits
   whose messages suggest generated code, and a "here is what nobody has read"
   figure. Provokes the site's central argument.
2. **Prompt-to-spec converter** — paste a vague prompt, get the inputs,
   outputs and failure cases it left ambiguous. Directly serves the "Writing
   the Spec First" practice.
3. **Diff reader** — paste a diff, and it asks the questions a reviewer should
   ask about generated code: what does this not handle, which imports are new,
   what widened.
4. **Hallucinated-dependency checker** — paste a package list, it flags names
   that do not exist on npm/PyPI. Small, sharp, genuinely useful.
5. **Context-window visualiser** — show how much of a real repo fits in 200k
   tokens. Makes an abstract limit concrete.

Anything using a model needs an API key, which means a Netlify function and a
key in the site's environment. Ask before assuming that is available.

---

## How to hand work back

Deliver a zip with:

```
public/w/<name>/index.html      the widget
public/w/<name>/<name>.js       its JS, separate file (CSP)
NOTES.md                        what it does, what you tested, what you did not
```

In `NOTES.md`, state plainly **what you verified and what you only built**.
The last handoff into this repo said "built but never executed" and that
honesty was the most useful line in it.

Do not include a copy of the site. Do not port anything from an older
standalone version without saying so.

---

## One thing to know about this repo

Two chats have worked in the same folder simultaneously and one destroyed the
other's uncommitted work with a `git checkout`. If you are handed the folder
rather than a zip, **commit before you start** and check `git log` for work you
did not do.
