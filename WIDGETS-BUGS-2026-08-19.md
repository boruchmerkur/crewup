# Widgets space — six bugs found on the live site

**Date:** 2026-08-19
**Found against:** https://crewup.dev/widgets (live, deployed build)
**Fixed in:** `src/Widgets.jsx`, `src/widgets.css`, `netlify/edge-functions/feed.js`
**Status:** fixed in source, `vite build` clean, **not deployed**

Untouched: `src/App.jsx` and `src/widgets-data.js` had uncommitted changes
already in the tree when I arrived. I left both alone.

---

## Why you're getting this

I came at the Widgets space from a different angle — the user asked where the
standalone Widgetry page had gone — and ended up auditing the live page. Six
things are wrong with it. Three are invisible in code review and only show up
when you measure the rendered page, which is how they survived the port.

Nothing here is a criticism of the drop. Four of the six were latent in the
standalone version and came across intact.

---

## 1. Half the cards render blank — worst one

`Thumb` seeded its stage from the prop, once, at mount:

```js
const [stage, setStage] = useState(item.image ? 0 : 3);
```

Every card from a feed that ships no `<enclosure>` / `<media:content>` — dev.to,
web.dev, Chrome Developers, Product Hunt, 9to5Mac, i.e. most of the list —
mounted at stage 3 and stayed there. `/api/preview` then found the og:image and
wrote it onto the item, and nothing happened: the component had already decided
it had no picture.

**Measured on the live page:** 24 cards, 12 rendering flat tint. I POSTed those
12 links back to `/api/preview` — **12 of 12 returned a usable image.** The data
was there the whole time; the component never re-read it.

Fix: stage is derived from the prop, only the failure count is state.

```js
const [failed, setFailed] = useState(0);
useEffect(() => { setFailed(0); }, [item.image]);
const stage = (item.image ? 0 : 3) + failed;
```

This is worth checking on `FeedThumb` in `src/Art.jsx` too — I did not look at
whether the main feed has the same shape, and the two components have the same
job.

## 2. Wide images cropped into an unreadable zoom

`.wg-shot` was `aspect-ratio: 5 / 4`.

Every og:image these sources carry is 2:1 — dev.to renders cards at 1200×627,
WordPress at 1600×800. I measured 9 of 9 loaded images on the live page at
exactly 2.00. `object-fit: cover` into a 1.25:1 box discards 60% of the width
and scales what's left up by ~1.9×, so the title-banner images most of these
sources use arrived as three unreadable letters filling the frame.

Now `16 / 9` — an 11% crop.

The gallery's `.wg-frame` is `aspect-ratio: 1` and has the same problem in a
worse form (2× zoom), but a square contact sheet reads as deliberate and the
captions overlay it, so **I left it alone.** Your call.

## 3. Every design token was computing to invalid

`widgets.css` had **two `.wg` blocks.** The first declared real values. The
second — the drop's original header, which should have been deleted when the
first was written — redeclared each token as itself:

```css
.wg {
  --wg-ink:    var(--wg-ink);
  --wg-bg:     var(--wg-bg);
  --wg-rule:   var(--wg-rule));   /* ← stray paren */
  --wg-accent: var(--wg-accent);
  --wg-mono:   var(--wg-mono);
}
```

A custom property that references itself is a cycle, which makes it invalid at
computed-value time. Read off the live page, `--wg-ink`, `--wg-bg`, `--wg-accent`
and `--wg-mono` **all computed to the empty string.**

What that actually cost:

- Every mono label on the page — the 001/002 counters, the timestamps, the
  filter chips, the whole source table — rendered in Inter, not JetBrains Mono.
  The parts-catalogue look was simply not there.
- `--wg-accent` empty, so the purple on the counters and the `.wg-cat` underline
  was gone.
- `.wg-chip[aria-pressed="true"] { background: var(--wg-ink) }` — the active
  filter chip had no fill.
- Body text survived only by accident: `color: var(--wg-ink)` fell through to
  the colour inherited from the site shell.
- `--wg-rule` survived **only because of the typo.** The stray `)` made that one
  line a parse error, so it was dropped and the good value from the first block
  stood.

Also fixed in the same block: `--wg-soft` was `#0A0A0B`, near-black secondary
text on a `#101010` card. It is now `#939AA8`, which is what was rendering
anyway (via the second block's `var(--wg-muted)`) and clears 4.5:1.

Deleted the second block.

## 4. The page was fetching from 9to5Mac directly on load

`stripTags` assigned feed HTML to a detached div's `innerHTML`. Chrome fetches
what's inside a subtree built that way — every `<img>`, and every `<audio
preload>`. 9to5Mac ships podcast audio in its item descriptions, which is what
the CSP `media-src` violations in the console were:

```
Loading media from 'https://9to5mac.com/.../MacDaily_8-18-26.mp3'
violates the following Content Security Policy directive: "default-src 'self'"
```

CSP caught it, so nothing loaded — but the requests were being attempted, which
is the exact third-party contact `/api/img` exists to prevent, and it's stated
as a house rule in the code comments right above.

Now `DOMParser.parseFromString(s, "text/html")`, whose document is inert.

**Worth grepping for elsewhere** — `d.innerHTML = …` as a text-stripping idiom
is common and `src/lib.js` does RSS parsing too.

## 5. WordPress numeric entities in image URLs

The code decoded `&amp;` only. WordPress escapes query separators as the
numeric entity `&#038;`, so 9to5Mac image URLs arrived as:

```
...bad-monkey-s2.jpg?quality=82&#038;strip=all&#038;w=1600
```

Now decodes `&amp;`, `&#038;` and `&#x26;`, and upgrades `http://` sources to
https (Smashing's images come over plain http).

## 6. Reddit is rate-limited, not dead

Four of five subreddit feeds were failing. `/api/feed` returned 502; the body
said **`Upstream 429`**, and the failing set is different on every load. The UI
printed "not answering — HTTP 502", which is a lie about a source that is merely
busy — and Reddit carries the entire gallery bucket.

The existing single retry at a flat 600ms was not enough. Now:

- **edge function:** up to 3 retries, backing off 700/1600/2800ms, honouring
  `Retry-After` when Reddit sends one.
- **429 passes through as 429**, not flattened to 502, so the client can tell
  "busy" from "broken".
- **`no-store` on the failure path.** There was no cache header on the error
  response at all, and a rate-limit cached at the edge turns a three-second
  problem into a fifteen-minute outage.
- **client:** waits 4s, then 9s, re-asks, and shows
  "rate-limited — waiting to ask again" instead of writing the source off.

---

## What I verified, and what I didn't

Verified directly against the live page:

- 12 of 24 cards blank, and `/api/preview` has an image for 12 of 12 of them
- all loaded images are 2.00:1 against a 1.25:1 box
- `--wg-ink` / `--wg-bg` / `--wg-accent` / `--wg-mono` computing to empty string,
  and coming back correctly (JetBrains Mono restored, `#A78BFA` restored) when
  the corrected tokens are injected
- `Upstream 429` on 4 of 5 subreddits, and the failing set rotating between passes
- the CSP media violations in the console

Not verified — **please run it before you trust it:**

- the repaired `Thumb`, the `stripTags` swap and the Reddit retry have been
  **built but never executed.** The Browser pane caps dev servers at 5 per
  folder and all five belong to other sessions, so I could not get a preview up.
  `npm run build` is clean; that is all I can honestly claim.

---

## Asks

1. **Free a dev server slot for the folder** if you're holding one, or run
   `netlify dev` yourself and exercise the four points above.
2. **Deploy** — `netlify deploy --prod --build`. Not done; publishing to
   crewup.dev is the owner's call and he hasn't given it yet.
3. **Check `FeedThumb` in `src/Art.jsx`** for the bug-1 shape, and grep for the
   bug-4 `innerHTML` idiom in `src/lib.js`.
4. **`widgets-drop/crewup-widgets/` still has all six.** It's the handoff copy,
   presumably disposable — delete it or sync it, but don't port from it again.
