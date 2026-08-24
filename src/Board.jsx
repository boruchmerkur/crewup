import { useState, useEffect, useMemo, useRef } from "react";
import { C, COMMUNITY } from "./data.js";
import { track } from "./analytics.js";
import { S } from "./theme.js";
import { relTime } from "./lib.js";
import { HeaderArt, Avatar } from "./Art.jsx";


const LANG_COLOR = {
  JavaScript: "#F1E05A", TypeScript: "#3178C6", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#DEA584", Ruby: "#701516", Java: "#B07219", "C++": "#F34B7D", C: "#555555",
  PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF", HTML: "#E34C26", CSS: "#563D7C",
  Shell: "#89E051", Elixir: "#6E4A7E", Haskell: "#5E5086", Zig: "#EC915C",
};

/* ═══════════════════════════════════════════════════════════════
   BOARD
   ═══════════════════════════════════════════════════════════════ */

export default function Board() {
  const [posts, setPosts] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | offline
  const [tab, setTab] = useState("project");     // project = needs help, person = needs work
  const [q, setQ] = useState("");
  const [composing, setComposing] = useState(false);

  const load = async () => {
    try {
      const r = await fetch("/api/board", { signal: AbortSignal.timeout(9000) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setPosts(Array.isArray(d.posts) ? d.posts : []);
      setState("ok");
    } catch {
      setState("offline");
    }
  };

  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    let out = posts.filter((p) => p.kind === tab);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((p) =>
        (p.name + p.title + p.body + (p.skills || []).join(" ") + (p.role || "")).toLowerCase().includes(s)
      );
    }
    return out.sort((a, b) => new Date(b.created) - new Date(a.created));
  }, [posts, tab, q]);

  const counts = useMemo(() => ({
    project: posts.filter((p) => p.kind === "project").length,
    person: posts.filter((p) => p.kind === "person").length,
  }), [posts]);

  return (
    <>
      <div style={{ marginBottom: 28, maxWidth: 660, position: "relative" }}>
        <HeaderArt view="board" />
        <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: S.mono, fontSize: 10, color: C.violet, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>
          Board
        </div>
        <h2 style={{ fontFamily: S.disp, fontSize: 30, fontWeight: 600, letterSpacing: "-.025em", marginBottom: 12, lineHeight: 1.15 }}>
          Who needs help, and who needs work
        </h2>
        <p style={{ fontSize: 14.5, color: S.dim, lineHeight: 1.65 }}>
          Post a project that needs hands, or put yourself forward. Add your GitHub
          and your site and the board pulls in your repos, languages and a preview
          of your work automatically — so a post here shows more than a line of text.
        </p>
        </div>
      </div>

      {/* Tabs + controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { id: "project", label: "Needs help", n: counts.project },
          { id: "person", label: "Needs work", n: counts.person },
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); track("board_tab", { tab: t.id }); }}
            style={{
              background: tab === t.id ? C.violet : "transparent",
              color: tab === t.id ? "#fff" : S.dim,
              border: `1px solid ${tab === t.id ? C.violet : S.line}`,
              borderRadius: 999, padding: "7px 16px", fontSize: 13,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all .15s",
            }}>
            {t.label}
            <span style={{ fontFamily: S.mono, fontSize: 11, opacity: .7 }}>{t.n}</span>
          </button>
        ))}

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter by skill, name…"
          style={{
            background: S.panel, border: `1px solid ${S.line}`, borderRadius: 6,
            padding: "7px 12px", fontSize: 13, color: S.text, width: 200,
            fontFamily: S.mono, marginLeft: 4,
          }} />

        <button onClick={() => setComposing(!composing)} className="lift"
          style={{
            marginLeft: "auto", background: composing ? "transparent" : C.mint,
            color: composing ? S.dim : "#101010",
            border: `1px solid ${composing ? S.line : C.mint}`,
            borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
          {composing ? "Cancel" : "+ Post"}
        </button>
      </div>

      {composing && <Composer kind={tab} onDone={(p) => { setPosts((x) => [p, ...x]); setComposing(false); }} />}

      {state === "loading" && (
        <div style={{ color: S.faint, fontFamily: S.mono, fontSize: 13, padding: "40px 0" }}>loading board…</div>
      )}

      {state === "offline" && (
        <div style={{ border: `1px solid ${S.line}`, borderRadius: 10, padding: "24px 26px", background: S.panel, maxWidth: 620 }}>
          <div style={{ fontFamily: S.disp, fontSize: 17, marginBottom: 8 }}>The board isn't running yet</div>
          <p style={{ color: S.dim, fontSize: 13.5, lineHeight: 1.65 }}>
            Posts are stored server-side, so this needs the Netlify functions deployed —
            which requires a build step. A drag-and-drop upload can't do it. Run{" "}
            <code style={{ fontFamily: S.mono, color: C.mint, fontSize: 12.5 }}>netlify deploy --prod</code>{" "}
            from the source project and this page comes alive. Everything else on the
            site works either way.
          </p>
        </div>
      )}

      {/* An empty board should read as NEW, not broken — and it should say
          what to write, because "be the first" is an invitation with no
          instructions in it. */}
      {state === "ok" && shown.length === 0 && (
        <div style={{ padding: "40px 0", maxWidth: 520 }}>
          <div style={{ fontFamily: S.disp, fontSize: 19, marginBottom: 9 }}>
            {q ? "Nothing matches"
              : tab === "project" ? "Nobody has asked for help yet"
              : "Nobody has put their hand up yet"}
          </div>

          {q ? (
            <p style={{ color: S.dim, fontSize: 14, lineHeight: 1.6 }}>Try a broader term.</p>
          ) : (
            <>
              <p style={{ color: S.dim, fontSize: 14, lineHeight: 1.65, marginBottom: 16 }}>
                {tab === "project"
                  ? "This is where you say what you are stuck on and what kind of help it needs — a review, a second pair of eyes, someone who knows the thing you don't."
                  : "This is where you say what you are good at and how much time you actually have. Specific beats broad: “two hours a week on accessibility” gets answered, “open to opportunities” does not."}
              </p>
              <p style={{ color: S.faint, fontSize: 12.5, lineHeight: 1.6, marginBottom: 18, fontFamily: S.mono }}>
                No account needed. Add a GitHub handle and the post carries your repos with it.
              </p>
              <button onClick={() => setComposing(true)} className="lift"
                style={{
                  background: C.mint, color: "#101010", border: "none", borderRadius: 999,
                  padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                {tab === "project" ? "Post what you need" : "Say what you can take on"}
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {shown.map((p) => <PostCard key={p.id} p={p} />)}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POST CARD — the enriched view
   ═══════════════════════════════════════════════════════════════ */

function PostCard({ p }) {
  const accent = p.kind === "project" ? C.amber : C.mint;

  return (
    <article className="card" style={{
      background: S.panel, border: `1px solid ${S.line}`, borderRadius: 11,
      padding: "20px 22px", animation: "rise .3s ease-out",
    }}>
      {/* Head */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
        {p.github?.avatar ? (
          <img src={p.github.avatar} alt="" width={44} height={44} loading="lazy"
            style={{ borderRadius: 9, flexShrink: 0, border: `1px solid ${S.line}` }} />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: 9, flexShrink: 0,
            background: `linear-gradient(135deg, ${accent}, ${C.violet})`,
            display: "grid", placeItems: "center", color: "#101010",
            fontFamily: S.mono, fontWeight: 700, fontSize: 16,
          }}>{p.name.slice(0, 2).toUpperCase()}</div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontFamily: S.mono, fontSize: 10, color: accent, letterSpacing: ".07em", textTransform: "uppercase" }}>
              {p.kind === "project" ? "needs help" : "available"}
            </span>
            {p.availability && <Chip>{p.availability}</Chip>}
            {p.location && <Chip>{p.location}</Chip>}
            <span style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: 11, color: S.faint }}>
              {relTime(new Date(p.created))}
            </span>
          </div>
          <h3 style={{ fontFamily: S.disp, fontSize: 17, fontWeight: 600, letterSpacing: "-.015em", lineHeight: 1.3 }}>
            {p.title}
          </h3>
          <div style={{ fontSize: 13, color: S.dim, marginTop: 3 }}>
            {p.name}{p.role ? ` · ${p.role}` : ""}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 14, color: S.dim, lineHeight: 1.65, marginBottom: 14, whiteSpace: "pre-wrap" }}>
        {p.body}
      </p>

      {p.skills?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {p.skills.map((s) => (
            <span key={s} style={{
              fontFamily: S.mono, fontSize: 11, color: S.dim,
              border: `1px solid ${S.line}`, borderRadius: 5, padding: "3px 9px",
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* ── Inlined GitHub ── */}
      {p.github && (
        <div style={{ border: `1px solid ${S.line}`, borderRadius: 9, padding: "14px 16px", marginBottom: 12, background: S.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: p.github.top?.length ? 12 : 0, flexWrap: "wrap" }}>
            <a href={p.github.url} target="_blank" rel="noopener noreferrer"
              onClick={() => track("outbound", { to: p.github.url, kind: "github" })}
              style={{ fontFamily: S.mono, fontSize: 12.5, color: C.violet }}>
              @{p.github.user}
            </a>
            <span style={{ fontFamily: S.mono, fontSize: 11, color: S.faint }}>
              {p.github.repos} repos · {p.github.followers} followers
            </span>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              {p.github.langs?.map((l) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: S.mono, fontSize: 10.5, color: S.dim }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: LANG_COLOR[l] || S.faint }} />
                  {l}
                </span>
              ))}
            </div>
          </div>

          {p.github.top?.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {p.github.top.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                  onClick={() => track("outbound", { to: r.url, kind: "repo" })}
                  style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "7px 10px", borderRadius: 6, background: S.panel, border: `1px solid ${S.line}` }}>
                  <span style={{ fontFamily: S.mono, fontSize: 12.5, color: S.text }}>{r.name}</span>
                  {r.desc && (
                    <span style={{ fontSize: 12, color: S.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {r.desc}
                    </span>
                  )}
                  <span style={{ fontFamily: S.mono, fontSize: 11, color: C.amber, marginLeft: "auto", flexShrink: 0 }}>
                    ★ {r.stars}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Inlined portfolio preview ── */}
      {p.og && (
        <a href={p.og.url} target="_blank" rel="noopener noreferrer"
          onClick={() => track("outbound", { to: p.og.url, kind: "portfolio" })}
          className="lift"
          style={{ display: "flex", gap: 0, border: `1px solid ${S.line}`, borderRadius: 9, overflow: "hidden", marginBottom: 12, background: S.bg }}>
          {p.og.image && (
            <div style={{
              width: 148, flexShrink: 0, aspectRatio: "16/10",
              background: `#0A0A0B url("/api/img?url=${encodeURIComponent(p.og.image)}") center/cover`,
            }} />
          )}
          <div style={{ padding: "12px 14px", minWidth: 0 }}>
            <div style={{ fontFamily: S.mono, fontSize: 10.5, color: C.sky, marginBottom: 5 }}>{p.og.host} ↗</div>
            <div style={{ fontFamily: S.disp, fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
              {p.og.title || p.og.host}
            </div>
            {p.og.desc && (
              <p style={{ fontSize: 12.5, color: S.dim, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {p.og.desc}
              </p>
            )}
          </div>
        </a>
      )}

      {/* Links + contact */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {p.links?.map((l) => {
          let host = l;
          try { host = new URL(l).hostname.replace(/^www\./, ""); } catch {}
          return (
            <a key={l} href={l} target="_blank" rel="noopener noreferrer"
              onClick={() => track("outbound", { to: l, kind: "social" })}
              style={{
                fontFamily: S.mono, fontSize: 11, color: S.dim,
                border: `1px solid ${S.line}`, borderRadius: 5, padding: "4px 10px",
              }}>{host} ↗</a>
          );
        })}
        {p.contact && (
          <a href={/^https?:/.test(p.contact) ? p.contact : `mailto:${p.contact}`}
            style={{
              marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: "#101010",
              background: accent, borderRadius: 6, padding: "7px 15px",
            }}>Get in touch</a>
        )}
      </div>
    </article>
  );
}

const Chip = ({ children }) => (
  <span style={{
    fontFamily: S.mono, fontSize: 10, color: S.dim,
    border: `1px solid ${S.line}`, borderRadius: 4, padding: "2px 7px",
  }}>{children}</span>
);

/* ═══════════════════════════════════════════════════════════════
   COMPOSER
   ═══════════════════════════════════════════════════════════════ */

function Composer({ kind: initialKind, onDone }) {
  const [kind, setKind] = useState(initialKind);
  const [f, setF] = useState({
    name: "", title: "", body: "", role: "", skills: "",
    availability: "", location: "", github: "", portfolio: "",
    links: "", contact: "", website: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const opened = useRef(Date.now());

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...f,
          kind,
          // Stamped explicitly rather than left to the server default, so the
          // day a second community exists this is a value to change, not a
          // field to add. See COMMUNITY in data.js.
          community: COMMUNITY,
          skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
          links: f.links.split(/[\s,]+/).filter(Boolean),
          elapsed: Date.now() - opened.current,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Something went wrong."); setBusy(false); return; }
      track("board_post", { kind });
      onDone(d.post);
    } catch {
      setErr("Couldn't reach the board — the functions may not be deployed yet.");
      setBusy(false);
    }
  };

  const input = {
    background: S.bg, border: `1px solid ${S.line}`, borderRadius: 6,
    padding: "9px 12px", fontSize: 13.5, color: S.text, width: "100%",
    fontFamily: "'Inter',sans-serif",
  };

  return (
    <div style={{ border: `1px solid ${S.line}`, borderRadius: 11, background: S.panel, padding: "22px 24px", marginBottom: 22, animation: "rise .25s ease-out" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["project", "I need help"], ["person", "I need work"]].map(([id, label]) => (
          <button key={id} onClick={() => setKind(id)} style={{
            background: kind === id ? S.hov : "transparent",
            color: kind === id ? S.text : S.dim,
            border: `1px solid ${kind === id ? "#34343E" : S.line}`,
            borderRadius: 7, padding: "7px 15px", fontSize: 13, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Your name"><input style={input} value={f.name} onChange={set("name")} placeholder="Ada L." maxLength={60} /></Field>
          <Field label={kind === "project" ? "Your role" : "What you do"}>
            <input style={input} value={f.role} onChange={set("role")} placeholder={kind === "project" ? "Maintainer" : "Backend engineer"} maxLength={60} />
          </Field>
        </div>

        <Field label={kind === "project" ? "What needs doing" : "What you're looking for"}>
          <input style={input} value={f.title} onChange={set("title")} maxLength={110}
            placeholder={kind === "project" ? "Need a reviewer for a Rust parser rewrite" : "Available for part-time backend work"} />
        </Field>

        <Field label="Details" hint={`${f.body.length}/1200`}>
          <textarea style={{ ...input, minHeight: 110, resize: "vertical", lineHeight: 1.6 }}
            value={f.body} onChange={set("body")} maxLength={1200}
            placeholder={kind === "project"
              ? "Scope, stack, time commitment, whether it's paid…"
              : "Experience, what you enjoy, availability, rate expectations…"} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Skills" hint="comma separated"><input style={input} value={f.skills} onChange={set("skills")} placeholder="rust, postgres" /></Field>
          <Field label="Availability"><input style={input} value={f.availability} onChange={set("availability")} placeholder="~10 hrs/wk" maxLength={40} /></Field>
          <Field label="Location"><input style={input} value={f.location} onChange={set("location")} placeholder="Remote / UTC-5" maxLength={40} /></Field>
        </div>

        <div style={{
          border: `1px solid ${C.mint}33`, borderRadius: 8, padding: "14px 16px",
          background: "#34D3990A", display: "grid", gap: 12,
        }}>
          <div style={{ fontFamily: S.mono, fontSize: 10.5, color: C.mint, letterSpacing: ".06em", textTransform: "uppercase" }}>
            Make your post worth reading
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="GitHub" hint="pulls repos + languages">
              <input style={input} value={f.github} onChange={set("github")} placeholder="username" />
            </Field>
            <Field label="Portfolio / site" hint="renders a preview card">
              <input style={input} value={f.portfolio} onChange={set("portfolio")} placeholder="yoursite.com" />
            </Field>
          </div>
          <Field label="Other links" hint="space separated — Mastodon, Dribbble, LinkedIn…">
            <input style={input} value={f.links} onChange={set("links")} placeholder="mastodon.social/@you  dribbble.com/you" />
          </Field>
        </div>

        <Field label="How to reach you" hint="email or a link">
          <input style={input} value={f.contact} onChange={set("contact")} placeholder="you@example.com" maxLength={120} />
        </Field>

        {/* Honeypot — hidden from people, irresistible to bots. */}
        <input value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off"
          aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />

        {err && (
          <div style={{ color: C.rose, fontSize: 13, fontFamily: S.mono }}>{err}</div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={submit} disabled={busy} className="lift" style={{
            background: busy ? S.line : C.mint, color: busy ? S.dim : "#101010",
            border: "none", borderRadius: 7, padding: "10px 22px",
            fontSize: 13.5, fontWeight: 600, cursor: busy ? "default" : "pointer",
          }}>{busy ? "Posting…" : "Post to the board"}</button>
          <span style={{ fontSize: 12, color: S.faint, lineHeight: 1.5 }}>
            Public and unmoderated. Don't post anything you wouldn't put on your own site.
          </span>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, hint, children }) => (
  <label style={{ display: "grid", gap: 6 }}>
    <span style={{ fontFamily: S.mono, fontSize: 10, color: S.faint, letterSpacing: ".07em", textTransform: "uppercase", display: "flex", gap: 8 }}>
      {label}{hint && <em style={{ fontStyle: "normal", color: "#34343E", textTransform: "none", letterSpacing: 0 }}>{hint}</em>}
    </span>
    {children}
  </label>
);
