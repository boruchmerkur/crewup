import { useState, useEffect, useRef, useMemo } from "react";
import { C, proxied } from "./data.js";
import { S } from "./theme.js";
import { track } from "./analytics.js";
import { HeaderArt } from "./Art.jsx";

/* ═══════════════════════════════════════════════════════════════
   SHOWCASE — things people made.

   Submitting is a link and two lines. Nothing is uploaded: the picture is
   the project's own og:image, fetched and cached by /api/preview, which
   already does exactly that for the feed. So a project that changes its
   screenshot updates here on its own, and there is no upload endpoint to
   abuse.

   Entries are held until released. See netlify/functions/showcase.js for
   why that is not optional on a list of links with pictures.
   ═══════════════════════════════════════════════════════════════ */

const KINDS = ["app", "widget", "tool", "site"];

function Shot({ url, title }) {
  const [img, setImg] = useState(null);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    let gone = false;
    fetch(`/api/preview?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!gone) setImg(d?.previews?.[url] || null); })
      .catch(() => {});
    return () => { gone = true; };
  }, [url]);

  // Initials on a tinted ground: deliberate, not a broken image icon.
  if (!img || dead) {
    const seed = [...title].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7);
    const hue = Math.abs(seed) % 360;
    return (
      <div style={{
        aspectRatio: "16 / 9", display: "grid", placeItems: "center",
        background: `linear-gradient(135deg, hsl(${hue} 45% 16%), #0A0A0B 70%)`,
        fontFamily: S.disp, fontSize: 22, fontWeight: 600, color: "#E8E6E366",
      }}>
        {title.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={proxied(img)} alt="" loading="lazy" onError={() => setDead(true)}
      style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
  );
}

export default function Showcase() {
  const [entries, setEntries] = useState([]);
  const [state, setState] = useState("loading");
  const [kind, setKind] = useState("all");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", url: "", blurb: "", maker: "", kind: "app", website: "" });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const opened = useRef(Date.now());

  const load = () => fetch("/api/showcase")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { setEntries(d?.entries || []); setState("ok"); })
    .catch(() => setState("offline"));

  useEffect(() => { load(); }, []);

  const shown = useMemo(
    () => (kind === "all" ? entries : entries.filter((e) => e.kind === kind)),
    [entries, kind]
  );

  const submit = async (e) => {
    e.preventDefault();
    setSending(true); setErr("");
    try {
      const r = await fetch("/api/showcase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ act: "submit", ...f, elapsed: Date.now() - opened.current }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "That didn't go through."); setSending(false); return; }
      track("showcase_submit", { kind: f.kind });
      setDone(true);
      setF({ title: "", url: "", blurb: "", maker: "", kind: "app", website: "" });
      load();
    } catch {
      setErr("Network trouble — try again.");
    }
    setSending(false);
  };

  const field = (k, label, ph, lines) => (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontFamily: S.mono, fontSize: 10, color: S.faint, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 5 }}>
        {label}
      </span>
      {lines ? (
        <textarea rows={lines} value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} placeholder={ph}
          style={{ width: "100%", background: S.bg, border: `1px solid ${S.line}`, borderRadius: 7, color: S.text, padding: "9px 11px", fontSize: 13.5, fontFamily: S.body, resize: "vertical" }} />
      ) : (
        <input value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} placeholder={ph}
          style={{ width: "100%", background: S.bg, border: `1px solid ${S.line}`, borderRadius: 7, color: S.text, padding: "9px 11px", fontSize: 13.5, fontFamily: S.body }} />
      )}
    </label>
  );

  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px 70px" }}>
      <HeaderArt src="/art/header-toolbox.jpg" />

      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
        <h2 style={{ fontFamily: S.disp, fontSize: 27, fontWeight: 600, letterSpacing: "-.025em" }}>Showcase</h2>
        <button onClick={() => { setOpen((o) => !o); opened.current = Date.now(); setDone(false); }}
          className="cta cta-primary" style={{ marginLeft: "auto", fontSize: 11.5, padding: "8px 18px" }}>
          <span>{open ? "close" : "submit yours"}</span>{!open && <span className="arw">→</span>}
        </button>
      </div>

      <p style={{ fontSize: 14.5, color: S.dim, lineHeight: 1.65, maxWidth: 640, marginBottom: 22 }}>
        Tools, apps and widgets people have built. To add yours, give a link, a name and a
        one-line description — the screenshot is taken from your own page, so there is no
        image to prepare. Submissions are reviewed before they appear.
      </p>

      {open && (
        <form onSubmit={submit} style={{
          border: `1px solid ${S.line}`, borderRadius: 10, background: S.panel,
          padding: "18px 20px", marginBottom: 26, maxWidth: 560,
        }}>
          {done ? (
            <div style={{ fontSize: 14, color: C.mint, lineHeight: 1.6 }}>
              Submitted. It will appear once it has been reviewed. Until then you can see it
              below, marked as awaiting review.
            </div>
          ) : (
            <>
              {field("title", "Name", "What it is called")}
              {field("url", "Link", "example.com/thing")}
              {field("blurb", "What it does", "One line describing what it does.", 2)}
              {field("maker", "Who made it (optional)", "a name or handle")}

              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={{ display: "block", fontFamily: S.mono, fontSize: 10, color: S.faint, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 5 }}>
                  Kind
                </span>
                <select value={f.kind} onChange={(e) => setF((p) => ({ ...p, kind: e.target.value }))}
                  style={{ background: S.bg, border: `1px solid ${S.line}`, borderRadius: 7, color: S.text, padding: "8px 10px", fontSize: 13, fontFamily: S.body }}>
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>

              {/* Honeypot */}
              <input value={f.website} onChange={(e) => setF((p) => ({ ...p, website: e.target.value }))}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />

              <button type="submit" disabled={sending} className="cta cta-primary" style={{ fontSize: 12, padding: "9px 20px" }}>
                <span>{sending ? "sending…" : "send it"}</span>
              </button>
              {err && <div style={{ marginTop: 10, fontSize: 12.5, color: C.rose, fontFamily: S.mono }}>{err}</div>}
            </>
          )}
        </form>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {["all", ...KINDS].map((k) => (
          <button key={k} onClick={() => setKind(k)} className="chip"
            style={{
              background: kind === k ? S.hov : "transparent",
              color: kind === k ? S.text : S.dim,
              border: `1px solid ${kind === k ? S.line : "transparent"}`,
              borderRadius: 999, padding: "5px 13px", fontSize: 12, cursor: "pointer", fontFamily: S.mono,
            }}>
            {k}
          </button>
        ))}
      </div>

      {state === "loading" && <p style={{ color: S.faint, fontFamily: S.mono, fontSize: 12.5 }}>loading…</p>}

      {state === "ok" && shown.length === 0 && (
        <div style={{ padding: "36px 0", maxWidth: 480 }}>
          <div style={{ fontFamily: S.disp, fontSize: 18, marginBottom: 8 }}>Nothing here yet</div>
          <p style={{ color: S.dim, fontSize: 14, lineHeight: 1.6 }}>
            Add the first one — it takes a link and a one-line description.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(268px,1fr))", gap: 14 }}>
        {shown.map((e) => (
          <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="card lift"
            onClick={() => track("outbound", { to: e.url, kind: "showcase" })}
            style={{
              background: S.panel, border: `1px solid ${S.line}`, borderRadius: 10,
              overflow: "hidden", display: "flex", flexDirection: "column",
              opacity: e.held ? 0.7 : 1,
            }}>
            <Shot url={e.url} title={e.title} />
            <div style={{ padding: "13px 15px 15px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: S.mono, fontSize: 9.5, color: C.mint, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  {e.kind}
                </span>
                {e.featured && (
                  <span style={{ fontFamily: S.mono, fontSize: 9, color: C.amber, letterSpacing: ".07em", textTransform: "uppercase" }}>
                    picked
                  </span>
                )}
                {e.held && e.mine && (
                  <span style={{ fontFamily: S.mono, fontSize: 8.5, color: S.faint, border: `1px solid ${S.line}`, borderRadius: 4, padding: "1px 5px" }}>
                    AWAITING REVIEW
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: 10, color: S.faint }}>
                  {(() => { try { return new URL(e.url).hostname.replace(/^www\./, ""); } catch { return ""; } })()}
                </span>
              </div>
              <div className="t" style={{ fontFamily: S.disp, fontSize: 16, fontWeight: 600, letterSpacing: "-.01em" }}>{e.title}</div>
              <p style={{ fontSize: 13, color: S.dim, lineHeight: 1.55 }}>{e.blurb}</p>
              {e.maker && (
                <span style={{ marginTop: "auto", paddingTop: 4, fontFamily: S.mono, fontSize: 10.5, color: S.faint }}>
                  by {e.maker}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
