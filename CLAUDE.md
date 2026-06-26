# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## What this repo is

`finalibaba-selfhosted` is the **public self-hosted edition** of [Finalibaba](https://github.com/LoicSERRE/Finalibaba), a personal wealth management dashboard. It contains the same core application stripped of personal deployment config, with community-oriented documentation.

**Goal:** anyone should be able to run the app with a single `docker compose up` and a `.env` filled in under 5 minutes.

## Language policy

- **All repo meta** (code comments, README, CLAUDE.md, commit messages, PR descriptions, issue templates) → **English**
- **UI strings** → French by default. English is available via the language switcher (stored in `NEXT_LOCALE` cookie). Add new UI strings to both `messages/fr.json` and `messages/en.json`.
- The private upstream repo (`Finalibaba/`) stays in French — it's personal.

## Relationship with the upstream private repo

The private repo is at `/home/loic/Projets/Finalibaba/` on the same machine.

**Porting rule:** app-layer changes (features, bug fixes, schema changes) made in `Finalibaba/` should be ported here via `scripts/sync-from-upstream.sh`. Infra-layer changes (deploy pipeline, VPS config, personal credentials) are **never** ported.

Files excluded from selfhosted:

| Upstream file | Reason |
|---|---|
| `.github/workflows/deploy.yml` | Personal VPS deploy (private server + private GHCR) |
| `docker-compose.server.yml` | Pre-built GHCR images + personal Cloudflare tunnel |
| `env.server.example` | Personal URLs |
| `CLAUDE.md` | Replaced by this file |
| `README.md` | Replaced by the public selfhosted README |
| `AGENTS.md` | Same |

Files that must **never** be overwritten by the sync script:

| File | Reason |
|---|---|
| `proxy.ts` | Selfhosted version has conditional auth — may diverge from upstream |
| `components/sidebar-wrapper.tsx` | Server component reading `AUTH_ENABLED` — selfhosted-specific |
| `components/sidebar-dynamic.tsx` | Selfhosted-only file, does not exist in upstream |
| `docker-compose.yml` / `docker-compose.dev.yml` | Different from upstream (build from source, generic credentials) |
| `.env.example` | Written from scratch for the selfhosted audience |

## Tech stack

Same as upstream.

- **Framework:** Next.js 16+ (App Router, Server Actions for mutations), React 19+
- **Styling & UI:** Tailwind CSS v4 with CSS custom properties (no config file — tokens in `globals.css`)
- **Database:** PostgreSQL via Prisma ORM — client generated to `app/generated/prisma`
- **Charts:** Recharts
- **Icons:** `lucide-react`
- **Sync service:** Python FastAPI + APScheduler (optional — runs without bank credentials)

> Always append `@latest` when installing packages.

## Development commands

```bash
npm run dev      # Dev server (http://localhost:3000)
NODE_ENV=production npm run build    # Prod build + type-check (NODE_ENV=production REQUIRED)
npm run lint     # ESLint
```

Docker (local dev — DB only, credentials fixed in `docker-compose.dev.yml`):
```bash
docker compose -f docker-compose.dev.yml up -d
# DATABASE_URL=postgresql://appuser:devpassword@localhost:5432/finalibaba
```

Production (one-shot setup):
```bash
cp .env.example .env   # fill in values
docker compose up -d   # builds and starts everything
```

Prisma:
```bash
npm run db:migrate -- --name <name>   # Create + apply migration
npx prisma generate                    # Regenerate client after schema changes
npm run db:seed                        # Seed common institutions
npm run db:push                        # Sync schema to DB without a migration (dev only)
npm run db:studio                      # Open Prisma Studio for DB inspection
```

npm scripts for Docker (note: `docker:dev` and `docker:prod` reference non-standard compose files — prefer the direct commands above):
```bash
npm run docker:dev        # docker compose up -d  (default docker-compose.yml)
npm run docker:dev:stop   # docker compose down
```

No test suite (no jest/vitest/playwright).

### npm overrides

`package.json` contains an `overrides` block that forces patched versions of transitive dependencies that can't be resolved by Dependabot alone (upstream packages pin older ranges). Do not remove these entries — they are security fixes:

| Package | Reason |
|---|---|
| `uuid >=11.1.1` | CVE-2026-41907 — buffer bounds check; pinned to `^8.3.2` by `next-auth` |
| `postcss >=8.5.10` | CVE-2026-41305 — XSS via `</style>`; vendored at `8.4.31` by `next` |
| `@hono/node-server >=1.19.13` | CVE-2026-39406 — middleware bypass; pulled in via `@prisma/dev` |

## Architecture

### File layout

```
app/                  Next.js App Router pages and Server Actions
  generated/prisma/   Prisma client (generated — do not edit)
  globals.css         Design tokens + Tailwind base
  global-error.tsx    Global error boundary (client component, force-dynamic)
components/
  ui/                 Radix UI primitive wrappers (dialog, select, label, etc.)
  (other)             Feature components — dialogs, charts, sync buttons, etc.
lib/
  actions/            Server Actions (all DB mutations go here)
  auth.ts             NextAuth config + in-memory rate limiter
  format.ts           Monetary helpers: cents↔Decimal, formatCurrency, formatPercent
  gocardless.ts       GoCardless API client (token cache, typed fetch helpers)
  institutions.ts     Bank/broker name → favicon domain mapping (used for logos)
  loan.ts             calcCurrentCapital() helper
  prisma.ts           Singleton PrismaClient via @prisma/adapter-pg + pg Pool
messages/
  fr.json             French UI strings (default locale)
  en.json             English UI strings
i18n/
  request.ts          next-intl locale detection (cookie → Accept-Language → DEFAULT_LOCALE)
prisma/
  schema.prisma       Data model
  migrations/         Applied migrations
  seed.ts             Institution seed data
prisma.config.ts      Prisma config (schema path, migrations path, DB URL from env)
sync/                 Python FastAPI service (optional bank sync)
  main.py             APScheduler entry point + credential guards
  db.py               Shared PostgreSQL helpers
  sync_lcl.py         LCL (FR) via Woob (hardcoded module)
  sync_tr.py          Trade Republic via pytr
  sync_woob.py        Generic Woob runner for user-configured institutions
  setup_lcl.py        Interactive first-time LCL setup
  setup_tr.py         Interactive first-time Trade Republic setup
public/               Static assets (includes manifest.json for PWA)
proxy.ts              Next.js middleware (root) — auth bypass + demo POST-blocking
```

Selfhosted-specific points below.

### Authentication

**Disabled by default** (`AUTH_ENABLED` unset or anything other than `"true"`). Self-hosted = private network, network-level trust is sufficient.

Enabled via `AUTH_ENABLED=true` + `AUTH_PASSWORD` (plaintext) or `AUTH_PASSWORD_HASH` (bcrypt). When enabled: NextAuth Credentials provider, JWT session 30d, rate-limit 5 attempts/15min/IP. Display name via `AUTH_USER_NAME` (defaults to `"owner"`).

`proxy.ts` is the Next.js middleware (at the repo root). It reads `process.env.AUTH_ENABLED` in the `authorized` callback and bypasses NextAuth when it isn't `"true"`. If the upstream `proxy.ts` ever diverges, do **not** blindly overwrite this file.

`sidebar-wrapper.tsx` is a **server component** (no `"use client"`) — reads `AUTH_ENABLED`, passes `showLogout` prop to `sidebar-dynamic.tsx`.
`sidebar-dynamic.tsx` is a **client component** (`"use client"`) — handles `dynamic({ ssr: false })` (required to be in a client component in Next.js 16). This file does not exist in the upstream repo.
Both files are selfhosted-specific and must never be overwritten by the sync script.

For users who want security without built-in auth: document Nginx Proxy Manager, Caddy basicauth, Traefik + Authelia, Cloudflare Access, or VPN (Tailscale).

### i18n

Implemented via `next-intl`. Locale detection order: `NEXT_LOCALE` cookie → `Accept-Language` header → `DEFAULT_LOCALE` env var (defaults to `"fr"`). Supported locales: `fr` (default) and `en`. No URL prefix per locale.

UI strings live in `messages/fr.json` and `messages/en.json`. When adding new strings, update both files. Institution logos are fetched from Google Favicons using domain mappings in `lib/institutions.ts`.

### Demo mode

Set `DEMO_MODE=true` to enable a read-only public demo. `proxy.ts` intercepts all non-GET requests and returns 403. The `<AutoSync />` component on the dashboard is also disabled. Use `docker-compose.demo.yml` for a pre-seeded demo environment.

### GoCardless (Open Banking PSD2)

Optional. EU + UK bank connections via the official PSD2 API (free tier: 50 connections, 90-day history).

Credentials: `GOCARDLESS_SECRET_ID` + `GOCARDLESS_SECRET_KEY`. Set `APP_URL` to the app's public URL when behind a reverse proxy — it's used as the OAuth callback after bank authentication. Leave `APP_URL` blank for localhost use.

GoCardless logic lives in the Next.js app (not the `sync/` service).

### App ↔ Sync service communication

The Next.js app calls the Python sync service via HTTP using `SYNC_SERVICE_URL=http://sync:8000` (set automatically in `docker-compose.yml`). In development, the sync service is not started — only the DB runs via `docker-compose.dev.yml`.

### Sync service — optional modules

The `sync/` service has two dedicated sync modules plus a generic Woob runner:

| Module | Required credentials | Purpose |
|---|---|---|
| `sync_lcl.py` | `LCL_LOGIN`, `LCL_PASSWORD` | LCL (FR) via Woob hardcoded module |
| `sync_tr.py` | `TR_PHONE`, `TR_PIN` | Trade Republic via pytr |
| `sync_woob.py` | Set per-institution in UI | Generic Woob runner for any institution configured in Settings |

Leave credentials blank to disable a module. `sync/main.py` skips gracefully. `sync/db.py` contains shared PostgreSQL helpers — do not duplicate inline.

### Tax rates

Stored in `UserSettings` (`taxRatePea`, `taxRateCto`, `taxRateCrypto`). All four pages that compute latent taxes (`app/page.tsx`, `app/accounts/page.tsx`, `app/accounts/[id]/page.tsx`, `app/analytics/page.tsx`) fetch settings and use the user-defined rates. Defaults: PEA 17.2%, CTO 31.4%, Crypto 31.4%.

### Data model

- `Institution` → many `Account`
- `Account` (`AccountType`: `CHECKING | SAVINGS | INVESTMENT | REAL_ESTATE | MEAL_VOUCHER | CRYPTO | AUTOMOBILE | LOAN`)
  - Fiat (CHECKING, SAVINGS, MEAL_VOUCHER): `HistoricalBalance` (balance in cents as `BigInt`)
  - Investment/Crypto: `Holding` (ticker + `Decimal` quantity) + live price at runtime. `investmentSubtype` = `"PEA"` or `"CTO"`
  - Real Estate & Automobile: `manualValueCents` + optional `liabilityCents`
  - LOAN: capital computed at runtime via `calcCurrentCapital()` from `lib/loan.ts`
- `Holding` — unique on `(accountId, ticker)`. `costBasisCents` for P&L
- `HistoricalBalance` — daily balance snapshots
- `Transaction` — bank movements. `amountCents`: positive = credit, negative = debit. Deduplicated via `syncId`
- `SyncLog` — per-run log entries: `source` ("lcl" | "trade_republic"), `status` ("success" | "error" | "auth_required"), optional `message`
- `UserSettings` — singleton (`id = "singleton"`): salary, expenses, savings goal, monthly saved, `taxRatePea`/`taxRateCto`/`taxRateCrypto` (Float, defaults 0.172/0.314/0.314)

### Net worth calculation

**Gross = fiat balances + holdings market value + real estate/automobile manualValueCents**
**Net = Gross − liabilityCents − loan remaining capital − latent taxes**

Latent tax rates: read from `UserSettings` (defaults: PEA 17.2%, CTO 31.4%, Crypto 31.4%). User-editable in Settings → Fiscalité.

### Prisma client

This project uses **Prisma 7** with the `@prisma/adapter-pg` driver adapter (not the legacy built-in engine). `lib/prisma.ts` creates the client via a `pg.Pool` → `PrismaPg` adapter. Always import `prisma` from `@/lib/prisma` — never instantiate `PrismaClient` directly. The client is a module-level singleton (cached on `globalThis` in dev to survive HMR).

### Server vs Client boundary

- All Prisma queries and third-party API calls **must** live in Server Components or Server Actions.
- Chart and interactive UI components are `"use client"`. Pass pre-fetched data as props.

### Amounts & precision

All monetary values stored as **integer cents** (`BigInt`). Arithmetic via `Decimal.js`. Use helpers from `lib/format.ts` for conversion and display (do not inline formatting logic). Institution logos are fetched at runtime via Google Favicons using domain mappings in `lib/institutions.ts` — add new institutions there, not inline.

## Design tokens

Defined in `globals.css`. Never use raw Tailwind colour classes for brand colours.

| Token | Value | Use |
|---|---|---|
| `--accent` | #6366f1 | Active nav, primary highlight |
| `--positive` | #22c55e | Positive deltas |
| `--negative` | #ef4444 | Negative deltas, liabilities |
| `--surface` | #13131a | Card backgrounds |
| `--surface-elevated` | #1a1a24 | Hover states |
| `--border` | #2a2a38 | Dividers |
| `--muted` | #a1a1aa | Secondary text |

## Next.js version note

This project uses Next.js 16+, which has breaking changes from training data. Before writing Next.js-specific code, check `node_modules/next/dist/docs/` for current APIs and conventions. Heed deprecation notices.
