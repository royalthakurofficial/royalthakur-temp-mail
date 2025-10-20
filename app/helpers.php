<?php
use App\Config;

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function require_post_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = hash_hmac('sha256', bin2hex(random_bytes(16)), Config::CSRF_KEY);
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(?string $token): bool {
    return is_string($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
