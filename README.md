# CS2 Skin Price API Documentation

CS2Cap is a CS2 skin price API for live prices, buy orders, sales history, and market analytics across 40+ Counter-Strike 2 marketplaces, including Steam, BUFF163, Youpin, CSFloat, GameBoost, and Skinport. This repository contains its public Mintlify documentation, including onboarding, authentication, pricing, rate limits, endpoint references, provider coverage, error codes, and field semantics.

The docs are written for API consumers: developers building pricing tools, trading workflows, portfolio trackers, alerting systems, and analytics products on top of CS2Cap.

## Contents

| Path | Purpose |
| --- | --- |
| `docs.json` | Mintlify site configuration, theme, navigation, and page order. |
| `index.mdx` | Landing page for the docs site. |
| `introduction.mdx` | Product and API overview: base URL, capabilities, tiers, and next steps. |
| `quickstart.mdx` | First-request walkthrough with example calls. |
| `authentication.mdx` | API key authentication, account setup, and key handling. |
| `core-concepts.mdx` | Core API concepts such as providers, items, prices, bids, sales, and currencies. |
| `api-reference/` | Endpoint-level reference pages for prices, bids, sales, catalog, analytics, and portfolio. |
| `guides/` | Task-oriented guides for pricing plans, rate limits, and portfolio workflows. |
| `reference/` | Cross-cutting reference material for fields, error codes, and provider keys. |
| `openapi.json` | Filtered public OpenAPI spec generated from the backend contract. |
| `changelog.mdx` | Public documentation changelog. |

## Navigation Model

The site is split into two primary tabs in `docs.json`:

- `Documentation`: conceptual pages and task guides.
- `API Reference`: endpoint-specific request and response documentation.

## API Surface Covered

The reference pages currently document the main public surfaces of the CS2Cap API:

- Market data: `/prices`, `/bids`, `/sales`, `/items`, and provider catalog routes.
- Analytics: market indicators, arbitrage, inventory analytics, and related Quant-tier capabilities.
- Portfolio: holdings, transactions, Steam imports, and portfolio valuation workflows.
