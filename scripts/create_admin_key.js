
const { getUser, createApiKey } = require('../web/backend/lib/db');
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'data/shadowguard.db'));

// We need to fetch the user first to get UID
const row = db.prepare('SELECT uid FROM users WHERE email = ?').get('admin@gmail.com');
if (!row) { console.error('User not found'); process.exit(1); }

// Create Enterprise Key
const key = createApiKey(row.uid, 'Admin Enterprise Key', 'enterprise');
console.log('--- KEY START ---');
console.log(JSON.stringify(key));
console.log('--- KEY END ---');

// Also create a Pro key just in case
const keyPro = createApiKey(row.uid, 'Admin Pro Key', 'professional');
console.log('--- KEY PRO START ---');
console.log(JSON.stringify(keyPro));
console.log('--- KEY PRO END ---');
