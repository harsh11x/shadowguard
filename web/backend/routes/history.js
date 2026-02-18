/**
 * GET /api/history?limit=20
 * Returns past simulation records from the SQLite database via Python.
 */

const express = require('express');
const router = express.Router();
const { runPython } = require('../lib/python');

router.get('/', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    try {
        const lines = await runPython(['view_logs', '--limit', String(limit)]);
        // Find the JSON object with records
        const result = lines.find(l => l.records !== undefined);
        if (result) {
            res.json(result);
        } else {
            res.json({ records: [], total: 0 });
        }
    } catch (err) {
        console.error('[history] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
