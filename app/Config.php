<?php
namespace App;

define('APP_START_TS', microtime(true));

class Config
{
    // Update these for your cPanel MySQL
    public const DB_HOST = 'localhost';
    public const DB_NAME = 'cpanel_db_name';
    public const DB_USER = 'cpanel_db_user';
    public const DB_PASS = 'cpanel_db_password';
    public const DB_CHARSET = 'utf8mb4';

    // App
    public const APP_NAME = 'Royal Temp Mail';
    public const BASE_URL = null; // Auto-detect; set to string to override

    // Domains for email addresses
    public const ALLOWED_DOMAINS = [
        'royalflood.site',
        'royalthakur.xyz',
    ];

    // Security
    public const JWT_SECRET = 'change-this-super-secret-key';
    public const JWT_ISSUER = 'royal-tempmail';
    public const CSRF_KEY = 'change-this-csrf-secret';

    // Mail
    public const MAIL_FROM = 'no-reply@royalflood.site';
    public const MAIL_FROM_NAME = 'Royal Temp Mail';

    // Plans (defaults; can be overridden by DB 'plans')
    public const FREE_PLAN = [
        'name' => 'free',
        'daily_api' => 100,
        'daily_emails' => 5,
        'retention_days' => 1,
        'max_addresses' => 1,
    ];
    public const PREMIUM_PLAN = [
        'name' => 'premium',
        'daily_api' => 10000,
        'daily_emails' => 100,
        'retention_days' => 30,
        'max_addresses' => 10,
    ];

    // Payments
    public const UPI_ID = 'royalthakur@ptaxis';
    public const PREMIUM_PRICE_INR = 299; // per month

    // Storage
    public const STORAGE_PATH = __DIR__ . '/../storage';
    public const UPLOADS_PATH = __DIR__ . '/../storage/uploads';
    public const PAYMENT_UPLOADS = __DIR__ . '/../storage/uploads/payments';

    public static function baseUrl(): string
    {
        if (is_string(self::BASE_URL) && self::BASE_URL !== '') {
            return self::BASE_URL;
        }
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? null) == 443;
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '/';
        $basePath = rtrim(str_replace('/public/index.php', '', $scriptName), '/');
        return rtrim("{$scheme}://{$host}{$basePath}", '/');
    }
}
