# Payments Konvertti: Full App Explanation + Lovable Enhancement Prompt

## 1) What this app currently is

This repository is currently a **single-entry PHP bootstrap app** for a Shopify commission + insurance solution.

At runtime, `index.php` does four primary things:

1. Starts a PHP session and parses the incoming path (`/`, `/health`, etc.).
2. Checks whether Composer dependencies are installed (`shopify/shopify-api`, `vlucas/phpdotenv`).
3. Loads required environment variables and computes an app setup status payload.
4. Serves either:
   - JSON health/status output (for `/health`, `?format=json`, non-root paths, or `Accept: application/json`), or
   - a basic HTML UI with login + store domain capture.

So this is best understood as a **foundation shell** rather than a complete production Shopify app.

---

## 2) Runtime flow in detail

### A. Boot and request parsing

- Session is initialized if not already started.
- The app computes `$path` from `$_SERVER['REQUEST_URI']`.
- It creates a default `$payload` with status = `dependencies_missing` and a message instructing to run Composer install.

### B. Dependency + environment readiness logic

If `vendor/autoload.php` exists:

- Composer autoload is required.
- App checks if:
  - Shopify SDK class exists (`Shopify\Clients\Rest`),
  - Dotenv class exists.
- If Dotenv is available:
  - It calls `safeLoad()` on `.env`.
  - Validates required env variables:
    - `SHOPIFY_API_KEY`
    - `SHOPIFY_API_SECRET`
    - `SHOPIFY_API_SCOPES`
    - `SHOPIFY_APP_URL`
    - `SHOPIFY_APP_HOSTNAME`
    - `SHOPIFY_WEBHOOK_SECRET`
  - If all present => status `ready`.
  - If any missing => status `needs_configuration` and lists missing keys.
- If Dotenv missing, payload remains dependency error.

### C. JSON mode vs HTML mode

JSON is returned when any of these are true:

- path is `/health`
- path is not `/` and not `/index.php`
- query string has `format=json`
- HTTP `Accept` includes `application/json`

If JSON mode:

- sets `Content-Type: application/json`
- returns HTTP 500 only when dependencies are missing, otherwise 200
- outputs pretty-printed payload

If HTML mode:

- renders UI dashboard with status badge, setup instructions, login/store form, dependency chips, env requirements.

### D. Login + store capture flow (HTML POST only)

Only runs on POST when not in JSON mode:

1. `action=login`
   - Auth is hardcoded: `admin / admin`.
   - On success, session flag `authenticated = true`.
   - On failure, shows error.

2. `action=store` (requires authenticated session)
   - Reads store domain input.
   - Sanitizes domain using regex to retain only alphanumeric, `.` and `-`.
   - Lowercases and saves to session as `store_domain`.

This is currently a **placeholder install UX**, not real Shopify OAuth.

---

## 3) UI and DX characteristics

- Single-page UI in `index.php` with embedded CSS.
- Clearly communicates whether app is:
  - dependency-ready,
  - env-ready,
  - or blocked.
- Provides a webhook HMAC verification snippet for future backend webhook handling.
- Uses safe HTML output (`htmlspecialchars`) for dynamic text rendering in page messages.

---

## 4) What is present vs missing

### Present now

- PHP 8.1+ project scaffold via Composer.
- Shopify API SDK dependency declaration.
- Dotenv support.
- Local dev start script (`php -S localhost:8080 index.php`).
- Health/config readiness endpoint behavior.
- Session-backed login + store form placeholders.

### Not implemented yet (but described in README roadmap)

- Real Shopify OAuth (`/auth/install`, `/auth/callback`).
- Persistent database tables (`shops`, `settings`, `commissions`).
- Webhook registration and verified webhook processing endpoint.
- Commission calculation engine and aggregation/report endpoints.
- Embedded Shopify Admin UI (App Bridge + Polaris frontend).
- Cart Transform / Checkout extension for auto-adding insurance product.
- Multi-merchant security hardening and production auth/session policies.

---

## 5) Data model the app intends to evolve toward

Suggested from repository docs:

- `shops`: shop identity + offline token metadata.
- `settings`: commission %, insurance toggles, variant IDs, inclusion rules.
- `commissions`: per-order calculated commission rows.

You should treat this as the intended target architecture while using current `index.php` only as bootstrap.

---

## 6) Operational constraints to keep in mind

- Current auth (`admin/admin`) is intentionally non-production.
- No CSRF middleware currently in place.
- Session storage defaults to PHP session handler; no distributed/session-store strategy.
- No database persistence yet; state is transient except env and session.
- Non-root routes currently route to JSON health payload rather than true route handling.

---

## 7) Production-ready enhancement plan (high level)

1. Introduce a router/controller structure (`public/index.php`, `src/Http/...`).
2. Add real OAuth install/callback and token persistence.
3. Add webhook endpoints + HMAC validation middleware.
4. Add DB schema + repositories for shops/settings/commissions.
5. Add commission service and reporting API.
6. Build embedded app frontend (React + Polaris + App Bridge) or server-rendered Polaris-compatible pages.
7. Build Shopify Function/Cart Transform extension for insurance line insertion.
8. Add tests (unit + integration for webhook signature and commission calculations).
9. Add structured logging, error monitoring, and deployment config.

---

## 8) Copy/paste prompt for Lovable (full detail)

Use this exact prompt in Lovable:

```text
You are a senior product engineer. I need you to transform a bootstrap PHP Shopify app into a production-grade Shopify embedded app for commission tracking and auto-insurance add-ons.

## Existing app context (important)
- Tech: Native PHP 8.1+, Composer.
- Current repo has:
  - index.php (single entry file with session boot, dependency/env checks, health JSON mode, placeholder login/store form)
  - composer.json requiring shopify/shopify-api ^6.0 and vlucas/phpdotenv ^5.6
  - README describing intended architecture (OAuth, webhooks, commission reports, insurance line item auto-add)
- Current status:
  - No real OAuth
  - No DB persistence
  - No webhook handler endpoint
  - No reporting API
  - No cart extension yet

## Product requirements
1) Merchant sets commission percentage and rules (include/exclude shipping, taxes, discounts).
2) App calculates commission from orders and stores per-order commission records.
3) Merchant sees reporting dashboard: total orders, gross/net sales, total commission, filters (today/7d/30d/custom).
4) App auto-adds an insurance product/variant to cart where possible, but customer can remove it.
5) Must be secure and Shopify-compliant.

## Build requirements
- Keep PHP backend.
- Implement Shopify OAuth install + callback.
- Persist shop installs and offline tokens in database.
- Add webhook subscriptions (orders/create and optionally orders/paid).
- Verify webhook HMAC in middleware.
- Add idempotent order-processing pipeline.
- Add commission calculator service and test coverage.
- Add API endpoints for settings and reports.
- Add migrations for tables:
  - shops
  - settings
  - commissions
  - processed_webhooks (or equivalent idempotency table)
- Add validation and authorization checks.
- Add configuration management via .env.
- Add structured logging and error handling.

## Shopify insurance auto-add implementation
- Prefer modern Shopify approach:
  - Cart Transform / Shopify Function (or best currently supported equivalent)
  - Ensure insurance line item is removable by customer
- Provide fallback strategy for themes that cannot use the preferred method.
- Include merchant UI controls to enable/disable insurance and set insurance variant.

## UX requirements
- Embedded Shopify Admin UI with clear IA:
  - Overview
  - Settings
  - Reports
  - Webhook/Sync status
- Production-level form validation and helpful empty/loading/error states.
- Show setup checklist if app is not fully configured.

## Non-functional requirements
- Security: no default credentials, no plaintext secrets, CSRF/session hardening.
- Reliability: idempotency, retry-safe processing, clear admin-visible logs.
- Performance: pagination/cursoring on order sync, cached report aggregates where appropriate.
- Observability: request IDs, webhook event IDs, actionable error logs.

## Deliverables expected from you
1) Proposed target architecture diagram (textual is fine).
2) Folder structure and responsibility map.
3) Database schema (SQL migrations).
4) API contract for each endpoint (request/response examples).
5) Step-by-step implementation plan with milestones.
6) Representative code for:
   - OAuth flow
   - webhook verification + processing
   - commission calculation
   - reporting query
7) Test plan with concrete test cases.
8) Deployment checklist.

## Important coding constraints
- PHP-first backend implementation.
- Keep code modular and testable.
- Avoid over-engineering; prefer incremental migration from existing index.php.
- Include backwards-compatible transition steps from current bootstrap state.

Now generate:
- a phased implementation blueprint,
- prioritized backlog (P0/P1/P2),
- and starter code snippets for each critical path.
```

---

## 9) Short version prompt (if you want a faster Lovable run)

```text
Enhance my PHP Shopify bootstrap app into a production embedded app.
Current app only has health checks + placeholder login/store capture in index.php.
Build OAuth, DB persistence, verified webhooks, commission engine, reporting APIs/UI, and insurance auto-add with removable line item.
Use secure defaults, idempotency, and observability.
Return architecture, migrations, endpoint contracts, phased plan, and starter code.
```
