/* eslint-env node */
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { database } from "../app/credentials.js";

const envContent = `DATABASE_URL=${database.url}
`;

function ensureFile(path) {
  if (existsSync(path)) return;
  writeFileSync(path, envContent);
  // eslint-disable-next-line no-console
  console.log(`Created ${path} with default DATABASE_URL from credentials.js`);
}

ensureFile(resolve(".env"));
ensureFile(resolve("prisma/.env"));
