# Roadmap — Finalibaba Self-Hosted

Planned features and improvements, roughly in priority order.

---

## v1.1 — Internationalisation + configurable tax rates

These two features are bundled into a single milestone: shipping i18n with hardcoded French tax rates would be useless for non-French users. Both share the same settings infrastructure.

- [ ] **English UI** — `next-intl` integration (`en` default, `fr` translation). No URL prefix per locale.
- [ ] **User-configurable tax rates** — PEA, CTO, and Crypto rates editable in Settings instead of hardcoded French defaults. Common presets: Germany (25%), UK (ISA 0%), Belgium (30%).

This milestone is community-triggered: it will be prioritised when there is clear demand from non-French users.

---

## Backlog

- [ ] **CSV import** — bulk import of transactions and balance history for accounts not covered by auto-sync
- [ ] **GoCardless webhooks** — real-time balance updates instead of polling every 4 hours
- [ ] **Demo mode** — pre-seeded fictional data to explore the app without connecting real accounts
- [ ] **Multi-user support** — independent portfolios for multiple users on the same instance
- [ ] **Plaid integration** — US and Canadian banks (only if there is clear community demand)

---

## Completed

- [x] AGPL-3.0 open-source release
- [x] `docker compose up` one-command setup
- [x] All account types: checking/savings, PEA/CTO, crypto, real estate, automobile, loan, meal vouchers
- [x] Optional built-in password authentication (`AUTH_ENABLED=true`)
- [x] GoCardless PSD2 open banking — 2,200+ banks across EU and UK
- [x] Trade Republic auto-sync — 18 EU countries
- [x] LCL bank auto-sync (FR, via Woob)
- [x] Analytics: savings rate, runway, passive income, CAGR, sector allocation
- [x] CSV and PDF export
- [x] WCAG 2.1 accessibility (keyboard navigation, screen reader, focus management)
