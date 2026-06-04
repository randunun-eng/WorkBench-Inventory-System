# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**WorkBench** — a Sri Lankan electronics-parts **marketplace**. Shops list inventory; buyers
browse, add to cart, and pay each shop **directly via that shop's own LANKAQR**. An AI assistant
(Google Gemini) helps find parts, reads datasheets, and suggests in-stock alternatives.
Monetized **freemium**: the AI tools are a paid "Pro" plan; selling is free (no platform commission —
money flows straight to each seller's QR).

**Live URL: https://www.workbench.cam** (custom domain).
The worker also answers on `workbench-inventory.randunu-4oc.workers.dev`, but the apex and that
origin **301-redirect to www**. ⚠️ Older docs/commits reference `…randunun.workers.dev` — that host
**never existed** and was the original cause of "the site doesn't work."

## Stack

- **Backend**: Cloudflare Workers + Hono — `src/`
- **Frontend**: React 18 + Vite + Tailwind (CDN), **BrowserRouter** — `frontend/`. Built to
  `frontend/dist` and served by the Worker via the `ASSETS` binding.
- **Database**: Cloudflare D1 (SQLite) — `workbench-db`
- **Storage**: R2 — `workbench-public`, `workbench-private`
- **Realtime**: Durable Objects — `ChatRoom`, `PresenceRegistry`
- **AI**: Google Gemini (incl. File API for datasheets), with Cloudflare Workers AI (Llama 3) as a
  free first pass for text-only turns to save Gemini tokens.

## Commands

```bash
npm install && (cd frontend && npm install)   # deps (root + frontend)
npm run dev                                    # wrangler dev (local)
(cd frontend && npm run build)                 # build SPA → frontend/dist (REQUIRED before deploy)
npx tsc --noEmit                               # typecheck backend
npx wrangler deploy                            # deploy working tree (build frontend first!)
npx wrangler d1 migrations apply workbench-db --remote   # apply DB migrations
npx wrangler tail                              # live logs
```

Deployment is **manual `wrangler deploy`** from the working tree (the repo was archived, which broke
Cloudflare git-integration builds). Always `npm run build` the frontend before deploying or the
worker serves a stale bundle.

## Secrets & config

Set via `wrangler secret put <NAME>` (production) or `.dev.vars` (local, gitignored):

| Secret | Required | Purpose |
|--------|----------|---------|
| `JWT_SECRET` | ✅ (min 16 chars) | Auth token signing. The app throws if unset — there is no hardcoded fallback. |
| `GEMINI_API_KEY` | ✅ | AI chat, datasheet analysis, alternatives. Google AI Studio key — **the newer `AQ.` prefix format is valid**, not only `AIza`. |
| `RESEND_API_KEY` | optional | Seller order-notification emails. Skipped silently if unset. |

`wrangler.toml [vars]`: `ADMIN_EMAIL`, `LANKAQR_MERCHANT_NAME`, `LANKAQR_QR_URL` (set to the platform's
own static LANKAQR image URL to enable Pro-subscription payments; empty = disabled).

## Architecture

`src/index.ts` — Hono app: CORS → **canonical-host redirect** (apex + `*.workers.dev` → www) →
SEO interceptor (`/`-mounted `seo` route) → API routes → SPA asset fallback (serves `index.html` for
client routes).

Routes (`src/routes/`): `auth`, `inventory`, `search`, `shop`, `ai`, `payments`, `orders`,
`subscription`, `chat`, `network`, `presence`, `vision`, `admin`, `categories`, `images`, `upload`, `seo`.

**Shared catalog model** (migration 0007): `catalog_items` is the universal product + datasheet
catalog; `shop_inventory` holds each shop's stock/price for a catalog item. Search uses FTS5
(`catalog_fts`, trigram) plus category/token LIKE passes.

**Auth** (`src/auth.ts`, `src/routes/auth.ts`): JWT from `JWT_SECRET`; salted SHA-256 passwords with
lazy upgrade of legacy unsalted hashes. New shops need admin approval (`is_approved`).

**Subscriptions** (`src/subscription.ts`, `routes/subscription.ts`): freemium. `requirePro` gates the
Pro AI endpoints. Self-serve 14-day trial; LANKAQR manual-confirm upgrades; admin grant.

**Marketplace**: `shop_payment_details` (each seller's LANKAQR/bank). `orders` + `order_items`: buyers
(guests allowed) place one order per seller, pay that seller's QR, submit a bank reference; the seller
confirms in the dashboard "Orders" tab → stock decrements. See `routes/orders.ts`, `routes/payments.ts`.

**AI agent** (`src/routes/ai.ts`): two-pass — (1) intent JSON `{SEARCH|COMPARE|SELECT|ALTERNATIVE|CHAT}`
with an optional `category`; (2) grounded response over the matched inventory. Reads datasheets via the
Gemini File API (URIs persisted in `catalog_items.gemini_file_uri`, refreshed when >24h stale). The
`ALTERNATIVE` intent (and empty searches with a known category) pull same-category items as candidate
substitutes for the model to evaluate. CHAT/greetings get a natural conversational reply.

## Conventions & gotchas

- **Frontend API base = `window.location.origin`** (same-origin). Never hardcode a host — that's what
  broke the site originally.
- **BrowserRouter**, not HashRouter — real, indexable URLs. The server serves `index.html` for client
  routes and `seo.ts` injects per-page meta + JSON-LD (canonical host = `www.workbench.cam`).
- D1 `migrations/` are sequential (`0000`–`0018`); apply remotely after any schema change.
- Don't reintroduce a hardcoded JWT secret or unsalted password hashing.
- AI route middleware order matters: `authMiddleware` then `requirePro` then handler (a past bug had
  auth after the handler, leaving endpoints unprotected).

## Migrations (summary)

`0000` initial · `0001`–`0006` categories/FTS · `0007` shared catalog · `0010` user status/reset ·
`0011` landing cost · `0012` user_memories · `0013`/`0014` Gemini file metadata · `0015` subscriptions ·
`0016` payment submissions · `0017` shop payment details · `0018` orders.
