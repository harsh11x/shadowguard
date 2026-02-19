/**
 * GET /api/live/stream?network=ethereum
 * Real-time pending transaction stream via ethers.js WebSocket.
 * Streams as Server-Sent Events (SSE) to the frontend.
 * 
 * Each transaction is enriched with a quick heuristic risk score
 * based on value, gas limit, and calldata patterns.
 */

const express = require('express');
const router = express.Router();
const { getWsProvider, getChainConfig, CHAIN_CONFIGS } = require('../lib/chains');
const { ethers } = require('ethers');

// Known high-risk function selectors
const RISKY_SELECTORS = {
    '0xa9059cbb': 'transfer()',
    '0x23b872dd': 'transferFrom()',
    '0x095ea7b3': 'approve()',
    '0x42842e0e': 'safeTransferFrom()',
    '0x629a4a6c': 'selfDestruct()',
    '0xdeadbeef': 'unknown_risky',
};

const KNOWN_CONTRACTS = {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange',
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
};

function computeRiskScore(tx) {
    let score = 0;
    const reasons = [];

    const value = tx.value || 0n;
    const ethVal = parseFloat(ethers.formatEther(value));

    if (ethVal > 100) { score += 40; reasons.push(`High value transfer: ${ethVal.toFixed(2)} ETH`); }
    else if (ethVal > 10) { score += 20; reasons.push(`Large value: ${ethVal.toFixed(2)} ETH`); }
    else if (ethVal > 1) { score += 10; }

    if (tx.data && tx.data.length > 2) {
        const selector = tx.data.slice(0, 10);
        if (RISKY_SELECTORS[selector]) {
            score += 25;
            reasons.push(`Risky function: ${RISKY_SELECTORS[selector]}`);
        }
        if (tx.data.length > 1000) { score += 10; reasons.push('Large calldata payload'); }
    }

    const gasLimit = Number(tx.gasLimit || tx.gas || 0);
    if (gasLimit > 500000) { score += 15; reasons.push('High gas limit'); }
    else if (gasLimit > 200000) { score += 5; }

    // No destination (contract creation)
    if (!tx.to) { score += 30; reasons.push('Contract creation'); }

    return { score: Math.min(score, 100), reasons };
}

function classifyRisk(score) {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
}

router.get('/stream', async (req, res) => {
    const network = req.query.network || 'ethereum';
    const cfg = getChainConfig(network);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data) => {
        try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (_) { }
    };

    console.log(`[live] Starting WebSocket stream for ${network}...`);

    let provider;
    let txCount = 0;
    const MAX_PER_SESSION = 200;

    try {
        provider = getWsProvider(network);

        send({ type: 'connected', network, chain_id: cfg.id, message: `Connected to ${cfg.name} mempool` });

        provider.on('pending', async (txHash) => {
            if (txCount >= MAX_PER_SESSION) return;

            try {
                const tx = await provider.getTransaction(txHash);
                if (!tx) return;

                txCount++;
                const { score, reasons } = computeRiskScore(tx);
                const risk = classifyRisk(score);

                send({
                    type: 'tx',
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value?.toString() || '0',
                    value_eth: parseFloat(ethers.formatEther(tx.value || 0n)).toFixed(6),
                    gas_limit: tx.gasLimit?.toString(),
                    data: tx.data?.slice(0, 66) || '0x',
                    has_data: (tx.data?.length || 0) > 2,
                    known_contract: KNOWN_CONTRACTS[tx.to?.toLowerCase()] || null,
                    risk_score: score,
                    risk_level: risk,
                    risk_reasons: reasons,
                    network,
                    timestamp: new Date().toISOString(),
                });
            } catch (_) {
                // Transaction not found or network error — skip silently
            }
        });

        provider.on('error', (err) => {
            console.error(`[live-ws] ${network} error:`, err.message);
            send({ type: 'error', message: 'WebSocket error: ' + err.message });
        });

    } catch (err) {
        send({ type: 'error', message: `Failed to connect to ${network}: ${err.message}` });
        res.end();
        return;
    }

    req.on('close', () => {
        console.log(`[live] Client disconnected from ${network} stream (${txCount} tx sent)`);
        try {
            if (provider) provider.destroy();
        } catch (_) { }
    });
});

// GET /api/live/networks — list available networks for streaming
router.get('/networks', (req, res) => {
    const available = Object.entries(CHAIN_CONFIGS).map(([id, cfg]) => ({
        id,
        name: cfg.name,
        symbol: cfg.symbol,
        chain_id: cfg.id,
        explorer: cfg.explorer,
    }));
    res.json({ networks: available });
});

module.exports = router;
