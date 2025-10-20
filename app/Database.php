<?php
namespace App;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', Config::DB_HOST, Config::DB_NAME, Config::DB_CHARSET);
            try {
                self::$pdo = new PDO($dsn, Config::DB_USER, Config::DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo 'Database connection failed.';
                exit;
            }
        }
        return self::$pdo;
    }
}
