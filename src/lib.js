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

const JUNK_RE = /1x1|\bpixel\b|spacer|blank|transparent|track|beacon|feedburner|doubleclick|gravatar|avatar|emoji|badge|button|icon-|\/icons?\//i;

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
  for (const m of [...tags("media:content"), ...tags("media:thumbnail")]) {
    const u = m.getAttribute("url");
    const type = m.getAttribute("type") || "";
    const medium = m.getAttribute("medium") || "";
    const w = parseInt(m.getAttribute("width") || "0", 10);
    if (w && w < 120) continue;
    if (u && (medium === "image" || type.startsWith("image") || /\.(jpe?g|png|webp|gif|avif)/i.test(u))) {
      const hit = plausible(absolutise(u, base));
      if (hit) return hit;
    }
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

  // 4. First real <img> inside the content HTML. Common on Substack, DEV,
  //    Smashing — and where most of our images will actually come from.
  if (html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      for (const img of doc.querySelectorAll("img")) {
        const w = parseInt(img.getAttribute("width") || "0", 10);
        const h = parseInt(img.getAttribute("height") || "0", 10);
        if ((w && w < 120) || (h && h < 120)) continue;   // icon or pixel
        const raw = img.getAttribute("src") || img.getAttribute("data-src") ||
                    (img.getAttribute("srcset") || "").split(/\s+/)[0];
        const hit = plausible(absolutise(raw, base));
        if (hit) return hit;
      }
    } catch { /* malformed content html */ }
  }

  return null;
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
      return {
        image: extractImage(n, html, link || source.url),
        host,
        title: stripHtml(g("title")),
        link,
        summary: stripHtml(raw).slice(0, 240),
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
  <head><title>Collab — collaboration feeds</title></head>
  <body>
${body}
  </body>
</opml>`;
  const url = URL.createObjectURL(new Blob([xml], { type: "text/xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "collab-feeds.opml";
  a.click();
  URL.revokeObjectURL(url);
}

/* Reading list, persisted to localStorage. */
export function useSaved() {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("collab:saved");
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* first visit, or storage blocked */
    }
  }, []);

  const write = (next) => {
    try {
      localStorage.setItem("collab:saved", JSON.stringify(next));
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
