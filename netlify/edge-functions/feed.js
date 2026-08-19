/* ═══════════════════════════════════════════════════════════════
   EDGE FUNCTION — /api/feed?url=…

   Fetches an RSS/Atom feed server-side and returns it with CORS
   headers, so the browser never has to touch a public proxy.
   Runs at Netlify's edge (Deno), cached for 15 minutes at the CDN.

   Only feeds on the allowlist are fetched — otherwise this becomes
   an open proxy that anyone can point at anything.
   ═══════════════════════════════════════════════════════════════ */

const ALLOWED_HOSTS = [
  "github.blog", "about.gitlab.com", "opensource.googleblog.com", "opensource.org",
  "www.linuxfoundation.org", "fossforce.com", "feeds.feedburner.com",
  "randsinrepose.com", "charity.wtf",
  "martinfowler.com", "blog.pragmaticengineer.com", "stackoverflow.blog",
  "feed.infoq.com", "changelog.com", "www.thoughtworks.com", "www.honeycomb.io",
  "tidyfirst.substack.com", "world.hey.com", "www.atlassian.com", "blog.doist.com",
  "leaddev.com", "lethain.com", "dev.to", "hnrss.org", "lobste.rs",
  "www.smashingmagazine.com", "code.visualstudio.com", "linear.app", "blog.replit.com",

  // Widgets space. dev.to and www.smashingmagazine.com were already above —
  // the point of one list is that a source shared between spaces is listed once.
  "tympanus.net", "css-tricks.com", "developer.chrome.com", "web.dev",
  "developer.mozilla.org", "www.producthunt.com", "9to5mac.com", "frontendfoc.us",
  "www.reddit.com",
];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return new Response("Missing ?url", { status: 400, headers: CORS });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Malformed url", { status: 400, headers: CORS });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response("Host not on allowlist", { status: 403, headers: CORS });
  }

  try {
    let upstream = await fetch(parsed.toString(), {
      headers: {
        "user-agent": "crewup-feed-reader/1.0 (+https://crewup.dev)",
        // Reddit in particular refuses requests that do not ask for a feed type.
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(9000),
    });

    /* Reddit rate-limits hard and intermittently — three of five subreddits
       came back 429 on one pass and a different three on the next. It carries
       the entire visual load of the Widgets space, so retrying is worth it; a
       429 is a "not right now", not a refusal.

       One retry at a flat 600ms was not enough: measured against the live site,
       four of the five subreddits still ended at 429 and the space lost its
       whole gallery. Backing off properly — and honouring Retry-After when
       Reddit sends one — is what actually clears it. */
    for (let attempt = 0; upstream.status === 429 && attempt < 3; attempt++) {
      const asked = Number(upstream.headers.get("retry-after")) * 1000;
      const wait = Number.isFinite(asked) && asked > 0
        ? Math.min(asked, 4000)
        : [700, 1600, 2800][attempt];
      await new Promise((r) => setTimeout(r, wait));
      upstream = await fetch(parsed.toString(), {
        headers: {
          "user-agent": "crewup-feed-reader/1.0 (+https://crewup.dev)",
          accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(9000),
      });
    }

    /* Pass 429 through as 429 rather than flattening it to 502. The client
       shows "not answering" for a 502, which is a lie about a source that is
       merely busy, and it needs to tell the two apart to know whether asking
       again is worth anything. no-store matters just as much: a rate limit
       cached at the edge turns a three-second problem into a fifteen-minute
       outage. */
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      return new Response(`Upstream ${upstream.status}`, {
        status,
        headers: {
          ...CORS,
          "cache-control": "no-store",
          "netlify-cdn-cache-control": "no-store",
        },
      });
    }

    /* Feeds that rate-limit are held far longer at the edge: the cheapest way
       to stop being rate-limited is to ask far less often. Nothing in these is
       breaking news, and a successful fetch then covers everyone for an hour. */
    const touchy = parsed.hostname.endsWith("reddit.com");

    return new Response(await upstream.text(), {
      headers: {
        ...CORS,
        "content-type": "application/xml; charset=utf-8",
        // Browser caches 5 min, Netlify's CDN holds it 15 min and will
        // serve a stale copy for an hour rather than fail.
        "cache-control": touchy ? "public, max-age=900" : "public, max-age=300",
        "netlify-cdn-cache-control": touchy
          ? "public, max-age=3600, stale-while-revalidate=86400"
          : "public, max-age=900, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    return new Response(`Fetch failed: ${err.message}`, { status: 504, headers: CORS });
  }
};

export const config = { path: "/api/feed" };
