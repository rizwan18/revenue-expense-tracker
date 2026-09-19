import { PrismaClient } from "@prisma/client";

// Vercel's Neon integration injects DATABASE_URL (pooled) and
// DATABASE_URL_UNPOOLED (direct). The Prisma schema also expects DIRECT_URL,
// so fall back to the integration's names when it isn't set explicitly.
process.env.DIRECT_URL ??= process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

// Reuse a single PrismaClient instance across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
