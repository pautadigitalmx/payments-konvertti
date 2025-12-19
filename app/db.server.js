import { PrismaClient } from "@prisma/client";

const fallbackUrl =
  "postgres://069ed3512f523cfbaa74d69d0709ab6fe158a25d622e821310d12347a731e10b:sk_ka5js4A-9qV1FTRK6sTq_@db.prisma.io:5432/postgres?sslmode=require";

export function createPrismaClient(url) {
  const connectionString = url || process.env.DATABASE_URL || fallbackUrl;
  return new PrismaClient({
    datasources: { db: { url: connectionString } },
  });
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = fallbackUrl;
}

const prisma = createPrismaClient();
export default prisma;
