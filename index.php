<?php
// Konvertti Payments minimal bootstrap
// Provides a simple health/status JSON response without exposing secrets.

declare(strict_types=1);

$requiredKeys = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SHOPIFY_API_SCOPES',
    'SHOPIFY_APP_URL',
    'SHOPIFY_APP_HOSTNAME',
    'SHOPIFY_WEBHOOK_SECRET',
    'SESSION_SECRET',
    'DATABASE_URL',
    'ENCRYPTION_KEY',
];

$missing = [];
foreach ($requiredKeys as $key) {
    $value = getenv($key);
    if ($value === false || $value === '') {
        $missing[] = $key;
    }
}

$scopes = getenv('SHOPIFY_API_SCOPES') ?: 'write_orders,read_products,write_script_tags';

$status = empty($missing) ? 'ok' : 'missing_env';
http_response_code($status === 'ok' ? 200 : 503);

$response = [
    'app' => 'Konvertti Payments',
    'status' => $status,
    'timestamp_utc' => gmdate(DATE_ATOM),
    'missing_environment_keys' => $missing,
    'scopes_expected' => array_map('trim', explode(',', $scopes)),
    'database_url_configured' => getenv('DATABASE_URL') !== false && getenv('DATABASE_URL') !== '',
    'documentation' => 'Refer to README.md for setup and health-check instructions.',
];

header('Content-Type: application/json');
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
