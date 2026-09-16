# Revenue Expense Tracker

A simple Australian personal finance, investment and tax-year organiser for retail investors, property investors, retirees and pensioners. It is **not** accounting software and does **not** give tax or financial advice — it helps you record, organise, remind, understand and report on your own finances, in plain English, on the Australian financial year (1 July – 30 June).

## Product overview

- **Dashboard** — a plain-English snapshot of income, expenses, investments, property and upcoming bills for the selected Australian financial year.
- **Money** — record income and expenses against sensible Australian categories (council rates, land tax, body corporate, franking credits, etc).
- **Properties** — track one or more investment properties: rent, expenses, net rental income, estimated equity and rental yield.
- **Investments** — shares, ETFs, managed funds, term deposits and more, with buy/sell history, cost base, unrealised/realised gain-loss, and dividend/franking-credit tracking.
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
| Database | SQLite for local development/demo; designed for a one-line switch to PostgreSQL in production |
| ORM | Prisma |
| Auth | JWT bearer tokens, bcrypt password hashing, password-reset token architecture |
| Validation | Zod |
| Testing | Vitest (unit tests) |

### Why SQLite in `schema.prisma`?

The schema avoids SQLite-only quirks (native enums, arrays) precisely so that switching:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

and pointing `DATABASE_URL` at a real Postgres instance is the **only** change needed for production. "Enum-like" fields (transaction direction, bill frequency, investment type, etc.) are validated in the application layer instead (`src/lib/constants.ts` + `src/lib/validation.ts`), which also makes them easy to extend without a migration.

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

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

This creates `backend/prisma/dev.db` (SQLite) with the full schema.

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

## Testing

```bash
npm run test:backend
```

Current coverage focuses on the two areas correctness matters most: the Australian financial-year engine (30 June/1 July boundary at the second, leap years, timezone handling, FY id parsing/formatting — 18 tests) and bill recurrence date advancement (5 tests). See `backend/src/tests/`.

**Recommended next testing steps** (not yet included, to keep this build focused): integration tests against a real database (Vitest + a test Postgres/SQLite instance), React Testing Library component tests, and Playwright end-to-end tests covering the full "create account → add property → generate report" flow from section 33 of the product brief.

## Production build

```bash
npm run build:backend   # compiles to backend/dist
npm run build:frontend  # builds static assets to frontend/dist
```

Serve `frontend/dist` from any static host (or behind the same reverse proxy as the API) and run `node backend/dist/server.js` for the API.

## Deployment considerations

- **Database**: switch to PostgreSQL (see above) — SQLite is for local development/demo only.
- **File storage**: receipts/documents currently save to local disk (`UPLOAD_DIR`). For production, swap `src/routes/documents.ts` to upload to S3/Azure Blob/GCS instead.
- **Email**: password reset currently returns the raw token directly in the API response in non-production environments so the flow is testable end-to-end without email configured. Wire up a real provider (Postmark, SES, etc.) in `src/routes/auth.ts` before going to production, and remove the `devOnlyToken` field.
- **Reminders**: bill "overdue" status is refreshed lazily whenever bills are listed. For timely push/email reminders, add a scheduled job (cron, or a queue) that scans `Reminder` rows due today and sends a notification.
- Put the API behind HTTPS; set `NODE_ENV=production`.

## Security considerations

- Passwords hashed with bcrypt (12 salt rounds); password-reset tokens are stored only as bcrypt hashes, are single-use, and expire after 1 hour.
- Every data route re-derives `householdId` from the authenticated user's database record (never trusts a client-supplied id), and every Prisma query is scoped by `householdId` — one household can never read another's data.
- Zod validates all input; a friendly-error middleware ensures raw database/internal errors are never shown to users.
- Uploaded documents are served only via an authenticated, ownership-checked download route — never a raw static file path.

## A note on this sandbox's limitations

This project was built and type-checked in a network-restricted sandbox that cannot reach `binaries.prisma.sh` (Prisma's engine CDN), so live database migrations and the running server could not be verified end-to-end in that environment — only via `tsc` type-checking and dependency-free unit tests. This resolves itself automatically on any machine with normal internet access; there is nothing unusual about this project's Prisma setup.

## Important disclaimer

This application is a record-keeping and planning tool. It is not tax or financial advice. Figures such as "potential tax category", "estimated equity", "rental yield" and CGT discount eligibility are informational only. Always review your records with a registered tax professional or licensed financial adviser before lodging a tax return or making investment decisions.
