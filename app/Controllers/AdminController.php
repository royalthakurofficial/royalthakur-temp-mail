<?php
namespace App\Controllers;

use App\Database;
use App\Config;

class AdminController
{
    private function requireAdmin(): int
    {
        $userId = (int)($_SESSION['user_id'] ?? 0);
        if ($userId <= 0) { http_response_code(403); echo 'Forbidden'; exit; }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT is_admin FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $isAdmin = (int)($stmt->fetch()['is_admin'] ?? 0);
        if ($isAdmin !== 1) { http_response_code(403); echo 'Forbidden'; exit; }
        return $userId;
    }

    public function dashboard(): void
    {
        $this->requireAdmin();
        echo '<!doctype html><html><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script><title>Admin</title></head><body class="bg-gray-950 text-gray-100"><div class="p-6"><h1 class="text-xl font-semibold">Admin Dashboard</h1><p class="text-sm text-gray-400">Minimal admin for payments and users</p></div></body></html>';
    }

    public function approvePayment(): void
    {
        $this->requireAdmin();
        $paymentId = (int)($_POST['payment_id'] ?? 0);
        if ($paymentId <= 0) { json_response(['error' => 'Invalid id'], 422); return; }
        $pdo = Database::pdo();
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT user_id FROM payments WHERE id = ? AND status = "pending" FOR UPDATE');
        $stmt->execute([$paymentId]);
        $payment = $stmt->fetch();
        if (!$payment) { $pdo->rollBack(); json_response(['error' => 'Not found'], 404); return; }
        $pdo->prepare('UPDATE users SET plan = ? WHERE id = ?')->execute([Config::PREMIUM_PLAN['name'], $payment['user_id']]);
        $pdo->prepare('UPDATE payments SET status = "approved" WHERE id = ?')->execute([$paymentId]);
        $pdo->commit();
        json_response(['ok' => true]);
    }

    public function rejectPayment(): void
    {
        $this->requireAdmin();
        $paymentId = (int)($_POST['payment_id'] ?? 0);
        if ($paymentId <= 0) { json_response(['error' => 'Invalid id'], 422); return; }
        $pdo = Database::pdo();
        $pdo->prepare('UPDATE payments SET status = "rejected" WHERE id = ?')->execute([$paymentId]);
        json_response(['ok' => true]);
    }

    public function listUsers(): void
    {
        $this->requireAdmin();
        $pdo = Database::pdo();
        $users = $pdo->query('SELECT id, email, plan, is_verified, is_admin, created_at FROM users ORDER BY id DESC LIMIT 200')->fetchAll();
        json_response(['users' => $users]);
    }

    public function updateUser(): void
    {
        $this->requireAdmin();
        $id = (int)($_POST['id'] ?? 0);
        $plan = (string)($_POST['plan'] ?? '');
        $isActive = (int)($_POST['is_active'] ?? 1);
        $pdo = Database::pdo();
        $pdo->prepare('UPDATE users SET plan = ?, is_active = ? WHERE id = ?')->execute([$plan, $isActive, $id]);
        json_response(['ok' => true]);
    }

    public function deleteUser(): void
    {
        $this->requireAdmin();
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) { json_response(['error' => 'Invalid id'], 422); return; }
        $pdo = Database::pdo();
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        json_response(['ok' => true]);
    }
}
