<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

use App\Security\SecureHeaders;
use App\Router;

SecureHeaders::apply();

$router = new Router();
$router->dispatch($_SERVER['REQUEST_METHOD'], parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
