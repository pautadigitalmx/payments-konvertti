/* eslint-env node */
import { spawnSync } from "node:child_process";
import { database } from "../app/credentials.js";

const args = process.argv.slice(2);
if (args.length === 0) {
  // eslint-disable-next-line no-console
  console.error("Usage: node scripts/run-with-db-url.js <command> [args...]");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || database.url,
};

const result = spawnSync(args[0], args.slice(1), {
  stdio: "inherit",
  env,
});

if (result.error) {
  // eslint-disable-next-line no-console
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
