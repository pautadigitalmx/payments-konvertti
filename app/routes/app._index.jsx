import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getAuthSession, updateAuthSession } from "../utils/auth.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const session = await getAuthSession(request);
  await authenticate.admin(request);

  const saved = await prisma.commissionSetting.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const fallbackCommission = 8;
  const commissionValue = saved?.value ?? session.commission ?? fallbackCommission;

  return {
    commission: commissionValue,
    defaultCommission: fallbackCommission,
    testResult: null,
  };
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("_action");

  if (intent === "testConnection") {
    try {
      const [row] =
        (await prisma.$queryRaw`SELECT inet_server_addr() AS ip`) ?? [];

      return Response.json({
        testResult: {
          ok: true,
          ip: row?.ip ?? "unknown",
          message: row?.ip
            ? `Connected successfully. Database server IP: ${row.ip}`
            : "Connected successfully. Unable to determine server IP.",
        },
      });
    } catch (error) {
      let outboundIp = null;
      try {
        const resp = await fetch("https://api.ipify.org?format=json");
        const data = await resp.json();
        outboundIp = data?.ip;
      } catch {
        outboundIp = null;
      }

      return Response.json(
        {
          testResult: {
            ok: false,
            ip: outboundIp,
            message:
              "Connection failed. Please whitelist this app server IP and confirm host, port, database, user, password, and SSL mode.",
          },
        },
        { status: 500 },
      );
    }
  }

  const commissionValue = formData.get("commission");
  const commission = Number(commissionValue);

  if (!commissionValue || Number.isNaN(commission) || commission <= 0) {
    return Response.json(
      {
        errors: {
          commission: "Enter a commission greater than 0",
        },
      },
      { status: 400 },
    );
  }

  await prisma.commissionSetting.upsert({
    where: { id: 1 },
    update: { value: commission },
    create: { id: 1, value: commission },
  });

  const cookie = await updateAuthSession(request, { commission });

  return Response.json(
    { commission },
    {
      headers: {
        "Set-Cookie": cookie,
      },
    },
  );
};

export default function Index() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [editingCommission, setEditingCommission] = useState(false);
  const commission = actionData?.commission ?? loaderData.commission;

  return (
    <s-page heading="Payments overview">
      <s-section heading="Commission settings" spacing="loose">
        <div style={{ display: "grid", gap: "12px" }}>
          {commission ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid var(--s-border, #d9e1ec)",
                borderRadius: "12px",
                padding: "12px 16px",
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Commission</p>
                <p style={{ margin: 0, color: "#637381" }}>{commission}%</p>
              </div>
              <s-button
                variant="tertiary"
                onClick={() => setEditingCommission(true)}
              >
                Change
              </s-button>
            </div>
          ) : null}

          {editingCommission || !commission ? (
            <Form method="post" style={{ display: "grid", gap: "12px" }}>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontWeight: 600 }}>Set commission (%)</span>
                <input
                  name="commission"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={commission ?? loaderData.defaultCommission}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #d9e1ec",
                  }}
                  required
                />
                {actionData?.errors?.commission ? (
                  <span style={{ color: "#b42318", fontSize: "14px" }}>
                    {actionData.errors.commission}
                  </span>
                ) : (
                  <span style={{ color: "#637381", fontSize: "14px" }}>
                    Set the percentage deducted per transaction.
                  </span>
                )}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <s-button type="submit">Save commission</s-button>
                {commission ? (
                  <s-button
                    type="button"
                    variant="tertiary"
                    onClick={() => setEditingCommission(false)}
                  >
                    Cancel
                  </s-button>
                ) : null}
              </div>
            </Form>
          ) : null}
        </div>
      </s-section>

      <s-section heading="Performance" spacing="loose">
        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "8px",
              padding: "16px",
              border: "1px solid var(--s-border, #d9e1ec)",
              borderRadius: "12px",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>Overview</p>
            <p style={{ margin: 0, color: "#637381" }}>
              Track settlement status, payouts, and commissions at a glance.
            </p>
            <div
              style={{
                display: "grid",
                gap: "8px",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              {[
                { label: "Gross volume (7d)", value: "$48,230" },
                { label: "Pending payouts", value: "$12,400" },
                {
                  label: "Commission",
                  value: commission ? `${commission}%` : "Not set",
                },
                { label: "Disputes open", value: "3" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: "#f4f6f8",
                    display: "grid",
                    gap: "4px",
                  }}
                >
                  <span style={{ color: "#637381", fontSize: "14px" }}>
                    {item.label}
                  </span>
                  <span style={{ fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "8px",
              padding: "16px",
              border: "1px solid var(--s-border, #d9e1ec)",
              borderRadius: "12px",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>Navigation</p>
            <nav
              style={{
                display: "grid",
                gap: "8px",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              }}
            >
              {[
                "Payouts",
                "Orders",
                "Disputes",
                "Reports",
                "Integrations",
              ].map((item) => (
                <a
                  key={item}
                  style={{
                    padding: "12px",
                    border: "1px solid #d9e1ec",
                    borderRadius: "10px",
                    color: "#111827",
                    textDecoration: "none",
                    background: "#fff",
                  }}
                  href={`/app#${item.toLowerCase()}`}
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              padding: "16px",
              border: "1px solid var(--s-border, #d9e1ec)",
              borderRadius: "12px",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>Recent payouts</p>
            <div style={{ display: "grid", gap: "8px" }}>
              {[
                { id: "P-1042", amount: "$3,120.44", status: "Scheduled" },
                { id: "P-1041", amount: "$2,980.11", status: "Sent" },
                { id: "P-1040", amount: "$3,440.98", status: "Processing" },
              ].map((payout) => (
                <div
                  key={payout.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "grid", gap: "2px" }}>
                    <span style={{ fontWeight: 600 }}>{payout.id}</span>
                    <span style={{ color: "#637381", fontSize: "14px" }}>
                      {payout.status}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{payout.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              padding: "16px",
              border: "1px solid var(--s-border, #d9e1ec)",
              borderRadius: "12px",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>Test database connection</p>
            <p style={{ margin: 0, color: "#637381" }}>
              Validate connectivity and get the IP to whitelist if needed.
            </p>
            <Form method="post" style={{ display: "grid", gap: "8px" }}>
              <input type="hidden" name="_action" value="testConnection" />
              <s-button type="submit" variant="tertiary">
                Run connection test
              </s-button>
            </Form>
            {(actionData?.testResult || loaderData.testResult) && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: (actionData?.testResult || loaderData.testResult).ok
                    ? "#ecfdf3"
                    : "#fef2f2",
                  border: "1px solid #d1fae5",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {(actionData?.testResult || loaderData.testResult).ok
                    ? "Connection successful"
                    : "Connection failed"}
                </p>
                <p style={{ margin: "4px 0 0 0", color: "#111827" }}>
                  {(actionData?.testResult || loaderData.testResult).message}
                </p>
                {(actionData?.testResult || loaderData.testResult).ip ? (
                  <p style={{ margin: "4px 0 0 0", color: "#374151" }}>
                    IP to whitelist: {(actionData?.testResult || loaderData.testResult).ip}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
