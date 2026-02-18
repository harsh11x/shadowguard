/**
 * GET /api/export?format=csv|json
 * Download simulation history as CSV or JSON.
 */

const express = require('express');
const router = express.Router();
const { runPython } = require('../lib/python');

router.get('/', async (req, res) => {
    const format = req.query.format || 'json';
    const limit = parseInt(req.query.limit) || 1000;

    try {
        const lines = await runPython(['view_logs', '--limit', String(limit)]);
        const result = lines.find(l => l.records !== undefined);
        const records = result?.records || [];

        if (format === 'csv') {
            const headers = [
                'simulation_id', 'timestamp', 'from', 'to', 'value_eth',
                'gas_used', 'risk_score', 'risk_level', 'reverted',
                'policy_violations', 'execution_time_s'
            ];

            const rows = records.map(r => {
                const req_ = r.request || {};
                const risk = r.risk_report || {};
                const exec = r.execution_result || {};
                return [
                    r.simulation_id || '',
                    r.timestamp || '',
                    req_.sender || '',
                    req_.to || '',
                    ((req_.value_wei || 0) / 1e18).toFixed(6),
                    exec.gas_used || '',
                    risk.score ?? '',
                    risk.level || '',
                    exec.reverted ? 'true' : 'false',
                    (risk.policy_violations || []).join('; '),
                    r.execution_time_s?.toFixed(3) || '',
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
            });

            const csv = [headers.join(','), ...rows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="shadowguard_export_${Date.now()}.csv"`);
            res.send(csv);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="shadowguard_export_${Date.now()}.json"`);
            res.json({ exported_at: new Date().toISOString(), total: records.length, records });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
