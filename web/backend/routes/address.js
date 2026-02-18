/**
 * GET /api/address/:addr  — on-chain info for any address
 * GET /api/address/:addr/simulations — history involving this address
 */

const express = require('express');
const router = express.Router();
const { runPython } = require('../lib/python');

// Known labels for Sepolia addresses
const KNOWN_LABELS = {
    '0x7b79995e5f793a07bc00c21412e50ecae098e7f9': 'Sepolia WETH',
    '0xc532a74256d3db42d0bf7a0400fefdbad7694008': 'Uniswap V2 Router (Sepolia)',
    '0x6ae43d3271ff6888e7fc43fd7321a503ff738951': 'Aave Pool (Sepolia)',
    '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2',
    '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266': 'Hardhat Account #0',
    '0x0000000000000000000000000000000000000001': 'Precompile: ecRecover',
    '0x0000000000000000000000000000000000000002': 'Precompile: SHA-256',
};

router.get('/:addr', async (req, res) => {
    const addr = req.params.addr.toLowerCase();

    try {
        const lines = await runPython(['network']);
        const netInfo = lines.find(l => l.block !== undefined) || {};

        // Run a quick balance/code check via Python
        const infoLines = await runPython(['address_info', '--address', addr]);
        const info = infoLines.find(l => l.balance_wei !== undefined) || {};

        res.json({
            address: addr,
            label: KNOWN_LABELS[addr] || null,
            balance_wei: info.balance_wei ?? null,
            balance_eth: info.balance_eth ?? null,
            nonce: info.nonce ?? null,
            code_size: info.code_size ?? null,
            is_contract: (info.code_size ?? 0) > 0,
            block: netInfo.block ?? null,
        });
    } catch (err) {
        // Fallback: return what we know without RPC
        res.json({
            address: addr,
            label: KNOWN_LABELS[addr] || null,
            balance_wei: null,
            balance_eth: null,
            nonce: null,
            code_size: null,
            is_contract: null,
            error: err.message,
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
