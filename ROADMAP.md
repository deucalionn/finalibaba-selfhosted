# Roadmap — Finalibaba Self-Hosted

Work plan for turning the private `Finalibaba/` repo into a public self-hostable release.

## Context & success criteria

**Source:** private repo `/mnt/c/Projets/Finalibaba/` (personal use, CI/CD pipeline, personal credentials)
**Target:** this repo — community edition, `docker compose up` is enough

**Success criteria:**
- Someone unfamiliar with the project can be running in production in under 10 minutes
- Only two required `.env` variables: `POSTGRES_PASSWORD` + `NEXTAUTH_SECRET`
- No personal credentials or config in the code
- Sync service is optional and clearly documented as such
- Features added to the private repo can be ported here easily

## Language policy (applies to everything in this repo)

- **All code comments, docs, README, commit messages, issue templates** → **English**
- **UI strings** → `next-intl` (`messages/en.json` default, `messages/fr.json` for French)
- The private upstream repo (`Finalibaba/`) stays in French — it's personal

---

## Phase 0 — Authentication (architectural decision) ✅

### Decision: auth disabled by default, opt-in via env var

Self-hosted = private network. Authentication is the network's responsibility, not the app's.

| `AUTH_ENABLED` | Behaviour |
|---|---|
| unset / anything ≠ `"true"` (default) | All routes open, no login required |
| `"true"` | NextAuth password auth enabled (`AUTH_PASSWORD` or `AUTH_PASSWORD_HASH`) |

### Code changes — already implemented in upstream

- [x] `proxy.ts` — conditional bypass via `authorized` callback reading `AUTH_ENABLED`
- [x] `lib/auth.ts` — hardcoded `"Loic"` replaced by `process.env.AUTH_USER_NAME ?? "owner"`
- [x] `components/sidebar-wrapper.tsx` — converted to server component, reads `AUTH_ENABLED`, passes `showLogout` prop
- [x] `components/sidebar.tsx` — accepts `showLogout?: boolean`, logout button is conditional

### Documentation to add in README

```markdown
## Securing access (optional)

By default the app is open — designed for local networks and VPNs.

### Option 1 — Built-in auth
AUTH_ENABLED=true
AUTH_PASSWORD=your_password

### Option 2 — Reverse proxy (recommended if internet-facing)
- Nginx Proxy Manager + Basic Auth
- Caddy + basicauth directive
- Traefik + Authelia / Authentik (full SSO)
- Cloudflare Access (zero-trust, free up to 50 users)

### Option 3 — VPN (simplest)
Tailscale, WireGuard, or OpenVPN. No auth config needed.
```

---

## Phase 1 — Initial copy and cleanup

### 1.1 Copy application sources

Copy from `Finalibaba/` excluding personal infra files:

```bash
rsync -av \
  --exclude='.git/' \
  --exclude='.github/' \
  --exclude='docker-compose.server.yml' \
  --exclude='env.server.example' \
  --exclude='CLAUDE.md' \
  --exclude='README.md' \
  --exclude='AGENTS.md' \
  --exclude='ROADMAP.md' \
  --exclude='.env' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  /mnt/c/Projets/Finalibaba/ /mnt/c/Projets/finalibaba-selfhosted/
```

> CLAUDE.md, README.md, ROADMAP.md in this repo are written from scratch — never overwrite.

Files to verify after copy:
- [ ] `app/` — full Next.js source
- [ ] `components/` — React components
- [ ] `lib/` — actions, helpers, auth
- [ ] `prisma/` — schema + migrations + seed
- [ ] `sync/` — Python service (LCL, TR, Swile)
- [ ] `public/` — static assets
- [ ] `Dockerfile` — Next.js app
- [ ] `sync/Dockerfile` — Python service
- [ ] `next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `prisma.config.ts`
- [ ] `proxy.ts` — already has conditional auth from Phase 0
- [ ] `app/globals.css` — design tokens

### 1.2 Translate code meta to English

After copying, translate all French **developer-facing text** to English: code comments, log messages, server-side error strings. UI strings (labels, buttons, tooltips visible to end users) stay in French for v1 — they'll move to `next-intl` in a later milestone.

Files with French developer text to translate:
- [ ] `sync/main.py` — log messages, comments
- [ ] `sync/sync_lcl.py`, `sync_tr.py`, `sync_swile.py`, `sync/db.py` — comments, log messages
- [ ] `prisma/schema.prisma` — inline comments (e.g. `// LOAN: montant emprunté initial`)
- [ ] `lib/actions/*.ts` — comments
- [ ] `lib/loan.ts` — comments
- [ ] `app/` Server Components — comments only (UI strings stay in French for v1)
- [ ] `components/` — comments only (UI strings stay in French for v1)

### 1.3 docker-compose.yml for selfhosted

Based on `docker-compose.prod.yml` from upstream, adapted:

```yaml
# Differences from upstream:
# - Build from source (no pre-built GHCR images)
# - Port 3000:3000 publicly exposed (not 127.0.0.1:3002:3000)
# - AUTH_ENABLED, AUTH_USER_NAME, APP_URL passed to app container
# - No Cloudflare tunnel service
# - POSTGRES_USER default → "appuser" (not "loic")
```

`docker-compose.dev.yml` for local development (DB only, port 5432, generic credentials):
- Based on the upstream `docker-compose.yml` but with `POSTGRES_USER: appuser` / `POSTGRES_PASSWORD: devpassword`

- [ ] Create `docker-compose.yml` (production, build from source)
- [ ] Create `docker-compose.dev.yml` (local dev, DB only)
- [ ] Pass `AUTH_ENABLED`, `AUTH_USER_NAME`, `APP_URL` to the `app` service
- [ ] Verify PostgreSQL healthcheck works with generic variables

### 1.4 Create .env.example

Full inventory of env vars read by the app (`process.env.*`) and sync service (`os.environ`):

```env
# ╔══════════════════════════════════════════════════════════════════════╗
# ║                   FINALIBABA — Configuration                        ║
# ║  Copy to .env and fill in the values.                               ║
# ║  [REQUIRED] = mandatory  /  [OPTIONAL] = leave blank to disable     ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ── Database ───────────────────────────────────────────────────────────
# [REQUIRED] PostgreSQL password — at least 16 random characters
POSTGRES_PASSWORD=changeme_use_a_strong_password

# ── NextAuth (session management) ─────────────────────────────────────
# [REQUIRED] Secret key — generate with: openssl rand -base64 32
NEXTAUTH_SECRET=

# Public URL of the app — used by NextAuth for OAuth redirects.
# Leave blank if you don't use GoCardless or AUTH_ENABLED=true.
NEXTAUTH_URL=http://localhost:3000

# ── Built-in authentication (optional) ────────────────────────────────
# Default: no auth. The app is open — suited for local networks and VPNs.
# See README → "Securing access" for alternatives.
AUTH_ENABLED=false

# If AUTH_ENABLED=true, set one of these:
# AUTH_PASSWORD=your_password              # plaintext (simple)
# AUTH_PASSWORD_HASH=                      # bcrypt hash (more secure)
# Generate a hash: htpasswd -bnBC 10 "" password | tr -d ':\n'

# Display name shown in the UI when AUTH_ENABLED=true
# AUTH_USER_NAME=

# ── Open Banking PSD2 — GoCardless (optional) ─────────────────────────
# Connect European banks via the official PSD2 API.
# Free account at bankaccountdata.gocardless.com (50 connections/90d free)
GOCARDLESS_SECRET_ID=
GOCARDLESS_SECRET_KEY=

# Public URL for the GoCardless callback (after bank OAuth).
# Set this if the app is behind a reverse proxy (e.g. https://yourdomain.com).
# Leave blank for local-only use.
# APP_URL=

# ── Automatic bank sync (all optional) ────────────────────────────────
# Leave blank to disable the corresponding module.
# The app works fully without sync — manual balance entry is always available.

# LCL — via Woob (web scraping, French bank)
LCL_LOGIN=
LCL_PASSWORD=

# Trade Republic — via pytr (WebSocket + REST)
# Available in 18 EU countries. TR_PHONE in international format: +33612345678
TR_PHONE=
TR_PIN=

# Swile — meal vouchers (OAuth, French only)
SWILE_LOGIN=
SWILE_PASSWORD=
```

### 1.5 Make sync service graceful without credentials

Modify `sync/main.py` so modules skip cleanly when credentials are absent:

```python
def _run_lcl():
    if not os.environ.get("LCL_LOGIN"):
        log.info("LCL_LOGIN not set — LCL sync disabled")
        return

def _run_tr():
    if not os.environ.get("TR_PHONE"):
        log.info("TR_PHONE not set — Trade Republic sync disabled")
        return

def _run_swile():
    if not os.environ.get("SWILE_LOGIN"):
        log.info("SWILE_LOGIN not set — Swile sync disabled")
        return
```

- [ ] `sync/main.py` — graceful skip for LCL, TR, Swile
- [ ] TR keepalive (`_keepalive_tr`) also skips if `TR_PHONE` absent
- [ ] The `sync` container starts and stays healthy with zero credentials

### 1.6 Enrich institution seed

`prisma/seed.ts` — current institutions are already generic. Add:

```typescript
{ name: "Revolut" },
{ name: "N26" },
{ name: "Hello Bank" },
{ name: "Crédit Mutuel" },
{ name: "CIC" },
{ name: "Caisse d'Épargne" },
{ name: "La Banque Postale" },
{ name: "Degiro" },
{ name: "Saxo Banque" },
{ name: "Interactive Brokers" },
```

- [ ] Add missing institutions
- [ ] Check available GoCardless institution IDs in their docs

---

## Phase 2 — Documentation

### 2.1 README.md

The README is in **English** — the primary audience for a public GitHub repo is international. The app UI is in French for v1, which is stated clearly in the README.

Target structure — optimised so a GitHub visitor is running in production in 5 minutes:

```markdown
# Finalibaba — Self-Hosted

[Badges: Docker, License, Stars]

> Self-hosted personal wealth dashboard. Aggregates bank accounts,
> investments, real estate, loans and crypto in a single view.
> Open-source alternative to Finary, with built-in French tax calculations.

> ⚠️ v1 — UI is currently in French. i18n + configurable tax rates planned.
> See [Roadmap](#roadmap).

[Screenshot: dashboard]

## Features
- Net worth dashboard (gross / net of latent taxes)
- Accounts: cash, PEA/CTO, crypto, real estate, cars, loans
- French tax: latent taxes PEA (17.2%), CTO (31.4%), crypto (30%)
- Analytics: savings rate, runway, sector exposure
- Auto-sync: Trade Republic (18 EU countries), LCL, Swile (optional)
- Open Banking PSD2 via GoCardless (EU + UK banks)
- 100% self-hosted, no external data

## Quick setup (5 min)

Prerequisites: Docker + Docker Compose

    git clone https://github.com/xxx/finalibaba-selfhosted
    cd finalibaba-selfhosted
    cp .env.example .env
    # Edit .env: set POSTGRES_PASSWORD and NEXTAUTH_SECRET
    docker compose up -d
    docker compose exec app npx prisma db seed
    # Open http://localhost:3000

## Adding accounts
(table of AccountTypes with examples)

## Automatic bank sync (optional)
### Trade Republic (18 EU countries)
### LCL (French bank)
### Swile (French meal vouchers)
### GoCardless (EU + UK banks via PSD2)

## Securing access
(the 3 options: AUTH_ENABLED, reverse proxy, VPN)

## Updating
    git pull && docker compose up -d --build

## Roadmap
- [ ] i18n + configurable tax rates (EN default, FR translation, user-defined rates)
- [ ] CSV import
- [ ] Multi-user support
- [ ] Plaid integration (US/CA)

## FAQ
```

- [ ] Write the full README
- [ ] Add screenshots (dashboard, accounts, analytics)
- [ ] "Adding accounts" section with one example per `AccountType`
- [ ] FAQ: common issues (port conflict, first TR login, GoCardless setup)

### 2.2 CONTRIBUTING.md

- [ ] How to report a bug (GitHub issue template)
- [ ] Note on bank scrapers: fragile, bank ToS dependent, PRs welcome but not guaranteed
- [ ] Architecture pointer → CLAUDE.md

### 2.3 GitHub files

- [ ] `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] `LICENSE` — MIT or AGPL? (AGPL prevents SaaS forks without contribution)
- [ ] `.gitignore` — verify `.env` is ignored (already the case upstream)

---

## Phase 3 — CI/CD and image publishing (optional)

### 3.1 Build workflow

If we want to spare users from building from source, publish images to GHCR:
- `ghcr.io/xxx/finalibaba-app:latest`
- `ghcr.io/xxx/finalibaba-sync:latest`
- Add `.github/workflows/build.yml` (build + push only, no deploy)
- Add `docker-compose.ghcr.yml` alternative that uses pre-built images

- [ ] Decide: build-from-source only, or publish images too
- [ ] If yes: create `.github/workflows/build.yml`

### 3.2 Auto-updates via Watchtower (optional, if images published)

Document in README: add a `watchtower` service to the compose for automatic image updates.

---

## Upstream → selfhosted sync strategy

### Principle

When a feature is added to the private `Finalibaba/` repo:

1. Make sure it contains no personal infra code
2. Run `scripts/sync-from-upstream.sh`
3. Check `git diff` — ensure nothing personal was copied
4. Apply any selfhosted-specific adaptations (see table below)
5. Commit + push in English

### Sync script

Create `scripts/sync-from-upstream.sh`:

```bash
#!/bin/bash
# Sync application files from the private Finalibaba repo to selfhosted.
# Does not copy personal infra files. Always run git diff afterwards.
#
# Usage: ./scripts/sync-from-upstream.sh

set -e

UPSTREAM="/mnt/c/Projets/Finalibaba"
SELFHOSTED="$(dirname "$(dirname "$(realpath "$0")")")"

echo "→ Syncing from $UPSTREAM to $SELFHOSTED"

rsync -av --delete \
  --exclude='.git/' \
  --exclude='.github/' \
  --exclude='docker-compose.server.yml' \
  --exclude='docker-compose.yml' \
  --exclude='docker-compose.dev.yml' \
  --exclude='env.server.example' \
  --exclude='.env' \
  --exclude='.env.example' \
  --exclude='CLAUDE.md' \
  --exclude='README.md' \
  --exclude='AGENTS.md' \
  --exclude='ROADMAP.md' \
  --exclude='scripts/' \
  --exclude='messages/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='*.log' \
  "$UPSTREAM/" "$SELFHOSTED/"

echo ""
echo "✓ Sync complete. Next steps:"
echo "  1. git diff — verify no personal files were copied"
echo "  2. Apply selfhosted-specific adaptations if needed (see ROADMAP.md)"
echo "  3. git add -p && git commit (in English)"
```

### Adaptation table

| Upstream change | Action in selfhosted |
|---|---|
| New `.github/workflows/*` file | Delete (or archive in `scripts/`) |
| Change in `docker-compose.server.yml` | Ignore |
| New sync script (`sync_xxx.py`) | Add credential guard in `main.py`, translate comments to English |
| `prisma/seed.ts` modified | Check no personal data, enrich if relevant |
| New `AccountType` in schema | Port + add example in README "Adding accounts" |
| `lib/auth.ts` modified | Check `name: "Loic"` is not reintroduced |
| `proxy.ts` modified | Review carefully — selfhosted version may diverge |
| Any French comment added | Translate to English |

**Files to never overwrite with the sync script:**
- `proxy.ts`
- `docker-compose.yml` / `docker-compose.dev.yml`
- `.env.example`
- `messages/` (i18n translation files)
- `scripts/`

---

## Backlog (post-v1)

### General
- [ ] Demo mode: seed with fictional data to showcase the app without a real account
- [ ] CSV import: for accounts not covered by auto-sync
- [ ] GoCardless webhook: real-time sync instead of polling
- [ ] Multi-user support (see upstream CLAUDE.md Phase 2 roadmap)

### Internationalisation — single milestone (i18n + configurable taxes)

**v1 is France-only.** The UI is in French, tax rates are French defaults. This is clearly stated in the README so foreign visitors understand the scope and can follow progress.

**Why bundle i18n and configurable taxes into one milestone:**
- Shipping i18n with hardcoded French tax rates is useless for non-French users — wrong numbers
- Both touch the same files; doing them together avoids two rounds of refactoring
- Trigger: community demand (issues or stars from non-FR users)

**Context:**
- Trade Republic available in 18 EU countries — potential users in DE, ES, IT, NL, BE, AT, etc.
- GoCardless PSD2 covers 2,200+ banks in all EEA countries + UK
- Tax rates currently hardcoded as `TAX_RATES` constants in **4 files**:
  `app/page.tsx:14`, `app/accounts/page.tsx:45`, `app/accounts/[id]/page.tsx:41`, `app/analytics/page.tsx:35`

**What the milestone includes:**

1. **Configurable tax rates**
   - Extract `TAX_RATES` to `lib/tax.ts` → read from `UserSettings` in DB
   - Add to Prisma schema: `peaTaxRate Float @default(0.172)`, `ctoTaxRate Float @default(0.314)`, `cryptoTaxRate Float @default(0.30)`
   - Settings page: "Tax rates" section with 3 configurable fields
   - Tooltip with common rates: FR (17.2/31.4/30%), DE (25% Abgeltungsteuer), UK (ISA = 0%), BE (30%)

2. **i18n with `next-intl`**
   - `messages/en.json` (default), `messages/fr.json`
   - Extract all UI strings from `app/` and `components/`
   - `Intl.NumberFormat` already locale-aware — no change needed for number/currency formatting
   - No URL prefix per locale (no `/en/dashboard`)

3. **Plaid integration** (separate future item, only if strong US/CA community signal)
   - Paid API beyond dev quota — do not anticipate without clear demand

---

## Current status

- [x] CLAUDE.md created (English)
- [x] ROADMAP.md created (English, with full strategy)
- [x] Phase 0 — Conditional auth implemented in upstream (`proxy.ts`, `lib/auth.ts`, `sidebar-wrapper.tsx`, `sidebar.tsx`)
- [ ] Phase 1 — Initial copy, cleanup, translate code meta to English
- [ ] Phase 2 — Documentation (README + CONTRIBUTING + GitHub files)
- [ ] Phase 3 — CI/CD and image publishing (optional)
- [ ] Backlog — i18n + configurable taxes (single milestone, post-v1 on community demand)
