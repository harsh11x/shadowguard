/**
 * GET /api/stats
 * Aggregate analytics across all simulation records.
 */

const express = require('express');
const router = express.Router();
const { runPython } = require('../lib/python');

router.get('/', async (req, res) => {
    try {
        const lines = await runPython(['view_logs', '--limit', '500']);
        const result = lines.find(l => l.records !== undefined);
        const records = result?.records || [];

        const total = records.length;
        const dist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
        let scoreSum = 0;
        let blocked = 0;
        const contractFreq = {};
        const dailyCounts = {};

        for (const r of records) {
            const risk = r.risk_report || {};
            const level = risk.level || 'LOW';
            dist[level] = (dist[level] || 0) + 1;
            scoreSum += risk.score || 0;
            if (risk.policy_violations?.length > 0) blocked++;

            const to = r.request?.to || '';
            if (to) contractFreq[to] = (contractFreq[to] || 0) + 1;

            // Daily bucketing
            const day = (r.timestamp || '').slice(0, 10);
            if (day) dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }

        const avgScore = total > 0 ? Math.round(scoreSum / total) : 0;

        // Top 5 most targeted contracts
        const topContracts = Object.entries(contractFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([addr, count]) => ({ addr, count }));

        // Last 7 days activity
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            last7.push({ date: key, count: dailyCounts[key] || 0 });
        }

        // Recent 5 simulations
        const recent = records.slice(0, 5).map(r => ({
            simulation_id: r.simulation_id,
            timestamp: r.timestamp,
            to: r.request?.to,
            score: r.risk_report?.score,
            level: r.risk_report?.level,
            execution_time_s: r.execution_time_s,
        }));

        res.json({
            total,
            avg_score: avgScore,
            blocked,
            distribution: dist,
            top_contracts: topContracts,
            activity_7d: last7,
            recent,
        });
    } catch (err) {
        console.error('[stats] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
