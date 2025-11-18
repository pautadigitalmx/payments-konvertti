<?php
// Konvertti Payments minimal bootstrap
// Provides a simple health/status JSON response without exposing secrets.

declare(strict_types=1);

$requiredKeys = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SHOPIFY_API_SCOPES',
    'SHOPIFY_APP_URL',
    'SHOPIFY_WEBHOOK_SECRET',
    'SESSION_SECRET',
];

$missing = [];
foreach ($requiredKeys as $key) {
    $value = getenv($key);
    if ($value === false || $value === '') {
        $missing[] = $key;
    }
}

$response = [
    'app' => 'Konvertti Payments',
    'status' => empty($missing) ? 'ok' : 'missing_env',
    'missing_environment_keys' => $missing,
    'scopes_expected' => 'write_orders,read_products,write_script_tags',
    'documentation' => 'Refer to README.md for setup instructions.',
];

header('Content-Type: application/json');
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
