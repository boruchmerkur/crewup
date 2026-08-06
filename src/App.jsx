import { useState, useEffect, useMemo, useRef } from "react";
import { C, SOURCES, TAGS, PLAYBOOK, TOOLS, GLOSSARY } from "./data.js";
import { fetchFeed, scoreItem, relTime, trendingTerms, exportOPML, useSaved } from "./lib.js";
import { track } from "./analytics.js";
import Board from "./Board.jsx";
import { Backdrop, ConnectiveField, ArtSlot, Avatar, PresenceStrip, HeaderArt, FeedThumb } from "./Art.jsx";

const VIEWS = [
  { id: "home",     label: "Home",     hint: "What this is" },
  { id: "feed",     label: "Feed",     hint: "Live stream from 30 sources" },
  { id: "board",    label: "Board",    hint: "Who needs help, and who needs work" },
  { id: "playbook", label: "Playbook", hint: "How teams actually work together" },
  { id: "toolbox",  label: "Toolbox",  hint: "Tools worth the switching cost" },
  { id: "glossary", label: "Glossary", hint: "The vocabulary, defined" },
  { id: "sources",  label: "Sources",  hint: "What we read, and why" },
  { id: "saved",    label: "Saved",    hint: "Your reading list" },
];

const S = {
  bg: "#0D1117", panel: "#0B0F15", line: "#1C2333", hov: "#12161F",
  text: "#E8E6E3", dim: "#6B7694", faint: "#3B4252",
  mono: "'JetBrains Mono',ui-monospace,monospace",
  disp: "'Space Grotesk',sans-serif",
  body: "'Inter',-apple-system,sans-serif",
};

/* Real paths, not hash fragments. A hash never reaches the server, so
   hash routing would have made every server-side pageview record as "/".
   The SPA catch-all in public/_redirects serves index.html for these. */
const validView = (p) => {
  const id = (p || "").replace(/^\/+|\/+$/g, "").replace(/^#\/?/, "") || "home";
  return VIEWS.some((v) => v.id === id) ? id : "home";
};

const pathFor = (id) => (id === "home" ? "/" : `/${id}`);

export default function App() {
  const [view, setViewRaw] = useState(() => validView(location.pathname + location.hash));
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({});
  const [tag, setTag] = useState("all");
  const [q, setQ] = useState("");
  const [collabOnly, setCollabOnly] = useState(false);
  const [sort, setSort] = useState("new");
  const [dense, setDense] = useState(false);
  const [layout, setLayout] = useState("list"); // list | grid
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState(null);
  const [cursor, setCursor] = useState(-1);
  const searchRef = useRef(null);
  const { saved, toggle, clear } = useSaved();

  const setView = (id) => {
    setViewRaw(id);
    setCursor(-1);
    history.pushState(null, "", pathFor(id));
    track("view", { view: id });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  useEffect(() => {
    const onNav = () => setViewRaw(validView(location.pathname + location.hash));
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, []);

  /* Pull every feed in parallel; render each as it lands. */
  useEffect(() => {
    let dead = false;
    setStatus(Object.fromEntries(SOURCES.map((s) => [s.id, "loading"])));
    let done = 0;
    SOURCES.forEach(async (s) => {
      const { ok, items: got } = await fetchFeed(s);
      if (dead) return;
      setStatus((p) => ({ ...p, [s.id]: ok ? "ok" : "fail" }));
      if (ok) setItems((p) => [...p, ...got]);
      if (++done === SOURCES.length) setLoading(false);
    });
    return () => { dead = true; };
  }, []);

  /* Keyboard */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") {
        if (e.key === "Escape") { e.target.blur(); setQ(""); }
        return;
      }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VIEWS.length) { setView(VIEWS[n - 1].id); return; }
      if (view !== "feed" && view !== "saved") return;
      if (e.key === "j") { e.preventDefault(); setCursor((c) => c + 1); }
      if (e.key === "k") { e.preventDefault(); setCursor((c) => Math.max(-1, c - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  useEffect(() => {
    if (cursor < 0) return;
    document.querySelector(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cursor]);

  const visible = useMemo(() => {
    let out = items;
    if (tag !== "all") out = out.filter((i) => i.tag === tag);
    if (collabOnly) out = out.filter((i) => scoreItem(i) > 0);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((i) => (i.title + i.summary + i.source).toLowerCase().includes(s));
    }
    const seen = new Set();
    out = out.filter((i) => (seen.has(i.link) ? false : seen.add(i.link)));
    return sort === "new"
      ? [...out].sort((a, b) => (b.date || 0) - (a.date || 0))
      : [...out].sort((a, b) => scoreItem(b) - scoreItem(a) || (b.date || 0) - (a.date || 0));
  }, [items, tag, q, collabOnly, sort]);

  const trends = useMemo(() => trendingTerms(items), [items]);
  const savedLinks = useMemo(() => new Set(saved.map((s) => s.link)), [saved]);
  const live = Object.values(status).filter((s) => s === "ok").length;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.body, position: "relative" }}>
      <Backdrop />

      {/* ── Header ── */}
      <header style={{
        borderBottom: `1px solid ${S.line}`, padding: "14px 28px", display: "flex",
        alignItems: "center", gap: 12, flexWrap: "wrap", position: "sticky", top: 0,
        background: "rgba(13,17,23,.94)", backdropFilter: "blur(12px)", zIndex: 30,
      }}>
        <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0 }}>
          <span style={{ width: 26, height: 26, borderRadius: 6, background: `linear-gradient(135deg,${C.violet},${C.mint})`, display: "grid", placeItems: "center", fontFamily: S.mono, fontWeight: 700, fontSize: 13, color: S.bg }}>C</span>
          <span className="glow-text" style={{ fontFamily: S.disp, fontWeight: 600, fontSize: 17, letterSpacing: "-.02em" }}>collab</span>
        </button>

        <nav style={{ display: "flex", gap: 2, marginLeft: 14, flexWrap: "wrap" }}>
          {VIEWS.map((v, i) => (
            <button key={v.id} onClick={() => setView(v.id)} title={v.hint} style={{
              background: view === v.id ? S.hov : "transparent",
              color: view === v.id ? S.text : S.dim,
              border: "none", borderRadius: 6, padding: "6px 11px", fontSize: 13,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              {v.label}
              <span style={{ fontFamily: S.mono, fontSize: 9, color: S.faint }}>{i + 1}</span>
              {v.id === "saved" && saved.length > 0 && (
                <span style={{ fontFamily: S.mono, fontSize: 10, color: C.mint }}>{saved.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, fontFamily: S.mono, fontSize: 11, color: S.dim }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? C.violet : C.mint, animation: loading ? "pulse 1.4s infinite" : "none" }} />
          {loading ? "syncing…" : `${live}/${SOURCES.length} live · ${items.length} items`}
        </div>
      </header>

      {/* ── Feed / Saved controls ── */}
      {(view === "feed" || view === "saved") && (
        <div style={{ borderBottom: `1px solid ${S.line}`, padding: "12px 28px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {view === "feed" && TAGS.map((t) => (
            <button key={t} onClick={() => setTag(t)} className="chip" style={{
              background: tag === t ? C.violet : "transparent", color: tag === t ? "#fff" : S.dim,
              border: `1px solid ${tag === t ? C.violet : S.line}`, borderRadius: 999,
              padding: "5px 13px", fontSize: 12, fontFamily: S.mono, cursor: "pointer", transition: "all .15s",
            }}>{t}</button>
          ))}
          {view === "feed" && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6, fontSize: 12, fontFamily: S.mono, color: collabOnly ? C.mint : S.dim, cursor: "pointer" }}>
                <input type="checkbox" checked={collabOnly} onChange={(e) => setCollabOnly(e.target.checked)} style={{ accentColor: C.mint, cursor: "pointer" }} />
                collab only
              </label>
              <button onClick={() => setSort(sort === "new" ? "rel" : "new")} className="chip" style={ctlBtn}>
                sort: {sort === "new" ? "newest" : "relevance"}
              </button>
            </>
          )}
          <button onClick={() => setLayout(layout === "list" ? "grid" : "list")} className="chip" style={ctlBtn}>
            {layout === "list" ? "\u2261 list" : "\u229E grid"}
          </button>
          {layout === "list" && (
            <button onClick={() => setDense(!dense)} className="chip" style={ctlBtn}>{dense ? "compact" : "comfortable"}</button>
          )}
          {view === "saved" && saved.length > 0 && (
            <button onClick={clear} className="chip" style={ctlBtn}>clear all</button>
          )}
          <input ref={searchRef} value={q} onChange={(e) => { setQ(e.target.value); }} onBlur={() => q && track("search", { q })}
            placeholder="filter…  /" style={{
              marginLeft: "auto", background: S.panel, border: `1px solid ${S.line}`, borderRadius: 6,
              padding: "7px 12px", fontSize: 13, color: S.text, width: 180, fontFamily: S.mono, transition: "border-color .15s",
            }} />
        </div>
      )}

      <div className="shell" style={{
        display: "grid", gridTemplateColumns: view === "feed" ? "1fr 250px" : "1fr",
        gap: 32, padding: view === "home" ? "0" : "24px 28px 80px",
        maxWidth: view === "home" ? "none" : 1280, margin: "0 auto",
      }}>
        <main>
          {view === "home" && <Home setView={setView} items={items} saved={saved} live={live} loading={loading} />}

          {view === "feed" && (
            <>
              {visible.length === 0 && loading && (
                <div style={{ color: S.faint, fontFamily: S.mono, fontSize: 13, padding: "40px 0" }}>pulling {SOURCES.length} feeds…</div>
              )}
              {visible.length === 0 && !loading && (
                <Empty title="Nothing matches" body="Loosen the filters, or a few upstream feeds may be slow. The Playbook, Toolbox and Glossary work regardless — they're local." />
              )}
              {layout === "grid" ? (
                <div className="gridwrap">
                  {visible.map((it, i) => (
                    <FeedCard key={it.link + i} it={it} isSaved={savedLinks.has(it.link)}
                      onSave={() => { toggle(it); track("save", { link: it.link, source: it.source }); }} />
                  ))}
                </div>
              ) : (
                visible.map((it, i) => (
                  <FeedRow key={it.link + i} it={it} i={i} dense={dense} active={cursor === i}
                    isSaved={savedLinks.has(it.link)} onSave={() => { toggle(it); track("save", { link: it.link, source: it.source }); }} />
                ))
              )}
            </>
          )}

          {view === "board" && <Board />}
          {view === "playbook" && <Playbook openCard={openCard} setOpenCard={setOpenCard} />}
          {view === "toolbox" && <Toolbox />}
          {view === "glossary" && <Glossary />}
          {view === "sources" && <Sources status={status} items={items} />}

          {view === "saved" && (
            <>
              <SectionHead eyebrow="Saved" title="Your reading list"
                body="Stored in this browser only — nothing leaves your device. Click the star on any feed item to keep it here." />
              {saved.length === 0
                ? <Empty title="Nothing saved yet" body="Hover an item in the feed and hit the star." />
                : saved
                    .filter((it) => !q.trim() || (it.title + it.summary).toLowerCase().includes(q.toLowerCase()))
                    .map((it, i) => (
                      <FeedRow key={it.link} it={it} i={i} dense={dense} active={cursor === i}
                        isSaved onSave={() => toggle(it)} />
                    ))}
            </>
          )}
        </main>

        {view === "feed" && (
          <Rail trends={trends} q={q} setQ={setQ} status={status} visible={visible} items={items} saved={saved} />
        )}
      </div>

      {view !== "home" && <Footer />}
    </div>
  );
}

const ctlBtn = {
  background: "transparent", color: S.dim, border: `1px solid ${S.line}`,
  borderRadius: 6, padding: "5px 11px", fontSize: 12, fontFamily: S.mono, cursor: "pointer",
};

/* ═══ HOME ═══ */

const TYPING = [
  "const room = await collab.open('sprint-14');",
  "room.invite(['@mira', '@dan', '@leah']);",
  "room.on('push', c => notify(c.author, c.message));",
  "// everyone's here. let's ship.",
];

function Home({ setView, items, saved, live, loading }) {
  const [lines, setLines] = useState([]);
  const [li, setLi] = useState(0);
  const [ci, setCi] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (li >= TYPING.length) return;
    const line = TYPING[li];
    if (ci <= line.length) {
      const t = setTimeout(() => {
        setLines((p) => { const c = [...p]; c[li] = line.slice(0, ci); return c; });
        setCi((c) => c + 1);
      }, 26 + Math.random() * 44);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setLi((l) => l + 1); setCi(0); }, 380);
    return () => clearTimeout(t);
  }, [li, ci]);

  const hi = (t = "") => t
    .replace(/(const|await|new|return)/g, `<span style="color:${C.violet}">$1</span>`)
    .replace(/(\/\/.*)/g, `<span style="color:#546178">$1</span>`)
    .replace(/('(?:[^'\\]|\\.)*')/g, `<span style="color:${C.mint}">$1</span>`)
    .replace(/(\.[a-z]\w*)/g, `<span style="color:${C.amber}">$1</span>`);

  const stats = [
    { n: SOURCES.length, l: "feeds tracked" },
    { n: PLAYBOOK.length, l: "practices" },
    { n: TOOLS.reduce((a, g) => a + g.items.length, 0), l: "tools reviewed" },
    { n: GLOSSARY.length, l: "terms defined" },
  ];

  return (
    <div>
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 28px 56px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="hero">
        <div>
          <div style={{ fontFamily: S.mono, fontSize: 11, color: C.violet, marginBottom: 22, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.mint, animation: "pulse 2s infinite" }} />
            {live > 0 ? `${live} sources streaming` : "connecting to sources…"}
          </div>
          <h1 style={{ fontFamily: S.disp, fontSize: 50, fontWeight: 700, lineHeight: 1.07, letterSpacing: "-.03em", marginBottom: 22 }}>
            Code together.<br /><span style={{ color: C.violet }}>Ship faster.</span>
          </h1>
          <p style={{ fontSize: 17, color: S.dim, lineHeight: 1.62, maxWidth: 430, marginBottom: 32 }}>
            A working library for teams that build things together — a live feed of what's being
            written about collaboration, the practices that actually hold up, and the tools worth
            the switching cost.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setView("feed")} style={{ background: C.violet, color: "#fff", border: "none", borderRadius: 7, padding: "12px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Read the feed
            </button>
            <button onClick={() => setView("playbook")} style={{ background: "transparent", color: S.text, border: `1px solid ${S.line}`, borderRadius: 7, padding: "12px 22px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Open the playbook
            </button>
          </div>
          <div style={{ marginTop: 28 }}><PresenceStrip /></div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
        <ArtSlot src="/art/hero.jpg" ratio="16 / 10">
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <ConnectiveField height={220} count={30} />
          </div>
        </ArtSlot>

        <div style={{ background: "#0B0F15", border: `1px solid ${S.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${S.line}`, display: "flex", alignItems: "center", gap: 8 }}>
            {["#F5534F", "#F5BF4F", "#28C840"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
            <span style={{ fontFamily: S.mono, fontSize: 11, color: S.faint, marginLeft: 8 }}>collab — session:sprint-14</span>
          </div>
          <div style={{ padding: "20px", fontFamily: S.mono, fontSize: 13, lineHeight: 1.85, color: "#C9D1D9", minHeight: 150 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                <span style={{ color: "#3B4252", width: 16, textAlign: "right", flexShrink: 0, userSelect: "none" }}>{i + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: hi(l) }} />
                {i === li && <span style={{ display: "inline-block", width: 8, height: 17, marginTop: 3, background: blink ? C.violet : "transparent" }} />}
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

      <FeaturedFeed items={items} setView={setView} loading={loading} />

      <section style={{ borderTop: `1px solid ${S.line}`, borderBottom: `1px solid ${S.line}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          {stats.map((s, i) => (
            <div key={s.l} style={{ padding: "26px 4px", borderLeft: i ? `1px solid ${S.line}` : "none" }}>
              <div style={{ fontFamily: S.disp, fontSize: 30, fontWeight: 600, letterSpacing: "-.02em" }}>{s.n}</div>
              <div style={{ fontFamily: S.mono, fontSize: 11, color: S.faint, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 28px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 1, background: S.line, borderRadius: 10, overflow: "hidden" }}>
          {VIEWS.filter((v) => v.id !== "home" && v.id !== "saved").map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} className="card lift" style={{
              background: S.bg, border: "none", padding: "30px 26px", textAlign: "left",
              cursor: "pointer", color: S.text, transition: "background .15s",
            }}>
              <div style={{ fontFamily: S.disp, fontSize: 19, fontWeight: 600, marginBottom: 8, letterSpacing: "-.015em" }}>{v.label}</div>
              <div style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.5 }}>{v.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   FEATURED FEED — the landing-page strip.
   Image-first by design: items WITH thumbnails are promoted ahead of
   ones without, because a wall of gradient placeholders is worse than
   a shorter, fully-illustrated strip. Only pads with image-less items
   if there genuinely aren't enough.
   ═══════════════════════════════════════════════════════════════ */

function FeaturedFeed({ items, setView, loading }) {
  const picks = useMemo(() => {
    const byDate = (a, b) => (b.date || 0) - (a.date || 0);
    const seen = new Set();
    const uniq = items.filter((i) => (seen.has(i.link) ? false : seen.add(i.link)));

    // Spread across sources so one prolific feed can't take the whole strip.
    const perSource = {};
    const spread = [...uniq].sort(byDate).filter((i) => {
      perSource[i.sourceId] = (perSource[i.sourceId] || 0) + 1;
      return perSource[i.sourceId] <= 2;
    });

    const withImg = spread.filter((i) => i.image);
    const without = spread.filter((i) => !i.image);
    return [...withImg, ...without].slice(0, 5);
  }, [items]);

  if (loading && picks.length === 0) {
    return (
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px 64px" }}>
        <Eyebrow>Latest</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16 }} className="feat">
          <Skel h={330} />
          <div style={{ display: "grid", gap: 16 }}>
            <Skel h={157} /><Skel h={157} />
          </div>
        </div>
      </section>
    );
  }

  if (picks.length === 0) return null;

  const [lead, ...rest] = picks;

  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px 64px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
        <Eyebrow flush>Latest</Eyebrow>
        <button onClick={() => setView("feed")} style={{
          marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
          color: C.violet, fontSize: 13, fontFamily: S.mono,
        }}>read the full feed →</button>
      </div>

      <div className="feat" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16 }}>
        {/* Lead story — big image */}
        <a href={lead.link} target="_blank" rel="noopener noreferrer" className="card lift"
          onClick={() => track("outbound", { to: lead.link, source: lead.source, kind: "featured" })}
          style={{
            background: S.panel, border: `1px solid ${S.line}`, borderRadius: 12,
            overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
          <FeedThumb src={lead.image} color={lead.color} w="100%" ratio="16 / 9" radius={0} host={lead.host} />
          <div style={{ padding: "18px 20px 20px" }}>
            <Meta it={lead} />
            <h3 className="t" style={{
              fontFamily: S.disp, fontSize: 21, fontWeight: 600, lineHeight: 1.28,
              letterSpacing: "-.02em", marginBottom: 8, transition: "color .15s",
            }}>{lead.title}</h3>
            {lead.summary && (
              <p style={{
                fontSize: 13.5, color: S.dim, lineHeight: 1.6,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>{lead.summary}</p>
            )}
          </div>
        </a>

        {/* Four secondary items, thumbnail left */}
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          {rest.map((it) => (
            <a key={it.link} href={it.link} target="_blank" rel="noopener noreferrer" className="card lift"
              onClick={() => track("outbound", { to: it.link, source: it.source, kind: "featured" })}
              style={{
                background: S.panel, border: `1px solid ${S.line}`, borderRadius: 10,
                overflow: "hidden", display: "flex", gap: 0, alignItems: "stretch",
              }}>
              <div style={{ width: 104, flexShrink: 0 }}>
                <FeedThumb src={it.image} color={it.color} w="100%" ratio="1 / 1" radius={0} host={it.host} />
              </div>
              <div style={{ padding: "11px 14px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Meta it={it} tight />
                <h4 className="t" style={{
                  fontFamily: S.disp, fontSize: 14, fontWeight: 600, lineHeight: 1.35,
                  letterSpacing: "-.01em", transition: "color .15s",
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>{it.title}</h4>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const Meta = ({ it, tight }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 7,
    marginBottom: tight ? 5 : 9, fontFamily: S.mono, fontSize: 10.5,
  }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: it.color, flexShrink: 0 }} />
    <span style={{ color: it.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.source}</span>
    <span style={{ color: S.faint, marginLeft: "auto", flexShrink: 0 }}>{relTime(it.date)}</span>
  </div>
);

const Eyebrow = ({ children, flush }) => (
  <div style={{
    fontFamily: S.mono, fontSize: 10, color: C.violet, letterSpacing: ".1em",
    textTransform: "uppercase", marginBottom: flush ? 0 : 18,
  }}>{children}</div>
);

const Skel = ({ h }) => (
  <div style={{
    height: h, borderRadius: 12, border: `1px solid ${S.line}`, background: S.panel,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(90deg,transparent,#ffffff08,transparent)",
      backgroundSize: "200% 100%", animation: "sweep 1.4s linear infinite",
    }} />
  </div>
);

/* ═══ VIEWS ═══ */

function Playbook({ openCard, setOpenCard }) {
  return (
    <>
      <SectionHead art="playbook" eyebrow="Playbook" title="How teams actually work together"
        body={`${PLAYBOOK.length} practices, each with the mechanics, the failure modes, and one thing worth measuring. Written to be argued with.`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {PLAYBOOK.map((p) => {
          const open = openCard === p.id;
          return (
            <div key={p.id} className="card lift" onClick={() => { setOpenCard(open ? null : p.id); if (!open) track("open_practice", { id: p.id }); }}
              style={{
                background: S.panel, border: `1px solid ${open ? "#2A3550" : S.line}`, borderRadius: 10,
                padding: "18px 20px", cursor: "pointer", transition: "border-color .15s",
                gridColumn: open ? "1 / -1" : "auto",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontFamily: S.mono, fontSize: 10 }}>
                <span style={{ color: C.violet, letterSpacing: ".07em", textTransform: "uppercase" }}>{p.family}</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                  {[0, 1, 2].map((n) => (
                    <span key={n} style={{ width: 14, height: 3, borderRadius: 2, background: n < { low: 1, medium: 2, high: 3 }[p.heat] ? C.mint : S.line }} />
                  ))}
                </span>
              </div>
              <h3 style={{ fontFamily: S.disp, fontSize: 18, fontWeight: 600, letterSpacing: "-.015em", marginBottom: 7 }}>{p.name}</h3>
              <p style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.55 }}>{p.one}</p>
              {open && (
                <div style={{ marginTop: 20, animation: "rise .25s ease-out", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 24 }}>
                  <Block label="When to reach for it"><p style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.6 }}>{p.when}</p></Block>
                  <Block label="How it works">
                    <ol style={{ padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                      {p.how.map((h, n) => (
                        <li key={n} style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.55, display: "flex", gap: 10 }}>
                          <span style={{ fontFamily: S.mono, fontSize: 11, color: C.violet, flexShrink: 0, paddingTop: 2 }}>{String(n + 1).padStart(2, "0")}</span>{h}
                        </li>
                      ))}
                    </ol>
                  </Block>
                  <Block label="Where it goes wrong">
                    <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                      {p.pitfalls.map((x, n) => (
                        <li key={n} style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.55, display: "flex", gap: 10 }}>
                          <span style={{ color: C.rose, flexShrink: 0 }}>·</span>{x}
                        </li>
                      ))}
                    </ul>
                  </Block>
                  <Block label="Worth measuring">
                    <p style={{ fontSize: 13.5, color: C.mint, lineHeight: 1.6, fontFamily: S.mono }}>{p.metric}</p>
                  </Block>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Toolbox() {
  return (
    <>
      <SectionHead art="toolbox" eyebrow="Toolbox" title="Tools worth the switching cost"
        body="Grouped by the collaboration problem they solve, with an honest line on each. No affiliate links, no rankings." />
      {TOOLS.map((g) => (
        <div key={g.cat} style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: S.mono, fontSize: 10, color: C.violet, letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 12 }}>{g.cat}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {g.items.map((t) => (
              <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer" className="card lift"
                onClick={() => track("outbound", { to: t.url, kind: "tool" })}
                style={{ background: S.panel, border: `1px solid ${S.line}`, borderRadius: 9, padding: "16px 18px", display: "block", transition: "border-color .15s" }}>
                <div style={{ fontFamily: S.disp, fontSize: 15, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  {t.name}<span style={{ color: S.faint, fontSize: 12 }}>↗</span>
                </div>
                <p style={{ fontSize: 13, color: S.dim, lineHeight: 1.55 }}>{t.note}</p>
              </a>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Glossary() {
  return (
    <>
      <SectionHead art="glossary" eyebrow="Glossary" title="The vocabulary, defined"
        body="Terms that get thrown around in collaboration discussions, written out plainly." />
      <div style={{ display: "grid", gap: 1, background: S.line, border: `1px solid ${S.line}`, borderRadius: 10, overflow: "hidden" }}>
        {GLOSSARY.map((g) => (
          <div key={g.term} className="gloss" style={{ background: S.bg, padding: "16px 20px", display: "grid", gridTemplateColumns: "180px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ fontFamily: S.mono, fontSize: 13, color: C.mint }}>{g.term}</div>
            <p style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.6 }}>{g.def}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Sources({ status, items }) {
  return (
    <>
      <SectionHead art="sources" eyebrow="Sources" title="What we read"
        body={`${SOURCES.length} feeds, refreshed on load. Take the whole list to your own reader — the OPML export works with Feedly, NetNewsWire, Inoreader, anything.`} />
      <button onClick={() => { exportOPML(); track("opml"); }} style={{
        background: C.violet, color: "#fff", border: "none", borderRadius: 7,
        padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 28,
      }}>Download OPML ({SOURCES.length} feeds)</button>
      {TAGS.filter((t) => t !== "all").map((t) => (
        <div key={t} style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: S.mono, fontSize: 10, color: C.violet, letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 12 }}>{t}</div>
          <div style={{ border: `1px solid ${S.line}`, borderRadius: 9, overflow: "hidden" }}>
            {SOURCES.filter((s) => s.tag === t).map((s, i, arr) => (
              <div key={s.id} style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < arr.length - 1 ? `1px solid ${S.line}` : "none", background: S.panel, flexWrap: "wrap" }}>
                <Dot state={status[s.id]} />
                <span style={{ fontSize: 14, fontWeight: 500, minWidth: 180 }}>{s.name}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: S.mono, fontSize: 11, color: S.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{s.url}</a>
                <span style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: 11, color: S.faint }}>{items.filter((x) => x.sourceId === s.id).length} items</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Rail({ trends, q, setQ, status, visible, items, saved }) {
  return (
    <aside className="rail" style={{ position: "sticky", top: 86, alignSelf: "start", display: "grid", gap: 26 }}>
      <div>
        <RailLabel>Trending in titles</RailLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {trends.map(([w, n]) => (
            <button key={w} onClick={() => setQ(q === w ? "" : w)} className="chip" style={{
              background: q === w ? C.violet : "transparent", color: q === w ? "#fff" : S.dim,
              border: `1px solid ${q === w ? C.violet : S.line}`, borderRadius: 5,
              padding: "3px 8px", fontSize: 11, fontFamily: S.mono, cursor: "pointer", transition: "all .15s",
            }}>{w}<span style={{ color: q === w ? "#ffffff88" : S.faint, marginLeft: 5 }}>{n}</span></button>
          ))}
          {trends.length === 0 && <span style={{ color: S.faint, fontSize: 12, fontFamily: S.mono }}>waiting for data…</span>}
        </div>
      </div>
      <div>
        <RailLabel>Source health</RailLabel>
        <div style={{ background: S.panel, border: `1px solid ${S.line}`, borderRadius: 8, padding: "4px 12px", maxHeight: 250, overflowY: "auto" }}>
          {SOURCES.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 11.5, fontFamily: S.mono }}>
              <Dot state={status[s.id]} />
              <span style={{ color: status[s.id] === "fail" ? S.faint : S.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <RailLabel>Keyboard</RailLabel>
        <div style={{ fontFamily: S.mono, fontSize: 11, color: S.faint, lineHeight: 2 }}>
          {[["1–8", "switch view"], ["/", "focus filter"], ["j / k", "move cursor"], ["esc", "clear filter"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 10 }}>
              <span style={{ color: S.dim, minWidth: 44 }}>{k}</span><span>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: S.mono, fontSize: 11, color: S.faint, lineHeight: 1.8, borderTop: `1px solid ${S.line}`, paddingTop: 14 }}>
        {visible.length} shown · {items.length} pulled<br />{saved.length} saved
      </div>
    </aside>
  );
}

/* ═══ SMALL PIECES ═══ */

function FeedRow({ it, i, dense, active, isSaved, onSave }) {
  return (
    <div data-idx={i} className="row" style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: dense ? "10px 14px" : "16px 14px",
      borderBottom: `1px solid ${S.line}`,
      borderLeft: `2px solid ${active ? it.color : "transparent"}`,
      background: active ? S.hov : "transparent",
      transition: "background .15s,border-color .15s", animation: "rise .3s ease-out",
    }}>
      {!dense && <FeedThumb src={it.image} color={it.color} w={116} host={it.host} />}
      <a href={it.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0 }}
        onClick={() => track("outbound", { to: it.link, source: it.source, kind: "feed" })}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: dense ? 4 : 7, fontFamily: S.mono, fontSize: 11 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: it.color, flexShrink: 0 }} />
          <span style={{ color: it.color }}>{it.source}</span>
          {it.author && !dense && <span style={{ color: S.faint }}>· {it.author.slice(0, 26)}</span>}
          <span style={{ color: S.faint, marginLeft: "auto" }}>{relTime(it.date)}</span>
        </div>
        <h3 className="t" style={{ fontFamily: S.disp, fontSize: dense ? 14.5 : 16, fontWeight: 600, lineHeight: 1.35, letterSpacing: "-.01em", transition: "color .15s", marginBottom: dense ? 0 : 6 }}>{it.title}</h3>
        {!dense && it.summary && <p style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.55 }}>{it.summary}…</p>}
      </a>
      <button onClick={onSave} className={`sv ${isSaved ? "on" : ""}`} aria-label={isSaved ? "Remove from saved" : "Save"}
        style={{ background: "transparent", border: "none", cursor: "pointer", color: isSaved ? C.mint : S.faint, fontSize: 15, padding: "2px 4px", flexShrink: 0 }}>
        {isSaved ? "★" : "☆"}
      </button>
    </div>
  );
}

function FeedCard({ it, isSaved, onSave }) {
  return (
    <div className="card lift" style={{
      background: S.panel, border: `1px solid ${S.line}`, borderRadius: 10,
      overflow: "hidden", display: "flex", flexDirection: "column",
      animation: "rise .3s ease-out",
    }}>
      <a href={it.link} target="_blank" rel="noopener noreferrer"
        onClick={() => track("outbound", { to: it.link, source: it.source, kind: "feed" })}>
        <FeedThumb src={it.image} color={it.color} w="100%" ratio="16 / 9" radius={0} host={it.host} />
      </a>
      <div style={{ padding: "13px 15px 15px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, fontFamily: S.mono, fontSize: 10.5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: it.color, flexShrink: 0 }} />
          <span style={{ color: it.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.source}</span>
          <span style={{ color: S.faint, marginLeft: "auto" }}>{relTime(it.date)}</span>
          <button onClick={onSave} aria-label={isSaved ? "Remove from saved" : "Save"}
            style={{ background: "none", border: "none", cursor: "pointer", color: isSaved ? C.mint : S.faint, fontSize: 13, padding: 0 }}>
            {isSaved ? "\u2605" : "\u2606"}
          </button>
        </div>
        <a href={it.link} target="_blank" rel="noopener noreferrer" className="t"
          style={{ fontFamily: S.disp, fontSize: 15, fontWeight: 600, lineHeight: 1.35, letterSpacing: "-.01em", marginBottom: 7, transition: "color .15s" }}>
          {it.title}
        </a>
        {it.summary && (
          <p style={{ fontSize: 12.5, color: S.dim, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {it.summary}
          </p>
        )}
      </div>
    </div>
  );
}

const Dot = ({ state }) => (
  <span style={{
    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
    background: state === "ok" ? C.mint : state === "fail" ? "#F5534F" : S.faint,
    animation: state === "loading" ? "pulse 1.2s infinite" : "none",
  }} />
);

const SectionHead = ({ eyebrow, title, body, art }) => (
  <div style={{ marginBottom: 32, maxWidth: 620, position: "relative" }}>
    {art && <HeaderArt view={art} />}
    <div style={{ position: "relative", zIndex: 1 }}>
    <div style={{ fontFamily: S.mono, fontSize: 10, color: C.violet, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>{eyebrow}</div>
    <h2 style={{ fontFamily: S.disp, fontSize: 30, fontWeight: 600, letterSpacing: "-.025em", marginBottom: 12, lineHeight: 1.15 }}>{title}</h2>
    <p style={{ fontSize: 14.5, color: S.dim, lineHeight: 1.65 }}>{body}</p>
    </div>
  </div>
);

const Block = ({ label, children }) => (
  <div>
    <div style={{ fontFamily: S.mono, fontSize: 9.5, color: S.faint, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
    {children}
  </div>
);

const RailLabel = ({ children }) => (
  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.faint, letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 12 }}>{children}</div>
);

const Empty = ({ title, body }) => (
  <div style={{ padding: "48px 0", maxWidth: 460 }}>
    <div style={{ fontFamily: S.disp, fontSize: 19, marginBottom: 8 }}>{title}</div>
    <p style={{ color: S.dim, fontSize: 14, lineHeight: 1.6 }}>{body}</p>
  </div>
);

const Footer = () => (
  <footer style={{ borderTop: `1px solid ${S.line}`, padding: "28px", maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 12.5, color: S.faint }}>
    <span><b style={{ fontFamily: S.disp, color: S.dim }}>collab</b> · a lab for people who build things together</span>
    <span style={{ fontFamily: S.mono }}>
      {SOURCES.length} feeds · {PLAYBOOK.length} practices · {TOOLS.reduce((n, g) => n + g.items.length, 0)} tools · {GLOSSARY.length} terms
    </span>
  </footer>
);
