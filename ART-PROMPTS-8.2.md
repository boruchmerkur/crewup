# Collab — Midjourney 8.2 Prompt Pack

Human element · backgrounds · motifs. Written for **V8.2**, which has been the
default since 24 July 2026 — no version flag needed, every prompt routes there
automatically. `--preview` is obsolete; it was the early-access switch before
8.2 shipped.

---

## What changed, and why these prompts look different from the 8.1 set

Midjourney describes 8.2 as focused on aesthetics and personalization, aiming
for images that are "more creative, bold, sophisticated, edgy and fresh," with
fewer random low-quality generations.

For most people that's an upgrade. **For this site it's a hazard.** Collab is
restrained, near-black and technical. A model tuned toward bold and edgy will
happily hand you teal-and-orange lens flares and dramatic rim lighting that will
look ridiculous behind a feed reader.

So the whole pack is calibrated *down*:

| | 8.1 pack | 8.2 pack | Why |
|---|---|---|---|
| `--stylize` | 140–400 | **50–150** | 8.2's baseline aesthetic is already assertive; high stylize compounds it |
| `--raw` | optional | **on everything** | The single strongest brake on decorative drift |
| Negatives | short | **longer** | Specifically excluding the 8.2 house look |

If a render comes back cinematic and gorgeous, it's wrong. You want images that
disappear behind the interface.

### Find your style code first — this part got much faster

8.2 extended Big Batch Draft Mode to accept `--sref random`, which Midjourney
claims explores style space around 24× faster. Use it:

1. Draft Mode on, run the anchor prompt below with `--sref random`, 30–40 drafts.
2. Pick the 3 or 4 that look like the site.
3. Pull their sref codes, combine as `--sref A::2 B::1`.
4. That combined code goes on **every** prompt in this pack.

Anchor prompt for the random sweep:

```
documentary photograph of software engineers working late, lit only by monitors,
deep charcoal-blue darkness, restrained palette --raw --s 100 --sref random
```

One caution on personalization: your V7 profile carries over and works in both
8.1 and 8.2, but there is still no Global V8 profile. If your accumulated
ratings lean warm or painterly, `--profile` will fight this brief. Leave it off
for this set.

Palette, name it every time: `#0D1117` near-black navy · `#7C3AED` electric
violet · `#34D399` mint · `#F59E0B` amber.

`XXXXXXXX` below is your combined sref code.

---

# 1 · Human element

The site is currently all interface. These put people in it.

**H1 — Pairing, the hero shot**
```
documentary photograph, two software engineers at one desk in a dark room at
night, one gesturing toward an off-frame monitor, the other listening, faces lit
only by cool screen glow, deep charcoal-blue #0D1117 environment, faint electric
violet #7C3AED edge light, shallow depth of field, 35mm, unposed candid, quiet,
restrained, fine film grain --ar 4:3 --raw --s 90 --sref XXXXXXXX
--no text, watermark, logos, ui, screens facing camera, stock photo smiles,
teal and orange grade, lens flare, dramatic rim light, glossy retouching
```

**H2 — Hands over one keyboard**

The reliable one. If faces come back plastic across a dozen rolls, stop fighting
it and use this.
```
close-up documentary photograph, two pairs of hands over a single keyboard, one
hand pointing at something off-frame, dark charcoal-blue desk, cool light from
above, extreme shallow depth of field, 50mm macro, natural skin, film grain
--ar 3:2 --raw --s 70 --sref XXXXXXXX
--no text, watermark, faces, logos, jewellery, glossy skin, lens flare
```

**H3 — The room, from behind**
```
documentary photograph, four people gathered around one desk in a darkened
office, seen from behind and slightly above, monitor glow the only light,
deep charcoal-blue #0D1117, mint green #34D399 spill, generous empty space in
the upper third, 35mm, film grain --ar 16:9 --raw --s 110 --sref XXXXXXXX
--no text, watermark, faces to camera, bright lighting, cinematic grade, flare
```

**H4 — One person, thinking**

For the Playbook header. Collaboration includes the pause before you speak.
```
documentary photograph, a developer leaning back from a desk, hands behind head,
looking at something off-frame, dark room, single cool light source, deep
charcoal-blue shadow filling most of the frame, 35mm, candid, film grain
--ar 3:2 --raw --s 90 --sref XXXXXXXX
--no text, watermark, logos, direct eye contact, smiling, staged posture
```

**H5 — Handoff**

Two people, different times of day. The timezone-handoff practice, literally.
```
documentary photograph, split composition, one figure at a desk in blue
pre-dawn darkness on the left, another at a desk in warm amber #F59E0B lamplight
on the right, both in profile, deep charcoal-blue #0D1117 throughout, 35mm,
quiet, film grain --ar 21:9 --raw --s 130 --sref XXXXXXXX
--no text, watermark, faces to camera, mirror symmetry, collage seams
```

**H6 — Avatars for the presence strip**

Six of these. Deliberately not photorealistic — six fabricated realistic faces
on a page reads as deceptive the moment anyone looks closely.
```
abstract portrait silhouette in profile, rendered as a soft gradient from
[COLOUR A] to [COLOUR B], no facial features, deep charcoal-blue #0D1117
background, minimal, smooth, editorial --ar 1:1 --raw --s 120
--no text, face, eyes, hair detail, watermark, realism
```
Colour pairs: violet→mint · mint→amber · amber→violet · violet→sky `#38BDF8` ·
sky→mint · rose `#FB7185`→violet

---

# 2 · Backgrounds

These sit at 15–25% opacity behind content. Detail in the centre is wasted —
compose to the edges and leave the middle quiet.

**B1 — Site-wide texture** *(generate this one first)*
```
seamless tileable texture, extremely subtle diagonal grain and fine noise,
near-black charcoal-blue #0D1117, barely perceptible violet undertone, uniform
density, no focal point, flat, dark, film grain scan --ar 1:1 --tile --raw --s 40
--no text, pattern, shapes, logos, gradient, vignette, texture detail
```
`--tile` is not optional — without it the seams show and it's unusable as a
repeat. `--s 40` because any higher and it stops being a texture and starts
being an image.

**B2 — Feed header, motion**
```
abstract long-exposure photograph, streaks of violet and mint light flowing
horizontally through darkness, suggestion of a night window reflection, deep
charcoal-blue #0D1117, motion blur, mostly empty frame, film grain
--ar 21:9 --raw --s 150 --no text, people, logos, symmetry, neon aesthetic
```

**B3 — Toolbox header, still life**
```
still life photograph, worn mechanical keyboard, coiled cable and a cup on a
dark surface, raking side light, deep charcoal-blue #0D1117 background, shallow
depth of field, 50mm, honest wear, film grain --ar 21:9 --raw --s 80
--no text, logos, brands, product shot lighting, glossy surfaces, arrangement
```

**B4 — Glossary header, defocused type**
```
macro photograph of dense typeset text completely out of focus, bokeh of violet
and mint specular highlights, deep charcoal-blue field, extremely shallow depth
of field, unreadable, abstract, film grain --ar 21:9 --raw --s 140
--no legible text, letters, watermark, book edges
```

**B5 — Sources header, convergence**
```
abstract macro photograph, many thin fibre optic strands converging toward one
point in darkness, violet and mint light travelling along them, deep
charcoal-blue #0D1117, shallow focus, film grain --ar 21:9 --raw --s 130
--no text, people, logos, symmetry, sci-fi aesthetic
```

**B6 — Deep atmosphere, full-bleed**

Optional, behind the hero.
```
abstract photograph of dust and haze in a dark room lit by a single distant cool
light source, deep charcoal-blue #0D1117, faint violet bloom, almost entirely
empty, extremely subtle, film grain --ar 16:9 --raw --s 60
--no text, objects, people, rays, god rays, drama
```

---

# 3 · Motifs

Small marks used at 48–72px. They have to survive being tiny, so keep them
near-abstract — anything with internal detail turns to mush.

Common tail for all of these:
```
--ar 1:1 --raw --s 160 --sref XXXXXXXX
--no text, letters, numbers, watermark, icon border, 3d render, glossy
```

### Playbook families

| Family | Prompt head |
|---|---|
| **Live** | `two overlapping circles of violet and mint light merging in darkness, soft glow, deep charcoal-blue field, abstract minimal light study` |
| **Async** | `a chain of small violet light points curving across darkness, unequal spacing, deep charcoal-blue field, abstract minimal light study` |
| **Flow** | `a single unbroken ribbon of mint light flowing through darkness, deep charcoal-blue field, abstract minimal long-exposure light study` |
| **Community** | `a loose cluster of many small violet and mint light points, uneven density, deep charcoal-blue field, abstract minimal light study` |
| **Recovery** | `a broken line of amber light reconnecting across a gap in darkness, deep charcoal-blue field, abstract minimal light study` |
| **Foundations** | `a horizontal band of dim violet light anchoring the base of a dark frame, solid, still, deep charcoal-blue field, abstract minimal light study` |

### Structural motifs

**M1 — The connective node field**

You already have this as live canvas in the site. A still version is useful for
the social card and any static export.
```
abstract minimal light study, scattered points of violet and mint light in
darkness connected by faint thin lines, uneven spacing, deep charcoal-blue
#0D1117, soft focus, film grain --ar 16:9 --raw --s 120
--no text, network diagram, nodes labelled, sci-fi, glow excess
```

**M2 — Convergence mark**
```
abstract minimal light study, several faint violet lines converging into one
brighter mint line, darkness around, deep charcoal-blue #0D1117, film grain
--ar 1:1 --raw --s 140 --no text, arrows, diagram, symmetry
```

**M3 — Handoff mark**
```
abstract minimal light study, one violet light form passing into one amber light
form at a soft overlap, darkness, deep charcoal-blue #0D1117, film grain
--ar 1:1 --raw --s 140 --no text, arrows, hands, diagram
```

**M4 — Social card**
```
photograph, silhouetted figures at desks in a dark open office at night, seen
from a distance, monitor glow the only light, deep charcoal-blue #0D1117, violet
and mint spill, the entire left half of the frame near-empty for text overlay,
35mm, film grain --ar 1200:630 --raw --s 110 --sref XXXXXXXX
--no text, watermark, faces, logos, cinematic grade, lens flare
```
The empty left half is deliberate — that's where the headline overlays.

---

---

# 4 · Board section

Added after the first pass of this pack. The Board is the one page that is
*literally about people looking for each other*, so it carries the human
element harder than anywhere else — and it's the page most likely to look
desolate before anyone posts. Art matters more here than on the feed.

**BD1 — Board header** → `header-board.jpg`

Two people who haven't met yet. Distance, not intimacy.
```
documentary photograph, two people at separate desks in a large dark room, far
apart, each lit by their own monitor, deep charcoal-blue #0D1117, one pool of
electric violet #7C3AED light and one of mint green #34D399, wide empty space
between them, 35mm, quiet, unposed, film grain --ar 21:9 --raw --s 120
--sref XXXXXXXX
--no text, watermark, logos, faces to camera, eye contact, cinematic grade,
lens flare, dramatic lighting, symmetry
```

**BD2 — Alternative header, the offer**

If BD1 reads too lonely.
```
documentary photograph, close on a hand extending a folded note or card across a
dark desk toward another hand, only the hands and forearms visible, cool
directional light, deep charcoal-blue #0D1117, shallow depth of field, 50mm,
natural skin, film grain --ar 21:9 --raw --s 80 --sref XXXXXXXX
--no text, writing, faces, logos, glossy skin, jewellery, staged handshake
```

**BD3 — Empty-state art**

The board will sit empty for a while. This should feel like potential rather
than failure — an unoccupied desk with the light already on, not an abandoned
one.
```
documentary photograph, one empty chair pulled slightly back from a dark desk,
monitor off, single cool lamp already switched on, deep charcoal-blue #0D1117,
soft shadow, generous negative space, 35mm, still, film grain
--ar 16:9 --raw --s 90 --sref XXXXXXXX
--no text, people, watermark, logos, clutter, melancholy grade, dust motes,
abandoned aesthetic
```

**BD4 — Avatar set, second batch** → `avatar-7.jpg` … `avatar-12.jpg`

The board shows placeholder avatars for anyone posting without a GitHub handle.
Six more so repeats are less obvious on a busy page. Same treatment as H6 —
abstract, no features, because fabricated realistic faces on a page about real
people looking for real work is exactly the wrong signal.
```
abstract portrait silhouette in profile, rendered as a soft gradient from
[COLOUR A] to [COLOUR B], no facial features, deep charcoal-blue #0D1117
background, minimal, smooth, editorial --ar 1:1 --raw --s 120
--no text, face, eyes, hair detail, watermark, realism, symmetry
```
Second-batch colour pairs: mint→violet · amber→mint · violet→rose `#FB7185` ·
sky `#38BDF8`→amber · rose→mint · amber→sky

**BD5 — Motif: the match**

Small mark for the board, and reusable as a favicon variant.
```
abstract minimal light study, two separate points of light — one violet, one
mint — drawing toward each other across darkness, a faint line just beginning
to form between them, deep charcoal-blue #0D1117, film grain
--ar 1:1 --raw --s 150 --sref XXXXXXXX
--no text, arrows, hearts, diagram, symmetry, sci-fi
```

**BD6 — Motif: two states**

For the tab pair — "needs help" in amber, "available" in mint.
```
abstract minimal light study, [a small amber #F59E0B light form with an open gap
in it | a small mint green #34D399 light form, closed and complete], darkness
around, deep charcoal-blue #0D1117, film grain --ar 1:1 --raw --s 150
--no text, letters, icons, diagram, 3d render
```
Run twice, once per bracketed variant → `motif-needs.jpg`, `motif-available.jpg`.

---

## Updated filenames

```
public/art/
  hero.jpg                H1 or H2        1600×1200
  header-board.jpg        BD1 or BD2      2100×900     ← new
  header-playbook.jpg     H4              2100×900
  header-toolbox.jpg      B3              2100×900
  header-glossary.jpg     B4              2100×900
  header-sources.jpg      B5              2100×900
  board-empty.jpg         BD3             1600×900     ← new
  texture.jpg             B1 (tileable)    512×512
  og.jpg                  M4              1200×630
  avatar-1..6.jpg         H6               128×128
  avatar-7..12.jpg        BD4              128×128     ← new
  motif-needs.jpg         BD6              256×256     ← new
  motif-available.jpg     BD6              256×256     ← new
  family-live.jpg … family-foundations.jpg   256×256
```

## Revised order of work

The Board changes the priority — it's the page that most needs help looking
alive, and the only one with a real empty-state problem.

1. **B1 texture** — cheapest, changes every page at once.
2. **BD1 board header** — the newest and emptiest section.
3. **H2 hands** — the most reliable human image, for the hero.
4. Look at the site, then decide whether to continue.

Still true: a dark technical interface is often *worse* with photography, and
the CSS atmosphere in the build may already be doing the job. Three renders will
tell you more than three hundred words of art direction.
