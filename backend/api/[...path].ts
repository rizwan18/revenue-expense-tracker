/**
 * Vercel serverless function entry point.
 *
 * The filename `[...path].ts` is Vercel's catch-all dynamic route convention:
 * every request to /api/* is routed to this one function, and Vercel passes
 * the *real* incoming request path through as `req.url` (this filename only
 * controls which function handles the request — it doesn't rewrite the URL).
 * Since our Express app already mounts every route under an `/api/...`
 * prefix (see src/app.ts), no further path rewriting is needed here: this
 * file is a zero-config bridge between "one Express app" and "one Vercel
 * serverless function".
 *
 * Locally, this file is never used — `npm run dev` runs src/server.ts
 * instead, which calls app.listen() directly.
 */
import { createApp } from "../src/app";

export default createApp();
