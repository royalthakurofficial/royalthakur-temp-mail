#!/usr/bin/php -q
<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';
use App\Controllers\InboundController;
InboundController::handleCli();
