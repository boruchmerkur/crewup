import { useState, useEffect, useRef } from "react";
import { C, USE_IMG_PROXY, proxied } from "./data.js";

/* null = untested, true = working, false = absent (drop deploy).
   Shared across every thumbnail so one failure teaches all of them. */
let proxyAvailable = null;

/* ═══════════════════════════════════════════════════════════════
   BACKDROP — pure CSS/SVG atmosphere.
   Costs no network requests, can't 404, works offline.
   Sits at z-index 0 behind everything, pointer-events none.
   ═══════════════════════════════════════════════════════════════ */

export function Backdrop() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Aurora — three slow-drifting colour fields. The third is warm on
          purpose: violet and mint are both cool, and two cool sources over a
          neutral ground is what made the page read cold. */}
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="aurora a3" />

      {/* Dot grid, fading out toward the bottom */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        <defs>
          <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#24242A" />
          </pattern>
          <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="dotMask"><rect width="100%" height="100%" fill="url(#fadeDown)" /></mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" mask="url(#dotMask)" />
      </svg>

      {/* Film grain — SVG turbulence, no image file needed */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.035, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Optional generated texture, if the MJ tile has been dropped in */}
      <div className="mj-texture" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONNECTIVE LINES — the collaboration motif, drawn live.
   Nodes drift slowly; lines appear between nodes that are close.
   Respects prefers-reduced-motion by freezing on the first frame.
   ═══════════════════════════════════════════════════════════════ */

export function ConnectiveField({ height = 220, count = 26 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w, h, nodes, raf;

    const size = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 1 + Math.random() * 1.6,
        c: Math.random() > 0.72 ? C.mint : C.violet,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.strokeStyle = `rgba(124,58,237,${(1 - d / 130) * 0.28})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.fillStyle = n.c;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (!still) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      });

      if (!still) raf = requestAnimationFrame(draw);
    };

    size();
    seed();
    draw();

    const onResize = () => { size(); seed(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [count]);

  return (
    <canvas ref={ref} aria-hidden="true"
      style={{ width: "100%", height, display: "block", opacity: 0.75, maskImage: "linear-gradient(to bottom,transparent,#000 30%,#000 70%,transparent)", WebkitMaskImage: "linear-gradient(to bottom,transparent,#000 30%,#000 70%,transparent)" }} />
  );
}

/* ═══════════════════════════════════════════════════════════════
   ART SLOT — shows a generated image if present, otherwise a
   CSS gradient that looks deliberate rather than broken.
   Drop files into public/art/ and they light up automatically.
   ═══════════════════════════════════════════════════════════════ */

export function ArtSlot({ src, ratio = "4 / 3", radius = 10, fallbackFrom = C.violet, fallbackTo = C.mint, children, style }) {
  const [state, setState] = useState("checking");

  useEffect(() => {
    let dead = false;
    const img = new Image();
    img.onload = () => !dead && setState("ok");
    img.onerror = () => !dead && setState("none");
    img.src = src;
    return () => { dead = true; };
  }, [src]);

  return (
    <div style={{
      position: "relative", aspectRatio: ratio, borderRadius: radius, overflow: "hidden",
      border: "1px solid #24242A",
      background: state === "ok"
        ? `#0A0A0B url(${src}) center/cover`
        : `radial-gradient(120% 100% at 20% 10%, ${fallbackFrom}22, transparent 60%),
           radial-gradient(100% 100% at 85% 90%, ${fallbackTo}1C, transparent 55%),
           #0A0A0B`,
      ...style,
    }}>
      {state !== "ok" && children}
      {state === "ok" && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #101010CC, transparent 55%)" }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROTATING ART — the hero slot, cycling through whatever exists.

   Every candidate is probed before it is shown, so the list can name files
   that have not been generated yet: missing ones are dropped silently and
   the slot behaves exactly as it did with a single image. With one file it
   never cycles. With none it falls back to the gradient.

   Auto-advance stops under prefers-reduced-motion — a picture changing on
   its own behind text is exactly the kind of motion that rule exists for.
   ═══════════════════════════════════════════════════════════════ */

export function RotatingArt({ sources = [], ratio = "16 / 10", radius = 10, every = 9000, children }) {
  const [live, setLive] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let dead = false;
    const found = [];
    Promise.all(
      sources.map((src) => new Promise((res) => {
        const img = new Image();
        img.onload = () => { found.push(src); res(); };
        img.onerror = () => res();
        img.src = src;
      }))
    ).then(() => {
      if (dead) return;
      // Keep the authored order rather than whichever decoded first.
      setLive(sources.filter((s) => found.includes(s)));
    });
    return () => { dead = true; };
  }, [sources.join("|")]);

  useEffect(() => {
    if (live.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % live.length), every);
    return () => clearInterval(t);
  }, [live, every]);

  return (
    <div style={{
      position: "relative", aspectRatio: ratio, borderRadius: radius, overflow: "hidden",
      border: "1px solid #24242A",
      background: `radial-gradient(120% 100% at 20% 10%, ${C.violet}22, transparent 60%),
                   radial-gradient(100% 100% at 85% 90%, ${C.mint}1C, transparent 55%),
                   #0A0A0B`,
    }}>
      {/* Both layers stay mounted; only opacity moves, so the cross-fade
          never shows the ground through a gap. */}
      {live.map((src, n) => (
        <div key={src} aria-hidden="true" style={{
          position: "absolute", inset: 0,
          background: `#0A0A0B url(${src}) center/cover`,
          opacity: n === i ? 1 : 0,
          transition: "opacity 1.1s ease-in-out",
        }} />
      ))}

      {live.length === 0 && children}

      {live.length > 0 && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #101010CC, transparent 55%)" }} />
      )}

      {/* Which of them you are looking at, only when there is a choice. */}
      {live.length > 1 && (
        <div style={{ position: "absolute", bottom: 10, right: 12, display: "flex", gap: 5 }}>
          {live.map((src, n) => (
            <button key={src} onClick={() => setI(n)} aria-label={`Show image ${n + 1}`}
              style={{
                width: 5, height: 5, padding: 0, borderRadius: "50%", cursor: "pointer",
                border: "none", background: n === i ? "#E8E6E3" : "#E8E6E355",
                transition: "background .3s",
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AVATAR — deterministic gradient from initials, upgraded to a
   generated portrait if public/art/avatar-N.jpg exists.
   ═══════════════════════════════════════════════════════════════ */

const PAIRS = [
  [C.violet, C.mint], [C.mint, C.amber], [C.amber, C.violet],
  [C.violet, C.sky], [C.sky, C.mint], [C.rose, C.violet],
];

const hashStr = (s) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7);

export function Avatar({ name, size = 28, index }) {
  const [img, setImg] = useState(false);
  const n = index ?? Math.abs(hashStr(name)) % PAIRS.length;
  const [from, to] = PAIRS[n % PAIRS.length];
  const src = `/art/avatar-${(n % 6) + 1}.jpg`;

  useEffect(() => {
    let dead = false;
    const i = new Image();
    i.onload = () => !dead && setImg(true);
    i.src = src;
    return () => { dead = true; };
  }, [src]);

  const initials = name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <span title={name} style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      display: "grid", placeItems: "center",
      background: img ? `#0A0A0B url(${src}) center/cover` : `linear-gradient(135deg, ${from}, ${to})`,
      color: "#101010", fontFamily: "'JetBrains Mono',monospace",
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: "-.02em",
      border: "2px solid #101010",
    }}>
      {!img && initials}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRESENCE STRIP — the human element that ships today.
   Overlapping avatars plus a live-ish caption.
   ═══════════════════════════════════════════════════════════════ */

const PEOPLE = ["mira.k", "dan.s", "leah.r", "omar.j", "ava.c", "jin.w"];

export function PresenceStrip({ label = "in the room right now" }) {
  /* This used to invent its own number: 3 + Math.floor(Math.random() * 4),
     re-rolled every six seconds, over avatars of people who do not exist.
     Fabricated social proof on a site whose house rules promise that claims
     are checkable — and the one number a visitor might have believed.

     It now shows the room's real presence count, which the room already
     tracks server-side, and renders NOTHING when there is nobody there.
     An empty room is allowed to look empty. */
  const [n, setN] = useState(null);

  useEffect(() => {
    let dead = false;
    const read = () => fetch("/api/room?room=lobby")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!dead && d) setN(d.here || 0); })
      .catch(() => {});
    read();
    const t = setInterval(read, 30000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  if (!n) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex" }}>
        {Array.from({ length: Math.min(n, 5) }).map((_, i) => (
          <span key={i} style={{ marginLeft: i ? -9 : 0, position: "relative", zIndex: 5 - i }}>
            <Avatar name={`p${i}`} index={i} size={28} />
          </span>
        ))}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#7E8494" }}>
        {n} {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER ART — wide band behind a section title.
   ═══════════════════════════════════════════════════════════════ */

export function HeaderArt({ view }) {
  const [ok, setOk] = useState(false);
  const src = `/art/header-${view}.jpg`;

  useEffect(() => {
    let dead = false;
    const i = new Image();
    i.onload = () => !dead && setOk(true);
    i.onerror = () => !dead && setOk(false);
    i.src = src;
    return () => { dead = true; };
  }, [src]);

  if (!ok) return null;

  return (
    <div aria-hidden="true" style={{
      position: "absolute", top: -24, left: -28, right: -28, height: 190,
      background: `url(${src}) center/cover`, opacity: 0.22,
      maskImage: "linear-gradient(to bottom, #000, transparent)",
      WebkitMaskImage: "linear-gradient(to bottom, #000, transparent)",
      pointerEvents: "none", zIndex: 0,
    }} />
  );
}


/* ═══════════════════════════════════════════════════════════════
   FEED THUMBNAIL
   Three states: loading skeleton, loaded image, or a source-coloured
   gradient when the item has no image or the fetch fails. The
   fallback is deliberate-looking rather than a broken-image icon —
   roughly a third of feed items have no usable image at all.
   ═══════════════════════════════════════════════════════════════ */

export function FeedThumb({ src, color = C.violet, w = 116, ratio = "16 / 10", radius = 7, host }) {
  const [state, setState] = useState(src ? "loading" : host ? "loading" : "none");
  const [url, setUrl] = useState(null);
  const [isIcon, setIsIcon] = useState(false);

  useEffect(() => {
    let dead = false;
    setIsIcon(false);

    // Fallback chain, most informative first:
    //   1. article image via our proxy   (privacy + caching)
    //   2. article image direct          (proxy absent on a drop deploy)
    //   3. the source site's favicon     (branded, better than nothing)
    //   4. gradient + glyph              (never a broken-image icon)
    const chain = [];
    if (src) {
      if (USE_IMG_PROXY && proxyAvailable !== false) chain.push([proxied(src), "proxy"]);
      chain.push([src, "direct"]);
    }
    if (host) {
      const fav = `https://${host}/favicon.ico`;
      chain.push([USE_IMG_PROXY && proxyAvailable !== false ? proxied(fav) : fav, "icon"]);
    }

    if (chain.length === 0) { setState("none"); setUrl(null); return; }
    setState("loading");

    const run = (i) => {
      if (dead || i >= chain.length) { if (!dead) { setState("none"); setUrl(null); } return; }
      const [candidate, kind] = chain[i];
      const img = new Image();
      img.onload = () => {
        if (dead) return;
        if (kind === "proxy") proxyAvailable = true;
        // Reject 1x1 trackers and tiny placeholder icons served as article art.
        if (kind !== "icon" && img.naturalWidth < 64) return run(i + 1);
        setIsIcon(kind === "icon");
        setUrl(candidate);
        setState("ok");
      };
      img.onerror = () => {
        if (dead) return;
        if (kind === "proxy") proxyAvailable = false;
        run(i + 1);
      };
      img.src = candidate;
    };
    run(0);

    return () => { dead = true; };
  }, [src, host]);

  const showing = state === "ok" && url;

  return (
    <div style={{
      width: w, aspectRatio: ratio, flexShrink: 0, borderRadius: radius,
      overflow: "hidden", position: "relative",
      border: "1px solid #24242A",
      background: showing && !isIcon
        ? `#0A0A0B url("${url}") center/cover`
        : `linear-gradient(135deg, ${color}1E, #0A0A0B 70%)`,
      transition: "background .25s",
    }}>
      {/* A favicon is centred at its own size rather than stretched to cover. */}
      {showing && isIcon && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
        }}>
          <img src={url} alt="" width={28} height={28}
            style={{ borderRadius: 5, opacity: .85, filter: "saturate(.9)" }} />
        </div>
      )}
      {state === "loading" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg,transparent,#ffffff09,transparent)",
          backgroundSize: "200% 100%", animation: "sweep 1.4s linear infinite",
        }} />
      )}
      {state === "none" && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          color: `${color}66`, fontSize: 15,
        }}>{"\u25C8"}</div>
      )}
    </div>
  );
}
