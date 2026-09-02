import { useState } from "react";
import { C } from "./data.js";
import { S } from "./theme.js";
import { track } from "./analytics.js";
import { ARENAS } from "./ai-arenas.js";
import { HeaderArt } from "./Art.jsx";

/* ═══════════════════════════════════════════════════════════════
   WHICH MODEL FOR WHICH JOB

   Same data as checkmysite.pro; crewup's typography and palette rather
   than a transplanted design.

   Two things the layout has to enforce, because they are the difference
   between a useful table and a misleading one:

     · Bars are scaled WITHIN a category, never across. A 1340 in the image
       arena and a 1548 in the code arena are different measurements taken
       from different populations by different voters. A shared axis would
       invite exactly the comparison the data cannot support.

     · A gap under ~20 Elo is noise. Models within that of the leader are
       marked as tied rather than ranked 2nd and 3rd, because a ranking
       implies a difference the votes do not show.
   ═══════════════════════════════════════════════════════════════ */

const TIE = 20;

function Category({ cat }) {
  const [openWeights, setOpenWeights] = useState(false);
  const rows = cat.models;
  const top = rows[0]?.elo ?? 0;
  const floor = Math.min(...rows.map((m) => m.elo)) - 40;   // scale within the category only
  const width = (elo) => `${Math.max(6, ((elo - floor) / (top - floor)) * 100)}%`;

  return (
    <section style={{
      border: `1px solid ${S.line}`, borderRadius: 11, background: S.panel,
      padding: "20px 22px 18px", display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: S.disp, fontSize: 18, fontWeight: 600, letterSpacing: "-.015em" }}>
            {cat.name}
          </h3>
          <span style={{ fontFamily: S.mono, fontSize: 10, color: S.faint, letterSpacing: ".06em", textTransform: "uppercase" }}>
            {cat.sub}
          </span>
          {cat.dated && (
            <span style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: 10, color: C.amber }}>
              board dated {cat.dated}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: S.dim, lineHeight: 1.6, marginTop: 7, maxWidth: 640 }}>{cat.why}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map((m, i) => {
          const tied = i > 0 && top - m.elo < TIE;
          return (
            <div key={m.n + i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{ fontSize: 13.5, color: S.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.n}
                  </span>
                  <span style={{ fontFamily: S.mono, fontSize: 10, color: S.faint }}>{m.org}</span>
                  {(i === 0 || tied) && (
                    <span style={{ fontFamily: S.mono, fontSize: 9, color: tied ? S.faint : C.mint, letterSpacing: ".06em", textTransform: "uppercase" }}>
                      {tied ? "tied" : "ahead"}
                    </span>
                  )}
                </div>
                <div style={{ height: 4, background: S.hov, borderRadius: 3, marginTop: 5, overflow: "hidden" }}>
                  <div style={{
                    width: width(m.elo), height: "100%", borderRadius: 3,
                    background: i === 0 ? C.mint : tied ? `${C.mint}77` : S.link,
                  }} />
                </div>
              </div>
              <span style={{ fontFamily: S.mono, fontSize: 12, color: i === 0 ? S.text : S.dim }}>{m.elo}</span>
            </div>
          );
        })}
      </div>

      {cat.open?.length > 0 && (
        <div>
          <button onClick={() => setOpenWeights((o) => !o)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: S.mono, fontSize: 11, color: S.link }}>
            {openWeights ? "hide" : "best with open weights"} <span className="arw">{openWeights ? "▲" : "▾"}</span>
          </button>
          {openWeights && (
            <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
              {cat.open.map((m) => (
                <div key={m.n} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: S.dim }}>
                  <span style={{ color: S.text }}>{m.n}</span>
                  <span style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: 11.5 }}>{m.elo}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {cat.note && (
        <p style={{ fontSize: 12, color: S.faint, lineHeight: 1.6, borderTop: `1px solid ${S.line}`, paddingTop: 10 }}>
          {cat.note}
        </p>
      )}

      <a href={cat.url} target="_blank" rel="noopener noreferrer"
        onClick={() => track("outbound", { to: cat.url, kind: "arena" })}
        style={{ fontFamily: S.mono, fontSize: 11, color: S.link, marginTop: "auto" }}>
        {cat.source} <span className="arw">↗</span>
      </a>
    </section>
  );
}

export default function Models() {
  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px 70px" }}>
      <HeaderArt src="/art/header-toolbox.jpg" />

      <h2 style={{ fontFamily: S.disp, fontSize: 27, fontWeight: 600, letterSpacing: "-.025em", marginBottom: 10 }}>
        Which model for which job
      </h2>
      <p style={{ fontSize: 14.5, color: S.dim, lineHeight: 1.65, maxWidth: 660, marginBottom: 8 }}>
        Every number here is an Elo score from blind pairwise voting: two outputs from the same
        prompt, shown without labels, and a person picks one. Gaps under about 20 points are
        noise — read the margins, not the ranks.
      </p>
      <p style={{ fontFamily: S.mono, fontSize: 11.5, color: S.faint, marginBottom: 26 }}>
        snapshot taken {ARENAS.captured} · several boards carry their own older date, shown on the card
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14, marginBottom: 30 }}>
        {ARENAS.categories.map((cat) => <Category key={cat.key} cat={cat} />)}
      </div>

      {/* Stated as loudly as the rankings, because the absence is the finding. */}
      <div style={{ border: `1px dashed ${S.line}`, borderRadius: 11, padding: "20px 22px", maxWidth: 760 }}>
        <div style={{ fontFamily: S.mono, fontSize: 10, color: C.amber, letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 11 }}>
          What is not here, and why
        </div>
        {ARENAS.gaps.map((g) => (
          <p key={g.name} style={{ fontSize: 13.5, color: S.dim, lineHeight: 1.65, marginBottom: 9 }}>
            <span style={{ color: S.text }}>{g.name}</span> — {g.why}
          </p>
        ))}
        <p style={{ fontSize: 12.5, color: S.faint, lineHeight: 1.6, marginTop: 12 }}>
          Scores compare within a category, never across it. The bars are scaled inside each card
          for that reason: a 1340 in the image arena and a 1548 in the code arena come from
          different boards, different models and different voters.
        </p>
      </div>
    </section>
  );
}
