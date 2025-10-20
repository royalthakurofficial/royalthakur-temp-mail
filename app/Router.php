<?php
namespace App;

use App\Controllers\AuthController;
use App\Controllers\HomeController;
use App\Controllers\ApiController;
use App\Controllers\AdminController;

class Router
{
    private array $routes = [];

    public function __construct()
    {
        // Public pages
        $this->get('/', [HomeController::class, 'index']);
        $this->get('/login', [AuthController::class, 'showLogin']);
        $this->get('/register', [AuthController::class, 'showRegister']);
        $this->get('/verify', [AuthController::class, 'verifyEmail']);
        $this->get('/logout', [AuthController::class, 'logout']);

        // Auth actions
        $this->post('/api/auth/register', [AuthController::class, 'register']);
        $this->post('/api/auth/login', [AuthController::class, 'login']);
        $this->post('/api/auth/request-reset', [AuthController::class, 'requestReset']);
        $this->post('/api/auth/reset', [AuthController::class, 'resetPassword']);

        // API
        $this->get('/api/me', [ApiController::class, 'me']);
        $this->post('/api/addresses', [ApiController::class, 'createAddress']);
        $this->get('/api/addresses', [ApiController::class, 'listAddresses']);
        $this->delete('/api/addresses', [ApiController::class, 'deleteAddress']);
        $this->get('/api/emails', [ApiController::class, 'listEmails']);
        $this->get('/api/emails/search', [ApiController::class, 'searchEmails']);
        $this->get('/api/emails/read', [ApiController::class, 'readEmail']);
        $this->delete('/api/emails', [ApiController::class, 'deleteEmails']);
        $this->get('/api/emails/stream', [ApiController::class, 'emailStream']);
        $this->post('/api/payments/submit', [ApiController::class, 'submitPaymentProof']);

        // API key rotation
        $this->post('/api/key/rotate', [ApiController::class, 'rotateApiKey']);

        // Admin
        $this->get('/admin', [AdminController::class, 'dashboard']);
        $this->post('/api/admin/payments/approve', [AdminController::class, 'approvePayment']);
        $this->post('/api/admin/payments/reject', [AdminController::class, 'rejectPayment']);
        $this->get('/api/admin/users', [AdminController::class, 'listUsers']);
        $this->post('/api/admin/users/update', [AdminController::class, 'updateUser']);
        $this->post('/api/admin/users/delete', [AdminController::class, 'deleteUser']);
    }

    public function get(string $path, callable|array $handler): void
    { $this->routes['GET'][$path] = $handler; }
    public function post(string $path, callable|array $handler): void
    { $this->routes['POST'][$path] = $handler; }
    public function delete(string $path, callable|array $handler): void
    { $this->routes['DELETE'][$path] = $handler; }

    public function dispatch(string $method, string $path): void
    {
        $path = rtrim($path, '/') ?: '/';
        $handler = $this->routes[$method][$path] ?? null;
        if (!$handler) {
            http_response_code(404);
            echo 'Not Found';
            return;
        }
        if (is_array($handler)) {
            [$class, $action] = $handler;
            $instance = new $class();
            $instance->$action();
        } else {
            $handler();
        }
    }
}
