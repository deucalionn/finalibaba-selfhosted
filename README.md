# Finalibaba — Self-Hosted

> Self-hosted personal wealth dashboard. Track your net worth, investments, real estate, loans and crypto in a single view.
> Open-source alternative to Finary, with built-in French tax calculations (PEA · CTO · Crypto).

![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)

> ⚠️ **v1 — UI is in French.** i18n + configurable tax rates are planned. See [Roadmap](#roadmap).

---

## Features

- **Net worth dashboard** — gross and net of latent taxes, monthly evolution, allocation breakdown
- **All asset types** — cash accounts, investments (PEA / CTO / Crypto), real estate, automobiles, loans
- **French tax calculations** — latent taxes: PEA 17.2%, CTO 31.4%, Crypto 30%
- **Analytics** — savings rate, survival runway, sector exposure, passive income, CAGR per account
- **Automatic sync** (optional) — Trade Republic (18 EU countries), LCL, Swile
- **Open Banking PSD2** — connect any EU or UK bank via GoCardless (2,200+ institutions)
- **100% self-hosted** — your data stays on your server, no external service required

## Screenshots

<!-- TODO: add screenshots -->

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 · React 19 · TypeScript |
| Styling | Tailwind CSS v4 (CSS custom properties) |
| Database | PostgreSQL 16 · Prisma ORM |
| Auto-sync | Python · Woob (LCL) · pytr (Trade Republic) |
| Charts | Recharts |
| Deployment | Docker · Docker Compose |

## Quick setup (5 min)

**Prerequisites:** Docker + Docker Compose

```bash
git clone https://github.com/LoicSERRE/finalibaba-selfhosted
cd finalibaba-selfhosted
cp .env.example .env
```

Open `.env` and set at minimum:
- `POSTGRES_PASSWORD` — a strong random password
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`

```bash
docker compose up -d
docker compose exec app npx prisma db seed
```

Open [http://localhost:3000](http://localhost:3000).

## Adding accounts

The app supports the following account types, all addable manually from the UI:

| Type | Description | Sync available |
|---|---|---|
| Checking / Savings | Bank accounts | GoCardless (EU/UK), LCL |
| Investment (PEA / CTO) | Stock/ETF brokerage accounts | Trade Republic |
| Crypto | Cryptocurrency wallets | Trade Republic |
| Meal vouchers | Swile, Edenred | Swile |
| Real estate | Property with optional mortgage liability | Manual |
| Automobile | Vehicle with purchase price | Manual |
| Loan / Credit | Amortizing loans (auto-computed capital) | Manual |

## Automatic bank sync (optional)

All sync modules are **optional** — the app works fully without them. Leave credentials blank to disable a module.

### Trade Republic
Available in 18 EU countries (AT, BE, DE, ES, FI, FR, GR, IE, IT, LT, LU, LV, NL, PL, PT, SK, SI, EE).

First-time setup (interactive, required once):
```bash
docker compose exec -it sync python setup_tr.py
# Approve in the TR app → enter the 4-digit code
```

Session persists in a Docker volume. Renew when it expires (every few weeks).

### LCL
```bash
# First-time setup:
docker compose exec -it sync python setup_lcl.py
```

Requires `LCL_LOGIN` and `LCL_PASSWORD` in `.env`.

### GoCardless — EU + UK banks via PSD2
Free account at [bankaccountdata.gocardless.com](https://bankaccountdata.gocardless.com) (50 connections / 90 days free).

Set `GOCARDLESS_SECRET_ID` and `GOCARDLESS_SECRET_KEY` in `.env`, then connect banks from **Settings → Institutions**.

## Securing access

By default the app is open — suited for local networks, VPNs, or behind a reverse proxy that handles auth.

### Option 1 — Built-in password
```env
AUTH_ENABLED=true
AUTH_PASSWORD=your_password
# or AUTH_PASSWORD_HASH=bcrypt_hash  (generate: htpasswd -bnBC 10 "" pass | tr -d ':\n')
```

### Option 2 — Reverse proxy (recommended if internet-facing)
Put the app behind any of these:
- **Nginx Proxy Manager** + Basic Auth
- **Caddy** + `basicauth` directive
- **Traefik + Authelia / Authentik** (full SSO)
- **Cloudflare Access** (zero-trust, free up to 50 users)

### Option 3 — VPN (simplest)
Access via **Tailscale**, WireGuard, or OpenVPN — no auth config needed.

## Updating

```bash
git pull
docker compose up -d --build
```

Migrations are applied automatically on startup.

## Roadmap

- [ ] i18n — English UI default + French translation, configurable tax rates per country
- [ ] CSV import for unsupported accounts
- [ ] Multi-user support
- [ ] Demo mode with fictional data

## Contributing

Bug reports and PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Note on bank scrapers (LCL, Trade Republic, Swile): these are fragile by nature and depend on each bank's private API. PRs fixing broken scrapers are welcome but not guaranteed to be merged if they rely on undocumented endpoints.

## License

[AGPL-3.0](LICENSE) — free to self-host and modify. If you run a modified version as a network service, you must publish your changes under the same license.
