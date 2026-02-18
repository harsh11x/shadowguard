/**
 * SHADOWGUARD Express.js API Server
 * Bridges the React frontend to the Python simulation engine.
 * Port: 3001
 */

require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');

const simulateRouter = require('./routes/simulate');
const historyRouter = require('./routes/history');
const policyRouter = require('./routes/policy');
const networkRouter = require('./routes/network');

const app = express();
const PORT = process.env.API_PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/simulate', simulateRouter);
app.use('/api/history', historyRouter);
app.use('/api/policy', policyRouter);
app.use('/api/network', networkRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SHADOWGUARD API', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
    console.log(`\n  ██████╗ SHADOWGUARD API`);
    console.log(`  ██╔══██╗ Port: ${PORT}`);
    console.log(`  ██████╔╝ http://localhost:${PORT}/api/health`);
    console.log(`  ╚═════╝  Python engine: ${path.resolve('../../main.py')}\n`);
});

module.exports = app;
