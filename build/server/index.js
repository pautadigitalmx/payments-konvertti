var _a;
import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, redirect, createCookie, UNSAFE_withErrorBoundaryProps, useRouteError } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-react-router/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
const loginCredentials = {
  username: "joseluis",
  password: "konvertti_123"
};
const database = {
  url: "mysql://konvertt_pagos:konvertti_123@konvertti.com:3306/konvertt_pagos"
};
const fallbackUrl = process.env.DATABASE_URL || database.url;
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
function createPrismaClient(url) {
  const connectionString = url || process.env.DATABASE_URL || fallbackUrl;
  const client = new PrismaClient({
    datasources: { db: { url: connectionString } }
  });
  void ensureTables(client);
  return client;
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = fallbackUrl;
}
const prisma = createPrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.October25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login$1 = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, reactRouterContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: reactRouterContext, url: request.url }),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width,initial-scale=1"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://cdn.shopify.com/"
      }), /* @__PURE__ */ jsx("link", {
        rel: "stylesheet",
        href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
const action$4 = async ({
  request
}) => {
  const {
    payload,
    session,
    topic,
    shop
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4
}, Symbol.toStringTag, { value: "Module" }));
const action$3 = async ({
  request
}) => {
  const {
    shop,
    session,
    topic
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma.session.deleteMany({
      where: {
        shop
      }
    });
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: "Module" }));
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const loader$5 = async ({
  request
}) => {
  const errors = loginErrorMessage(await login$1(request));
  return {
    errors
  };
};
const action$2 = async ({
  request
}) => {
  const errors = loginErrorMessage(await login$1(request));
  return {
    errors
  };
};
const route$1 = UNSAFE_withComponentProps(function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const {
    errors
  } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, {
    embedded: false,
    children: /* @__PURE__ */ jsx("s-page", {
      children: /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-section", {
          heading: "Log in",
          children: [/* @__PURE__ */ jsx("s-text-field", {
            name: "shop",
            label: "Shop domain",
            details: "example.myshopify.com",
            value: shop,
            onChange: (e) => setShop(e.currentTarget.value),
            autocomplete: "on",
            error: errors.shop
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            children: "Log in"
          })]
        })
      })
    })
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: route$1,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_12o3y_1";
const heading = "_heading_12o3y_11";
const text = "_text_12o3y_12";
const content = "_content_12o3y_22";
const form = "_form_12o3y_27";
const label = "_label_12o3y_35";
const input = "_input_12o3y_43";
const button = "_button_12o3y_47";
const list = "_list_12o3y_51";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$4 = async ({
  request
}) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return {
    showForm: Boolean(login$1)
  };
};
const route = UNSAFE_withComponentProps(function App2() {
  const {
    showForm
  } = useLoaderData();
  return /* @__PURE__ */ jsx("div", {
    className: styles.index,
    children: /* @__PURE__ */ jsxs("div", {
      className: styles.content,
      children: [/* @__PURE__ */ jsx("h1", {
        className: styles.heading,
        children: "A short heading about [your app]"
      }), /* @__PURE__ */ jsx("p", {
        className: styles.text,
        children: "A tagline about [your app] that describes your value proposition."
      }), showForm && /* @__PURE__ */ jsxs(Form, {
        className: styles.form,
        method: "post",
        action: "/auth/login",
        children: [/* @__PURE__ */ jsxs("label", {
          className: styles.label,
          children: [/* @__PURE__ */ jsx("span", {
            children: "Shop domain"
          }), /* @__PURE__ */ jsx("input", {
            className: styles.input,
            type: "text",
            name: "shop"
          }), /* @__PURE__ */ jsx("span", {
            children: "e.g: my-shop-domain.myshopify.com"
          })]
        }), /* @__PURE__ */ jsx("button", {
          className: styles.button,
          type: "submit",
          children: "Log in"
        })]
      }), /* @__PURE__ */ jsxs("ul", {
        className: styles.list,
        children: [/* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        }), /* @__PURE__ */ jsxs("li", {
          children: [/* @__PURE__ */ jsx("strong", {
            children: "Product feature"
          }), ". Some detail about your feature and its benefit to your customer."]
        })]
      })]
    })
  });
});
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: route,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const headers$2 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$2,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const authCookie = createCookie("app-auth", {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/"
});
const VALID_USERNAME = process.env.APP_USERNAME || loginCredentials.username;
const VALID_PASSWORD = process.env.APP_PASSWORD || loginCredentials.password;
const defaultSession = {
  authenticated: false,
  commission: null,
  connectionString: null
};
function isSafeRedirect(to) {
  return Boolean(to) && to.startsWith("/") && !to.startsWith("//");
}
async function getAuthSession(request) {
  const cookieHeader = request.headers.get("Cookie");
  return {
    ...defaultSession,
    ...await authCookie.parse(cookieHeader) ?? {}
  };
}
async function createAuthSession() {
  return authCookie.serialize(
    { ...defaultSession, authenticated: true },
    {
      maxAge: 60 * 60 * 24
    }
  );
}
async function updateAuthSession(request, updates) {
  const session = await getAuthSession(request);
  return authCookie.serialize(
    { ...session, ...updates, authenticated: true },
    {
      maxAge: 60 * 60 * 24
    }
  );
}
function validateCredentials(username, password) {
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
const defaultRedirect = "/app";
const loader$2 = async ({
  request
}) => {
  const session = await getAuthSession(request);
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo");
  if (session == null ? void 0 : session.authenticated) {
    throw redirect(isSafeRedirect(redirectTo) ? redirectTo : defaultRedirect);
  }
  return Response.json({
    redirectTo: isSafeRedirect(redirectTo) ? redirectTo : defaultRedirect
  });
};
const action$1 = async ({
  request
}) => {
  var _a2, _b, _c;
  const formData = await request.formData();
  const username = (_a2 = formData.get("username")) == null ? void 0 : _a2.toString().trim();
  const password = (_b = formData.get("password")) == null ? void 0 : _b.toString().trim();
  const redirectTo = (_c = formData.get("redirectTo")) == null ? void 0 : _c.toString();
  const result = validateCredentials(username, password);
  if (!result.success) {
    return Response.json({
      errors: result.errors,
      fields: {
        username: username ?? "",
        password: password ?? ""
      }
    }, {
      status: 400
    });
  }
  const cookie = await createAuthSession();
  return redirect(isSafeRedirect(redirectTo) ? redirectTo : defaultRedirect, {
    headers: {
      "Set-Cookie": cookie
    }
  });
};
const login = UNSAFE_withComponentProps(function Login() {
  const {
    redirectTo
  } = useLoaderData();
  const actionData = useActionData();
  const errors = (actionData == null ? void 0 : actionData.errors) ?? {};
  const fields = (actionData == null ? void 0 : actionData.fields) ?? {};
  return /* @__PURE__ */ jsx("main", {
    style: {
      minHeight: "100vh",
      display: "grid",
      placeItems: "center"
    },
    children: /* @__PURE__ */ jsxs("section", {
      style: {
        width: "100%",
        maxWidth: "420px",
        padding: "2rem",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
        background: "#fff",
        display: "grid",
        gap: "1rem"
      },
      children: [/* @__PURE__ */ jsxs("header", {
        style: {
          display: "grid",
          gap: "0.25rem"
        },
        children: [/* @__PURE__ */ jsx("h1", {
          style: {
            margin: 0
          },
          children: "Sign in"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            margin: 0,
            color: "#4b5563"
          },
          children: "Use the temporary credentials to access the demo content."
        })]
      }), errors.form ? /* @__PURE__ */ jsx("div", {
        style: {
          padding: "0.75rem",
          borderRadius: "8px",
          background: "#fef2f2",
          color: "#b91c1c",
          border: "1px solid #fecaca"
        },
        children: errors.form
      }) : null, /* @__PURE__ */ jsxs(Form, {
        method: "post",
        style: {
          display: "grid",
          gap: "1rem"
        },
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "redirectTo",
          value: redirectTo
        }), /* @__PURE__ */ jsxs("label", {
          style: {
            display: "grid",
            gap: "0.35rem"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between"
            },
            children: [/* @__PURE__ */ jsx("span", {
              children: "Username"
            }), errors.username ? /* @__PURE__ */ jsx("span", {
              style: {
                color: "#b91c1c",
                fontSize: "0.875rem"
              },
              children: errors.username
            }) : null]
          }), /* @__PURE__ */ jsx("input", {
            name: "username",
            type: "text",
            defaultValue: fields.username,
            style: {
              padding: "0.75rem",
              borderRadius: "8px",
              border: errors.username ? "1px solid #f87171" : "1px solid #d1d5db"
            },
            autoComplete: "username",
            required: true
          })]
        }), /* @__PURE__ */ jsxs("label", {
          style: {
            display: "grid",
            gap: "0.35rem"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between"
            },
            children: [/* @__PURE__ */ jsx("span", {
              children: "Password"
            }), errors.password ? /* @__PURE__ */ jsx("span", {
              style: {
                color: "#b91c1c",
                fontSize: "0.875rem"
              },
              children: errors.password
            }) : null]
          }), /* @__PURE__ */ jsx("input", {
            name: "password",
            type: "password",
            defaultValue: fields.password,
            style: {
              padding: "0.75rem",
              borderRadius: "8px",
              border: errors.password ? "1px solid #f87171" : "1px solid #d1d5db"
            },
            autoComplete: "current-password",
            required: true
          })]
        }), /* @__PURE__ */ jsx("button", {
          type: "submit",
          style: {
            padding: "0.85rem",
            borderRadius: "8px",
            background: "#0b5cff",
            border: "none",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer"
          },
          children: "Sign in"
        })]
      })]
    })
  });
});
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: login,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const loader$1 = async ({
  request
}) => {
  await authenticate.admin(request);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || ""
  };
};
const app = UNSAFE_withComponentProps(function App3() {
  const {
    apiKey
  } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider, {
    embedded: true,
    apiKey,
    children: [/* @__PURE__ */ jsxs("s-app-nav", {
      children: [/* @__PURE__ */ jsx("s-link", {
        href: "/app",
        children: "Home"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/additional",
        children: "Additional page"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/login",
        children: "Login (coming soon)"
      })]
    }), /* @__PURE__ */ jsx(Outlet, {})]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2() {
  return boundary.error(useRouteError());
});
const headers$1 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: app,
  headers: headers$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const app_additional = UNSAFE_withComponentProps(function AdditionalPage() {
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Additional page",
    children: [/* @__PURE__ */ jsxs("s-section", {
      heading: "Multiple pages",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: ["The app template comes with an additional page which demonstrates how to create multiple pages within app navigation using", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/apps/tools/app-bridge",
          target: "_blank",
          children: "App Bridge"
        }), "."]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["To create your own page and have it show up in the app navigation, add a page inside ", /* @__PURE__ */ jsx("code", {
          children: "app/routes"
        }), ", and a link to it in the", " ", /* @__PURE__ */ jsx("code", {
          children: "<ui-nav-menu>"
        }), " component found in", " ", /* @__PURE__ */ jsx("code", {
          children: "app/routes/app.jsx"
        }), "."]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      slot: "aside",
      heading: "Resources",
      children: /* @__PURE__ */ jsx("s-unordered-list", {
        children: /* @__PURE__ */ jsx("s-list-item", {
          children: /* @__PURE__ */ jsx("s-link", {
            href: "https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav",
            target: "_blank",
            children: "App nav best practices"
          })
        })
      })
    })]
  });
});
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_additional
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({
  request
}) => {
  const session = await getAuthSession(request);
  await authenticate.admin(request);
  const connectionString = session.connectionString || database.url;
  let saved = null;
  const client = (prisma == null ? void 0 : prisma.commissionSetting) ? createPrismaClient(connectionString) : null;
  if (client == null ? void 0 : client.commissionSetting) {
    try {
      saved = await client.commissionSetting.findFirst({
        orderBy: {
          updatedAt: "desc"
        }
      });
    } catch (error) {
      console.error("Failed to read commission setting:", error);
      saved = null;
    } finally {
      await (client == null ? void 0 : client.$disconnect());
    }
  }
  const fallbackCommission = 8;
  const commissionValue = (saved == null ? void 0 : saved.value) ?? session.commission ?? fallbackCommission;
  return {
    commission: commissionValue,
    defaultCommission: fallbackCommission,
    connectionString,
    testResult: null
  };
};
const action = async ({
  request
}) => {
  var _a2;
  const formData = await request.formData();
  const intent = formData.get("_action");
  if (intent === "testConnection") {
    const activeConnection2 = formData.get("connectionString") || formData.get("existingConnectionString") || database.url;
    try {
      const testClient = createPrismaClient(activeConnection2 || void 0);
      const [row] = await testClient.$queryRaw`SELECT inet_server_addr() AS ip` ?? [];
      await testClient.$disconnect();
      return Response.json({
        testResult: {
          ok: true,
          ip: (row == null ? void 0 : row.ip) ?? "unknown",
          message: (row == null ? void 0 : row.ip) ? `Connected successfully. Database server IP: ${row.ip}` : "Connected successfully. Unable to determine server IP."
        }
      });
    } catch (error) {
      let outboundIp = null;
      try {
        const resp = await fetch("https://api.ipify.org?format=json");
        const data = await resp.json();
        outboundIp = data == null ? void 0 : data.ip;
      } catch {
        outboundIp = null;
      }
      return Response.json({
        testResult: {
          ok: false,
          ip: outboundIp,
          message: "Connection failed. Please whitelist this app server IP and confirm host, port, database, user, password, and SSL mode."
        }
      }, {
        status: 500
      });
    }
  }
  if (intent === "saveConnection") {
    const connectionString = (_a2 = formData.get("connectionString")) == null ? void 0 : _a2.toString().trim();
    if (!connectionString) {
      return Response.json({
        errors: {
          connection: "Connection string is required"
        }
      }, {
        status: 400
      });
    }
    try {
      const client = createPrismaClient(connectionString);
      await client.$queryRaw`SELECT 1`;
      await client.$disconnect();
      const cookie2 = await updateAuthSession(request, {
        connectionString
      });
      return Response.json({
        connectionString,
        testResult: {
          ok: true,
          ip: null,
          message: "Connection string saved successfully."
        }
      }, {
        headers: {
          "Set-Cookie": cookie2
        }
      });
    } catch (error) {
      console.error("Failed to save connection string:", error);
      return Response.json({
        errors: {
          connection: "Connection failed. Please verify host, port, database, user, password, and SSL mode."
        }
      }, {
        status: 500
      });
    }
  }
  const commissionValue = formData.get("commission");
  const commission = Number(commissionValue);
  if (!commissionValue || Number.isNaN(commission) || commission <= 0) {
    return Response.json({
      errors: {
        commission: "Enter a commission greater than 0"
      }
    }, {
      status: 400
    });
  }
  const activeConnection = (await getAuthSession(request)).connectionString || database.url;
  {
    const client = createPrismaClient(activeConnection);
    if (client == null ? void 0 : client.commissionSetting) {
      try {
        await client.commissionSetting.upsert({
          where: {
            id: 1
          },
          update: {
            value: commission
          },
          create: {
            id: 1,
            value: commission
          }
        });
      } catch (error) {
        console.error("Failed to persist commission:", error);
      } finally {
        await client.$disconnect();
      }
    }
  }
  const cookie = await updateAuthSession(request, {
    commission
  });
  return Response.json({
    commission
  }, {
    headers: {
      "Set-Cookie": cookie
    }
  });
};
const app__index = UNSAFE_withComponentProps(function Index() {
  var _a2;
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [editingCommission, setEditingCommission] = useState(false);
  const commission = (actionData == null ? void 0 : actionData.commission) ?? loaderData.commission;
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Payments overview",
    children: [/* @__PURE__ */ jsx("s-section", {
      heading: "Commission settings",
      spacing: "loose",
      children: /* @__PURE__ */ jsxs("div", {
        style: {
          display: "grid",
          gap: "12px"
        },
        children: [commission ? /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid var(--s-border, #d9e1ec)",
            borderRadius: "12px",
            padding: "12px 16px"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("p", {
              style: {
                margin: 0,
                fontWeight: 600
              },
              children: "Commission"
            }), /* @__PURE__ */ jsxs("p", {
              style: {
                margin: 0,
                color: "#637381"
              },
              children: [commission, "%"]
            })]
          }), /* @__PURE__ */ jsx("s-button", {
            variant: "tertiary",
            onClick: () => setEditingCommission(true),
            children: "Change"
          })]
        }) : null, editingCommission || !commission ? /* @__PURE__ */ jsxs(Form, {
          method: "post",
          style: {
            display: "grid",
            gap: "12px"
          },
          children: [/* @__PURE__ */ jsxs("label", {
            style: {
              display: "grid",
              gap: "6px"
            },
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                fontWeight: 600
              },
              children: "Set commission (%)"
            }), /* @__PURE__ */ jsx("input", {
              name: "commission",
              type: "number",
              step: "0.01",
              min: "0",
              defaultValue: commission ?? loaderData.defaultCommission,
              style: {
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #d9e1ec"
              },
              required: true
            }), ((_a2 = actionData == null ? void 0 : actionData.errors) == null ? void 0 : _a2.commission) ? /* @__PURE__ */ jsx("span", {
              style: {
                color: "#b42318",
                fontSize: "14px"
              },
              children: actionData.errors.commission
            }) : /* @__PURE__ */ jsx("span", {
              style: {
                color: "#637381",
                fontSize: "14px"
              },
              children: "Set the percentage deducted per transaction."
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: "8px"
            },
            children: [/* @__PURE__ */ jsx("s-button", {
              type: "submit",
              children: "Save commission"
            }), commission ? /* @__PURE__ */ jsx("s-button", {
              type: "button",
              variant: "tertiary",
              onClick: () => setEditingCommission(false),
              children: "Cancel"
            }) : null]
          })]
        }) : null]
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "Performance",
      spacing: "loose",
      children: /* @__PURE__ */ jsxs("div", {
        style: {
          display: "grid",
          gap: "16px"
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gap: "8px",
            padding: "16px",
            border: "1px solid var(--s-border, #d9e1ec)",
            borderRadius: "12px"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              margin: 0,
              fontWeight: 600
            },
            children: "Overview"
          }), /* @__PURE__ */ jsx("p", {
            style: {
              margin: 0,
              color: "#637381"
            },
            children: "Track settlement status, payouts, and commissions at a glance."
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "grid",
              gap: "8px",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            },
            children: [{
              label: "Gross volume (7d)",
              value: "$48,230"
            }, {
              label: "Pending payouts",
              value: "$12,400"
            }, {
              label: "Commission",
              value: commission ? `${commission}%` : "Not set"
            }, {
              label: "Disputes open",
              value: "3"
            }].map((item) => /* @__PURE__ */ jsxs("div", {
              style: {
                padding: "12px",
                borderRadius: "10px",
                background: "#f4f6f8",
                display: "grid",
                gap: "4px"
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  color: "#637381",
                  fontSize: "14px"
                },
                children: item.label
              }), /* @__PURE__ */ jsx("span", {
                style: {
                  fontWeight: 700
                },
                children: item.value
              })]
            }, item.label))
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gap: "8px",
            padding: "16px",
            border: "1px solid var(--s-border, #d9e1ec)",
            borderRadius: "12px"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              margin: 0,
              fontWeight: 600
            },
            children: "Navigation"
          }), /* @__PURE__ */ jsx("nav", {
            style: {
              display: "grid",
              gap: "8px",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
            },
            children: ["Payouts", "Orders", "Disputes", "Reports", "Integrations"].map((item) => /* @__PURE__ */ jsx("a", {
              style: {
                padding: "12px",
                border: "1px solid #d9e1ec",
                borderRadius: "10px",
                color: "#111827",
                textDecoration: "none",
                background: "#fff"
              },
              href: `/app#${item.toLowerCase()}`,
              children: item
            }, item))
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gap: "12px",
            padding: "16px",
            border: "1px solid var(--s-border, #d9e1ec)",
            borderRadius: "12px"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              margin: 0,
              fontWeight: 600
            },
            children: "Recent payouts"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "grid",
              gap: "8px"
            },
            children: [{
              id: "P-1042",
              amount: "$3,120.44",
              status: "Scheduled"
            }, {
              id: "P-1041",
              amount: "$2,980.11",
              status: "Sent"
            }, {
              id: "P-1040",
              amount: "$3,440.98",
              status: "Processing"
            }].map((payout) => /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "#f8fafc"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  display: "grid",
                  gap: "2px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontWeight: 600
                  },
                  children: payout.id
                }), /* @__PURE__ */ jsx("span", {
                  style: {
                    color: "#637381",
                    fontSize: "14px"
                  },
                  children: payout.status
                })]
              }), /* @__PURE__ */ jsx("span", {
                style: {
                  fontWeight: 700
                },
                children: payout.amount
              })]
            }, payout.id))
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gap: "12px",
            padding: "16px",
            border: "1px solid var(--s-border, #d9e1ec)",
            borderRadius: "12px"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              margin: 0,
              fontWeight: 600
            },
            children: "Database connection"
          }), /* @__PURE__ */ jsx("p", {
            style: {
              margin: 0,
              color: "#637381"
            },
            children: "Update the connection string or validate connectivity and get the IP to whitelist if needed."
          }), /* @__PURE__ */ jsxs(Form, {
            method: "post",
            style: {
              display: "grid",
              gap: "10px"
            },
            children: [/* @__PURE__ */ jsxs("label", {
              style: {
                display: "grid",
                gap: "4px"
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontWeight: 600
                },
                children: "Connection string"
              }), /* @__PURE__ */ jsx("input", {
                name: "connectionString",
                type: "text",
                placeholder: "postgres://user:pass@host:5432/db?sslmode=require",
                style: {
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid #d9e1ec"
                },
                defaultValue: loaderData.connectionString || "",
                required: true
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                gap: "8px",
                flexWrap: "wrap"
              },
              children: [/* @__PURE__ */ jsx("s-button", {
                type: "submit",
                name: "_action",
                value: "saveConnection",
                children: "Save connection"
              }), /* @__PURE__ */ jsx("s-button", {
                type: "submit",
                name: "_action",
                value: "testConnection",
                variant: "tertiary",
                children: "Run connection test"
              })]
            })]
          }), ((actionData == null ? void 0 : actionData.testResult) || loaderData.testResult) && /* @__PURE__ */ jsxs("div", {
            style: {
              padding: "10px 12px",
              borderRadius: "10px",
              background: ((actionData == null ? void 0 : actionData.testResult) || loaderData.testResult).ok ? "#ecfdf3" : "#fef2f2",
              border: "1px solid #d1fae5"
            },
            children: [/* @__PURE__ */ jsx("p", {
              style: {
                margin: 0,
                fontWeight: 600
              },
              children: ((actionData == null ? void 0 : actionData.testResult) || loaderData.testResult).ok ? "Connection successful" : "Connection failed"
            }), /* @__PURE__ */ jsx("p", {
              style: {
                margin: "4px 0 0 0",
                color: "#111827"
              },
              children: ((actionData == null ? void 0 : actionData.testResult) || loaderData.testResult).message
            }), ((actionData == null ? void 0 : actionData.testResult) || loaderData.testResult).ip ? /* @__PURE__ */ jsxs("p", {
              style: {
                margin: "4px 0 0 0",
                color: "#374151"
              },
              children: ["IP to whitelist: ", ((actionData == null ? void 0 : actionData.testResult) || loaderData.testResult).ip]
            }) : null]
          })]
        })]
      })
    })]
  });
});
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: app__index,
  headers,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-IfUhngJk.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/root-CXFR87Zr.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/route-Cz7oUhFC.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js", "/assets/AppProxyProvider-CMrN0Brk.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/route-CBmuP06g.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js"], "css": ["/assets/route-Xpdx9QZl.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/login": { "id": "routes/login", "parentId": "root", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/login-7NDrf0eO.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": true, "module": "/assets/app-BToaWVLu.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js", "/assets/AppProxyProvider-CMrN0Brk.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.additional": { "id": "routes/app.additional", "parentId": "routes/app", "path": "additional", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/app.additional-BsV4sQ0V.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/app._index-BfLsPYCB.js", "imports": ["/assets/chunk-JMJ3UQ3L-BzQfVR3p.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-757b60c7.js", "version": "757b60c7", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_subResourceIntegrity": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route4
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/app.additional": {
    id: "routes/app.additional",
    parentId: "routes/app",
    path: "additional",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route9
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
