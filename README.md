# Ledgerlane

Ledgerlane is an AI assurance operating system for finance teams. It turns recurring close work into controlled, auditable workflows: AI identifies anomalies, people approve decisions, and every piece of evidence is retained in an immutable audit trail.

## Product model

- **Customer:** Controllers and finance operations teams at 50–2,000 person companies.
- **Outcome:** Faster month-end close without weakening financial controls.
- **Differentiation:** It is a decision-and-evidence layer, not another accounting ledger. It sits over QuickBooks, NetSuite, Xero, ERP exports, and document stores.
- **Pricing:** Starter (free evaluation), Growth ($499/month, 10 users), Scale ($1,499/month, SSO, custom retention, advanced controls). Enterprise is contracted annually.

## Run locally

1. Install Node.js 22.5 or later.
2. From this directory, run `npm start`.
3. Open `http://localhost:3000`.

In local development, the live workspace button starts a secured demo session for `leila@atlas.example`. Set `ALLOW_DEMO=false` in production. The landing page also includes complete signup, sign-in, and briefing-request flows.

## Deploy and sell

1. Create Growth and Scale subscription variants in Lemon Squeezy, then set the store, variant, API, and webhook values in `.env` from `.env.example`.
2. Create a server-side Gemini API key and set `GEMINI_API_KEY`. It is never sent to the browser.
3. Set a unique `LEDGERLANE_SESSION_SECRET` of at least 32 characters, `NODE_ENV=production`, `ALLOW_DEMO=false`, and your public `APP_URL`.
4. Register `https://your-domain.com/api/webhooks/lemonsqueezy` in Lemon Squeezy and select subscription events. Paste the webhook signing secret into `LEMONSQUEEZY_WEBHOOK_SECRET`.
5. Deploy with `docker compose up -d --build` or build the included Dockerfile on your preferred container platform. Point your domain and TLS proxy at port 3000.

The checkout buttons become live automatically when the Lemon Squeezy environment variables are present. The checkout sends the customer back into their workspace after payment and the signed webhook records the subscription state.

## Architecture

The application uses the Node.js standard library and built-in SQLite, avoiding an unreviewed dependency supply chain. SQLite runs in WAL mode and is an excellent single-node deployment choice. For horizontal scale, use a managed PostgreSQL service and an object store for evidence packages; the HTTP API boundaries and tenant keys are already designed for that change.

| Area | Delivered implementation |
| --- | --- |
| Authentication | Passwords via `scrypt`, opaque signed-hash session tokens, secure production cookies, 14-day expiry |
| Multi-tenancy | Every business record is scoped by `org_id`; handlers authorize before reads and writes |
| RBAC | Owner, admin, controller, accountant, and auditor roles; write and audit routes enforce permissions |
| Core workflows | Create, progress, review, and complete reconciliation, accrual, and evidence workflows |
| Exceptions | Materiality-aware exception queue and resolution action with audit event |
| Auditability | Append-only event log with actor, entity, metadata, and timestamp |
| Billing | Lemon Squeezy checkout and HMAC-signed subscription webhooks |
| AI | Gemini server-side inference, grounded in tenant-scoped workflow and exception context |
| Operations | Health and readiness endpoints, structured server error logging, request rate limiting, CSP, strict origin checks, and security headers |

## API surface

`POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/leads`, `POST /api/intelligence/brief`, `GET /api/me`, `GET /api/dashboard`, `GET|POST /api/workflows`, `PATCH /api/workflows/:id`, `GET /api/exceptions`, `POST /api/exceptions/:id/resolve`, `GET /api/audit`, `GET /api/billing`, `POST /api/billing/checkout`, and `POST /api/webhooks/lemonsqueezy`.

## Production deployment

Set the required variables in `.env.example`, use an HTTPS reverse proxy, mount `data/` on encrypted persistent storage, back up the database, and run behind a process manager. Do not use the development session secret in production. Configure Lemon Squeezy to post subscription events to `/api/webhooks/lemonsqueezy` and set `LEMONSQUEEZY_WEBHOOK_SECRET`. Add a Gemini API key to enable grounded Lane responses.
"# saas9090" 
