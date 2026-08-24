import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "./data.js";
import { S } from "./theme.js";
import { track } from "./analytics.js";
import { HeaderArt } from "./Art.jsx";

/* ═══════════════════════════════════════════════════════════════
   ROOM — a chat and one shared pad.

   Polling, not sockets: a serverless function cannot hold a connection, so
   the client asks every couple of seconds and backs off hard when the tab is
   hidden. Latency is ~2s, which is fine for talking and fine for watching
   someone type, and is why the pad has a driver instead of free-for-all
   editing — see netlify/functions/room.js for that argument in full.
   ═══════════════════════════════════════════════════════════════ */

const POLL_ACTIVE = 2500;
const POLL_HIDDEN = 20000;
const NICK_KEY = "crewup:nick";
const ROOM_KEY = "crewup:room";

const LANGS = ["javascript", "python", "typescript", "go", "rust", "sql", "shell", "text"];

export default function Room() {
  const [nick, setNick] = useState(() => localStorage.getItem(NICK_KEY) || "");
  const [naming, setNaming] = useState(!localStorage.getItem(NICK_KEY));
  const [room, setRoom] = useState(() => localStorage.getItem(ROOM_KEY) || "lobby");
  const [roomInput, setRoomInput] = useState(room);

  const [msgs, setMsgs] = useState([]);
  const [here, setHere] = useState(0);
  const [draft, setDraft] = useState("");
  const [honey, setHoney] = useState("");
  const [err, setErr] = useState("");
  const [state, setState] = useState("connecting");   // connecting | live | offline

  const [pad, setPad] = useState("");
  const [lang, setLang] = useState("javascript");
  const [rev, setRev] = useState(0);
  const [driver, setDriver] = useState(null);
  const [youDrive, setYouDrive] = useState(false);

  const [out, setOut] = useState(null);       // { lines, ms, truncated } | { stopped: true }
  const [running, setRunning] = useState(false);
  const frame = useRef(null);
  const watchdog = useRef(null);

  const cursor = useRef(0);
  const scroller = useRef(null);
  const padDirty = useRef(false);
  const sendTimer = useRef(null);
  const stuck = useRef(false);      // pinned to the bottom of the log?

  /* ── polling ───────────────────────────────────────────────── */
  const pull = useCallback(async () => {
    try {
      const r = await fetch(`/api/room?room=${encodeURIComponent(room)}&since=${cursor.current}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setState("live");
      setHere(d.here || 0);
      setDriver(d.pad?.driver || null);
      setYouDrive(!!d.youDrive);
      setLang(d.pad?.lang || "javascript");

      if (d.msgs?.length) {
        setMsgs((prev) => [...prev, ...d.msgs].slice(-250));
        cursor.current = Math.max(cursor.current, ...d.msgs.map((m) => m.n));
      }

      // Never overwrite what the driver is in the middle of typing.
      if (!padDirty.current) {
        setPad(d.pad?.text ?? "");
        setRev(d.pad?.rev ?? 0);
      }
    } catch {
      setState("offline");
    }
  }, [room]);

  useEffect(() => {
    // Room changed: drop everything from the old one.
    cursor.current = 0;
    setMsgs([]);
    padDirty.current = false;
    setState("connecting");
    pull();
    let id = setInterval(pull, document.hidden ? POLL_HIDDEN : POLL_ACTIVE);
    const retime = () => {
      clearInterval(id);
      id = setInterval(pull, document.hidden ? POLL_HIDDEN : POLL_ACTIVE);
      if (!document.hidden) pull();
    };
    document.addEventListener("visibilitychange", retime);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", retime); };
  }, [pull]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stuck.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const post = async (payload) => {
    const r = await fetch("/api/room", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, name: nick, ...payload }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error || "That didn't go through."); return null; }
    setErr("");
    return d;
  };

  /* ── chat ──────────────────────────────────────────────────── */
  const say = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    stuck.current = true;
    const d = await post({ act: "say", text, website: honey });
    if (d) { track("room_say", { room }); pull(); }
    else setDraft(text);                       // give it back rather than lose it
  };

  /* ── the pad ───────────────────────────────────────────────── */
  const claim = async () => {
    const d = await post({ act: "claim" });
    if (d) { track("room_claim", { room }); pull(); }
  };

  const release = async () => {
    padDirty.current = false;
    await post({ act: "release" });
    pull();
  };

  /* Typing sends a patch 600ms after you stop, carrying the revision it was
     based on. A refused patch means someone else's write landed first — the
     pad is pulled fresh rather than forced over the top. */
  const onPad = (v) => {
    setPad(v);
    padDirty.current = true;
    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(async () => {
      const d = await post({ act: "patch", text: v, rev, lang });
      if (d?.rev !== undefined) { setRev(d.rev); padDirty.current = false; }
      else { padDirty.current = false; pull(); }
    }, 600);
  };

  const changeLang = async (l) => {
    setLang(l);
    if (youDrive) await post({ act: "patch", text: pad, rev, lang: l }).then((d) => d && setRev(d.rev));
  };

  /* The code runs in an iframe loaded WITHOUT allow-same-origin, so it sits in
     an opaque origin and cannot touch this page, its storage, or the network —
     see public/run.html and the CSP for /run.html in public/_headers.

     It cannot be stopped from the inside: a synchronous infinite loop blocks
     that frame's only thread, and nothing running in it can interrupt itself.
     So the parent keeps a watchdog and throws the whole iframe away, which is
     the one thing that reliably works. */
  useEffect(() => {
    const onMsg = (e) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;   // ignore anything else on the page
      if (e.data?.type === "late") {
        // Async output arriving after the run returned.
        setOut((o) => (o && o.lines ? { ...o, lines: [...o.lines, e.data.line] } : o));
        return;
      }
      if (e.data?.type !== "result") return;
      clearTimeout(watchdog.current);
      setRunning(false);
      setOut({ lines: e.data.lines || [], ms: e.data.ms, truncated: e.data.truncated });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const run = () => {
    if (!frame.current) return;
    setOut(null);
    setRunning(true);
    frame.current.contentWindow.postMessage({ type: "run", code: pad }, "*");
    clearTimeout(watchdog.current);
    watchdog.current = setTimeout(() => {
      // Reloading the src discards the wedged frame and gives us a fresh one.
      if (frame.current) frame.current.src = frame.current.src;
      setRunning(false);
      setOut({ stopped: true });
    }, 5000);
    track("room_run", { room });
  };

  const enterRoom = (e) => {
    e?.preventDefault();
    const next = (roomInput || "lobby").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") || "lobby";
    localStorage.setItem(ROOM_KEY, next);
    setRoom(next);
    setRoomInput(next);
  };

  const saveNick = (e) => {
    e?.preventDefault();
    const n = nick.trim().slice(0, 28);
    if (!n) return;
    localStorage.setItem(NICK_KEY, n);
    setNick(n);
    setNaming(false);
  };

  const mins = driver ? Math.max(0, Math.round((new Date(driver.until) - Date.now()) / 60000)) : 0;

  /* ── name gate ─────────────────────────────────────────────── */
  if (naming) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "70px 24px" }}>
        <HeaderArt src="/art/header-board.jpg" />
        <h2 style={{ fontFamily: S.disp, fontSize: 26, fontWeight: 600, letterSpacing: "-.025em", marginBottom: 10 }}>
          Pick a name
        </h2>
        <p style={{ fontSize: 14, color: S.dim, lineHeight: 1.65, marginBottom: 20 }}>
          Not an account — there is nothing to sign up for and nothing is stored about you. This is
          just what the room calls you, and it is kept in this browser.
        </p>
        <form onSubmit={saveNick} style={{ display: "flex", gap: 8 }}>
          <input autoFocus value={nick} onChange={(e) => setNick(e.target.value)} placeholder="e.g. mira"
            style={{ flex: 1, background: S.panel, border: `1px solid ${S.line}`, borderRadius: 8, color: S.text, padding: "11px 13px", fontSize: 14, fontFamily: S.body }} />
          <button type="submit" className="cta cta-primary"><span>enter</span><span className="arw">→</span></button>
        </form>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px 70px" }}>
      <HeaderArt src="/art/header-board.jpg" />

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <h2 style={{ fontFamily: S.disp, fontSize: 26, fontWeight: 600, letterSpacing: "-.025em" }}>Room</h2>
        <form onSubmit={enterRoom} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: S.mono, fontSize: 12, color: S.faint }}>/</span>
          <input value={roomInput} onChange={(e) => setRoomInput(e.target.value)}
            style={{ width: 130, background: "transparent", border: "none", borderBottom: `1px solid ${S.line}`, color: S.link, padding: "2px 0", fontSize: 13, fontFamily: S.mono }} />
          <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: S.mono, fontSize: 11, color: S.faint }}>go</button>
        </form>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontFamily: S.mono, fontSize: 11, color: state === "live" ? C.mint : S.faint }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: state === "live" ? C.mint : S.faint, animation: state === "live" ? "pulse 2s infinite" : "none" }} />
          {state === "live" ? `${here} here` : state}
        </span>
      </div>

      <p style={{ fontSize: 13, color: S.dim, lineHeight: 1.6, marginBottom: 20, maxWidth: 680 }}>
        Anyone with the room name is in the same room. Messages clear themselves after a day.
        The pad has one keyboard at a time — take it, type, and hand it back.
      </p>

      <div className="shell" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* ── chat ── */}
        <div className="room-panel" style={{ border: `1px solid ${S.line}`, borderRadius: 10, background: S.panel, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "11px 15px", borderBottom: `1px solid ${S.line}`, fontFamily: S.mono, fontSize: 10.5, color: S.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Chat
          </div>

          <div ref={scroller}
            onScroll={(e) => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
            style={{ flex: 1, overflowY: "auto", padding: "14px 15px", display: "flex", flexDirection: "column", gap: 12 }}>
            {msgs.length === 0 && (
              <div style={{ margin: "auto", textAlign: "center", maxWidth: 300, lineHeight: 1.65 }}>
                <div style={{ fontFamily: S.disp, fontSize: 15, color: S.text, marginBottom: 7 }}>
                  Nobody here yet
                </div>
                <p style={{ fontSize: 12.5, color: S.dim }}>
                  Anyone who opens <span style={{ fontFamily: S.mono, color: S.link }}>/{room}</span> lands
                  in this room. Send someone the name and you are both in the same place.
                </p>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.n}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: S.disp, fontSize: 13, fontWeight: 600, color: m.name === nick ? C.mint : S.link }}>{m.name}</span>
                  <span style={{ fontFamily: S.mono, fontSize: 10, color: S.faint }}>
                    {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div style={{ fontSize: 13.5, color: S.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.text}</div>
              </div>
            ))}
          </div>

          {err && <div style={{ padding: "0 15px 8px", fontSize: 11.5, color: C.rose, fontFamily: S.mono }}>{err}</div>}

          <form onSubmit={(e) => { e.preventDefault(); say(); }}
            style={{ borderTop: `1px solid ${S.line}`, padding: 10, display: "flex", gap: 8 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`say something as ${nick}`}
              style={{ flex: 1, background: S.bg, border: `1px solid ${S.line}`, borderRadius: 7, color: S.text, padding: "9px 11px", fontSize: 13, fontFamily: S.body }} />
            {/* honeypot */}
            <input value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true"
              style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
            <button type="submit" className="cta cta-primary" style={{ fontSize: 11.5, padding: "8px 16px" }}>
              <span>send</span>
            </button>
          </form>
        </div>

        {/* ── pad ── */}
        <div className="room-panel" style={{ border: `1px solid ${S.line}`, borderRadius: 10, background: S.panel, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "9px 12px", borderBottom: `1px solid ${S.line}`, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontFamily: S.mono, fontSize: 10.5, color: S.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>Pad</span>
            <select value={lang} onChange={(e) => changeLang(e.target.value)} disabled={!youDrive}
              style={{ background: S.bg, border: `1px solid ${S.line}`, borderRadius: 6, color: youDrive ? S.text : S.faint, fontFamily: S.mono, fontSize: 11, padding: "3px 6px" }}>
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            <button onClick={run} disabled={running || lang !== "javascript"}
              title={lang === "javascript" ? "Run this in a sandbox" : "Only JavaScript runs here"}
              style={{
                background: "none", border: `1px solid ${lang === "javascript" ? S.line : "transparent"}`,
                borderRadius: 6, padding: "3px 10px", cursor: lang === "javascript" ? "pointer" : "default",
                fontFamily: S.mono, fontSize: 10.5,
                color: lang === "javascript" ? (running ? S.faint : C.mint) : S.faint,
              }}>
              {running ? "running…" : "▶ run"}
            </button>

            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {youDrive ? (
                <>
                  <span style={{ fontFamily: S.mono, fontSize: 10.5, color: C.mint }}>you have the keyboard · {mins}m</span>
                  <button onClick={release} style={{ background: "none", border: `1px solid ${S.line}`, borderRadius: 6, cursor: "pointer", fontFamily: S.mono, fontSize: 10.5, color: S.dim, padding: "3px 8px" }}>
                    hand it back
                  </button>
                </>
              ) : driver ? (
                <span style={{ fontFamily: S.mono, fontSize: 10.5, color: S.faint }}>
                  {driver.name} is typing · free in {mins}m
                </span>
              ) : (
                <button onClick={claim} className="cta cta-primary" style={{ fontSize: 10.5, padding: "5px 13px" }}>
                  <span>take the keyboard</span>
                </button>
              )}
            </span>
          </div>

          <textarea value={pad} onChange={(e) => onPad(e.target.value)} readOnly={!youDrive} spellCheck={false}
            placeholder={youDrive ? "" : "Take the keyboard to edit. You can still read and copy."}
            style={{
              flex: 1, resize: "none", background: youDrive ? S.bg : "transparent",
              border: "none", outline: "none", color: youDrive ? S.text : S.dim,
              padding: "14px 15px", fontFamily: S.mono, fontSize: 12.5, lineHeight: 1.7,
              cursor: youDrive ? "text" : "default",
            }} />

          <div style={{ borderTop: `1px solid ${S.line}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, fontFamily: S.mono, fontSize: 10, color: S.faint }}>
            <span>rev {rev}</span>
            <span>{pad.length.toLocaleString()} chars</span>
            <button onClick={() => navigator.clipboard?.writeText(pad)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontFamily: S.mono, fontSize: 10, color: S.link }}>
              copy all
            </button>
          </div>
        </div>
      </div>

      {out && (
        <div style={{ border: `1px solid ${S.line}`, borderRadius: 10, background: S.panel, marginTop: 16, overflow: "hidden" }}>
          <div style={{ padding: "9px 14px", borderBottom: `1px solid ${S.line}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: S.mono, fontSize: 10.5, color: S.faint, letterSpacing: ".08em", textTransform: "uppercase" }}>Output</span>
            {out.ms !== undefined && <span style={{ fontFamily: S.mono, fontSize: 10, color: S.faint }}>{out.ms}ms</span>}
            <button onClick={() => setOut(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontFamily: S.mono, fontSize: 10, color: S.link }}>
              clear
            </button>
          </div>
          <div style={{ padding: "12px 14px", fontFamily: S.mono, fontSize: 12, lineHeight: 1.7, maxHeight: 260, overflowY: "auto" }}>
            {out.stopped ? (
              <div style={{ color: C.amber }}>
                Stopped after 5 seconds and the sandbox was discarded — usually a loop that never ends.
                Nothing outside that frame was affected.
              </div>
            ) : out.lines.length === 0 ? (
              <div style={{ color: S.faint }}>Ran cleanly, nothing logged. Use console.log(…), or return a value to see it.</div>
            ) : (
              out.lines.map((l, i) => (
                <div key={i} style={{
                  color: l.kind === "error" ? C.rose : l.kind === "warn" ? C.amber : l.kind === "value" ? S.link : S.text,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {l.kind === "value" ? "⟵ " : ""}{l.text}
                </div>
              ))
            )}
            {out.truncated && <div style={{ color: S.faint, marginTop: 6 }}>…output truncated.</div>}
          </div>
        </div>
      )}

      {/* No allow-same-origin: this is what keeps the code in its own origin. */}
      <iframe ref={frame} src="/run.html" sandbox="allow-scripts" title="code sandbox"
        style={{ width: 0, height: 0, border: "none", position: "absolute", left: -9999 }} />

      <p style={{ fontSize: 12, color: S.faint, lineHeight: 1.6, marginTop: 14, maxWidth: 680 }}>
        Updates arrive about every two seconds — this runs on functions that cannot hold an open
        connection, so the room polls rather than streams. That is also why the pad has one keyboard:
        two people typing into the same buffer over a poll would quietly overwrite each other.
      </p>
    </section>
  );
}
