/**
 * POST /api/simulate
 * Streams simulation progress via Server-Sent Events (SSE).
 * Each of the 8 Python steps is pushed to the client as it completes.
 */

const express = require('express');
const router = express.Router();
const { spawnStream } = require('../lib/python');

router.post('/', (req, res) => {
    const { from: sender, to, value = 0, data = '0x', gas } = req.body;

    if (!sender || !to) {
        return res.status(400).json({ error: 'Missing required fields: from, to' });
    }

    // ── SSE headers ────────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (obj) => {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    // Build Python args
    const args = [
        'simulate',
        '--from', sender,
        '--to', to,
        '--value', String(value),
        '--data', data || '0x',
    ];
    if (gas) args.push('--gas', String(gas));

    send({ type: 'start', message: 'Simulation started' });

    const handle = spawnStream(
        args,
        (line) => {
            // Forward every JSON line from Python to the SSE client
            send(line);
        },
        (code) => {
            if (code !== 0) {
                send({ type: 'error', message: `Python process exited with code ${code}` });
            }
            send({ type: 'done' });
            res.end();
        }
    );

    // Clean up if client disconnects
    req.on('close', () => handle.kill());
});

module.exports = router;
