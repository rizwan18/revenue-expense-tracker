# Revenue Expense Tracker

A simple Australian personal finance, investment and tax-year organiser for retail investors, property investors, retirees and pensioners. It is **not** accounting software and does **not** give tax or financial advice — it helps you record, organise, remind, understand and report on your own finances, in plain English, on the Australian financial year (1 July – 30 June).

## Product overview

- **Dashboard** — a plain-English snapshot of income, expenses, investments, property and upcoming bills for the selected Australian financial year.
- **Money** — record income and expenses against sensible Australian categories (council rates, land tax, body corporate, franking credits, etc).
- **Properties** — track one or more investment properties: rent, expenses, net rental income, estimated equity and rental yield.
- **Investments** — shares, ETFs, managed funds, term deposits and more, with buy/sell history, cost base, unrealised/realised gain-loss, and dividend/franking-credit tracking.
- **Capital gains** — disposals from your buy/sell history are calculated automatically; disposals for anything not tracked that way (a private sale, a collectible, a holding from before you started using this app) can be recorded manually and are persisted alongside the automatic ones, feeding into the same dashboard figures and reports.
- **Bills & Reminders** — recurring bills with automatic due-date rollover and reminders (snooze, complete, dismiss).
- **Reports** — financial year, tax information summary, property and investment reports, with CSV export for your accountant.
- **Easy View** — a larger-text, simplified mode for anyone who prefers less on the screen.

This app deliberately avoids automatically deciding what is tax-deductible. It only ever suggests a **potential tax category** and always tells you to review it with a registered tax professional.

## Architecture

```
revenue-expense-tracker/
├── backend/     Node.js + TypeScript + Express REST API, Prisma ORM
└── frontend/    React + TypeScript + Vite + Tailwind CSS
```

**Backend** (`backend/`)
- `src/lib/financialYear.ts` — the Australian financial-year engine (1 Jul–30 Jun), timezone-aware, leap-year-safe, fully unit tested. Every other calculation in the app depends on this being correct.
- `src/lib/billRecurrence.ts` — pure date-advancement logic for recurring bills, also unit tested.
- `src/services/calculations.ts` — the single source of truth for every total shown anywhere in the app (dashboard, reports, tax summary). Nothing else computes totals independently, so numbers can't drift between screens.
- `src/routes/*` — one file per resource (auth, transactions, properties, investments, dividends, capital gains, bills, reminders, dashboard, reports, search, documents).
- `prisma/schema.prisma` — the full relational data model.

**Frontend** (`frontend/`)
- `src/context/` — Auth and Financial Year React contexts (the financial-year selector is global and affects every screen).
- `src/components/ui.tsx` — small design-system primitives (Card, Button, StatTile, EmptyState, HelpText tooltips for jargon).
- `src/pages/` — one page per navigation item.

## Technology stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL in production (Neon); SQLite optional for local dev — see "Database setup & migrations" |
| ORM | Prisma |
| Auth | JWT bearer tokens, bcrypt password hashing, password-reset token architecture |
| Validation | Zod |
| Testing | Vitest (unit tests) |

### Why the schema avoids native enums

`schema.prisma` defaults to PostgreSQL (matching production), but deliberately avoids Postgres-only or SQLite-only quirks like native enums and arrays, so the same schema also works unmodified against SQLite for quick local development (see "Database setup & migrations" below for both options). "Enum-like" fields (transaction direction, bill frequency, investment type, etc.) are validated in the application layer instead (`src/lib/constants.ts` + `src/lib/validation.ts`), which also makes them easy to extend without a migration.

## Installation

Requires Node.js 20+.

```bash
git clone <this-repo>
cd revenue-expense-tracker
npm run install:all
```

## Environment variables

Copy the example files and adjust as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

See `backend/.env.example` for the full list (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `UPLOAD_DIR`). **Generate a real `JWT_SECRET` for anything beyond local development** — e.g. `openssl rand -base64 48`.

## Database setup & migrations

The schema defaults to PostgreSQL (matching production — see "Deploying to Vercel" below). For local development you have two options:

**Option A — local Postgres or a free Neon dev branch (recommended, matches production exactly):**
```bash
cd backend
# DATABASE_URL and DIRECT_URL can point at the same connection string
# locally if you're not using a pooler.
npx prisma migrate dev --name init
```

**Option B — SQLite (fastest to get running, zero external services):**
Temporarily edit `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"   // was "postgresql"
  url      = env("DATABASE_URL")
}
```
and set `DATABASE_URL="file:./dev.db"` in `backend/.env` (no `DIRECT_URL` needed). Then run the same `npx prisma migrate dev --name init`. Don't commit this schema change — switch back to `postgresql` before deploying.

## Seed data

Realistic **fictional** Australian demo data (two properties, shares, ETFs, dividends, franking credits, household bills, upcoming reminders):

```bash
npm run prisma:seed --prefix backend
```

Demo login: `demo@example.com` / `DemoPassword123!`

## Running the development servers

In two terminals:

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173 (proxies /api to the backend)
```

Document uploads always go to Vercel Blob (even in local dev) — set `BLOB_READ_WRITE_TOKEN` in `backend/.env` if you want to test that flow locally (`vercel env pull` after linking the backend project is the easiest way to get one).

## Testing

```bash
npm run test:backend
```

Current coverage focuses on the areas correctness matters most, all as dependency-free pure-function unit tests: the Australian financial-year engine (30 June/1 July boundary at the second, leap years, timezone handling, FY id parsing/formatting — 18 tests), bill recurrence date advancement (5 tests), and manual capital gains disposal math — cost base, proceeds, gain/loss, ownership-percentage splitting for joint ownership, and holding-period calculation (5 tests). 28 tests total. See `backend/src/tests/`.
**Recommended next testing steps** (not yet included, to keep this build focused): integration tests against a real database (Vitest + a test Postgres/SQLite instance), React Testing Library component tests, and Playwright end-to-end tests covering the full "create account → add property → generate report" flow from section 33 of the product brief.

## Deploying to Vercel

The frontend and backend are deployed as **two separate Vercel projects** from this one repository (set each project's "Root Directory" accordingly). This is the standard pattern for a Vite SPA + a separately-hosted API on Vercel.

### 1. Set up a production database (Neon Postgres)

Vercel's serverless functions can't use SQLite (no persistent local disk), so production uses PostgreSQL. [Neon](https://neon.tech) is Vercel's recommended serverless-friendly Postgres provider (there's also a direct Vercel Postgres/Neon integration in the Vercel dashboard's Storage tab, which sets these env vars for you automatically).

1. Create a Neon project and database.
2. Copy the **pooled** connection string (via PgBouncer) → this is `DATABASE_URL`.
3. Copy the **unpooled/direct** connection string → this is `DIRECT_URL` (used only for migrations).

### 2. Set up file storage (Vercel Blob)

In the backend Vercel project → **Storage** tab → create a **Blob** store and connect it to the project. Vercel automatically injects `BLOB_READ_WRITE_TOKEN` — you don't need to set it by hand.

### 3. Deploy the backend project

Create a new Vercel project from this repo with:
- **Root Directory**: `backend`
- **Framework Preset**: Other (it's a plain serverless-functions project — `backend/api/[...path].ts` wraps the whole Express app as one function, see the comment in that file for how the routing lines up)
- **Environment variables**: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN` (set once you know the frontend's URL), `NODE_ENV=production`

`postinstall: prisma generate` runs automatically on every install, so the Postgres-targeted Prisma Client is always built fresh for the deployment.

**Run migrations once against the production database** (from your own machine, since Vercel's build step doesn't run migrations automatically):
```bash
cd backend
DATABASE_URL="<your Neon pooled URL>" DIRECT_URL="<your Neon direct URL>" npx prisma migrate deploy
```
Re-run this (or `prisma migrate deploy` in CI) after every schema change.

### 4. Deploy the frontend project

Create a second Vercel project from the same repo with:
- **Root Directory**: `frontend`
- **Framework Preset**: Vite (auto-detected)
- **Environment variables**: `VITE_API_BASE_URL` = the backend project's URL (e.g. `https://revenue-expense-tracker-api.vercel.app`)

`frontend/vercel.json` adds the SPA rewrite React Router needs so refreshing a deep link (e.g. `/properties/abc123`) doesn't 404.

### 5. Close the loop

Set the backend's `CORS_ORIGIN` env var to the frontend's actual Vercel URL and redeploy the backend (a wildcard `*` works fine to start, since auth is bearer-token based rather than cookie based, but locking it down is good practice once you have a stable frontend URL).

### What changed from local dev

| | Local dev | Vercel production |
|---|---|---|
| Database | SQLite (`backend/prisma/dev.db`) | PostgreSQL (Neon) |
| File uploads | Local disk (`UPLOAD_DIR`) | Vercel Blob |
| Backend process | Long-running `node`/`tsx` process (`src/server.ts`) | Single serverless function per request (`api/[...path].ts`) |
| Frontend → API | Vite dev-server proxy (relative `/api/*`) | Absolute URL via `VITE_API_BASE_URL` (separate domains) |

Cold starts are worth knowing about: the first request after idle will be slower (new Postgres connection + Prisma engine init). The Prisma Client singleton in `src/lib/prisma.ts` is reused across warm invocations of the same function instance, which helps.

## Production build (self-hosted alternative)

```bash
npm run build:backend   # compiles to backend/dist
npm run build:frontend  # builds static assets to frontend/dist
```

Serve `frontend/dist` from any static host (or behind the same reverse proxy as the API) and run `node backend/dist/server.js` for the API.

## Deployment considerations

- **Database**: production uses PostgreSQL by default now (see "Deploying to Vercel" above); SQLite is for local development/demo only, and requires temporarily editing `prisma/schema.prisma`'s `provider`.
- **File storage**: production uploads go to Vercel Blob (`src/routes/documents.ts`). If you deploy the backend somewhere other than Vercel, swap that file to S3/Azure Blob/GCS instead — the pattern (upload buffer → store URL → stream back through an authenticated route) carries over directly.
- **Email**: password reset currently returns the raw token directly in the API response in non-production environments so the flow is testable end-to-end without email configured. Wire up a real provider (Postmark, SES, etc.) in `src/routes/auth.ts` before going to production, and remove the `devOnlyToken` field.
- **Reminders**: bill "overdue" status is refreshed lazily whenever bills are listed. For timely push/email reminders, add a scheduled job — Vercel Cron Jobs are a natural fit here — that scans `Reminder` rows due today and sends a notification.
- Put the API behind HTTPS (Vercel does this automatically); set `NODE_ENV=production`.

## Security considerations

- Passwords hashed with bcrypt (12 salt rounds); password-reset tokens are stored only as bcrypt hashes, are single-use, and expire after 1 hour.
- Every data route re-derives `householdId` from the authenticated user's database record (never trusts a client-supplied id), and every Prisma query is scoped by `householdId` — one household can never read another's data.
- Zod validates all input; a friendly-error middleware ensures raw database/internal errors are never shown to users.
- Uploaded documents are served only via an authenticated, ownership-checked download route — never a raw static file path.

## A note on this sandbox's limitations

This project was built and type-checked in a network-restricted sandbox that cannot reach `binaries.prisma.sh` (Prisma's engine CDN). Two consequences:

1. Live database migrations and the running server could not be verified end-to-end in that environment.
2. Because `prisma generate` never completes successfully, `@prisma/client` falls back to a minimal stub where `PrismaClient` is typed as `any`. This means `tsc` passing on Prisma-touching route files confirms the code is syntactically valid TypeScript, but does **not** confirm real Prisma type safety (e.g. a typo'd field name on a `prisma.investment.findMany({...})` call would not be caught here). The parts of the codebase that don't touch Prisma — the financial-year engine, bill recurrence, and capital gains math — have no such caveat: they're pure functions with dependency-free unit tests that genuinely pass.

Both resolve automatically on any machine with normal internet access (`npx prisma generate` there produces a fully-typed client); there is nothing unusual about this project's Prisma setup. Worth running `npx tsc --noEmit` again yourself after your first real `prisma generate`, just to catch anything this sandbox couldn't.

## Important disclaimer

This application is a record-keeping and planning tool. It is not tax or financial advice. Figures such as "potential tax category", "estimated equity", "rental yield" and CGT discount eligibility are informational only. Always review your records with a registered tax professional or licensed financial adviser before lodging a tax return or making investment decisions.
