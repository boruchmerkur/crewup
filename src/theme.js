/* One copy of the palette.
   This exists because there were two: App.jsx and Board.jsx each carried their
   own S, and when the text colours were lifted past the 4.5:1 contrast floor
   only one of them was updated — so the board quietly kept dim #6B7694 (4.19:1)
   and faint #3B4252 (1.88:1) after the rest of the site had been fixed.
   Anything that needs a colour imports it from here. */

export const S = {
  bg: "#101010",       // page ground — neutral, not blue-black
  panel: "#0A0A0B",    // deepest surface
  line: "#24242A",     // hairline
  hov: "#17171B",      // hover surface

  text: "#E8E6E3",     // 15.2:1
  dim: "#939AA8",      // 6.7:1 — body copy and secondary text
  faint: "#7E8494",    // 5.1:1 — metadata; still legible, which is the point

  // Brand violet is 3.3:1 on the ground: fine as a fill or a dot, illegible as
  // small text. Anything that is WORDS uses link instead.
  link: "#A78BFA",     // 7.0:1

  mono: "'JetBrains Mono',ui-monospace,monospace",
  disp: "'Space Grotesk',sans-serif",
  body: "'Inter',-apple-system,sans-serif",
};
