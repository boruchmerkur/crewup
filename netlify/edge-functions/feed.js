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
  "www.linuxfoundation.org", "news.apache.org", "fossforce.com",
  "martinfowler.com", "blog.pragmaticengineer.com", "stackoverflow.blog",
  "feed.infoq.com", "changelog.com", "www.thoughtworks.com", "www.honeycomb.io",
  "tidyfirst.substack.com", "world.hey.com", "www.atlassian.com", "blog.doist.com",
  "leaddev.com", "lethain.com", "dev.to", "hnrss.org", "lobste.rs",
  "www.smashingmagazine.com", "code.visualstudio.com", "linear.app", "blog.replit.com",
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
    const upstream = await fetch(parsed.toString(), {
      headers: { "user-agent": "crewup-feed-reader/1.0 (+https://crewup.dev)" },
      signal: AbortSignal.timeout(9000),
    });

    if (!upstream.ok) {
      return new Response(`Upstream ${upstream.status}`, { status: 502, headers: CORS });
    }

    return new Response(await upstream.text(), {
      headers: {
        ...CORS,
        "content-type": "application/xml; charset=utf-8",
        // Browser caches 5 min, Netlify's CDN holds it 15 min and will
        // serve a stale copy for an hour rather than fail.
        "cache-control": "public, max-age=300",
        "netlify-cdn-cache-control": "public, max-age=900, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    return new Response(`Fetch failed: ${err.message}`, { status: 504, headers: CORS });
  }
};

export const config = { path: "/api/feed" };
