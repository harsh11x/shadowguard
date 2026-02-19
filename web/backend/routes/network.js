/**
 * GET /api/network?network=ethereum
 * Real-time chain data via ethers.js — no Python subprocess needed.
 */

const express = require('express');
const router = express.Router();
const { getHttpProvider, getChainConfig } = require('../lib/chains');
const { ethers } = require('ethers');

router.get('/', async (req, res) => {
    const network = req.query.network || 'ethereum';

    try {
        const provider = getHttpProvider(network);
        const cfg = getChainConfig(network);

        const [blockNumber, feeData] = await Promise.all([
            provider.getBlockNumber(),
            provider.getFeeData().catch(() => ({})),
        ]);

        const gasPrice = feeData.gasPrice ? parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')) : null;
        const maxFee = feeData.maxFeePerGas ? parseFloat(ethers.formatUnits(feeData.maxFeePerGas, 'gwei')) : null;

        res.json({
            network,
            chain_id: cfg.id,
            name: cfg.name,
            symbol: cfg.symbol,
            block: blockNumber,
            gas_price_gwei: gasPrice ? gasPrice.toFixed(2) : null,
            max_fee_gwei: maxFee ? maxFee.toFixed(2) : null,
            explorer: cfg.explorer,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[network] Error:', err.message);
        res.status(503).json({ error: 'Could not connect to network: ' + err.message });
    }
});

module.exports = router;
