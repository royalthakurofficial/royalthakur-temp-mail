# Royal Temp Mail (PHP, MySQL) – cPanel-ready

## Quick setup
1. Create MySQL database/user in cPanel and update `app/Config.php` constants `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`.
2. Upload the project so that `public/` maps to your domain document root. On cPanel, put `public/` contents into your domain root and the rest above webroot if possible.
3. Ensure `.htaccess` is present in webroot.
4. Import `database/schema.sql` into your database.
5. Set PHP version 8.1+.
6. Configure email piping in cPanel for each domain (e.g., `:fail:` or forwarder) to pipe to the script:
   - Forwarder: Address: `@royalflood.site` -> Pipe to a program: `/home/USER/royal/bin/inbound-pipe.php`
   - Make script executable: `chmod +x bin/inbound-pipe.php`
7. Update `MAIL_FROM` in `Config.php` and set SPF/DMARC for your domain.

## Admin
- Set an admin: `UPDATE users SET is_admin=1 WHERE email='you@example.com';`

## Cron cleanup (email retention)
Add a cron in cPanel to run hourly:
```
/usr/local/bin/php -d detect_unicode=0 /home/USER/royal/bin/cleanup.php
```
