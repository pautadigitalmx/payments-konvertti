<?php

use Shopify\Clients\Rest as ShopifyRestClient;

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$autoloadPath = __DIR__ . '/vendor/autoload.php';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

$payload = [
    'status' => 'dependencies_missing',
    'missing_env' => [],
    'dependencies' => [
        'shopify/shopify-api_loaded' => false,
        'vlucas/phpdotenv_loaded' => false,
    ],
    'message' => 'Run "composer install" so the Shopify SDK and Dotenv are available.',
];

if (is_readable($autoloadPath)) {
    require $autoloadPath;

    $payload['dependencies'] = [
        'shopify/shopify-api_loaded' => class_exists(ShopifyRestClient::class),
        'vlucas/phpdotenv_loaded' => class_exists('Dotenv\\Dotenv'),
    ];

    if ($payload['dependencies']['vlucas/phpdotenv_loaded']) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
        $dotenv->safeLoad();

        $requiredEnv = [
            'SHOPIFY_API_KEY',
            'SHOPIFY_API_SECRET',
            'SHOPIFY_API_SCOPES',
            'SHOPIFY_APP_URL',
            'SHOPIFY_APP_HOSTNAME',
            'SHOPIFY_WEBHOOK_SECRET',
        ];

        $missingEnv = array_values(array_filter($requiredEnv, static function (string $key): bool {
            return empty($_ENV[$key]);
        }));

        $payload['status'] = empty($missingEnv) ? 'ready' : 'needs_configuration';
        $payload['missing_env'] = $missingEnv;
        $payload['message'] = empty($missingEnv)
            ? 'All required environment variables are present and libraries are loaded.'
            : 'Populate the missing environment variables to complete setup.';
    } else {
        $payload['message'] = 'Dotenv was not found. Install Composer dependencies before running the app.';
    }
}

$wantsJson = $path === '/health'
    || ($path !== '/' && $path !== '' && $path !== '/index.php')
    || (isset($_GET['format']) && $_GET['format'] === 'json')
    || (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

$loginError = null;
$storeNotice = null;
$isAuthenticated = !empty($_SESSION['authenticated']);
$storeDomain = $_SESSION['store_domain'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$wantsJson) {
    $action = $_POST['action'] ?? '';

    if ($action === 'login') {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = trim((string) ($_POST['password'] ?? ''));

        if ($username === 'admin' && $password === 'admin') {
            $_SESSION['authenticated'] = true;
            $isAuthenticated = true;
            $storeNotice = 'Logged in successfully. Provide your Shopify store domain to continue installation.';
        } else {
            $loginError = 'Invalid credentials. Use admin / admin to continue.';
            $_SESSION['authenticated'] = false;
        }
    }

    if ($action === 'store' && $isAuthenticated) {
        $inputDomain = trim((string) ($_POST['store_domain'] ?? ''));
        $cleanDomain = strtolower(preg_replace('/[^a-z0-9.-]/i', '', $inputDomain));

        if ($cleanDomain === '') {
            $storeNotice = 'Please enter the store domain (e.g., mystore.myshopify.com).';
        } else {
            $_SESSION['store_domain'] = $cleanDomain;
            $storeDomain = $cleanDomain;
            $storeNotice = "Store saved: {$cleanDomain}. Continue the OAuth install flow for this shop.";
        }
    }
}

if ($wantsJson) {
    header('Content-Type: application/json');
    http_response_code($payload['status'] === 'dependencies_missing' ? 500 : 200);
    echo json_encode($payload, JSON_PRETTY_PRINT);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Shopify Commission &amp; Insurance App (PHP)</title>
    <style>
        :root {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #0f172a;
            background: #f8fafc;
        }
        body { margin: 0; padding: 24px; }
        .card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
            max-width: 900px;
            margin: 0 auto;
        }
        h1 { margin-top: 0; }
        form { display: grid; gap: 12px; margin: 16px 0; }
        label { font-weight: 600; }
        input[type="text"], input[type="password"] {
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            font-size: 14px;
        }
        button {
            background: #0f172a;
            color: white;
            padding: 10px 14px;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
        }
        button:hover { background: #111827; }
        .alert { padding: 10px 12px; border-radius: 10px; margin: 10px 0; }
        .alert.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecdd3; }
        .alert.info { background: #ecfdf3; color: #166534; border: 1px solid #bbf7d0; }
        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            font-weight: 600;
        }
        .ready { background: #ecfdf3; color: #166534; }
        .needs { background: #fff7ed; color: #9a3412; }
        .deps { background: #fef2f2; color: #991b1b; }
        ul { padding-left: 18px; }
        code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
        pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 10px; overflow-x: auto; }
        .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        .pill { padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Shopify Commission &amp; Insurance App</h1>
        <div class="status <?php echo $payload['status'] === 'ready' ? 'ready' : ($payload['status'] === 'dependencies_missing' ? 'deps' : 'needs'); ?>">
            <span>Status:</span>
            <strong>
                <?php
                echo match ($payload['status']) {
                    'ready' => 'Ready',
                    'needs_configuration' => 'Missing environment configuration',
                    default => 'Dependencies missing',
                };
                ?>
            </strong>
        </div>

        <p><?php echo htmlspecialchars($payload['message'], ENT_QUOTES, 'UTF-8'); ?></p>

        <?php if (!$isAuthenticated): ?>
            <h2>Login</h2>
            <p>Use the default credentials to unlock the installation form.</p>
            <?php if ($loginError): ?>
                <div class="alert error"><?php echo htmlspecialchars($loginError, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>
            <form method="POST" action="/">
                <input type="hidden" name="action" value="login" />
                <label for="username">Username</label>
                <input id="username" name="username" type="text" autocomplete="username" value="admin" required />
                <label for="password">Password</label>
                <input id="password" name="password" type="password" autocomplete="current-password" value="admin" required />
                <button type="submit">Login</button>
            </form>
        <?php else: ?>
            <h2>Store selection</h2>
            <p>Enter the Shopify store domain where the app will be installed (e.g., <code>mystore.myshopify.com</code>).</p>
            <?php if ($storeNotice): ?>
                <div class="alert info"><?php echo htmlspecialchars($storeNotice, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>
            <form method="POST" action="/">
                <input type="hidden" name="action" value="store" />
                <label for="store_domain">Store domain</label>
                <input id="store_domain" name="store_domain" type="text" placeholder="your-store.myshopify.com" value="<?php echo htmlspecialchars($storeDomain, ENT_QUOTES, 'UTF-8'); ?>" required />
                <button type="submit">Save store</button>
            </form>
        <?php endif; ?>

        <h2>Quick setup</h2>
        <ol>
            <li>Install dependencies: <code>composer install</code></li>
            <li>Copy <code>.env.example</code> to <code>.env</code> and fill in your Shopify credentials.</li>
            <li>Start local server: <code>composer run start</code> (or serve this file via PHP/Apache).</li>
            <li>Visit <code>/health</code> or add <code>?format=json</code> for the JSON status payload.</li>
        </ol>

        <h2>Dependency status</h2>
        <div class="grid">
            <?php foreach ($payload['dependencies'] as $name => $loaded): ?>
                <div class="pill">
                    <?php echo $loaded ? '✅' : '❌'; ?>
                    <?php echo htmlspecialchars($name, ENT_QUOTES, 'UTF-8'); ?>
                </div>
            <?php endforeach; ?>
        </div>

        <h2>Environment requirements</h2>
        <?php if (empty($payload['missing_env'])): ?>
            <p>All required environment variables are set.</p>
        <?php else: ?>
            <p>Missing variables:</p>
            <ul>
                <?php foreach ($payload['missing_env'] as $key): ?>
                    <li><code><?php echo htmlspecialchars($key, ENT_QUOTES, 'UTF-8'); ?></code></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>

        <h2>About</h2>
        <p>This PHP app handles commission tracking and insurance add-ons for Shopify stores. Use it as the entry point for OAuth, webhook processing, and merchant configuration.</p>

        <h3>Webhook verification snippet</h3>
<pre><code>// Verify webhook HMAC in native PHP
$hmacHeader = $_SERVER['HTTP_X_SHOPIFY_HMAC_SHA256'] ?? '';
$calculated = base64_encode(hash_hmac(
    'sha256',
    file_get_contents('php://input'),
    $_ENV['SHOPIFY_WEBHOOK_SECRET'] ?? '',
    true
));
if (!hash_equals($calculated, $hmacHeader)) {
    http_response_code(401);
    exit('Invalid HMAC');
}
</code></pre>
    </div>
</body>
</html>
