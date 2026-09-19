/**
 * Vercel serverless function entry point.
 *
 * vercel.json rewrites every `/api/*` request to this single function
 * (`/api/(.*)` -> `/api`). Vercel keeps the original request path in `req.url`,
 * and the Express app mounts all of its routes under `/api/...` (see
 * backend/src/app.ts), so no further path handling is needed here.
 *
 * (A catch-all filename like `[...path].ts` only matched single-segment paths
 * such as /api/health, not /api/auth/register, so an explicit rewrite is used.)
 *
 * The file lives at the repo root because Vercel only detects functions in a
 * top-level `api/` folder. Locally it is never used: `npm run dev` runs
 * backend/src/server.ts, which calls app.listen() directly.
 */
import { createApp } from "../backend/src/app";

export default createApp();
