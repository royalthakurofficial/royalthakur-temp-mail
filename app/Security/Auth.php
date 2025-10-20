<?php
namespace App\Security;

class Auth
{
    public static function requireUserId(): int
    {
        $userId = (int)($_SESSION['user_id'] ?? 0);
        if ($userId <= 0) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        return $userId;
    }
}
