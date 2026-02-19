
const { upsertUser, createApiKey, pool } = require('./lib/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function main() {
    try {
        console.log('Connecting to Supabase...');

        // 1. Create Admin User
        const email = 'admin@gmail.com';
        const password = '12345678';
        const uid = uuidv4();
        const jwtSecret = process.env.JWT_SECRET || 'shadowguard-dev-secret-change-in-prod';
        const pwHash = crypto.createHash('sha256').update(password + jwtSecret).digest('hex');

        console.log(`Creating user: ${email}...`);

        // Insert into users
        await upsertUser({ uid, email, name: 'Admin', company: 'ShadowGuard' });

        // Insert into user_auth
        await pool.query(`
            INSERT INTO user_auth (uid, pw_hash) VALUES ($1, $2)
            ON CONFLICT (uid) DO UPDATE SET pw_hash = EXCLUDED.pw_hash
        `, [uid, pwHash]);

        console.log('User created.');

        // 2. Create Keys
        console.log('Generating keys...');

        const entKey = await createApiKey(uid, 'Admin Enterprise Key', 'enterprise');
        console.log('--- ENTERPRISE KEY ---');
        console.log(JSON.stringify(entKey));

        const proKey = await createApiKey(uid, 'Admin Pro Key', 'professional');
        console.log('--- PROFESSIONAL KEY ---');
        console.log(JSON.stringify(proKey));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

main();
