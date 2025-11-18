# Shopify Commission & Insurance App Overview

This repository documents how to build a Shopify app that:

1. Lets a merchant configure a commission percentage to be paid on net sales.
2. Shows reports about order counts, order value, and earned commission.
3. Auto-adds an “insurance product” to the cart while allowing buyers to remove it.

The document below outlines the architecture, required Shopify APIs, key flows, and suggested implementation details so you can build and deploy the app.

## Is it possible?
Yes. Shopify supports all of these requirements via its Admin and Storefront APIs, plus checkout/cart extensions in Shopify Functions and the new Cart Transform API. You can implement commission tracking in your app backend while injecting an insurance line item through a cart/checkout extension that buyers can remove.

## Architecture Overview (Native PHP)

- **App Server**: A native PHP backend that handles OAuth, stores merchant settings, calculates commissions, and exposes a simple UI for configuration and reports. Start with PHP’s built-in server for local dev and add a lightweight router (or plain `index.php` route handling) instead of using Node/Express.
- **Database**: Stores merchant installs, commission settings, insurance product ID, and calculated commission totals per order. (PostgreSQL or MySQL recommended via PDO.)
- **Shopify Admin API**: Used for reading orders, creating/maintaining the insurance product, and storing app-owned metafields for commission configuration. The `shopify/shopify-api` Composer package provides REST/GraphQL clients.
- **Shopify Webhooks**: Subscribe to `orders/create` and optionally `orders/paid` to compute commission amounts on each order and update analytics tables.
- **Cart/Checkout Extension**: Uses Shopify’s Cart Transform (or Checkout UI) extension to auto-insert the insurance product line item in the cart; the line can be removed by the buyer.
- **App UI**: Embedded app using App Bridge + Polaris to let merchants set commission %, enable/disable auto-insurance, and view reports.

## Key Implementation Steps

1. **App Setup**
   - Install Composer dependencies (`composer install`) to get the Shopify PHP SDK and Dotenv.
   - Use PHP’s built-in server for local development (`composer run start`).
   - Configure OAuth endpoints in PHP (`/auth/install`, `/auth/callback`) and store shop tokens after installation using PDO.

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
   - Implement a backend endpoint in PHP (e.g., `/api/reports?from=...&to=...`) that aggregates data from the commission table using PDO queries.

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

## Minimal Endpoint Sketch (Native PHP)

```php
<?php

require __DIR__ . '/vendor/autoload.php';

use Shopify\Clients\Rest as ShopifyRestClient;

// Verify HMAC header before reading the webhook body
function verifyWebhook(): bool {
    $hmacHeader = $_SERVER['HTTP_X_SHOPIFY_HMAC_SHA256'] ?? '';
    $calculated = base64_encode(hash_hmac('sha256', file_get_contents('php://input'), $_ENV['SHOPIFY_WEBHOOK_SECRET'], true));
    return hash_equals($calculated, $hmacHeader);
}

if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/webhooks/orders-create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyWebhook()) {
        http_response_code(401);
        exit('Invalid HMAC');
    }

    $order = json_decode(file_get_contents('php://input'), true);
    // Fetch merchant settings from your database here
    $commissionPercent = 10; // Example placeholder

    $netSales = (float) $order['subtotal_price'] ?? 0;
    $commission = $netSales * ($commissionPercent / 100);

    // Persist commission to your DB using PDO
    // $pdo->prepare('INSERT INTO commissions ...')->execute([...]);

    http_response_code(200);
    exit();
}

// Basic router fall-through
http_response_code(404);
echo 'Not Found';
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
