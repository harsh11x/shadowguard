/**
 * lib/db.js
 * PostgreSQL database (Supabase) for API key management.
 * Uses node-postgres (async, connection pooling).
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Connection string from environment variable
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('FATAL: DATABASE_URL not set in environment variables.');
    process.exit(1);
}

const isLocal = DATABASE_URL.includes('@db:') || DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false } // Disable SSL for local docker
});

// Test connection
pool.on('error', (err) => {
    console.error('[db] Unexpected error on idle client', err);
});

// ── Schema ────────────────────────────────────────────────────────────────────
const SCHEMA = `
    CREATE TABLE IF NOT EXISTS users (
        uid         TEXT PRIMARY KEY,
        email       TEXT UNIQUE NOT NULL,
        name        TEXT,
        company     TEXT,
        role        TEXT DEFAULT 'user', -- 'user' | 'admin'
        status      TEXT DEFAULT 'pending', -- 'pending' | 'active' | 'rejected' | 'banned'
        ban_expires_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_auth (
        uid       TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
        pw_hash   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
        id            TEXT PRIMARY KEY,
        uid           TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        key_hash      TEXT NOT NULL UNIQUE,
        key_raw       TEXT, -- Added for local enterprise mode (user request)
        key_prefix    TEXT NOT NULL,
        plan          TEXT NOT NULL DEFAULT 'demo',
        usage_count   INTEGER NOT NULL DEFAULT 0,
        active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        last_used_at  TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_uid ON api_keys(uid);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
`;

// Initialize schema
(async () => {
    try {
        await pool.query(SCHEMA);
        // Migration: Add key_raw if not exists (dempotent)
        await pool.query(SCHEMA);
        // Migration: Add key_raw if not exists (dempotent)
        await pool.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_raw TEXT;`);
        // Migration: Set default status to pending for NEW users
        await pool.query(`ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending';`);
        console.log('[db] Schema initialized');
    } catch (e) {
        console.error('[db] Schema init failed:', e.message);
    }
})();

// ── Plan definitions ────────────────────────────────────────────────────────
const PLANS = {
    demo: { label: 'Demo', limit: 100, price: 0, priceLabel: 'Free' },
    starter: { label: 'Starter', limit: 1000, price: 20, priceLabel: '$20/mo' },
    professional: { label: 'Professional', limit: 10000, price: 60, priceLabel: '$60/mo' },
    enterprise: { label: 'Enterprise', limit: Infinity, price: null, priceLabel: 'Contact Us' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function hashKey(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey() {
    // Format: sg_live_<32 random hex chars>
    return `sg_live_${uuidv4().replace(/-/g, '')}`;
}

// ── User ops ─────────────────────────────────────────────────────────────────
async function upsertUser({ uid, email, name, company }) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO users (uid, email, name, company) VALUES ($1, $2, $3, $4)
            ON CONFLICT(uid) DO UPDATE SET 
                email = EXCLUDED.email, 
                name = EXCLUDED.name, 
                company = COALESCE(EXCLUDED.company, users.company)
            RETURNING *
        `;
        const res = await client.query(query, [uid, email, name || null, company || null]);
        return res.rows[0];
    } finally {
        client.release();
    }
}

async function updateUserStatus(uid, status, banExpiresAt = null) {
    const res = await pool.query(
        'UPDATE users SET status = $1, ban_expires_at = $2 WHERE uid = $3 RETURNING *',
        [status, banExpiresAt, uid]
    );
    return res.rows[0];
}

async function getAllUsers() {
    const res = await pool.query(`
        SELECT u.*, 
               (SELECT COUNT(*) FROM api_keys k WHERE k.uid = u.uid AND k.active = TRUE) as active_keys,
               (SELECT SUM(k.usage_count) FROM api_keys k WHERE k.uid = u.uid) as total_usage
        FROM users u 
        ORDER BY u.created_at DESC
    `);
    return res.rows;
}

async function getPlatformStats() {
    const res = await pool.query(`
        SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM api_keys WHERE active = TRUE) as active_keys,
            (SELECT SUM(usage_count) FROM api_keys) as total_api_calls
    `);
    return res.rows[0];
}

async function getUser(uid) {
    const res = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
    return res.rows[0];
}

async function getUserByEmail(email) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
}

async function deleteUser(uid) {
    // Cascading delete will handle keys/logs due to schema constraint, but explicit is safer if constraints missing
    const res = await pool.query('DELETE FROM users WHERE uid = $1', [uid]);
    return res.rowCount > 0;
}


// ── API key ops ───────────────────────────────────────────────────────────────
async function createApiKey(uid, name, plan = 'demo') {
    const rawKey = generateRawKey();
    const hash = hashKey(rawKey);
    const prefix = rawKey.substring(0, 14); // "sg_live_xxxxxx"
    const id = uuidv4();

    await pool.query(`
        INSERT INTO api_keys (id, uid, name, key_hash, key_raw, key_prefix, plan)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, uid, name, hash, rawKey, prefix, plan]);

    // Return the raw key only once — never stored in plaintext
    return { id, rawKey, prefix, plan, name };
}

async function listApiKeys(uid) {
    const res = await pool.query(`
        SELECT id, name, key_prefix, key_raw, plan, usage_count, active, created_at, last_used_at
        FROM api_keys WHERE uid = $1 ORDER BY created_at DESC
    `, [uid]);
    return res.rows;
}

async function revokeApiKey(id, uid) {
    const res = await pool.query('UPDATE api_keys SET active = FALSE WHERE id = $1 AND uid = $2', [id, uid]);
    return res.rowCount > 0;
}

async function deleteApiKey(id, uid) {
    const res = await pool.query('DELETE FROM api_keys WHERE id = $1 AND uid = $2', [id, uid]);
    return res.rowCount > 0;
}

// Get full details for Admin View
async function getUserDetails(uid) {
    const userRes = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
    const user = userRes.rows[0];
    if (!user) return null;

    const keysRes = await pool.query('SELECT * FROM api_keys WHERE uid = $1 ORDER BY created_at DESC', [uid]);

    // 7-day usage history
    const historyRes = await pool.query(`
        SELECT DATE(timestamp) as date, COUNT(*) as count 
        FROM usage_logs 
        WHERE uid = $1 AND timestamp > NOW() - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp) ASC
    `, [uid]);

    return { user, keys: keysRes.rows, history: historyRes.rows };
}

async function validateApiKey(rawKey) {
    const hash = hashKey(rawKey);
    const res = await pool.query(`
        SELECT ak.*, u.email, u.name, u.status, u.role
        FROM api_keys ak JOIN users u ON ak.uid = u.uid
        WHERE ak.key_hash = $1 AND ak.active = TRUE
    `, [hash]);

    const keyRow = res.rows[0];

    if (!keyRow) return { valid: false, error: 'Invalid or revoked API key' };

    // Check user status
    if (keyRow.status !== 'active') {
        return { valid: false, error: 'Account not active. Please contact support.' };
    }

    const plan = PLANS[keyRow.plan] || PLANS.demo;
    if (plan.limit !== Infinity && keyRow.usage_count >= plan.limit) {
        return { valid: false, error: `Monthly limit reached (${plan.limit} requests on ${keyRow.plan} plan). Please upgrade.` };
    }

    // Increment usage and log (async)
    pool.query(`
        UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE key_hash = $1
    `, [hash]).catch(err => console.error('[db] usage update failed', err));

    // Log individual request
    pool.query(`INSERT INTO usage_logs (uid, key_id, endpoint) VALUES ($1, $2, $3)`, [keyRow.uid, keyRow.id, 'simulate'])
        .catch(err => console.error('[db] log failed', err));

    return { valid: true, keyRow, plan };
}

async function getUsageStats(uid) {
    const res = await pool.query(`
        SELECT plan, SUM(usage_count) as total_usage, COUNT(*) as key_count
        FROM api_keys WHERE uid = $1 AND active = TRUE
        GROUP BY plan
    `, [uid]);
    return res.rows;
}

module.exports = {
    pool,
    upsertUser,
    getUser,
    getUserByEmail,
    createApiKey,
    listApiKeys,
    revokeApiKey,
    deleteApiKey,
    validateApiKey,
    getUsageStats,
    updateUserStatus,
    getAllUsers,
    getUserDetails,
    deleteUser,
    getPlatformStats,
    PLANS
};
