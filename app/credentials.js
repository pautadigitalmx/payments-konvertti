// Centralized credentials for local development/testing.
// In production, prefer environment variables instead of keeping secrets in source control.

export const loginCredentials = {
  username: "joseluis",
  password: "konvertti_123",
};

export const database = {
  url: "postgres://069ed3512f523cfbaa74d69d0709ab6fe158a25d622e821310d12347a731e10b:sk_ka5js4A-9qV1FTRK6sTq_@db.prisma.io:5432/postgres?sslmode=require",
};
