# CS2Cap API Docs

This directory contains the public documentation source for CS2Cap's market-data API. It is a Mintlify docs project that covers onboarding, authentication, pricing, rate limits, endpoint references, provider coverage, error codes, and field semantics for the API served by this repository.

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
| `api-reference/` | Endpoint-level reference pages for prices, bids, sales, catalog, analytics, portfolio, account, sub-keys, alerts, and webhooks. |
| `guides/` | Task-oriented guides for pricing plans, rate limits, portfolio workflows, and webhook/alert integrations. |
| `reference/` | Cross-cutting reference material for fields, error codes, and provider keys. |
| `openapi.json` | Filtered public OpenAPI spec generated from the backend contract. |
| `changelog.mdx` | Public documentation changelog. |

## Navigation Model

The site is split into two primary tabs in `docs.json`:

- `Documentation`: conceptual pages and task guides.
- `API Reference`: endpoint-specific request and response documentation.

When adding a page, create the `.mdx` file in the relevant folder and add it to the correct navigation group in `docs.json`. Mintlify only exposes pages that are included in the navigation config.

## API Surface Covered

The reference pages currently document the main public surfaces of the CS2Cap API:

- Market data: `/v1/prices`, `/v1/bids`, `/v1/sales`, `/v1/items`, and provider catalog routes.
- Analytics: market indicators, arbitrage, inventory analytics, and related Quant-tier capabilities.
- Portfolio: holdings, transactions, Steam imports, and portfolio valuation workflows.
- Account workflows: API keys, sub-keys, alerts, webhooks, usage, and account-level operations.
