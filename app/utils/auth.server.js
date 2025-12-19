import { createCookie, redirect } from "react-router";

const authCookie = createCookie("app-auth", {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

const VALID_USERNAME = process.env.APP_USERNAME || "joseluis";
const VALID_PASSWORD = process.env.APP_PASSWORD || "konvertti_123";

const defaultSession = {
  authenticated: false,
  commission: null,
};

export function isSafeRedirect(to) {
  return Boolean(to) && to.startsWith("/") && !to.startsWith("//");
}

export async function getAuthSession(request) {
  const cookieHeader = request.headers.get("Cookie");

  return {
    ...defaultSession,
    ...((await authCookie.parse(cookieHeader)) ?? {}),
  };
}

export async function requireAuth(request) {
  const session = await getAuthSession(request);

  if (session?.authenticated) {
    return session;
  }

  const url = new URL(request.url);
  const redirectTo = `${url.pathname}${url.search}`;

  throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}

export async function createAuthSession() {
  return authCookie.serialize(
    { ...defaultSession, authenticated: true },
    {
      maxAge: 60 * 60 * 24,
    },
  );
}

export async function clearAuthSession() {
  return authCookie.serialize("", { maxAge: 0 });
}

export async function updateAuthSession(request, updates) {
  const session = await getAuthSession(request);

  return authCookie.serialize(
    { ...session, ...updates, authenticated: true },
    {
      maxAge: 60 * 60 * 24,
    },
  );
}

export function validateCredentials(username, password) {
  const errors = {};

  if (!username) {
    errors.username = "Username is required";
  }

  if (!password) {
    errors.password = "Password is required";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
    return { success: false, errors: { form: "Invalid username or password" } };
  }

  return { success: true, errors: {} };
}
