#!/usr/bin/php -q
<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';
use App\Database;

$pdo = Database::pdo();
// Delete emails older than plan retention by joining user plan via address owner
// Retention logic: default 1 day, premium 30 days
$pdo->exec("DELETE e FROM emails e JOIN addresses a ON a.id = e.address_id LEFT JOIN users u ON u.id = a.user_id WHERE (u.plan IS NULL OR u.plan = 'free') AND e.created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)");
$pdo->exec("DELETE e FROM emails e JOIN addresses a ON a.id = e.address_id LEFT JOIN users u ON u.id = a.user_id WHERE u.plan = 'premium' AND e.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
