<?php

$autoloadPath = __DIR__ . '/vendor/autoload.php';

if (!is_readable($autoloadPath)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'dependencies_missing',
        'message' => 'Run "composer install" so the Shopify SDK and Dotenv are available.',
        'details' => [
            'autoload_path' => $autoloadPath,
            'hint' => 'From the repo root, execute: composer install',
        ],
    ], JSON_PRETTY_PRINT);
    exit;
}

require $autoloadPath;

use Shopify\Clients\Rest as ShopifyRestClient;

$dependencies = [
    'shopify/shopify-api_loaded' => class_exists(ShopifyRestClient::class),
    'vlucas/phpdotenv_loaded' => class_exists('Dotenv\\Dotenv'),
];

if (!$dependencies['vlucas/phpdotenv_loaded']) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'dependencies_missing',
        'message' => 'Dotenv was not found. Install Composer dependencies before running the app.',
        'dependencies' => $dependencies,
    ], JSON_PRETTY_PRINT);
    exit;
}

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
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
    'dependencies' => $dependencies,
    'message' => empty($missingEnv)
        ? 'All required environment variables are present and libraries are loaded.'
        : 'Populate the missing environment variables to complete setup.'
];

header('Content-Type: application/json');
echo json_encode($payload, JSON_PRETTY_PRINT);
