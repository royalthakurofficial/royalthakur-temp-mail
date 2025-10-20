<?php
namespace App\Security;

class HtmlSanitizer
{
    public static function sanitize(string $html): string
    {
        // Very basic allowlist; for production consider HTML Purifier library
        $allowed = '<a><b><i><strong><em><p><br><ul><ol><li><code><pre><blockquote><span><div><img>'; 
        $clean = strip_tags($html, $allowed);
        // Remove on* event handlers and javascript: URLs
        $clean = preg_replace('/on[a-z]+\s*=\s*"[^"]*"/i', '', $clean);
        $clean = preg_replace("/on[a-z]+\s*=\s*'[^']*'/i", '', $clean);
        $clean = preg_replace('/javascript:/i', '', $clean);
        return $clean;
    }
}
