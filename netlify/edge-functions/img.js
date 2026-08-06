// netlify/edge-functions/img.js
// Image proxy for feed thumbnails.
//
// WHY THIS EXISTS: feed images live on dozens of third-party CDNs. Loading
// them directly means every visitor's browser makes requests to Substack,
// Cloudinary, WordPress, Google and so on — which quietly undoes the
// same-origin property the analytics install was careful to preserve, and
// leaks a referrer plus IP to each of them. Routing images through here means
// the browser only ever talks to this origin.
//
// It also fixes mixed content (http images on an https page get blocked) and
// gives us a CDN cache, so a popular thumbnail is fetched once, not once per
// visitor.
//
// TRADEOFF, STATED PLAINLY: this is an open proxy in the sense that it will
// fetch any host. It cannot be host-allowlisted the way /api/feed is, because
// image CDNs are unrelated to the feed domains and change without notice. The
// guards below are what make that acceptable: private address ranges are
// blocked (SSRF), the response must actually be an image, and it must be under
// the size cap. If you would rather not run it at all, set USE_IMG_PROXY to
// false in src/data.js and images load directly from source instead.

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — a thumbnail has no business being bigger

/* Block anything that could reach infrastructure rather than the public web.
   Without this, /api/img?url=http://169.254.169.254/… is a cloud-metadata
   read primitive. */
const BLOCKED_HOST = /^(localhost|.*\.local|.*\.internal|metadata\..*)$/i;
const BLOCKED_IP = new RegExp(
  "^(" +
  "127\\.|10\\.|" +
  "192\\.168\\.|" +
  "172\\.(1[6-9]|2[0-9]|3[01])\\.|" +
  "169\\.254\\.|" +
  "0\\.|" +
  "::1$|" +
  "f[cd][0-9a-f]{2}:" +
  ")"
, "i");

const HEADERS = {
  "access-control-allow-origin": "*",
  "cross-origin-resource-policy": "cross-origin",
};

const blank = (status) =>
  new Response(null, { status, headers: { ...HEADERS, "cache-control": "public, max-age=300" } });

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: HEADERS });

  const target = new URL(request.url).searchParams.get("url");
  if (!target) return blank(400);

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return blank(400);
  }

  if (!/^https?:$/.test(parsed.protocol)) return blank(400);
  if (BLOCKED_HOST.test(parsed.hostname) || BLOCKED_IP.test(parsed.hostname)) return blank(403);
  if (!parsed.hostname.includes(".")) return blank(403); // bare hostnames are internal

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        // Some CDNs 403 without a UA. No visitor data is forwarded — this is
        // our own identity, not theirs, and no referrer is sent.
        "user-agent": "crewup-thumbnail-fetcher/1.0",
        accept: "image/avif,image/webp,image/jpeg,image/png,image/gif,image/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) return blank(502);

    const type = upstream.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return blank(415);

    const declared = parseInt(upstream.headers.get("content-length") || "0", 10);
    if (declared && declared > MAX_BYTES) return blank(413);

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return blank(413);

    return new Response(buf, {
      headers: {
        ...HEADERS,
        "content-type": type,
        // Thumbnails are effectively immutable — cache them hard.
        "cache-control": "public, max-age=86400",
        "netlify-cdn-cache-control": "public, max-age=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return blank(504);
  }
};

export const config = { path: "/api/img" };
