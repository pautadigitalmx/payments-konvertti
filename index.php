<?php

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Shopify\Clients\Rest as ShopifyRestClient;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$requiredEnv = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SHOPIFY_API_SCOPES',
    'SHOPIFY_APP_HOSTNAME',
];

$missingEnv = array_values(array_filter($requiredEnv, static function (string $key): bool {
    return empty($_ENV[$key]);
}));

$payload = [
    'status' => empty($missingEnv) ? 'ready' : 'needs_configuration',
    'missing_env' => $missingEnv,
    'dependencies' => [
        'shopify/shopify-api_loaded' => class_exists(ShopifyRestClient::class),
        'vlucas/phpdotenv_loaded' => class_exists(Dotenv::class),
    ],
    'message' => empty($missingEnv)
        ? 'All required environment variables are present and libraries are loaded.'
        : 'Populate the missing environment variables to complete setup.'
];

header('Content-Type: application/json');
echo json_encode($payload, JSON_PRETTY_PRINT);
