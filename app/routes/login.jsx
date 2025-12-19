import { json } from "@react-router/node";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import {
  createAuthSession,
  getAuthSession,
  isSafeRedirect,
  validateCredentials,
} from "../utils/auth.server";

const defaultRedirect = "/app";

export const loader = async ({ request }) => {
  const session = await getAuthSession(request);
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo");

  if (session?.authenticated) {
    throw redirect(isSafeRedirect(redirectTo) ? redirectTo : defaultRedirect);
  }

  return json({
    redirectTo: isSafeRedirect(redirectTo) ? redirectTo : defaultRedirect,
  });
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString();

  const result = validateCredentials(username, password);

  if (!result.success) {
    return json(
      {
        errors: result.errors,
        fields: { username: username ?? "", password: password ?? "" },
      },
      { status: 400 },
    );
  }

  const cookie = await createAuthSession();

  throw redirect(isSafeRedirect(redirectTo) ? redirectTo : defaultRedirect, {
    headers: {
      "Set-Cookie": cookie,
    },
  });
};

export default function Login() {
  const { redirectTo } = useLoaderData();
  const actionData = useActionData();
  const errors = actionData?.errors ?? {};
  const fields = actionData?.fields ?? {};

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
          background: "#fff",
          display: "grid",
          gap: "1rem",
        }}
      >
        <header style={{ display: "grid", gap: "0.25rem" }}>
          <h1 style={{ margin: 0 }}>Sign in</h1>
          <p style={{ margin: 0, color: "#4b5563" }}>
            Use the temporary credentials to access the demo content.
          </p>
        </header>

        {errors.form ? (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            }}
          >
            {errors.form}
          </div>
        ) : null}

        <Form method="post" style={{ display: "grid", gap: "1rem" }}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Username</span>
              {errors.username ? (
                <span style={{ color: "#b91c1c", fontSize: "0.875rem" }}>
                  {errors.username}
                </span>
              ) : null}
            </div>
            <input
              name="username"
              type="text"
              defaultValue={fields.username}
              style={{
                padding: "0.75rem",
                borderRadius: "8px",
                border: errors.username ? "1px solid #f87171" : "1px solid #d1d5db",
              }}
              autoComplete="username"
              required
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Password</span>
              {errors.password ? (
                <span style={{ color: "#b91c1c", fontSize: "0.875rem" }}>
                  {errors.password}
                </span>
              ) : null}
            </div>
            <input
              name="password"
              type="password"
              defaultValue={fields.password}
              style={{
                padding: "0.75rem",
                borderRadius: "8px",
                border: errors.password ? "1px solid #f87171" : "1px solid #d1d5db",
              }}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            style={{
              padding: "0.85rem",
              borderRadius: "8px",
              background: "#0b5cff",
              border: "none",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </Form>
      </section>
    </main>
  );
}
