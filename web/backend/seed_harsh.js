
const { upsertUser, createApiKey, pool } = require('./lib/db');

async function main() {
    try {
        console.log('Seeding Harsh User...');

        const uid = 'harsh-user-uid-123';
        const email = 'harshdevsingh2004@gmail.com';
        const password = '12345678';
        const name = 'Harsh Dev';
        const company = 'ShadowGuard Enterprise';

        // 1. Create User
        await upsertUser({ uid, email, name, company });

        // 2. Set Password
        // Note: Using SHA256 + verify salt as per auth.js implementation
        const crypto = require('crypto');
        const JWT_SECRET = process.env.JWT_SECRET || 'shadowguard-dev-secret-change-in-prod';
        const hashPw = (pw) => crypto.createHash('sha256').update(pw + JWT_SECRET).digest('hex');

        await pool.query(
            `INSERT INTO user_auth (uid, pw_hash) VALUES ($1, $2)
             ON CONFLICT(uid) DO UPDATE SET pw_hash = EXCLUDED.pw_hash`,
            [uid, hashPw(password)]
        );

        // 3. Set Role/Status (if columns exist)
        try {
            await pool.query("UPDATE users SET role = 'admin', status = 'active' WHERE uid = $1", [uid]);
            console.log('Set as Admin/Active');
        } catch (e) {
            console.log('Role/Status columns missing, skipping');
        }

        // 4. Create Enterprise Key (Idempotent check)
        // 4. Force Create Enterprise Key (Delete old to ensure key_raw exists)
        await pool.query('DELETE FROM api_keys WHERE uid = $1', [uid]);
        const key = await createApiKey(uid, 'Harsh Enterprise Key', 'enterprise');
        console.log('API Key Created:', JSON.stringify(key, null, 2));

        console.log('Seeding complete. User harshdevsingh2004@gmail.com is ready.');
    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        await pool.end();
    }
}

main();
