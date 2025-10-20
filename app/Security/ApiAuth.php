<?php
namespace App\Security;

use App\Database;
use App\Services\Plan;
use App\Services\Usage;

class ApiAuth
{
    public static function requireUserId(string $endpointKey = 'api'): int
    {
        $user = self::userFromApiKey();
        if (!$user) {
            $userId = (int)($_SESSION['user_id'] ?? 0);
            if ($userId <= 0) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized']);
                exit;
            }
            $user = self::getUserById($userId);
        }
        if ((int)$user['is_active'] !== 1) {
            http_response_code(403);
            echo json_encode(['error' => 'Account deactivated']);
            exit;
        }
        // Enforce daily API limit per plan
        $limits = Plan::getLimitsForPlanName((string)$user['plan']);
        $count = Usage::incrementApiCount((int)$user['id'], $endpointKey);
        if ($count > (int)$limits['daily_api']) {
            http_response_code(429);
            echo json_encode(['error' => 'API daily limit reached']);
            exit;
        }
        return (int)$user['id'];
    }

    private static function userFromApiKey(): ?array
    {
        $apiKey = self::header('X-API-Key') ?: self::header('x-api-key');
        if (!$apiKey) { return null; }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id, plan, is_active FROM users WHERE api_key = ? LIMIT 1');
        $stmt->execute([$apiKey]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    private static function getUserById(int $userId): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id, plan, is_active FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        return (array)$stmt->fetch();
    }

    private static function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return isset($_SERVER[$key]) ? trim((string)$_SERVER[$key]) : null;
    }
}
