# Hub setup

Hub signs in with a **GitHub App** and reads/writes the private `personal-hub` repo.

**Hosting:** Hub needs Vercel. The CSP in `vercel.json` and the `api/github/token.ts` function are Vercel features; the Cloudflare Pages path in `DEPLOY.md` ships neither.

## 1. Create the GitHub App (once)

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**

- **Name:** Nook Hub (any)
- **Homepage URL:** your production Nook URL
- **Callback URLs:** GitHub matches these exactly (no wildcards, max 10), and the app sends `<origin>/`. Register the exact production URL `https://<production-domain>/` and `http://localhost:5173/`. For sign-in on previews, also register a stable branch-alias URL (for example the project's branch-alias domain for `feature/hub-dashboard`); per-deployment preview URLs change every deploy, so otherwise sign-in is only supported on production.
- **Expire user authorization tokens:** on
- **Request user authorization (OAuth) during installation:** off
- **Webhook:** off
- **Repository permissions → Contents:** Read and write. Nothing else.
- **Where can this app be installed:** Only on this account

Create it, then **Generate a new client secret**. Note the **Client ID** (not the numeric App ID).

Install the app: **Install App** → your account → **Only select repositories** → `personal-hub`.

## 2. Vercel environment variables

Project → Settings → Environment Variables (Production and Preview):

| Name | Value |
|---|---|
| `GITHUB_CLIENT_ID` | the app's Client ID |
| `GITHUB_CLIENT_SECRET` | the client secret |
| `VITE_GITHUB_CLIENT_ID` | the app's Client ID (public, baked into the bundle) |

Redeploy after adding them.

## 3. Local development

- UI with fixture data and no GitHub: `npm run dev`, open `http://localhost:5173/?hub-demo#/hub`.
- Real sign-in locally needs the `/api` function: run `npx vercel dev --listen 5173` (Vercel CLI, logged in, project linked) and copy the env vars into `.env.local`. The port must be 5173 because that is the only local callback URL registered on the GitHub App.

## 4. Revoking access and rotating the secret

- **Revoke:** GitHub → Settings → Applications → Authorized GitHub Apps → Nook Hub → Revoke. Signing out in Nook only forgets the keys on that device.
- **Remove the app's repo access entirely:** revoking the authorization does not remove the installation. Uninstall it under GitHub → Settings → Applications → Installed GitHub Apps → Nook Hub → Configure → Uninstall.
- **Rotate the client secret:** generate a new client secret on the GitHub App, update `GITHUB_CLIENT_SECRET` in Vercel, redeploy, then delete the old secret.
