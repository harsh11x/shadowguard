/**
 * POST /api/batch
 * Run multiple simulations sequentially, return array of results.
 * Body: { transactions: [{ from, to, value, data }, ...] }
 */

const express = require('express');
const router = express.Router();
const { runPython } = require('../lib/python');

const MAX_BATCH = 5;

router.post('/', async (req, res) => {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: 'transactions must be a non-empty array' });
    }

    if (transactions.length > MAX_BATCH) {
        return res.status(400).json({ error: `Max ${MAX_BATCH} transactions per batch` });
    }

    const results = [];

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        if (!tx.from || !tx.to) {
            results.push({ index: i, error: 'Missing from or to' });
            continue;
        }

        try {
            const args = [
                'simulate',
                '--from', tx.from,
                '--to', tx.to,
                '--value', String(tx.value || 0),
                '--data', tx.data || '0x',
            ];

            const lines = await runPython(args);
            const result = lines.find(l => l.type === 'result');
            const error = lines.find(l => l.type === 'error');

            if (error) {
                results.push({ index: i, tx, error: error.message });
            } else if (result) {
                results.push({
                    index: i,
                    tx,
                    simulation_id: result.record?.simulation_id,
                    risk_score: result.record?.risk_report?.score,
                    risk_level: result.record?.risk_report?.level,
                    reverted: result.record?.execution_result?.reverted,
                    gas_used: result.record?.execution_result?.gas_used,
                    execution_time_s: result.execution_time_s,
                    policy_violations: result.record?.risk_report?.policy_violations || [],
                });
            } else {
                results.push({ index: i, tx, error: 'No result returned' });
            }
        } catch (err) {
            results.push({ index: i, tx, error: err.message });
        }
    }

    res.json({
        total: transactions.length,
        completed: results.filter(r => !r.error).length,
        results,
    });
});

module.exports = router;
