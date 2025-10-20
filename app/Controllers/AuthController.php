<?php
namespace App\Controllers;

use App\Database;
use App\Config;
use App\Security\PasswordHasher;
use App\Services\Mailer;

class AuthController
{
    public function showLogin(): void
    {
        $csrf = \csrf_token();
        $base = Config::baseUrl();
        echo <<<HTML
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script src="https://cdn.tailwindcss.com"></script><title>Login</title></head>
<body class="bg-gray-950 text-gray-100">
<div class="max-w-md mx-auto p-6">
  <h1 class="text-xl font-semibold mb-4">Login</h1>
  <form method="post" action="{$base}/api/auth/login" class="space-y-3">
    <input type="hidden" name="csrf" value="{$csrf}">
    <input name="email" type="email" required placeholder="Email" class="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2">
    <input name="password" type="password" required placeholder="Password" class="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2">
    <button class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded">Login</button>
  </form>
  <p class="mt-3 text-sm text-gray-400"><a class="hover:underline" href="{$base}/register">Create an account</a></p>
</div>
</body></html>
HTML;
    }

    public function showRegister(): void
    {
        $csrf = \csrf_token();
        $base = Config::baseUrl();
        echo <<<HTML
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script src="https://cdn.tailwindcss.com"></script><title>Register</title></head>
<body class="bg-gray-950 text-gray-100">
<div class="max-w-md mx-auto p-6">
  <h1 class="text-xl font-semibold mb-4">Register</h1>
  <form method="post" action="{$base}/api/auth/register" class="space-y-3">
    <input type="hidden" name="csrf" value="{$csrf}">
    <input name="email" type="email" required placeholder="Email" class="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2">
    <input name="password" type="password" required placeholder="Password" class="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2">
    <button class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded">Create account</button>
  </form>
  <p class="mt-3 text-sm text-gray-400"><a class="hover:underline" href="{$base}/login">Already have an account?</a></p>
</div>
</body></html>
HTML;
    }

    public function register(): void
    {
        $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
        $password = (string)($_POST['password'] ?? '');
        $csrf = $_POST['csrf'] ?? null;
        if (!\verify_csrf($csrf)) { json_response(['error' => 'Invalid CSRF'], 400); return; }
        if (!$email || strlen($password) < 8) { json_response(['error' => 'Invalid input'], 422); return; }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetch()) { json_response(['error' => 'Email already registered'], 409); return; }

        $hash = PasswordHasher::hash($password);
        $verifyToken = bin2hex(random_bytes(32));

        $pdo->prepare('INSERT INTO users (email, password_hash, plan, is_verified, verify_token, created_at) VALUES (?, ?, ?, 0, ?, NOW())')
            ->execute([$email, $hash, Config::FREE_PLAN['name'], $verifyToken]);

        Mailer::send($email, 'Verify your email', "Click to verify: " . Config::baseUrl() . '/verify?token=' . urlencode($verifyToken));
        json_response(['ok' => true]);
    }

    public function login(): void
    {
        $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
        $password = (string)($_POST['password'] ?? '');
        $csrf = $_POST['csrf'] ?? null;
        if (!\verify_csrf($csrf)) { json_response(['error' => 'Invalid CSRF'], 400); return; }
        if (!$email || $password === '') { json_response(['error' => 'Invalid input'], 422); return; }

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id, password_hash, is_verified FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !PasswordHasher::verify($password, $user['password_hash'])) {
            json_response(['error' => 'Invalid credentials'], 401); return;
        }
        if ((int)$user['is_verified'] !== 1) {
            json_response(['error' => 'Email not verified'], 403); return;
        }
        $_SESSION['user_id'] = (int)$user['id'];
        json_response(['ok' => true]);
    }

    public function verifyEmail(): void
    {
        $token = $_GET['token'] ?? '';
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('UPDATE users SET is_verified = 1, verify_token = NULL WHERE verify_token = ?');
        $stmt->execute([$token]);
        echo 'Email verified. You can close this window.';
    }

    public function requestReset(): void
    {
        $data = \require_post_json();
        $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
        if (!$email) { json_response(['error' => 'Invalid email'], 422); return; }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user) { json_response(['ok' => true]); return; }
        $token = bin2hex(random_bytes(32));
        $pdo->prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?')
            ->execute([$token, $user['id']]);
        Mailer::send($email, 'Password reset', 'Reset link: ' . Config::baseUrl() . '/reset?token=' . urlencode($token));
        json_response(['ok' => true]);
    }

    public function resetPassword(): void
    {
        $data = \require_post_json();
        $token = (string)($data['token'] ?? '');
        $password = (string)($data['password'] ?? '');
        if (strlen($password) < 8 || $token === '') { json_response(['error' => 'Invalid input'], 422); return; }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires_at > NOW() LIMIT 1');
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        if (!$user) { json_response(['error' => 'Invalid or expired token'], 400); return; }
        $hash = PasswordHasher::hash($password);
        $pdo->prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?')
            ->execute([$hash, $user['id']]);
        json_response(['ok' => true]);
    }

    public function logout(): void
    {
        session_destroy();
        header('Location: ' . Config::baseUrl());
    }
}
