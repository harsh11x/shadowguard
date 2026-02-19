/**
 * GET /api/address/:addr  — real on-chain info via ethers.js
 * GET /api/address/:addr/simulations — simulation history for address
 */

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { getHttpProvider } = require('../lib/chains');
const { runPython } = require('../lib/python');

const KNOWN_LABELS = {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
    '0x00000000219ab540356cbb839cbe05303d7705fa': 'ETH2 Deposit Contract',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH (Wrapped Ether)',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USD Coin (USDC)',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'Tether (USDT)',
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'Dai Stablecoin',
    '0x7b79995e5f793a07bc00c21412e50ecae098e7f9': 'Sepolia WETH',
    '0x0000000000000000000000000000000000000001': 'Precompile: ecRecover',
    '0x0000000000000000000000000000000000000002': 'Precompile: SHA-256',
    '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2',
};

router.get('/:addr', async (req, res) => {
    const addr = req.params.addr.toLowerCase();
    const network = req.query.network || 'ethereum';

    if (!ethers.isAddress(addr)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    try {
        const provider = getHttpProvider(network);
        const [balance, nonce, code, blockNumber] = await Promise.all([
            provider.getBalance(addr),
            provider.getTransactionCount(addr),
            provider.getCode(addr),
            provider.getBlockNumber(),
        ]);

        const codeSize = code === '0x' ? 0 : (code.length - 2) / 2;

        res.json({
            address: addr,
            network,
            label: KNOWN_LABELS[addr] || null,
            balance_wei: balance.toString(),
            balance_eth: parseFloat(ethers.formatEther(balance)).toFixed(6),
            nonce,
            code_size: codeSize,
            is_contract: codeSize > 0,
            block: blockNumber,
        });
    } catch (err) {
        res.status(503).json({
            address: addr,
            label: KNOWN_LABELS[addr] || null,
            error: 'Could not fetch on-chain data: ' + err.message,
        });
    }
});

router.get('/:addr/simulations', async (req, res) => {
    const addr = req.params.addr.toLowerCase();
    try {
        const lines = await runPython(['view_logs', '--limit', '200']);
        const result = lines.find(l => l.records !== undefined);
        const records = (result?.records || []).filter(r => {
            const req_ = r.request || {};
            return (req_.sender || '').toLowerCase() === addr ||
                (req_.to || '').toLowerCase() === addr;
        });
        res.json({ address: addr, records, total: records.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
