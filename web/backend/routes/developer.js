/**
 * routes/developer.js
 * API key CRUD endpoints — requires Firebase auth.
 * 
 * GET    /api/developer/keys         → list all user's keys
 * POST   /api/developer/keys         → create a new key
 * DELETE /api/developer/keys/:id     → delete a key
 * GET    /api/developer/usage        → usage statistics
 * GET    /api/developer/plans        → plan definitions
 */

const express = require('express');
const router = express.Router();
const firebaseAuth = require('../middleware/firebaseAuth');
const { createApiKey, listApiKeys, deleteApiKey, getUsageStats, PLANS } = require('../lib/db');

// All routes require Firebase auth
router.use(firebaseAuth);

// GET /api/developer/keys
router.get('/keys', (req, res) => {
    try {
        const keys = listApiKeys(req.user.uid);
        res.json({ keys });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/developer/keys  { name: string, plan: string }
router.post('/keys', (req, res) => {
    const { name, plan = 'demo' } = req.body;

    if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Key name must be at least 2 characters' });
    }
    if (!PLANS[plan]) {
        return res.status(400).json({ error: `Invalid plan. Options: ${Object.keys(PLANS).join(', ')}` });
    }

    // Limit keys per user
    const existingKeys = listApiKeys(req.user.uid);
    if (existingKeys.filter(k => k.active).length >= 10) {
        return res.status(400).json({ error: 'Maximum 10 active API keys per account. Delete an existing key first.' });
    }

    try {
        const result = createApiKey(req.user.uid, name.trim(), plan);
        res.json({
            message: 'API key created. Copy your key now — it will never be shown again.',
            key: result.rawKey,
            prefix: result.prefix,
            name: result.name,
            plan: result.plan,
            limit: PLANS[plan].limit,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/developer/keys/:id
router.delete('/keys/:id', (req, res) => {
    try {
        const deleted = deleteApiKey(req.params.id, req.user.uid);
        if (!deleted) return res.status(404).json({ error: 'Key not found or not owned by you' });
        res.json({ message: 'API key permanently deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/developer/usage
router.get('/usage', (req, res) => {
    try {
        const stats = getUsageStats(req.user.uid);
        const keys = listApiKeys(req.user.uid);
        res.json({ stats, keys });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/developer/plans
router.get('/plans', (req, res) => {
    res.json({ plans: PLANS });
});

module.exports = router;
