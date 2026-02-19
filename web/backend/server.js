/**
 * SHADOWGUARD Express.js API Server
 * Bridges the React frontend to the Python simulation engine.
 * Real blockchain data is served directly via ethers.js.
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
const statsRouter = require('./routes/stats');
const addressRouter = require('./routes/address');
const exportRouter = require('./routes/export');
const batchRouter = require('./routes/batch');
const liveRouter = require('./routes/live');
const developerRouter = require('./routes/developer');
const v1Router = require('./routes/v1');

const app = express();
const PORT = process.env.API_PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ── Internal Routes ───────────────────────────────────────────────────────────
app.use('/api/simulate', simulateRouter);
app.use('/api/history', historyRouter);
app.use('/api/policy', policyRouter);
app.use('/api/network', networkRouter);
app.use('/api/stats', statsRouter);
app.use('/api/address', addressRouter);
app.use('/api/export', exportRouter);
app.use('/api/batch', batchRouter);
app.use('/api/live', liveRouter);

// ── Developer Portal / Key Management ────────────────────────────────────────
app.use('/api/developer', developerRouter);

// ── Public External API (requires API key) ───────────────────────────────────
app.use('/api/v1', v1Router);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'SHADOWGUARD API',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            simulate: '/api/simulate',
            live: '/api/live/stream',
            network: '/api/network',
            developer: '/api/developer/keys',
            publicApi: '/api/v1/simulate',
        }
    });
});

// ── Plans info (public) ───────────────────────────────────────────────────────
app.get('/api/plans', (req, res) => {
    const { PLANS } = require('./lib/db');
    res.json({ plans: PLANS });
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ██████╗ SHADOWGUARD API v2.0`);
    console.log(`  ██╔══██╗ Port: ${PORT}`);
    console.log(`  ██████╔╝ Health: http://localhost:${PORT}/api/health`);
    console.log(`  ╚═════╝  Public API: http://localhost:${PORT}/api/v1/simulate\n`);
});

module.exports = app;
