<?php
namespace App\Services;

use App\Config;

class Mailer
{
    public static function send(string $to, string $subject, string $body): bool
    {
        $headers = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-type: text/plain; charset=utf-8';
        $headers[] = 'From: ' . Config::MAIL_FROM_NAME . ' <' . Config::MAIL_FROM . '>';
        return mail($to, $subject, $body, implode("\r\n", $headers));
    }
}
