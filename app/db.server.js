import { PrismaClient } from "@prisma/client";
import { database } from "./credentials.js";

const fallbackUrl =
  process.env.DATABASE_URL || database.url || "mysql://root@localhost:3306/mysql";

let sessionTableEnsured = false;

async function ensureSessionTable(client) {
  if (sessionTableEnsured) return;

  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Session (
        id VARCHAR(191) PRIMARY KEY,
        shop VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL,
        isOnline BOOLEAN NOT NULL DEFAULT FALSE,
        scope TEXT,
        expires DATETIME,
        accessToken TEXT NOT NULL,
        userId BIGINT,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        email VARCHAR(255),
        accountOwner BOOLEAN NOT NULL DEFAULT FALSE,
        locale VARCHAR(255),
        collaborator BOOLEAN DEFAULT FALSE,
        emailVerified BOOLEAN DEFAULT FALSE,
        refreshToken TEXT,
        refreshTokenExpires DATETIME
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
