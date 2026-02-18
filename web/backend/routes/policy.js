/**
 * GET  /api/policy        — get current policy
 * POST /api/policy        — update policy fields
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const POLICY_FILE = path.resolve(__dirname, '../../../../policy.json');

const DEFAULT_POLICY = {
    max_drain: 50,
    disallow_selfdestruct: false,
    disallow_delegatecall: false,
    max_nested_calls: 5,
    min_block_score: 0,
    policy_version: 1,
};

function readPolicy() {
    try {
        if (fs.existsSync(POLICY_FILE)) {
            return { ...DEFAULT_POLICY, ...JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8')) };
        }
    } catch { }
    return { ...DEFAULT_POLICY };
}

function writePolicy(policy) {
    fs.writeFileSync(POLICY_FILE, JSON.stringify(policy, null, 2));
}

// GET /api/policy
router.get('/', (req, res) => {
    res.json(readPolicy());
});

// POST /api/policy  body: { max_drain, disallow_selfdestruct, ... }
router.post('/', (req, res) => {
    const current = readPolicy();
    const allowed = ['max_drain', 'disallow_selfdestruct', 'disallow_delegatecall', 'max_nested_calls'];
    const updates = {};

    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            updates[key] = req.body[key];
        }
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid policy fields provided' });
    }

    const updated = {
        ...current,
        ...updates,
        policy_version: (current.policy_version || 1) + 1,
    };

    writePolicy(updated);
    res.json({ success: true, policy: updated });
});

module.exports = router;
