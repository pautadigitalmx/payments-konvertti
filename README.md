# Shopify Commission & Insurance App Overview

This repository documents how to build a Shopify app that:

1. Lets a merchant configure a commission percentage to be paid on net sales.
2. Shows reports about order counts, order value, and earned commission.
3. Auto-adds an “insurance product” to the cart while allowing buyers to remove it.

The document below outlines the architecture, required Shopify APIs, key flows, and suggested implementation details so you can build and deploy the app.

## Is it possible?
Yes. Shopify supports all of these requirements via its Admin and Storefront APIs, plus checkout/cart extensions in Shopify Functions and the new Cart Transform API. You can implement commission tracking in your app backend while injecting an insurance line item through a cart/checkout extension that buyers can remove.

## Architecture Overview

- **App Server**: A backend (Node.js/TypeScript or Ruby) that handles OAuth, stores merchant settings, calculates commissions, and exposes a simple UI for configuration and reports.
- **Database**: Stores merchant installs, commission settings, insurance product ID, and calculated commission totals per order. (PostgreSQL or MySQL recommended.)
- **Shopify Admin API**: Used for reading orders, creating/maintaining the insurance product, and storing app-owned metafields for commission configuration.
- **Shopify Webhooks**: Subscribe to `orders/create` and optionally `orders/paid` to compute commission amounts on each order and update analytics tables.
- **Cart/Checkout Extension**: Uses Shopify’s Cart Transform (or Checkout UI) extension to auto-insert the insurance product line item in the cart; the line can be removed by the buyer.
- **App UI**: Embedded app using App Bridge + Polaris to let merchants set commission %, enable/disable auto-insurance, and view reports.

## Key Implementation Steps

1. **App Setup**
   - Use Shopify CLI (`shopify app init`) to scaffold an embedded app with an Admin UI extension (Polaris + App Bridge) and a Cart Transform/Checkout UI extension.
   - Configure OAuth and store shop tokens after installation.

2. **Commission Settings**
   - Create a settings page where the merchant sets the commission percentage (e.g., stored in your DB and optionally synced to a shop metafield namespace like `commission.settings`).
   - Validate inputs (0–100%) and allow toggling whether shipping/taxes are included in net sales calculations.

3. **Order Webhook Processing**
   - Subscribe to `orders/create` (or `orders/paid`) webhooks.
   - On each order:
     - Compute net sales (e.g., `subtotal_price` minus discounts; optionally exclude shipping/tax).
     - Calculate commission: `net_sales * commission_percentage`.
     - Record an entry in your DB (`order_id`, `order_name`, `net_sales`, `commission_amount`, `currency`, `created_at`).
   - Provide idempotency by storing processed order IDs to avoid double-counting.

4. **Reporting**
   - Build an embedded UI page with Polaris DataTable/Charts that shows:
     - Total orders processed
     - Total gross/net sales
     - Total commission owed/earned
     - Optional time filters (today/7 days/30 days/custom)
   - Implement a backend endpoint (e.g., `/api/reports?from=...&to=...`) that aggregates data from the commission table.

5. **Insurance Product Handling**
   - On install, create (or let the merchant select) an insurance product/variant (e.g., SKU `INS-001`, price configurable). Store its variant ID in your DB.
   - Use the **Cart Transform API** in a cart extension to automatically add the insurance line item whenever the cart does not already contain it.
   - Ensure the extension marks the line as removable so customers can delete it if they wish. Observe Shopify rules about not blocking checkout if removed.
   - Alternatively, for vintage themes, inject a theme app block/script that auto-adds the product to cart; ensure it respects buyer removal.

6. **Merchant Controls**
   - Settings page toggles:
     - Enable/disable auto insurance add-on.
     - Set insurance product/variant and price.
     - Set commission percentage and inclusion rules (shipping/tax inclusion, discount handling).

7. **Security & Compliance**
   - Verify webhooks with HMAC.
   - Use offline tokens for Admin API requests and per-user tokens for embedded UI, as needed.
   - Provide clear disclosure about the automatic insurance line item and give customers the option to remove it.

8. **Deployment**
   - Host the app server (e.g., on Railway/Render/Heroku) with HTTPS.
   - Use PostgreSQL/MySQL for persistent storage.
   - Configure Shopify App URLs and webhook subscriptions in app settings or via the Shopify CLI configuration.

## Sample Data Model

- `shops`: `{shop_domain, access_token, installed_at, deleted_at}`
- `settings`: `{shop_domain, commission_percentage, include_shipping, include_tax, auto_insurance_enabled, insurance_variant_id}`
- `commissions`: `{id, shop_domain, order_id, order_name, net_sales, commission_amount, currency, processed_at}`

## Minimal Endpoint Sketch (Express/TypeScript)

```ts
// Commission calculation in an orders webhook handler
app.post('/webhooks/orders-create', verifyShopifyHmac, async (req, res) => {
  const order = req.body;
  const settings = await db.settings.findOne({ shop_domain: order.shop_domain });
  if (!settings) return res.sendStatus(200);

  const netSales = calculateNetSales(order, settings);
  const commission = netSales * (settings.commission_percentage / 100);

  await db.commissions.upsert({
    shop_domain: order.shop_domain,
    order_id: order.id,
    order_name: order.name,
    net_sales: netSales,
    commission_amount: commission,
    currency: order.currency,
    processed_at: new Date(order.created_at)
  });

  return res.sendStatus(200);
});
```

```ts
// Example cart transform extension pseudo-code
export function run(input) {
  const insuranceVariantId = getSetting('insurance_variant_id');
  if (!insuranceVariantId) return { operations: [] };

  const alreadyHasInsurance = input.cart.lines.some(
    (line) => line.merchandise?.id === insuranceVariantId
  );

  if (alreadyHasInsurance) return { operations: [] };

  return {
    operations: [
      {
        type: 'add_cart_line',
        merchandiseId: insuranceVariantId,
        quantity: 1,
      },
    ],
  };
}
```

## Limitations & Notes
- Automatic add-to-cart must respect Shopify policies: customers must be able to remove the insurance product.
- Commission payout mechanics (actual transfer of funds) are outside Shopify’s APIs; typically you reconcile outside Shopify and bill via invoicing or a secondary payment flow.
- For stores using Shopify Plus checkout extensibility, prefer Cart Transform/Checkout UI extensions. For others, theme app embeds may be necessary.

## Next Steps
- Scaffold the app with Shopify CLI.
- Build the settings UI with Polaris.
- Implement the webhook handlers and reporting endpoints.
- Publish and test the cart/checkout extension for auto-inserting the insurance product.
- Add tests for webhook processing and report aggregation.

## Local PHP bootstrap

The repository now includes a lightweight PHP entry point that loads the required Shopify SDK and environment configuration utili
ties. Install the Composer dependencies and run the built-in PHP server to verify your environment variables are wired correctly:

```bash
composer install
composer run start
```

The root `index.php` will respond with a JSON payload indicating whether the required `.env` variables are present and whether th
e Shopify and Dotenv libraries are loaded.

## Environment configuration

Create a `.env` file (copy from `.env.example`) and fill in your credentials before running the app server or Shopify CLI:

- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`: App credentials from your Shopify Partners dashboard.
- `SHOPIFY_API_SCOPES`: Comma-separated scopes such as `read_products,write_orders,write_script_tags` to cover product creation and webhook setup.
- `SHOPIFY_APP_URL` / `SHOPIFY_APP_HOSTNAME`: Public HTTPS URL for your app (e.g., your tunnel/hosting domain) and its hostname.
- `SHOPIFY_WEBHOOK_SECRET`: Shared secret used to verify webhook HMAC signatures.
- `SESSION_SECRET`: Random string for signing session cookies.
- `ENCRYPTION_KEY`: 32-character key for encrypting stored tokens or secrets at rest.
- `DATABASE_URL`: Connection string for your database (PostgreSQL/MySQL per your chosen stack).
- `INSURANCE_PRODUCT_VARIANT_ID`: The product variant ID to auto-add via the cart/checkout extension.
- `INSURANCE_AUTO_ADD_ENABLED`: Toggle auto-adding the insurance line item.
- `LOG_LEVEL`: Optional logging verbosity (e.g., `info`, `debug`).

Keep the real `.env` file out of version control; only commit `.env.example` with placeholder values.
