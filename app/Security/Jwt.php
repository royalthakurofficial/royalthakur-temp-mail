<?php
namespace App\Security;

use App\Config;

class Jwt
{
    public static function encode(array $payload, int $ttlSeconds = 3600): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $now = time();
        $payload = array_merge($payload, [
            'iss' => Config::JWT_ISSUER,
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
        ]);
        $segments = [self::b64(json_encode($header)), self::b64(json_encode($payload))];
        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, Config::JWT_SECRET, true);
        $segments[] = self::b64($signature);
        return implode('.', $segments);
    }

    public static function decode(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) { return null; }
        [$h, $p, $s] = $parts;
        $sig = self::ub64($s);
        $expected = hash_hmac('sha256', $h . '.' . $p, Config::JWT_SECRET, true);
        if (!hash_equals($expected, $sig)) { return null; }
        $payload = json_decode(self::ub64($p), true);
        if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) { return null; }
        return $payload;
    }

    private static function b64(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
    private static function ub64(string $s): string { return base64_decode(strtr($s, '-_', '+/')); }
}
