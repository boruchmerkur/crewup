import { useState, useEffect, useCallback } from "react";
import { SOURCES, PROXIES, COLLAB_TERMS } from "./data.js";

export const stripHtml = (h = "") => {
  const d = new DOMParser().parseFromString(h, "text/html");
  return (d.body.textContent || "").replace(/\s+/g, " ").trim();
};


/* ── Thumbnail extraction ────────────────────────────────────────
   Feeds advertise images in at least five different ways and none of
   them is reliable, so we try all of them in order of trustworthiness
   and stop at the first plausible hit. Anything that smells like a
   tracking pixel, avatar or spacer is skipped. */

/* Extend this only with evidence. Every pattern added here is a thumbnail
   removed from the wall, and "looks like junk" is a weaker signal than it
   sounds: an earlier pass added /logo/ and cost several hundred good images. */
const JUNK_RE = /1x1|\bpixel\b|spacer|blank|transparent|track|beacon|feedburner|doubleclick|gravatar|avatar|emoji|badge|button|icon-|\/icons?\/|sprite|headshot|byline|\/author\/|share-icon|social-icon/i;

function absolutise(src, base) {
  if (!src) return null;
  if (src.startsWith("//")) return "https:" + src;
  if (/^https?:\/\//i.test(src)) return src;
  try { return new URL(src, base).toString(); } catch { return null; }
}

function plausible(url) {
  if (!url || JUNK_RE.test(url)) return null;
  return url;
}

function extractImage(node, html, base) {
  const tags = (name) => Array.from(node.getElementsByTagName(name));

  // 1. media:content / media:thumbnail — the RSS media extension. Most explicit.
  //    Feeds routinely advertise the SAME image at several sizes here, so take
  //    the widest rather than the first: the first is usually the thumbnail.
  const media = [];
  for (const m of [...tags("media:content"), ...tags("media:thumbnail")]) {
    const u = m.getAttribute("url");
    const type = m.getAttribute("type") || "";
    const medium = m.getAttribute("medium") || "";
    const w = parseInt(m.getAttribute("width") || "0", 10);
    if (w && w < 120) continue;
    if (u && (medium === "image" || type.startsWith("image") || /\.(jpe?g|png|webp|gif|avif)/i.test(u))) {
      const hit = plausible(absolutise(u, base));
      if (hit) media.push({ hit, w });
    }
  }
  if (media.length) {
    media.sort((a, b) => b.w - a.w);   // unknown width (0) sinks to the bottom
    return media[0].hit;
  }

  // 2. <enclosure> — the original RSS attachment mechanism.
  for (const e of tags("enclosure")) {
    const u = e.getAttribute("url");
    if (u && (e.getAttribute("type") || "").startsWith("image")) {
      const hit = plausible(absolutise(u, base));
      if (hit) return hit;
    }
  }

  // 3. Atom <link rel="enclosure">.
  for (const l of tags("link")) {
    if ((l.getAttribute("rel") || "") === "enclosure" && (l.getAttribute("type") || "").startsWith("image")) {
      const hit = plausible(absolutise(l.getAttribute("href"), base));
      if (hit) return hit;
    }
  }

  // 4. The best real <img> inside the content HTML. Common on Substack, DEV,
  //    Smashing — and where most of our images will actually come from.
  //    Not the first one: posts open with a logo or an author portrait often
  //    enough that "first" and "representative" are different pictures. Prefer
  //    the largest declared area, and treat position as the tie-breaker.
  if (html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const cands = [];
      [...doc.querySelectorAll("img")].forEach((img, idx) => {
        const w = parseInt(img.getAttribute("width") || "0", 10);
        const h = parseInt(img.getAttribute("height") || "0", 10);
        if ((w && w < 120) || (h && h < 120)) return;   // icon, avatar or pixel
        const raw = img.getAttribute("src") || img.getAttribute("data-src") ||
                    (img.getAttribute("srcset") || "").split(/\s+/)[0];
        const hit = plausible(absolutise(raw, base));
        if (hit) cands.push({ hit, area: w * h, idx });
      });
      if (cands.length) {
        cands.sort((a, b) => b.area - a.area || a.idx - b.idx);
        return cands[0].hit;
      }
    } catch { /* malformed content html */ }
  }

  return null;
}

/* ── Summary text ────────────────────────────────────────────────
   Feed descriptions arrive wrapped in syndication furniture: WordPress
   signs off every post, aggregators put nothing but metadata in the
   description, and several feeds close with subscribe pitches. Strip all
   of that before measuring length, or the excerpt spends its budget on
   boilerplate and truncates mid-sentence in the one place it had something
   to say. */

const SUMMARY_MAX = 420;

const BOILER = [
  /\bThe post\b[\s\S]{0,160}?\bappeared first on\b[^.]{0,80}\.?\s*$/i,   // WordPress
  /\bContinue reading\b[\s\S]*$/i,
  /\bRead (?:more|the (?:full|rest))\b[\s\S]{0,60}$/i,
  /\bShare this:[\s\S]*$/i,
  /\bSubscribe (?:to|now)\b[\s\S]*$/i,
];

// Hacker News, Lobsters and similar put only link metadata in <description>.
const AGGREGATOR_META = [
  /\b(?:Article|Comments)\s+URL:\s*\S+/gi,
  /\bPoints:\s*\d+/gi,
  /#\s*Comments:\s*\d+/gi,
];

export function cleanSummary(html) {
  let t = stripHtml(html);
  for (const re of AGGREGATOR_META) t = t.replace(re, " ");
  for (const re of BOILER) t = t.replace(re, "");
  t = t.replace(/\s+/g, " ").trim();

  // What's left of an aggregator entry is "Comments" or nothing. An empty
  // summary renders as no paragraph at all, which beats a stub that says
  // nothing — the headline is the content for those sources.
  if (t.length < 25) return { summary: "", truncated: false };
  if (t.length <= SUMMARY_MAX) return { summary: t, truncated: false };

  const cut = t.slice(0, SUMMARY_MAX);
  // Ending on a full sentence reads as deliberate rather than chopped, so
  // prefer that whenever one lands in the back half of the budget.
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (stop > SUMMARY_MAX * 0.55) return { summary: cut.slice(0, stop + 1).trim(), truncated: false };

  const sp = cut.lastIndexOf(" ");
  return { summary: (sp > 0 ? cut.slice(0, sp) : cut).replace(/[,;:—–-]$/, "").trim(), truncated: true };
}

export function parseFeed(xml, source) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("bad xml");
  const atom = !!doc.querySelector("feed");
  return Array.from(doc.querySelectorAll(atom ? "entry" : "item"))
    .map((n) => {
      const g = (s) => n.querySelector(s)?.textContent?.trim() || "";
      const link = atom
        ? n.querySelector("link")?.getAttribute("href") || g("id")
        : g("link") || g("guid");
      const ds = g("published") || g("updated") || g("pubDate") || g("date");
      const raw = g("content") || g("summary") || g("description") || "";
      // NOTE: never querySelector a namespaced tag — CSS parses "content:encoded"
      // as a pseudo-class and throws SyntaxError, killing the whole parse.
      const encoded = n.getElementsByTagName("content:encoded")[0]?.textContent || "";
      const html = encoded || raw;
      let host = "";
      try { host = new URL(link || source.url).hostname; } catch { /* malformed link */ }
      // Summarise from the richest body the entry offers. `raw` alone misses
      // content:encoded, which is exactly where the feeds with real prose put
      // it — so the fullest feeds were the ones getting the thinnest excerpts.
      const { summary, truncated } = cleanSummary(html || raw);
      return {
        image: extractImage(n, html, link || source.url),
        host,
        title: stripHtml(g("title")),
        link,
        summary,
        summaryTruncated: truncated,
        author: g("author > name") || g("creator") || "",
        date: ds ? new Date(ds) : null,
        source: source.name,
        sourceId: source.id,
        tag: source.tag,
        color: source.color,
      };
    })
    .filter((i) => i.title && i.link);
}

export async function fetchFeed(source) {
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(proxy(source.url), { signal: AbortSignal.timeout(11000) });
      if (!r.ok) throw new Error(String(r.status));
      const items = parseFeed(await r.text(), source);
      if (items.length) return { ok: true, items };
    } catch {
      /* try the next strategy */
    }
  }
  return { ok: false, items: [] };
}

/* Pick the items worth putting a picture on. Shared by the home hero and the
   Latest strip so the same story can't headline twice: the hero takes the
   first, the strip gets the rest of the same ordered list.

   Image-first is deliberate — an illustrated item earns the space, a gradient
   placeholder doesn't — but image-less items still pad the tail rather than
   leaving the strip short. */
export function pickFeatured(items, n = 6) {
  const seen = new Set();
  const uniq = items.filter((i) => (seen.has(i.link) ? false : seen.add(i.link)));

  // Spread across sources so one prolific feed can't take the whole strip.
  const perSource = {};
  const spread = [...uniq]
    .sort((a, b) => (b.date || 0) - (a.date || 0))
    .filter((i) => {
      perSource[i.sourceId] = (perSource[i.sourceId] || 0) + 1;
      return perSource[i.sourceId] <= 2;
    });

  return [...spread.filter((i) => i.image), ...spread.filter((i) => !i.image)].slice(0, n);
}

export const scoreItem = (i) => {
  const hay = `${i.title} ${i.summary}`.toLowerCase();
  return COLLAB_TERMS.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
};

export function relTime(d) {
  if (!d || isNaN(d)) return "";
  const m = Math.floor((Date.now() - d) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  return dd < 30 ? `${dd}d` : `${Math.floor(dd / 30)}mo`;
}

const STOP = new Set(
  "the a an and or of for to in on with your you our this that is are was how why what when it its from at by as be we they their new using use guide about into more than then very just can will".split(" ")
);

export function trendingTerms(items, n = 14) {
  const counts = {};
  items.forEach((i) => {
    i.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
      .forEach((w) => (counts[w] = (counts[w] || 0) + 1));
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function exportOPML() {
  const body = SOURCES.map(
    (s) => `    <outline type="rss" text="${s.name}" title="${s.name}" xmlUrl="${s.url}" category="${s.tag}"/>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Crewup — collaboration feeds</title></head>
  <body>
${body}
  </body>
</opml>`;
  const url = URL.createObjectURL(new Blob([xml], { type: "text/xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "crewup-feeds.opml";
  a.click();
  URL.revokeObjectURL(url);
}

/* Reading list, persisted to localStorage. */
export function useSaved() {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("crewup:saved");
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* first visit, or storage blocked */
    }
  }, []);

  const write = (next) => {
    try {
      localStorage.setItem("crewup:saved", JSON.stringify(next));
    } catch {
      /* session-only fallback */
    }
    return next;
  };

  const toggle = useCallback((item) => {
    setSaved((prev) => {
      const exists = prev.some((s) => s.link === item.link);
      return write(
        exists ? prev.filter((s) => s.link !== item.link) : [{ ...item, savedAt: Date.now() }, ...prev]
      );
    });
  }, []);

  const clear = useCallback(() => setSaved(write([])), []);

  return { saved, toggle, clear };
}
