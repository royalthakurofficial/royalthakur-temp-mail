<?php
namespace App\Services;

use App\Database;

class RateLimiter
{
    public static function checkAndIncrement(int $userId, string $key, int $limit, int $windowSeconds): bool
    {
        $pdo = Database::pdo();
        $windowStart = time() - $windowSeconds;
        $pdo->prepare('DELETE FROM rate_limits WHERE user_id = ? AND `key` = ? AND ts < FROM_UNIXTIME(?)')
            ->execute([$userId, $key, $windowStart]);
        $stmt = $pdo->prepare('SELECT COUNT(*) as c FROM rate_limits WHERE user_id = ? AND `key` = ?');
        $stmt->execute([$userId, $key]);
        $count = (int)$stmt->fetch()['c'];
        if ($count >= $limit) { return false; }
        $pdo->prepare('INSERT INTO rate_limits (user_id, `key`, ts) VALUES (?, ?, NOW())')->execute([$userId, $key]);
        return true;
    }
}
