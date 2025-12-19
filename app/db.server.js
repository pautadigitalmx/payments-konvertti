import { PrismaClient } from "@prisma/client";
import { database } from "./credentials.js";

const fallbackUrl =
  process.env.DATABASE_URL || database.url || "postgres://localhost:5432/postgres";

let sessionTableEnsured = false;

async function ensureSessionTable(client) {
  if (sessionTableEnsured) return;

  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        id TEXT PRIMARY KEY,
        shop TEXT NOT NULL,
        state TEXT NOT NULL,
        "isOnline" BOOLEAN NOT NULL DEFAULT FALSE,
        scope TEXT,
        expires TIMESTAMP,
        "accessToken" TEXT NOT NULL,
        "userId" BIGINT,
        "firstName" TEXT,
        "lastName" TEXT,
        email TEXT,
        "accountOwner" BOOLEAN NOT NULL DEFAULT FALSE,
        locale TEXT,
        collaborator BOOLEAN DEFAULT FALSE,
        "emailVerified" BOOLEAN DEFAULT FALSE,
        "refreshToken" TEXT,
        "refreshTokenExpires" TIMESTAMP
      );
    `);
    sessionTableEnsured = true;
  } catch (error) {
    console.error("Failed to ensure Session table exists:", error);
  }
}

export function createPrismaClient(url) {
  const connectionString = url || process.env.DATABASE_URL || fallbackUrl;
  const client = new PrismaClient({
    datasources: { db: { url: connectionString } },
  });
  // Fire-and-forget ensure session table
  void ensureSessionTable(client);
  return client;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = fallbackUrl;
}

const prisma = createPrismaClient();
export default prisma;
