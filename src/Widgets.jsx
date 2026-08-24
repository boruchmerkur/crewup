import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { WIDGET_SOURCES, WIDGET_CATS, WIDGET_COPY } from "./widgets-data.js";
import "./widgets.css";
import { track } from "./analytics.js";
import { proxied } from "./data.js";

/* ============================================================
   Widgets — a crewup space.

   Fetches through crewup's own /api/feed. There is no client-side
   CORS proxy here on purpose: the standalone version used five public
   relays and they were the single least reliable thing in it.

   SEAMS to reconcile against the real repo, both marked below:
     · Thumb — replace with crewup's FeedThumb if the props line up
     · trackEvent — wire to lily, or delete
   ============================================================ */

const FEED_API = "/api/feed?url=";
const PAGE = 24;

/* Articles are keyed by page, ignoring any #fragment. */
function keyOf(link) {
  try { const u = new URL(link); u.hash = ""; return u.toString(); } catch { return link; }
}

/* ---------- parsing ----------
   getElementsByTagName throughout, never querySelector.
   querySelector("content:encoded") throws SyntaxError — the colon is
   not a valid CSS selector. This bit us before. */

function textOf(node, names) {
  for (const name of names) {
    const el = node.getElementsByTagName(name)[0];
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return "";
}

function stripTags(html) {
  /* DOMParser, not innerHTML. Assigning feed HTML to a detached div still
     makes Chrome fetch what is inside the subtree — every <img>, and every
     <audio preload>. 9to5Mac ships podcast audio in its descriptions, so
     simply parsing the feed was reaching out to 9to5mac.com on load. CSP
     blocked it, but the requests were being attempted, which is precisely
     the third-party contact /api/img exists to prevent. A DOMParser
     document is inert. */
  const d = new DOMParser().parseFromString(String(html || ""), "text/html");
  return (d.body?.textContent || "").replace(/\s+/g, " ").trim();
}

function imageOf(node, body) {
  const enc = node.getElementsByTagName("enclosure")[0];
  if (enc && /image/.test(enc.getAttribute("type") || "")) {
    return enc.getAttribute("url") || "";
  }
  for (const el of node.getElementsByTagName("*")) {
    const tag = el.nodeName.toLowerCase();
    if (tag === "media:content" || tag === "media:thumbnail" || tag === "thumbnail") {
      const u = el.getAttribute("url");
      if (u && /\.(jpe?g|png|webp|avif)/i.test(u)) return u;
    }
  }
  const m = String(body || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

function linkOf(node) {
  for (const el of node.getElementsByTagName("link")) {
    const href = el.getAttribute("href");
    if (href && el.getAttribute("rel") !== "self") return href;
    if (!href && el.textContent.trim()) return el.textContent.trim();
  }
  return "";
}

function parseFeed(xml) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("not valid XML");
  const nodes = [
    ...doc.getElementsByTagName("item"),
    ...doc.getElementsByTagName("entry")
  ];
  if (!nodes.length) throw new Error("no items");

  return nodes.map((n) => {
    const body = textOf(n, ["content:encoded", "content", "description", "summary"]);
    let image = imageOf(n, body);
    if (image.startsWith("//")) image = "https:" + image;
    /* Feed image URLs arrive entity-encoded, and not only as &amp;: WordPress
       escapes query separators as the NUMERIC entity &#038;, so 9to5Mac's
       images came through as ...jpg?quality=82&#038;strip=all and 404'd.
       Smashing serves some over plain http, which is mixed content here. */
    image = image
      .replace(/&amp;/g, "&")
      .replace(/&#0*38;/g, "&")
      .replace(/&#x0*26;/gi, "&");
    if (image.startsWith("http://")) image = "https://" + image.slice(7);
    return {
      title: stripTags(textOf(n, ["title"])) || "Untitled",
      link: linkOf(n),
      date: textOf(n, ["pubDate", "published", "updated", "dc:date"]),
      text: stripTags(body).slice(0, 260),
      image: /^https?:\/\//.test(image) ? image : ""
    };
  });
}

/* ---------- categories ----------
   Scored rather than first-match. A post about a CSS animation inside a
   browser extension should land where most of its words point, not
   wherever the keyword list happens to hit first. Title hits count
   double because titles are written to describe the subject. */

function scoreCategory(item) {
  const title = item.title.toLowerCase();
  const all = (item.title + " " + item.text).toLowerCase();
  let best = "Other";
  let bestScore = 0;
  for (const [label, words] of WIDGET_CATS) {
    let score = 0;
    for (const w of words) {
      if (all.includes(w)) score += 1;
      if (title.includes(w)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = label;
    }
  }
  return best;
}

/* ---------- small helpers ---------- */

function ago(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function tint(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = Math.abs(h) % 360;
  return `linear-gradient(140deg,hsl(${a},18%,86%),hsl(${(a + 40) % 360},14%,72%))`;
}

/* Kept rather than swapped for FeedThumb, deliberately: FeedThumb paints a
   div with a background and owns its own width/ratio, while this grid sizes
   an <img> through CSS classes. Reconciling them would mean rewriting the
   layout, not deleting a component.

   What DID have to change is the third step. The drop fell back to
   google.com/s2/favicons, which fetches from Google for every item that has
   no picture — the exact third-party contact this site's house rules promise
   not to make, and the reason /api/img exists at all. It now asks the source
   for its own favicon, through our proxy, which is what FeedThumb does. */
function Thumb({ item, className }) {
  /* Stage is DERIVED from the prop; only the failure count is state.

     Seeding stage from the prop once at mount meant every card from a feed
     with no enclosure — dev.to, web.dev, Chrome Developers, Product Hunt,
     9to5Mac, most of the list — mounted at stage 3 and stayed there. When
     /api/preview later found the og:image and set it on the item, nothing
     happened: the component had already decided it had no picture. */
  const [failed, setFailed] = useState(0);
  useEffect(() => { setFailed(0); }, [item.image]);
  const stage = (item.image ? 0 : 3) + failed;
  const host = useMemo(() => {
    try { return new URL(item.link).hostname; } catch { return ""; }
  }, [item.link]);

  const src =
    stage === 0 ? proxied(item.image)
    : stage === 1 ? item.image
    : stage === 2 ? proxied(`https://${host}/favicon.ico`)
    : "";

  if (!src) {
    return <div className={className} style={{ background: tint(item.title) }} />;
  }
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed((f) => f + 1)}
    />
  );
}

/* Wired to the site's own interaction beacon. Pageviews are deliberately NOT
   sent from here — lily counts those server-side, and sending them again is
   how every number on the dashboard quietly doubles. */
const trackEvent = (name, detail) => track(name, detail);

/* ============================================================
   Component
   ============================================================ */

export default function Widgets() {
  /* Found pictures live here, keyed by article URL, and are merged in at
     RENDER — never written back into wire/bench/gallery.

     Writing them into the lists looked right and silently lost most of them:
     sources land progressively and each re-sets its whole bucket as it
     arrives, so an image merged a moment earlier was overwritten by the next
     source to finish. Half the wire rendered as flat tint with a good image
     already fetched and sitting in memory. */
  const [pix, setPix] = useState({});

  const [wire, setWire] = useState([]);
  const [bench, setBench] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [status, setStatus] = useState(() =>
    Object.fromEntries(WIDGET_SOURCES.map((s) => [s.name, { state: "wait" }]))
  );
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const seen = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    const byDate = (a, b) => new Date(b.date) - new Date(a.date);

    async function pull(source, attempt = 0) {
      try {
        const res = await fetch(FEED_API + encodeURIComponent(source.url));

        /* 429 means busy, not broken. The edge function passes it through as
           429 rather than flattening it to 502 precisely so this can tell the
           difference — Reddit rate-limits a rotating subset on every load and
           carries the whole gallery, so writing a source off after one refusal
           loses the pictures for no reason. Two more asks, then give up. */
        if (res.status === 429 && attempt < 2) {
          setStatus((st) => ({ ...st, [source.name]: { state: "busy" } }));
          await new Promise((r) => setTimeout(r, attempt === 0 ? 4000 : 9000));
          if (cancelled) return;
          return pull(source, attempt + 1);
        }
        if (!res.ok) throw new Error(res.status === 429 ? "rate-limited" : `HTTP ${res.status}`);
        const items = parseFeed(await res.text());
        if (cancelled) return;

        const fresh = [];
        for (const it of items) {
          const key = it.title.toLowerCase().slice(0, 60);
          if (seen.current.has(key)) continue;
          seen.current.add(key);
          fresh.push({ ...it, src: source.name, cat: scoreCategory(it) });
        }

        const withPics = items.filter((i) => i.image).length;
        const pct = Math.round((withPics / items.length) * 100);
        setStatus((s) => ({
          ...s,
          [source.name]: { state: pct >= 60 ? "ok" : "thin", count: items.length, pct }
        }));

        const setter =
          source.bucket === "bench" ? setBench
          : source.bucket === "gallery" ? setGallery
          : setWire;
        setter((prev) => [...prev, ...fresh].sort(byDate));
      } catch (err) {
        if (!cancelled) {
          setStatus((s) => ({ ...s, [source.name]: { state: "bad", why: err.message } }));
        }
      }
    }

    /* four at a time — the function edge-caches, but a cold board would
       otherwise open seventeen sockets at once */
    const queue = [...WIDGET_SOURCES];
    const lanes = Array.from({ length: 4 }, async () => {
      while (queue.length && !cancelled) await pull(queue.shift());
    });
    Promise.all(lanes);

    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const c = { All: wire.length };
    for (const it of wire) c[it.cat] = (c[it.cat] || 0) + 1;
    return c;
  }, [wire]);

  /* No source may take more than its share of the wire. Even after dropping
     the worst offender, Product Hunt and the MDN blog carry 50 and 71 items
     against Codrops' 10 — sorted purely by date, the high-volume publishers
     own the top of the page and the specialists never appear. */
  const PER_SOURCE = 6;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = wire.filter((it) => {
      if (cat !== "All" && it.cat !== cat) return false;
      if (q && !(it.title + " " + it.text).toLowerCase().includes(q)) return false;
      return true;
    });

    // Round-robin by source: take each publisher's newest, then their second,
    // and so on. Order stays newest-first within a source and no one floods.
    const bySource = new Map();
    for (const it of matched) {
      if (!bySource.has(it.src)) bySource.set(it.src, []);
      bySource.get(it.src).push(it);
    }
    const out = [];
    for (let round = 0; round < PER_SOURCE; round++) {
      for (const list of bySource.values()) if (list[round]) out.push(list[round]);
    }
    // A search should still find everything; the cap is for browsing.
    return q ? matched : out;
  }, [wire, cat, query]);

  const pickCat = useCallback((next) => {
    setCat(next);
    setShown(PAGE);
    trackEvent("widgets:filter", next);
  }, []);

  /* Most of this space's sources ship no image tags at all — Chrome
     Developers, web.dev, Product Hunt, 9to5Mac and every dev.to tag feed
     return zero. The articles all have an og:image; the feeds just never
     mention it. /api/preview reads it server-side and caches it, so this is
     the same fix the main feed got, pointed at the same gap here.

     Bounded and on-screen only: the three buckets each show a page at a
     time, so there is no reason to fetch pictures for anything below. */
  const askedPix = useRef(new Set());
  useEffect(() => {
    const pageOf = (l) => { try { const u = new URL(l); u.hash = ""; return u.toString(); } catch { return l; } };
    const want = [];
    for (const it of [...wire.slice(0, 24), ...gallery.slice(0, 18), ...benchP.slice(0, 12)]) {
      if (it.image || !it.link) continue;
      const page = pageOf(it.link);
      if (askedPix.current.has(page) || want.includes(page)) continue;
      want.push(page);
    }
    if (!want.length) return;
    const batch = want.slice(0, 28);
    batch.forEach((u) => askedPix.current.add(u));

    let dead = false;
    (async () => {
      for (let i = 0; i < batch.length; i += 14) {
        if (dead) return;
        try {
          const r = await fetch("/api/preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ urls: batch.slice(i, i + 14) }),
          });
          if (!r.ok) continue;
          const d = await r.json();
          if (dead) return;
          const found = Object.fromEntries(Object.entries(d.previews || {}).filter(([, v]) => v));
          if (Object.keys(found).length) setPix((prev) => ({ ...prev, ...found }));
        } catch { /* the tint fallback is already correct */ }
      }
    })();
    return () => { dead = true; };
  }, [wire, gallery, bench]);

  const dress = (it) => {
    if (it.image || !it.link) return it;
    const img = pix[keyOf(it.link)];
    return img ? { ...it, image: img } : it;
  };
  const wireP = wire.map(dress);
  const benchP = bench.map(dress);
  const galleryP = gallery.map(dress);
  const visibleP = visible.map(dress);          // the grid renders the filtered list

  const pics = (galleryP.length ? galleryP : wireP).filter((i) => i.image).slice(0, 18);
  const liveCount = Object.values(status).filter((s) => s.state === "ok" || s.state === "thin").length;

  return (
    <div className="wg">
      <header className="wg-head">
        <p className="wg-eyebrow">
          {WIDGET_COPY.tagline} · {liveCount} of {WIDGET_SOURCES.length} sources live
        </p>
        <h1>{WIDGET_COPY.title}</h1>
        <p className="wg-lede">{WIDGET_COPY.lede}</p>
      </header>

      <div className="wg-controls">
        <div className="wg-chips" role="group" aria-label="Filter by category">
          {["All", ...WIDGET_CATS.map((c) => c[0]), "Other"]
            .filter((n) => n === "All" || counts[n])
            .map((n) => (
              <button
                key={n}
                type="button"
                className="wg-chip"
                aria-pressed={n === cat}
                onClick={() => pickCat(n)}
              >
                {n}<i>{counts[n] || 0}</i>
              </button>
            ))}
        </div>
        <input
          className="wg-search"
          type="search"
          value={query}
          placeholder="Search everything logged…"
          onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
        />
      </div>

      <p className="wg-live" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "entry" : "entries"}
        {cat !== "All" ? ` in ${cat}` : ""}
      </p>

      <section className="wg-section">
        <h2>{WIDGET_COPY.wireTitle}</h2>
        <p className="wg-blurb">{WIDGET_COPY.wireBlurb}</p>

        {!wireP.length ? (
          <div className="wg-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="wg-card wg-skel" key={i} aria-hidden="true">
                <div className="wg-shot" /><div className="wg-lines" />
              </div>
            ))}
          </div>
        ) : !visible.length ? (
          <p className="wg-empty">Nothing matches that yet. Clear the search, or pick another category.</p>
        ) : (
          <>
            <div className="wg-grid">
              {visibleP.slice(0, shown).map((it, i) => (
                <article className="wg-card" key={it.link + i}>
                  <a href={it.link} target="_blank" rel="noopener noreferrer">
                    <Thumb item={it} className="wg-shot" />
                    <div className="wg-body">
                      <span className="wg-meta">
                        <b>{String(i + 1).padStart(3, "0")}</b> {it.src}
                      </span>
                      <h3>{it.title}</h3>
                      {it.text && <p>{it.text}</p>}
                      <span className="wg-foot">
                        <span className="wg-cat">{it.cat}</span>
                        <span>{ago(it.date)}</span>
                      </span>
                    </div>
                  </a>
                </article>
              ))}
            </div>
            {visibleP.length > shown && (
              <button className="wg-more" type="button" onClick={() => setShown((s) => s + PAGE)}>
                Show more
              </button>
            )}
          </>
        )}
      </section>

      {!!pics.length && (
        <section className="wg-section">
          <h2>{WIDGET_COPY.galleryTitle}</h2>
          <p className="wg-blurb">{WIDGET_COPY.galleryBlurb}</p>
          <div className="wg-sheet">
            {pics.map((it, i) => (
              <a
                className="wg-frame"
                key={it.link + i}
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="wg-num">{String(i + 1).padStart(2, "0")}</span>
                <Thumb item={it} className="wg-frame-img" />
                <span className="wg-cap">{it.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {!!benchP.length && (
        <section className="wg-section">
          <h2>{WIDGET_COPY.benchTitle}</h2>
          <p className="wg-blurb">{WIDGET_COPY.benchBlurb}</p>
          <ol className="wg-bench">
            {benchP.slice(0, 16).map((it, i) => (
              <li key={it.link + i}>
                <a href={it.link} target="_blank" rel="noopener noreferrer">
                  <span className="wg-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="wg-bench-title">{it.title}</span>
                  <span className="wg-when">{ago(it.date)}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="wg-section">
        <h2>Sources</h2>
        <p className="wg-blurb">
          Every feed in this space, whether it answered, and how many items carried a picture.
        </p>
        <div className="wg-sources">
          {WIDGET_SOURCES.map((s) => {
            const st = status[s.name] || { state: "wait" };
            return (
              <div className="wg-source" key={s.name}>
                <span className="wg-source-name">{s.name}</span>
                <span className="wg-state" data-s={st.state}>
                  {st.state === "wait" ? "fetching"
                    : st.state === "busy" ? "rate-limited — waiting to ask again"
                    : st.state === "bad" ? `not answering — ${st.why}`
                    : `${st.count} items · ${st.pct}% pics`}
                </span>
                <span className="wg-url">{s.url.replace(/^https?:\/\//, "")}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
