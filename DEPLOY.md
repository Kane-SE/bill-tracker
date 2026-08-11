# Deploying Split to Cloudflare Pages

Cloudflare's static hosting is called **Pages**. This app is a pre-built Vite
SPA, so you deploy the contents of the `dist/` folder.

- **Build command:** `npm run build`
- **Build output directory:** `dist`

These are the same in every option below.

First, produce a fresh build:

```bash
cd D:\study\bill-splitter && npm run build
```

---

## Option A — Dashboard drag-and-drop (easiest; no Git, no CLI)

Source: [Cloudflare Pages · Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

1. In the Cloudflare dashboard, open **Workers & Pages**.
2. **Create application → Get started → Drag and drop your files**.
3. Enter a project name, then drag the **`bill-splitter/dist`** folder into the
   upload frame.
4. Click **Deploy site**.

Live at `https://<project-name>.pages.dev`.
(Drag-and-drop limit: 1,000 files — this app is well under.)

---

## Option B — Wrangler CLI (deploy from the terminal)

Source: [Cloudflare Pages · Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

Run these from inside `D:\study\bill-splitter`:

```bash
npx wrangler login
```

```bash
npx wrangler pages project create
```

(prompts for a project name + production branch; cached for next time)

```bash
npx wrangler pages deploy dist
```

Site goes to `<project-name>.pages.dev`. For a preview URL instead:

```bash
npx wrangler pages deploy dist --branch=<branch-name>
```

Limits: Wrangler supports up to 20,000 files, 25 MiB max per file.

---

## Option C — Git integration (auto-deploy on every push)

Source: [Cloudflare Pages · Deploy a Vite project](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/)

1. Push the repo to GitHub (requires a Git repo — run `git init` and make the
   first commit if there isn't one yet).
2. Dashboard → **Workers & Pages → Create application → Pages → Import an
   existing Git repository**.
3. Pick the repo, then set:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Save and Deploy**. Every push then rebuilds automatically.

---

## Notes for this app

- **Routing just works.** The app uses `HashRouter`, so deep links resolve
  client-side — no rewrite config needed.
  _If you ever switch to `BrowserRouter`, add `public/_redirects` containing_
  `/* /index.html 200` _so refreshes on sub-routes don't 404 (Cloudflare's SPA
  convention)._
- **PWA install works** on any option — `*.pages.dev` is HTTPS, so the manifest
  and service worker qualify. You can install it to a phone's home screen.
- **No `base` tweak needed** (unlike GitHub Pages) because Pages serves at the
  domain root.

**Recommendation:** Option A to go live in under a minute; move to Option C later
if you want automatic deploys on push.
