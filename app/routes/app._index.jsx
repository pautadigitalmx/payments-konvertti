import { useEffect, useState } from "react";
import { Form, useActionData, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { requireAuth, updateAuthSession } from "../utils/auth.server";

export const loader = async ({ request }) => {
  const session = await requireAuth(request);
  await authenticate.admin(request);

  return { commission: session.commission };
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("_action");

  if (intent === "generateProduct") {
    const { admin } = await authenticate.admin(request);
    const color = ["Red", "Orange", "Yellow", "Green"][
      Math.floor(Math.random() * 4)
    ];
    const response = await admin.graphql(
      `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          product: {
            title: `${color} Snowboard`,
          },
        },
      },
    );
    const responseJson = await response.json();
    const product = responseJson.data.productCreate.product;
    const variantId = product.variants.edges[0].node.id;
    const variantResponse = await admin.graphql(
      `#graphql
    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
      {
        variables: {
          productId: product.id,
          variants: [{ id: variantId, price: "100.00" }],
        },
      },
    );
    const variantResponseJson = await variantResponse.json();

    return {
      product: responseJson.data.productCreate.product,
      variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
    };
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

  const cookie = await updateAuthSession(request, { commission });

  return Response.json(
    {
      commission,
    },
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
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const [editingCommission, setEditingCommission] = useState(
    !loaderData.commission,
  );
  const commission = actionData?.commission ?? loaderData.commission;

  useEffect(() => {
    if (fetcher.data?.product?.id) {
      shopify.toast.show("Product created");
    }
  }, [fetcher.data?.product?.id, shopify]);
  useEffect(() => {
    if (commission) {
      setEditingCommission(false);
    }
  }, [commission]);

  const generateProduct = () =>
    fetcher.submit(
      { _action: "generateProduct" },
      { method: "POST" },
    );

  return (
    <s-page heading="Shopify app template">
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

          {editingCommission && (
            <Form method="post" style={{ display: "grid", gap: "12px" }}>
              <input type="hidden" name="_action" value="saveCommission" />
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontWeight: 600 }}>Set commission (%)</span>
                <input
                  name="commission"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={commission ?? ""}
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
          )}
        </div>
      </s-section>

      <s-section heading="Dashboard" spacing="loose">
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
              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#f4f6f8",
                  display: "grid",
                  gap: "4px",
                }}
              >
                <span style={{ color: "#637381", fontSize: "14px" }}>
                  Pending payouts
                </span>
                <span style={{ fontWeight: 700 }}>$12,400</span>
              </div>
              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#f4f6f8",
                  display: "grid",
                  gap: "4px",
                }}
              >
                <span style={{ color: "#637381", fontSize: "14px" }}>
                  Commission
                </span>
                <span style={{ fontWeight: 700 }}>
                  {commission ? `${commission}%` : "Not set"}
                </span>
              </div>
              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#f4f6f8",
                  display: "grid",
                  gap: "4px",
                }}
              >
                <span style={{ color: "#637381", fontSize: "14px" }}>
                  Settled orders
                </span>
                <span style={{ fontWeight: 700 }}>182</span>
              </div>
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
        </div>
      </s-section>

      <s-section heading="Congrats on creating a new Shopify app 🎉">
        <s-paragraph>
          This embedded app template uses{" "}
          <s-link
            href="https://shopify.dev/docs/apps/tools/app-bridge"
            target="_blank"
          >
            App Bridge
          </s-link>{" "}
          interface examples like an{" "}
          <s-link href="/app/additional">additional page in the app nav</s-link>
          , as well as an{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            Admin GraphQL
          </s-link>{" "}
          mutation demo, to provide a starting point for app development.
        </s-paragraph>
      </s-section>
      <s-section heading="Get started with products">
        <s-paragraph>
          Generate a product with GraphQL and get the JSON output for that
          product. Learn more about the{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
            target="_blank"
          >
            productCreate
          </s-link>{" "}
          mutation in our API references.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button
            onClick={generateProduct}
            {...(isLoading ? { loading: true } : {})}
          >
            Generate a product
          </s-button>
          {fetcher.data?.product && (
            <s-button
              onClick={() => {
                shopify.intents.invoke?.("edit:shopify/Product", {
                  value: fetcher.data?.product?.id,
                });
              }}
              target="_blank"
              variant="tertiary"
            >
              Edit product
            </s-button>
          )}
        </s-stack>
        {fetcher.data?.product && (
          <s-section heading="productCreate mutation">
            <s-stack direction="block" gap="base">
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <pre style={{ margin: 0 }}>
                  <code>{JSON.stringify(fetcher.data.product, null, 2)}</code>
                </pre>
              </s-box>

              <s-heading>productVariantsBulkUpdate mutation</s-heading>
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <pre style={{ margin: 0 }}>
                  <code>{JSON.stringify(fetcher.data.variant, null, 2)}</code>
                </pre>
              </s-box>
            </s-stack>
          </s-section>
        )}
      </s-section>

      <s-section slot="aside" heading="App template specs">
        <s-paragraph>
          <s-text>Framework: </s-text>
          <s-link href="https://reactrouter.com/" target="_blank">
            React Router
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Interface: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/app-home/using-polaris-components"
            target="_blank"
          >
            Polaris web components
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>API: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            GraphQL
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank">
            Prisma
          </s-link>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Next steps">
        <s-unordered-list>
          <s-list-item>
            Build an{" "}
            <s-link
              href="https://shopify.dev/docs/apps/getting-started/build-app-example"
              target="_blank"
            >
              example app
            </s-link>
          </s-list-item>
          <s-list-item>
            Explore Shopify&apos;s API with{" "}
            <s-link
              href="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
              target="_blank"
            >
              GraphiQL
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
