/**
 * GET /api/network
 * Returns live Ethereum Sepolia network status via Python.
 */

const express = require('express');
const router = express.Router();
const { runPython } = require('../lib/python');

router.get('/', async (req, res) => {
    try {
        const lines = await runPython(['network']);
        // The network command emits a single JSON object
        const result = lines.find(l => l.chain_id !== undefined || l.block !== undefined);
        if (result) {
            res.json(result);
        } else {
            res.status(503).json({ error: 'Could not fetch network data' });
        }
    } catch (err) {
        console.error('[network] Error:', err.message);
        res.status(503).json({ error: err.message });
    }
});

module.exports = router;
