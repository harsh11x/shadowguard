/**
 * lib/db.js
 * SQLite database for API key management.
 * Uses better-sqlite3 (synchronous, fast).
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/shadowguard.db');

// Ensure data directory exists
const fs = require('fs');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better write performance
db.pragma('journal_mode = WAL');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        uid         TEXT PRIMARY KEY,
        email       TEXT UNIQUE NOT NULL,
        name        TEXT,
        company     TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
        id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        uid           TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        key_hash      TEXT NOT NULL UNIQUE,
        key_prefix    TEXT NOT NULL,
        plan          TEXT NOT NULL DEFAULT 'demo',
        usage_count   INTEGER NOT NULL DEFAULT 0,
        active        INTEGER NOT NULL DEFAULT 1,
        created_at    TEXT DEFAULT (datetime('now')),
        last_used_at  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_uid ON api_keys(uid);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
`);

// ── Plan definitions ────────────────────────────────────────────────────────
const PLANS = {
    demo: { label: 'Demo', limit: 100, price: 0, priceLabel: 'Free' },
    starter: { label: 'Starter', limit: 1000, price: 20, priceLabel: '$20/mo' },
    professional: { label: 'Professional', limit: 10000, price: 60, priceLabel: '$60/mo' },
    enterprise: { label: 'Enterprise', limit: Infinity, price: null, priceLabel: 'Contact Us' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const crypto = require('crypto');

function hashKey(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey() {
    // Format: sg_live_<32 random hex chars>
    return `sg_live_${uuidv4().replace(/-/g, '')}`;
}

// ── User ops ─────────────────────────────────────────────────────────────────
function upsertUser({ uid, email, name, company }) {
    db.prepare(`
        INSERT INTO users (uid, email, name, company) VALUES (?, ?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET email = excluded.email, name = excluded.name, company = COALESCE(excluded.company, company)
    `).run(uid, email, name || null, company || null);
    return db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
}

function getUser(uid) {
    return db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
}

// ── API key ops ───────────────────────────────────────────────────────────────
function createApiKey(uid, name, plan = 'demo') {
    const rawKey = generateRawKey();
    const hash = hashKey(rawKey);
    const prefix = rawKey.substring(0, 14); // "sg_live_xxxxxx"

    db.prepare(`
        INSERT INTO api_keys (uid, name, key_hash, key_prefix, plan)
        VALUES (?, ?, ?, ?, ?)
    `).run(uid, name, hash, prefix, plan);

    // Return the raw key only once — never stored in plaintext
    return { rawKey, prefix, plan, name };
}

function listApiKeys(uid) {
    return db.prepare(`
        SELECT id, name, key_prefix, plan, usage_count, active, created_at, last_used_at
        FROM api_keys WHERE uid = ? ORDER BY created_at DESC
    `).all(uid);
}

function revokeApiKey(id, uid) {
    const result = db.prepare('UPDATE api_keys SET active = 0 WHERE id = ? AND uid = ?').run(id, uid);
    return result.changes > 0;
}

function deleteApiKey(id, uid) {
    const result = db.prepare('DELETE FROM api_keys WHERE id = ? AND uid = ?').run(id, uid);
    return result.changes > 0;
}

function validateApiKey(rawKey) {
    const hash = hashKey(rawKey);
    const keyRow = db.prepare(`
        SELECT ak.*, u.email, u.name
        FROM api_keys ak JOIN users u ON ak.uid = u.uid
        WHERE ak.key_hash = ? AND ak.active = 1
    `).get(hash);

    if (!keyRow) return { valid: false, error: 'Invalid or revoked API key' };

    const plan = PLANS[keyRow.plan] || PLANS.demo;
    if (plan.limit !== Infinity && keyRow.usage_count >= plan.limit) {
        return { valid: false, error: `Monthly limit reached (${plan.limit} requests on ${keyRow.plan} plan). Please upgrade.` };
    }

    // Increment usage and update last_used
    db.prepare(`
        UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = datetime('now')
        WHERE key_hash = ?
    `).run(hash);

    return { valid: true, keyRow, plan };
}

function getUsageStats(uid) {
    return db.prepare(`
        SELECT plan, SUM(usage_count) as total_usage, COUNT(*) as key_count
        FROM api_keys WHERE uid = ? AND active = 1
        GROUP BY plan
    `).all(uid);
}

module.exports = { upsertUser, getUser, createApiKey, listApiKeys, revokeApiKey, deleteApiKey, validateApiKey, getUsageStats, PLANS };
