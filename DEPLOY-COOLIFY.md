# Deploying Scroll-2-Top on your own Coolify

App: **MeroxIO Scroll 2 Top** · Domain: **https://scroll2top.onkra.online**
App client_id: `220aaa3f99ef967f2b678b1b63cdd57a` (unchanged — same Partner Dashboard app)

Because you keep the **same app / client_id**, merchants do **not** reinstall,
subscriptions keep working, and there is **no App Store review** for this move.

---

## 0. Before you start — collect these

| Value | Where to get it |
|---|---|
| `SHOPIFY_API_SECRET` | Partner Dashboard → Apps → MeroxIO Scroll 2 Top → **API credentials** → API secret key |
| `SCOPES` | Same app → **Configuration** → Admin API access scopes (comma-separated; may be empty) |
| Exact **billing plan names** | Ask the dev, OR read from an installed store (see step 6). Needed so paying merchants don't drop to "free" |
| A **MongoDB** connection string | New MongoDB service in Coolify, or MongoDB Atlas free tier. (Old data optional — see step 6) |

---

## 1. Put the code in a Git repo Coolify can pull

The zip already contains a git repo, but it points at the dev's remote. Create a
fresh repo under your own GitHub/GitLab and push the `meroxio-scroll-2-top` folder:

```bash
cd "meroxio-scroll-2-top"
rm -rf .git
git init && git add -A && git commit -m "Initial self-hosted version"
git remote add origin git@github.com:YOUR_ORG/scroll-2-top.git
git push -u origin main
```

Then in Coolify: **New Resource → Application → connect this repo**.

## 2. Build settings in Coolify

- Build pack: **Dockerfile** (the repo already has one at the root)
- Port (exposed): **8081**
- Build argument: `SHOPIFY_API_KEY = 220aaa3f99ef967f2b678b1b63cdd57a`
  (the frontend bundle bakes this in at build time — it must be a *build arg*, not just runtime)

## 3. (Optional) MongoDB service

If you don't already have MongoDB: Coolify → **New Resource → Database → MongoDB**.
Copy its connection string for the next step.

## 4. Environment variables in Coolify (runtime)

Set these on the application (see `web/.env.example`):

```
SHOPIFY_API_KEY=220aaa3f99ef967f2b678b1b63cdd57a
SHOPIFY_API_SECRET=<from Partner Dashboard>
HOST=https://scroll2top.onkra.online
PORT=8081
NODE_ENV=production
SCOPES=<comma separated, or leave empty>
MONGODB_URI=<your mongodb connection string>
MONGODB_DB=scroll2top
# Only if the dev used different plan names than the defaults:
# BASIC_PLAN_NAME=...
# PREMIUM_PLAN_NAME=...
```

## 5. Domain + deploy

- Point `scroll2top.onkra.online` at the Coolify app (Coolify issues the SSL cert).
- Deploy. Confirm the container logs show `🚀 Server running` and no Mongo errors.

## 6. Point the Shopify app at the new server (Partner Dashboard)

Update these to the new domain (same app, same client_id):

- **App URL:** `https://scroll2top.onkra.online`
- **Allowed redirection URL(s):**
  - `https://scroll2top.onkra.online/auth/callback`
  - `https://scroll2top.onkra.online/auth/shopify/callback`
  - `https://scroll2top.onkra.online/api/auth/callback`
- **App proxy:** URL `https://scroll2top.onkra.online/api/scroll-to-top`, subpath prefix `apps`, subpath `scroll-to-top`
- **GDPR / compliance webhooks:** `https://scroll2top.onkra.online/api/webhooks`

Also update `shopify.app.meroxio-scroll-2-top.toml` to the new URLs and run
`shopify app deploy` **only if** you change the theme-app-extension. Backend/admin
changes need no deploy and no review.

## 7. Verify (protecting paying merchants)

1. Open the app from a dev/staging store → it should re-authenticate automatically.
2. Open a store that currently pays → the Plans page must still show its paid tier.
   If a paying store shows "Free", the plan **names** don't match — fix
   `BASIC_PLAN_NAME` / `PREMIUM_PLAN_NAME` to match the store's actual
   `activeSubscriptions.name` and redeploy.
3. Storefront: the scroll-to-top button still renders (that comes from the theme
   app extension, independent of this server).

---

## Notes / risks flagged during setup

- The dev delivered a **sanitized** copy: MongoDB connection, billing plans, the
  API secret, and an external analytics URL were blanked. Billing has been
  rebuilt from the pricing UI ($0 Free / $10 Basic / $100 Premium); **confirm the
  plan names** (step 6/7).
- `mongodb` and `express` were added to `web/package.json` (were relied on
  transitively). The unused SQLite analytics import was disabled to avoid a
  native build on Alpine.
- Old analytics history lives only in the dev's database; it carries over only if
  you import their MongoDB dump.
