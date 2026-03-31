# Decksmith

A dark-fantasy Commander (EDH) deck builder powered by Claude AI. Search cards via the Scryfall API, build 99-card decks, get AI-generated deck lists from natural language prompts, and goldfish your deck with the built-in playtester.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| State | Zustand (with localStorage persistence) |
| Card data | Scryfall REST API |
| AI | Anthropic Claude (proxied server-side) |
| Backend | Express 5 (API proxy + static file server) |
| Deployment | Railway (or any Node host) |

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env` in the project root

```
ANTHROPIC_KEY=sk-ant-...
VITE_API_URL=http://localhost:3001
```

`VITE_API_URL` tells the React app where to send Claude API requests during dev. The Express proxy runs on port 3001.

### 3. Start dev server

```bash
npm run dev
```

This runs Vite (port 5173) and the Express proxy (port 3001) concurrently.

---

## Production deployment (Railway)

Railway builds and runs Node apps directly from a GitHub repo with zero config.

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "ready for deploy"
git push
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Select **Deploy from GitHub repo**
3. Choose the `decksmith` repo

### Step 3 — Set environment variables

In the Railway dashboard → Variables tab, add:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_KEY` | `sk-ant-...` (your key) |
| `NODE_ENV` | `production` |

`PORT` is set automatically by Railway. Do not set it manually.

`VITE_API_URL` is **not needed** in production — leave it unset. The React app defaults to `''` (empty string) which makes API calls to the same origin.

### Step 4 — Deploy

Railway reads `railway.json` and runs:

```
npm run build:client && NODE_ENV=production node server.js
```

The build compiles the React app into `dist/`. Express then serves `dist/` as static files and proxies `/api/claude` to Anthropic.

After deploy, Railway provides a `.up.railway.app` URL. The health check at `/api/health` must return `{"ok":true}` for the deploy to be marked successful.

### Optional: custom domain

In Railway → Settings → Networking, add your domain. Then set:

```
CORS_ORIGIN=https://yourdomain.com
```

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_KEY` | Yes | Anthropic API key — never committed, server-side only |
| `NODE_ENV` | Prod only | Set to `production` to enable static file serving |
| `PORT` | Auto | Set by Railway/Heroku automatically |
| `CORS_ORIGIN` | Optional | Custom domain for CORS header in production |
| `VITE_API_URL` | Dev only | Express proxy URL (`http://localhost:3001`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Optional | Clerk publishable key — enables auth UI in the React app |
| `CLERK_SECRET_KEY` | Optional | Clerk secret key — enables server-side token verification and usage tracking |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis REST URL — persists Arcane status and usage counts across redeploys. Get from console.upstash.com |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis REST token — paired with the URL above |
| `RESEND_API_KEY` | Optional | Resend API key — enables transactional email. Free tier: 3,000 emails/month. Get from resend.com |
| `EMAIL_FROM` | Optional | From address for transactional emails (e.g. `merlin@yourdomain.com`). Use `onboarding@resend.dev` for testing without a custom domain |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key — enables Arcane subscription checkout |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook signing secret — required to verify subscription events |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key (reserved for future embedded components) |
| `STRIPE_PRICE_ID` | Optional | Stripe Price ID for the $5/month Arcane plan |
| `APP_URL` | Optional | Public app URL used in Stripe `success_url` / `cancel_url` (auto-detected from `HOST` header in production) |

Both Clerk keys must be set together. If neither is set, auth is disabled and all Merlin builds are unrestricted (useful for local development).

Both Stripe keys (`STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`) must be set for Arcane subscriptions. The webhook secret is required for Railway — register `/api/stripe/webhook` in your Stripe dashboard as an endpoint listening for `checkout.session.completed` and `customer.subscription.deleted`.

For local webhook testing, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```
This prints a local `whsec_...` secret to use as `STRIPE_WEBHOOK_SECRET` during development.

> **After deploying:** Rename the Stripe product to **"Decksmith Arcane"** in your Stripe dashboard.

---

## Pricing tiers

| Tier | Price | Status |
|------|-------|--------|
| Free | $0/forever | Live — 3 Merlin builds, card search, pricing, plain text export |
| Arcane | $5/month | Live — unlimited builds, all features |
| Grandmaster | TBD | Coming soon — waitlist collecting at `/api/waitlist` |

---

## Security notes

- `ANTHROPIC_KEY` is read only in `server.js` — it is never exposed to the client bundle or `dist/`
- `.env` is in `.gitignore` and is never committed
- `dist/` is in `.gitignore` — Railway builds it on the server
- In production, only `/api/claude` and `/api/health` accept POST/GET; everything else is served from `dist/`

---

## SEO & Discoverability

### Assets needed

- `public/og-image.png` — 1200×630px social preview image. Dark background (`#0a0805`), Decksmith logo centered, tagline below. Appears on Reddit, Discord, Twitter/X, and Facebook shares. See `public/og-image-placeholder.txt` for details.

### After deploying

1. Create `public/og-image.png` (1200×630px) for social previews
2. Submit sitemap at `https://decksmith.gg/sitemap.xml` via Google Search Console
3. Add your Google Search Console verification tag to `index.html` (placeholder comment is already there)
4. Set up `blog.decksmith.gg` on Hashnode for content marketing

### Monitoring

- Google Search Console: search.google.com/search-console
- Core Web Vitals: pagespeed.web.dev
- Check indexing: `site:decksmith.gg` in Google search
