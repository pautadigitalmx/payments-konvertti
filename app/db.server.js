import { PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://069ed3512f523cfbaa74d69d0709ab6fe158a25d622e821310d12347a731e10b:sk_SSBDWSjidHUu8G2ffIN6K@db.prisma.io:5432/postgres?sslmode=require";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;
