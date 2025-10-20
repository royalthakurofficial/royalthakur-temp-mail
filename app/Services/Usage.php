<?php
namespace App\Services;

use App\Database;

class Usage
{
    public static function incrementApiCount(int $userId, string $endpoint): int
    {
        $pdo = Database::pdo();
        $day = date('Y-m-d');
        $pdo->prepare('INSERT INTO api_usage (user_id, endpoint, day, count) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE count = count + 1')
            ->execute([$userId, $endpoint, $day]);
        $stmt = $pdo->prepare('SELECT count FROM api_usage WHERE user_id = ? AND endpoint = ? AND day = ?');
        $stmt->execute([$userId, $endpoint, $day]);
        $row = $stmt->fetch();
        return (int)($row['count'] ?? 0);
    }
}
