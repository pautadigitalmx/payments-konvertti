import { PrismaClient } from "@prisma/client";
import { database } from "./credentials.js";

const fallbackUrl =
  process.env.DATABASE_URL || database.url || "mysql://root@localhost:3306/mysql";

let tablesEnsured = false;

async function ensureTables(client) {
  if (tablesEnsured) return;

  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Session (
        id VARCHAR(191) PRIMARY KEY,
        shop VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL,
        isOnline TINYINT(1) NOT NULL DEFAULT 0,
        scope TEXT,
        expires DATETIME,
        accessToken TEXT NOT NULL,
        userId BIGINT,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        email VARCHAR(255),
        accountOwner TINYINT(1) NOT NULL DEFAULT 0,
        locale VARCHAR(255),
        collaborator TINYINT(1) DEFAULT 0,
        emailVerified TINYINT(1) DEFAULT 0,
        refreshToken TEXT,
        refreshTokenExpires DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS CommissionSetting (
        id INT NOT NULL PRIMARY KEY,
        value DOUBLE NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    tablesEnsured = true;
  } catch (error) {
    console.error("Failed to ensure required tables exist:", error);
  }
}

export function createPrismaClient(url) {
  const connectionString = url || process.env.DATABASE_URL || fallbackUrl;
  const client = new PrismaClient({
    datasources: { db: { url: connectionString } },
  });
  // Fire-and-forget ensure session table
  void ensureTables(client);
  return client;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = fallbackUrl;
}

const prisma = createPrismaClient();
export default prisma;
