<?php
namespace App\Controllers;

use App\Database;

class InboundController
{
    // This is not routed via web; cPanel pipe calls this via CLI
    public static function handleCli(): void
    {
        $raw = stream_get_contents(STDIN);
        if (!$raw) { return; }
        $headers = [];
        $parts = preg_split("/\r?\n\r?\n/", $raw, 2);
        $headerLines = explode("\n", $parts[0]);
        foreach ($headerLines as $line) {
            if (strpos($line, ':') !== false) {
                [$k, $v] = explode(':', $line, 2);
                $headers[strtolower(trim($k))] = trim($v);
            }
        }
        $to = $headers['to'] ?? '';
        $from = $headers['from'] ?? '';
        $subject = $headers['subject'] ?? '';
        $body = $parts[1] ?? '';

        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id, forwarding_to FROM addresses WHERE address = ? LIMIT 1');
        $stmt->execute([self::extractAddress($to)]);
        $addr = $stmt->fetch();
        if (!$addr) { return; }
        $pdo->prepare('INSERT INTO emails (address_id, sender, subject, text, html, created_at) VALUES (?, ?, ?, ?, ?, NOW())')
            ->execute([$addr['id'], $from, $subject, $body, null]);
        // Forwarding optional: can implement via PHP mail here if set
        if (!empty($addr['forwarding_to'])) {
            @mail($addr['forwarding_to'], $subject, $body);
        }
    }

    private static function extractAddress(string $field): string
    {
        if (preg_match('/<([^>]+)>/', $field, $m)) { return strtolower(trim($m[1])); }
        return strtolower(trim($field));
    }
}
