/**
 * routes/v1.js
 * Public external API — requires X-API-Key header.
 * This is what external developers integrate into their own projects.
 * 
 * POST /api/v1/simulate  → run a pre-execution simulation
 * GET  /api/v1/address/:address → lookup an address
 * GET  /api/v1/network   → current network status
 */

const express = require('express');
const router = express.Router();
const apiAuth = require('../middleware/apiAuth');
const { spawnStream } = require('../lib/python');
const { getHttpProvider } = require('../lib/chains');
const { ethers } = require('ethers');

// All v1 routes require an API key
router.use(apiAuth);

// POST /api/v1/simulate
// Same as internal simulate, but rate-limited and authenticated
router.post('/simulate', (req, res) => {
    const { from, to, value = 0, data = '0x', gas, network = 'ethereum' } = req.body;

    if (!from || !to) {
        return res.status(400).json({ error: 'Missing required fields: from, to' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // Expose plan info in response headers
    res.setHeader('X-Plan', req.apiKey.plan);
    res.setHeader('X-Usage', req.apiKey.usage_count);
    res.flushHeaders();

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    const args = [
        'simulate',
        '--from', from,
        '--to', to,
        '--value', String(value),
        '--data', data || '0x',
    ];
    if (gas) args.push('--gas', String(gas));
    if (network && network !== 'ethereum') args.push('--network', network);

    const handle = spawnStream(
        args,
        (line) => send(line),
        (code, signal) => {
            if (code !== 0 && code !== null) {
                send({ type: 'error', message: `Simulation engine exited with code ${code}` });
            }
            send({ type: 'done', apiKey: req.apiKey.key_prefix, plan: req.apiKey.plan });
            res.end();
        }
    );

    res.on('close', () => handle.kill());
});

// GET /api/v1/address/:address
router.get('/address/:address', async (req, res) => {
    const { address } = req.params;
    const { network = 'ethereum' } = req.query;

    if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    try {
        const provider = getHttpProvider(network);
        const [balance, nonce, code] = await Promise.all([
            provider.getBalance(address),
            provider.getTransactionCount(address),
            provider.getCode(address),
        ]);

        res.json({
            address,
            network,
            balance: balance.toString(),
            balance_eth: ethers.formatEther(balance),
            nonce,
            is_contract: code !== '0x',
            code_size: code === '0x' ? 0 : (code.length - 2) / 2,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/v1/network
router.get('/network', async (req, res) => {
    const { network = 'ethereum' } = req.query;
    try {
        const provider = getHttpProvider(network);
        const [block, feeData] = await Promise.all([
            provider.getBlockNumber(),
            provider.getFeeData(),
        ]);
        res.json({
            network,
            block,
            gas_price_gwei: feeData.gasPrice ? parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')).toFixed(2) : null,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
