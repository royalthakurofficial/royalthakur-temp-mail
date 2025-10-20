<?php
namespace App\Services;

use App\Config;
use App\Database;

class Plan
{
    public static function getLimitsForPlanName(string $planName): array
    {
        $planName = strtolower($planName);
        if ($planName === (Config::PREMIUM_PLAN['name'] ?? 'premium')) {
            return Config::PREMIUM_PLAN;
        }
        return Config::FREE_PLAN;
    }

    public static function getLimitsForUserId(?int $userId): array
    {
        if (!$userId) { return Config::FREE_PLAN; }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT plan FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return self::getLimitsForPlanName((string)($row['plan'] ?? Config::FREE_PLAN['name']));
    }
}
