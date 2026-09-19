import { PrismaClient } from "@prisma/client";

// Vercel's Neon integration injects DATABASE_URL (pooled) and
// DATABASE_URL_UNPOOLED (direct), optionally with a custom prefix such as
// `tracker_db_DATABASE_URL`. Resolve either form, and fall back for
// DIRECT_URL (which the Prisma schema expects) so no manual mapping is needed.
function fromEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const key = Object.keys(process.env).find((k) => k.endsWith(`_${name}`) && process.env[k]);
  return key ? process.env[key] : undefined;
}
process.env.DATABASE_URL ??= fromEnv("DATABASE_URL");
process.env.DIRECT_URL ??= fromEnv("DATABASE_URL_UNPOOLED") ?? process.env.DATABASE_URL;

// Reuse a single PrismaClient instance across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
