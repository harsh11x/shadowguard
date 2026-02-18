/**
 * GET /api/history?limit=20&search=&level=&from_addr=&to_addr=
 * Returns past simulation records from SQLite, with optional filtering.
 */

const express = require('express');
const router = express.Router();
const { runPython } = require('../lib/python');

router.get('/', async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const search = (req.query.search || '').toLowerCase();
    const levelFilter = (req.query.level || '').toUpperCase();
    const fromAddr = (req.query.from_addr || '').toLowerCase();
    const toAddr = (req.query.to_addr || '').toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;

    try {
        const lines = await runPython(['view_logs', '--limit', String(limit)]);
        const result = lines.find(l => l.records !== undefined);
        let records = result?.records || [];

        // Apply filters
        if (search) {
            records = records.filter(r => {
                const req_ = r.request || {};
                return (
                    (r.simulation_id || '').toLowerCase().includes(search) ||
                    (req_.sender || '').toLowerCase().includes(search) ||
                    (req_.to || '').toLowerCase().includes(search)
                );
            });
        }
        if (levelFilter && levelFilter !== 'ALL') {
            records = records.filter(r => (r.risk_report?.level || 'LOW') === levelFilter);
        }
        if (fromAddr) {
            records = records.filter(r => (r.request?.sender || '').toLowerCase().includes(fromAddr));
        }
        if (toAddr) {
            records = records.filter(r => (r.request?.to || '').toLowerCase().includes(toAddr));
        }

        // Paginate
        const total = records.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const paginated = records.slice(start, start + pageSize);

        res.json({
            records: paginated,
            total,
            page,
            page_size: pageSize,
            total_pages: totalPages,
        });
    } catch (err) {
        console.error('[history] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
