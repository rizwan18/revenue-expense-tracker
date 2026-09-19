#!/usr/bin/env node
/**
 * Create/update the database tables during Vercel *production* builds.
 *
 * Vercel's Neon integration can add a custom prefix to its variables
 * (e.g. `tracker_db_DATABASE_URL`), so this resolves the connection strings
 * from either the plain names or any `<prefix>_DATABASE_URL[_UNPOOLED]`.
 * Skipped for previews and local builds. Never prints connection strings.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const env = { ...process.env };
const findKey = (name) =>
  env[name] ? name : Object.keys(env).find((k) => k.endsWith(`_${name}`) && env[k]);

if (env.VERCEL_ENV !== "production") {
  console.log("db:sync skipped (only runs for Vercel production builds).");
  process.exit(0);
}

const dbKey = findKey("DATABASE_URL");
if (!dbKey) {
  console.log("db:sync skipped (no DATABASE_URL found in the environment).");
  process.exit(0);
}
const directKey = env.DIRECT_URL ? "DIRECT_URL" : findKey("DATABASE_URL_UNPOOLED");

env.DATABASE_URL = env[dbKey];
env.DIRECT_URL = env.DIRECT_URL || (directKey ? env[directKey] : env[dbKey]);
console.log(`db:sync: using ${dbKey} (direct: ${directKey || dbKey}) to sync the schema…`);

const r = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  cwd: path.join(__dirname, "..", "backend"),
  env,
  stdio: "inherit",
});
process.exit(r.status === null ? 1 : r.status);
