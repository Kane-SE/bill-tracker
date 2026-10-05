# Hub setup

Hub signs in with a **GitHub App** and reads/writes the private `personal-hub` repo.

## 1. Create the GitHub App (once)

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**

- **Name:** Nook Hub (any)
- **Homepage URL:** your production Nook URL
- **Callback URLs:** `https://<production-domain>/`, `https://<preview-domain-pattern>/` you use, and `http://localhost:5173/`
- **Expire user authorization tokens:** on
- **Request user authorization (OAuth) during installation:** off
- **Webhook:** off
- **Repository permissions → Contents:** Read and write. Nothing else.
- **Where can this app be installed:** Only on this account

Create it, then **Generate a new client secret**. Note the **Client ID**.

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
- Real sign-in locally needs the `/api` function: run `npx vercel dev` (Vercel CLI, logged in, project linked) and copy the env vars into `.env.local`.

## 4. Revoking access

GitHub → Settings → Applications → Authorized GitHub Apps → Nook Hub → Revoke. Signing out in Nook only forgets the keys on that device.
