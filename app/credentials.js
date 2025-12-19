// Centralized credentials for local development/testing.
// In production, prefer environment variables instead of keeping secrets in source control.

export const loginCredentials = {
  username: "joseluis",
  password: "konvertti_123",
};

export const database = {
  url: "mysql://konvertt_pagos:konvertti_123@konvertti.com:3306/konvertt_pagos",
};
