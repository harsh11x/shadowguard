const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('[live] Starting transaction stream...');

    // Path to the main Python engine
    const mainPy = path.join(__dirname, '../../../main.py');

    // Spawn the stream_transactions command
    // We use a reasonable limit per block to avoid flooding
    const proc = spawn('python3', [mainPy, 'stream_transactions', '--limit', '25']);

    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                // Verify it's valid JSON before sending
                JSON.parse(line);
                res.write(`data: ${line}\n\n`);
            } catch (e) {
                // Might be a partial line or non-json message
            }
        }
    });

    proc.stderr.on('data', (data) => {
        // Log errors but don't crash
        console.error(`[live-py-err] ${data.toString()}`);
    });

    req.on('close', () => {
        console.log('[live] SSE connection closed. Ending process.');
        proc.kill();
    });
});

module.exports = router;
