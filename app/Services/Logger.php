<?php
namespace App\Services;

use App\Database;

class Logger
{
    public static function log(int $userId, string $action, array $meta = []): void
    {
        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO user_logs (user_id, action, meta, created_at) VALUES (?, ?, ?, NOW())')
            ->execute([$userId, $action, json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }
}
