<?php
namespace App\Controllers;

use App\Database;
use App\Config;
use App\Security\Auth;
use App\Services\RateLimiter;
use App\Security\HtmlSanitizer;
use App\Security\ApiAuth;
use App\Services\Plan;
use App\Services\Logger;

class ApiController
{
    private function requireAuth(): int
    {
        return Auth::requireUserId();
    }

    public function me(): void
    {
        $userId = $this->requireAuth();
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id, email, plan FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        json_response(['user' => $user]);
    }

    public function createAddress(): void
    {
        $userId = $_SESSION['user_id'] ?? null; // allow anonymous temp address for landing
        $data = \require_post_json();
        $domain = Config::ALLOWED_DOMAINS[array_rand(Config::ALLOWED_DOMAINS)];
        $local = strtolower(bin2hex(random_bytes(5)));
        $address = $local . '@' . $domain;
        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO addresses (user_id, address, is_generated, created_at) VALUES (?, ?, 1, NOW())')
            ->execute([$userId, $address]);
        json_response(['address' => $address]);
    }

    public function listAddresses(): void
    {
        $userId = $this->requireAuth();
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id, address, forwarding_to FROM addresses WHERE user_id = ? ORDER BY id DESC');
        $stmt->execute([$userId]);
        json_response(['addresses' => $stmt->fetchAll()]);
    }

    public function deleteAddress(): void
    {
        $userId = $this->requireAuth();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) { json_response(['error' => 'Invalid id'], 422); return; }
        $pdo = Database::pdo();
        $pdo->prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
        json_response(['ok' => true]);
    }

    public function listEmails(): void
    {
        $userId = $this->requireAuth();
        $address = (string)($_GET['address'] ?? '');
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT e.id, e.sender, e.subject, e.created_at FROM emails e JOIN addresses a ON a.id = e.address_id WHERE a.user_id = ? AND a.address = ? ORDER BY e.id DESC LIMIT 100');
        $stmt->execute([$userId, $address]);
        json_response(['emails' => $stmt->fetchAll()]);
    }

    public function readEmail(): void
    {
        $userId = $this->requireAuth();
        $id = (int)($_GET['id'] ?? 0);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT e.*, a.user_id FROM emails e JOIN addresses a ON a.id = e.address_id WHERE e.id = ? LIMIT 1');
        $stmt->execute([$id]);
        $email = $stmt->fetch();
        if (!$email || (int)$email['user_id'] !== $userId) { json_response(['error' => 'Not found'], 404); return; }
        header('Content-Type: text/html; charset=utf-8');
        $html = $email['html'] ?: nl2br($email['text']);
        echo HtmlSanitizer::sanitize((string)$html);
    }

    // Optional: API key generation/rotation
    public function rotateApiKey(): void
    {
        $userId = $this->requireAuth();
        $key = bin2hex(random_bytes(24));
        $pdo = Database::pdo();
        $pdo->prepare('UPDATE users SET api_key = ? WHERE id = ?')->execute([$key, $userId]);
        Logger::log($userId, 'rotate_api_key');
        json_response(['api_key' => $key]);
    }

    public function searchEmails(): void
    {
        $userId = $this->requireAuth();
        $q = '%' . (string)($_GET['q'] ?? '') . '%';
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT e.id, e.sender, e.subject, e.created_at FROM emails e JOIN addresses a ON a.id = e.address_id WHERE a.user_id = ? AND (e.sender LIKE ? OR e.subject LIKE ?) ORDER BY e.id DESC LIMIT 100');
        $stmt->execute([$userId, $q, $q]);
        json_response(['emails' => $stmt->fetchAll()]);
    }

    public function deleteEmails(): void
    {
        $userId = $this->requireAuth();
        $ids = array_map('intval', $_GET['ids'] ?? []);
        if (!$ids) { json_response(['error' => 'No ids'], 422); return; }
        $pdo = Database::pdo();
        $in = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("DELETE e FROM emails e JOIN addresses a ON a.id = e.address_id WHERE a.user_id = ? AND e.id IN ($in)");
        $stmt->execute(array_merge([$userId], $ids));
        json_response(['ok' => true]);
    }

    public function emailStream(): void
    {
        $address = (string)($_GET['address'] ?? '');
        if ($address === '') { http_response_code(400); echo 'Missing address'; return; }
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');

        $pdo = Database::pdo();
        $lastId = 0;
        $start = time();
        while (time() - $start < 55) {
            $stmt = $pdo->prepare('SELECT e.id, e.sender as `from`, e.subject FROM emails e JOIN addresses a ON a.id = e.address_id WHERE a.address = ? AND e.id > ? ORDER BY e.id ASC');
            $stmt->execute([$address, $lastId]);
            foreach ($stmt->fetchAll() as $row) {
                $lastId = (int)$row['id'];
                echo 'data: ' . json_encode($row) . "\n\n";
                @ob_flush(); @flush();
            }
            sleep(2);
        }
    }

    public function submitPaymentProof(): void
    {
        $userId = $this->requireAuth();
        if (!isset($_FILES['screenshot']) || !is_uploaded_file($_FILES['screenshot']['tmp_name'])) {
            json_response(['error' => 'Screenshot required'], 422); return;
        }
        $utr = trim((string)($_POST['utr'] ?? ''));
        if ($utr === '') { json_response(['error' => 'UTR required'], 422); return; }
        $dir = Config::PAYMENT_UPLOADS;
        if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
        $name = $userId . '_' . time() . '_' . preg_replace('/[^a-zA-Z0-9_.-]/', '_', $_FILES['screenshot']['name']);
        $path = rtrim($dir, '/') . '/' . $name;
        move_uploaded_file($_FILES['screenshot']['tmp_name'], $path);
        $pdo = Database::pdo();
        $pdo->prepare('INSERT INTO payments (user_id, utr, screenshot_path, status, created_at) VALUES (?, ?, ?, "pending", NOW())')
            ->execute([$userId, $utr, $name]);
        json_response(['ok' => true]);
    }
}
