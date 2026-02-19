/**
 * routes/developer.js
 * API key CRUD endpoints — requires JWT auth (no Firebase).
 * 
 * GET    /api/developer/keys         → list all user's keys
 * POST   /api/developer/keys         → create a new key
 * DELETE /api/developer/keys/:id     → delete a key
 * GET    /api/developer/usage        → usage statistics
 * GET    /api/developer/plans        → plan definitions
 */

const express = require('express');
const router = express.Router();
const { jwtAuth } = require('./auth');
const { createApiKey, listApiKeys, deleteApiKey, getUsageStats, PLANS } = require('../lib/db');

// All routes require JWT auth
router.use(jwtAuth);

// GET /api/developer/keys
router.get('/keys', async (req, res) => {
    try {
        const keys = await listApiKeys(req.user.uid);
        res.json({ keys });
    } catch (e) {
        console.error('[Developer] List keys error:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/developer/keys  { name: string, plan: string }
router.post('/keys', async (req, res) => {
    const { name, plan = 'demo' } = req.body;

    if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Key name must be at least 2 characters' });
    }
    if (!PLANS[plan]) {
        return res.status(400).json({ error: `Invalid plan. Options: ${Object.keys(PLANS).join(', ')}` });
    }

    try {
        // Limit keys per user
        const existingKeys = await listApiKeys(req.user.uid);
        if (existingKeys.filter(k => k.active).length >= 10) {
            return res.status(400).json({ error: 'Maximum 10 active API keys per account. Delete an existing key first.' });
        }

        const result = await createApiKey(req.user.uid, name.trim(), plan);
        res.json({
            message: 'API key created. Copy your key now — it will never be shown again.',
            key: { id: result.id, name: result.name, plan: result.plan, key_prefix: result.prefix },
            raw_key: result.rawKey,
            limit: PLANS[plan].limit,
        });
    } catch (e) {
        console.error('[Developer] Create key error:', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/developer/keys/:id
router.delete('/keys/:id', async (req, res) => {
    try {
        const deleted = await deleteApiKey(req.params.id, req.user.uid);
        if (!deleted) return res.status(404).json({ error: 'Key not found or not owned by you' });
        res.json({ message: 'API key permanently deleted' });
    } catch (e) {
        console.error('[Developer] Delete key error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/developer/usage
router.get('/usage', async (req, res) => {
    try {
        const stats = await getUsageStats(req.user.uid);
        const keys = await listApiKeys(req.user.uid);

        // Production: usage logs not yet implemented in Postgres, returning 0s to avoid fake data
        const dailyUsage = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return {
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: 0
            };
        }).reverse();

        res.json({ stats, keys, dailyUsage });
    } catch (e) {
        console.error('[Developer] Usage stats error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/developer/plans
router.get('/plans', (req, res) => {
    res.json({ plans: PLANS });
});

module.exports = router;
