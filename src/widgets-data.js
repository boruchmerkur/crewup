/**
 * Widgets space — all editable content lives here, same convention as
 * the main src/data.js. Nothing below is referenced anywhere except
 * src/spaces/widgets/Widgets.jsx.
 *
 * ADDING A SOURCE IS TWO EDITS, NOT ONE:
 *   1. add it to WIDGET_SOURCES below
 *   2. add its hostname to ALLOWED_HOSTS in netlify/functions/feed.js
 * Miss the second and the request comes back 403.
 */

export const WIDGET_COPY = {
  title: "Widgets",
  tagline: "Small things that live on a screen",
  lede:
    "Home screen, desktop, browser, page. The people making widgets, the " +
    "techniques behind them, and what they look like once they are installed.",

  /* Blurbs describe the CONTENT, never the interface. "Newest first" told a
     reader what the sort order was, which they can see; "widgets in the wild"
     and "build-your-own —" were doing the same throat-clearing in fewer
     words. If a line would still make sense printed on paper, it stays. */
  wireTitle: "The wire",
  wireBlurb: "Releases, techniques, and components worth stealing.",
  benchTitle: "The bench",
  benchBlurb: "Walkthroughs, code, and the awkward details nobody writes down.",
  galleryTitle: "Setups",
  galleryBlurb: "Home screens, desktops, dashboards, rices."
};

/**
 * bucket: "wire" (default) | "bench" | "gallery"
 *
 * The gallery bucket exists because on this topic the pictures are
 * screenshots from subreddits, not article thumbnails. Keeping them in
 * their own bucket stops the news feeds filling the visual section with
 * publisher logos.
 */
export const WIDGET_SOURCES = [
  // wire
  { name: "Codrops",            url: "https://tympanus.net/codrops/feed/" },
  { name: "CSS-Tricks",         url: "https://css-tricks.com/feed/" },
  { name: "Smashing Magazine",  url: "https://www.smashingmagazine.com/feed/" },
  { name: "Chrome Developers",  url: "https://developer.chrome.com/blog/feed.xml" },
  { name: "web.dev",            url: "https://web.dev/feed.xml" },
  { name: "MDN Blog",           url: "https://developer.mozilla.org/en-US/blog/rss.xml" },
  { name: "Product Hunt",       url: "https://www.producthunt.com/feed" },
  { name: "9to5Mac",            url: "https://9to5mac.com/feed/" },
  { name: "dev.to · components",url: "https://dev.to/feed/tag/webcomponents" },
  { name: "dev.to · css",       url: "https://dev.to/feed/tag/css" },

  // gallery — carries the entire visual load of this space
  { name: "r/unixporn",  url: "https://www.reddit.com/r/unixporn/.rss",  bucket: "gallery" },
  { name: "r/Rainmeter", url: "https://www.reddit.com/r/Rainmeter/.rss", bucket: "gallery" },
  { name: "r/desktops",  url: "https://www.reddit.com/r/desktops/.rss",  bucket: "gallery" },
  { name: "r/iOSsetups", url: "https://www.reddit.com/r/iOSsetups/.rss", bucket: "gallery" },
  { name: "r/widgets",   url: "https://www.reddit.com/r/widgets/.rss",   bucket: "gallery" },

  // bench
  { name: "dev.to · webdev", url: "https://dev.to/feed/tag/webdev", bucket: "bench" },
  { name: "Frontend Focus",  url: "https://frontendfoc.us/rss",     bucket: "bench" }
];

/**
 * [label, [keywords]] — matched against lowercased title + summary.
 * Scored, not first-match: the category with the most hits wins, and a
 * hit in the title counts double. See scoreCategory() in Widgets.jsx.
 */
export const WIDGET_CATS = [
  ["Home screen", ["home screen", "homescreen", "lock screen", "ios widget", "android widget",
    "scriptable", "widgy", "glance", "app icon", "shortcut", "springboard"]],
  ["Desktop", ["rainmeter", "conky", "plasmoid", "gnome", "kde", "hyprland", "waybar", "rice",
    "wallpaper", "menu bar", "menubar", "dock", "desktop", "taskbar", "tiling"]],
  ["Browser", ["extension", "new tab", "newtab", "bookmarklet", "chrome", "firefox", "safari",
    "browser", "manifest v3", "userscript"]],
  ["Components", ["web component", "custom element", "shadow dom", "design system",
    "component library", "svelte", "lit", "storybook", "headless ui", "accessib"]],
  ["CSS", ["css", "animation", "scroll-driven", "container quer", "grid", "houdini", "svg",
    "keyframe", "transition", "gradient", "anchor position", "view transition"]],
  ["Dashboards", ["dashboard", "homelab", "homepage", "grafana", "tile", "panel", "status board",
    "home assistant", "homeassistant", "metrics", "kiosk"]],
  ["Embeds", ["embed", "iframe", "oembed", "badge", "ticker", "widget script",
    "third-party script", "snippet"]],
  ["No-code", ["notion", "figma", "obsidian", "airtable", "canva", "framer", "webflow",
    "plugin", "template gallery"]]
];

/** Hostnames this space needs in feed.js ALLOWED_HOSTS. Kept here so the
 *  list can be diffed against the function without reading every URL. */
export const WIDGET_HOSTS = [
  "tympanus.net", "css-tricks.com", "www.smashingmagazine.com",
  "developer.chrome.com", "web.dev", "developer.mozilla.org",
  "www.producthunt.com", "9to5mac.com", "dev.to", "frontendfoc.us",
  "www.reddit.com"
];
