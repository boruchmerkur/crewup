# Deploying Crewup → crewup.dev

This folder is already a git repo with one commit. Nothing to initialize.

## 1. Push to GitHub

Create an empty repo on GitHub — **no README, no .gitignore, no license**, or the
first push will be rejected as a non-fast-forward.

Then, in this folder:

```bash
git remote add origin https://github.com/YOURNAME/crewup.git
git branch -M main
git push -u origin main
```

## 2. Connect it to Netlify

Netlify → **Add new site → Import an existing project → GitHub → crewup**

Netlify reads `netlify.toml` and fills these in automatically. Confirm they say:

| Field | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |

Deploy.

**This is the step that has been missing.** Netlify runs a real build, which is
the only way the v2 functions get bundled. Every previous drag-and-drop deploy
published them as inert static files — which is why `/api/lily`, `/api/board`,
`/api/feed` and `/api/img` all returned 404.

From here, every `git push` redeploys automatically.

## 3. Environment variables

Netlify → Site configuration → Environment variables.

| Key | Value | What breaks without it |
|---|---|---|
| `DREAMSITE_ENDPOINT` | your dashboard ingest URL | interaction events go nowhere (pageviews still work — lily relays independently) |
| `DREAMSITE_TOKEN` | a shared secret | endpoint accepts unauthenticated posts |
| `BOARD_ADMIN_KEY` | any long random string | you can't delete board posts |

`LILY_SITE` is already set to `crewup` in `netlify.toml` — don't duplicate it here.

## 4. Custom domain

Netlify → Domains → Add `crewup.dev` → **Set up Netlify DNS**, then paste the
four nameservers it gives you into GoDaddy under Nameservers → Change → "I'll
use my own nameservers."

`.dev` is HSTS-preloaded, so browsers refuse plain HTTP entirely. Until the
certificate provisions you'll get a hard security error rather than a warning.
That's expected — wait 10–15 minutes.

## 5. Verify

| Check | Expect |
|---|---|
| `GET /api/lily` | **405** (not 404) |
| Netlify → Functions | `board`, `lily-collect` |
| Netlify → Edge Functions | `feed`, `img`, `beacon`, `lily-edge` |
| Open `/playbook` directly | loads, no 404 |
| Feed page header | `~28/30 live`, thumbnails visible |
| Paste the URL into Slack | unfurls with the hero photo |

A 404 on `/api/lily` means the build didn't run. Check the deploy log for a
"Building" section — if it went straight to "Deploying", the build was skipped.

## Working on it afterwards

```bash
npm install
npm run dev      # http://localhost:5173
```

Almost everything you'll want to change lives in `src/data.js` — the 30 feed
sources, 12 playbook practices, 30 tools, 22 glossary terms.

Adding a feed source needs **two** edits: `SOURCES` in `src/data.js` *and* the
hostname in `ALLOWED_HOSTS` in `netlify/edge-functions/feed.js`. Miss the second
and the new feed 403s.
