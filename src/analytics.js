/* ═══════════════════════════════════════════════════════════════
   ANALYTICS BEACON  →  DreamSite dashboard

   Every event is POSTed to /api/beacon, which is a Netlify Edge
   Function. The edge function enriches the payload with geo and
   request data (only available at the edge) and forwards it to
   whatever endpoint you set in DREAMSITE_ENDPOINT.

   Nothing here blocks rendering. If the beacon fails, the site
   carries on — analytics should never be able to break a page.
   ═══════════════════════════════════════════════════════════════ */

const SITE = "crewup";
const ENDPOINT = "/api/beacon";

/* One id per browser session. Not a cookie, not cross-site,
   dies when the tab closes. Enough to count sessions without
   tracking people. */
function sessionId() {
  try {
    let id = sessionStorage.getItem("crewup:sid");
    if (!id) {
      id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      sessionStorage.setItem("crewup:sid", id);
    }
    return id;
  } catch {
    return "nostore";
  }
}

const started = Date.now();

export function track(event, props = {}) {
  const payload = {
    site: SITE,
    event,                              // "pageview" | "view" | "outbound" | "save" | "search" | "opml"
    path: location.pathname + location.hash,
    ref: document.referrer || null,
    sid: sessionId(),
    ts: Date.now(),
    dwell: Math.round((Date.now() - started) / 1000),
    vw: window.innerWidth,
    ...props,
  };

  const body = JSON.stringify(payload);

  // sendBeacon survives page unload; fetch is the fallback.
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch { /* fall through */ }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => { /* analytics must never throw */ });
}

/* Pageviews are counted server-side by lily-edge, so we deliberately do
   NOT send one here — two systems counting the same load would double every
   number on the dashboard. This client handles only the interaction events
   lily cannot see: section changes, outbound clicks, saves, searches, and
   dwell time on leave. */
export function initAnalytics() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") track("leave");
  });
}
