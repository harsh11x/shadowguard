/**
 * lib/chains.js
 * Multi-chain RPC configuration with public fallback endpoints.
 * Uses ethers.js providers.
 */

const { ethers } = require('ethers');

const CHAIN_CONFIGS = {
    ethereum: {
        id: 1,
        name: 'Ethereum Mainnet',
        symbol: 'ETH',
        rpcHttp: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
        rpcWs: process.env.ETH_WS_URL || 'wss://ethereum-rpc.publicnode.com',
        explorer: 'https://etherscan.io',
    },
    sepolia: {
        id: 11155111,
        name: 'Ethereum Sepolia',
        symbol: 'ETH',
        rpcHttp: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
        rpcWs: process.env.SEPOLIA_WS_URL || 'wss://ethereum-sepolia-rpc.publicnode.com',
        explorer: 'https://sepolia.etherscan.io',
    },
    polygon: {
        id: 137,
        name: 'Polygon',
        symbol: 'MATIC',
        rpcHttp: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
        rpcWs: process.env.POLYGON_WS_URL || 'wss://polygon-bor-rpc.publicnode.com',
        explorer: 'https://polygonscan.com',
    },
    bsc: {
        id: 56,
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        rpcHttp: process.env.BSC_RPC_URL || 'https://bsc-dataseed.bnbchain.org',
        rpcWs: process.env.BSC_WS_URL || 'wss://bsc-rpc.publicnode.com',
        explorer: 'https://bscscan.com',
    },
    arbitrum: {
        id: 42161,
        name: 'Arbitrum One',
        symbol: 'ETH',
        rpcHttp: process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        rpcWs: process.env.ARB_WS_URL || 'wss://arbitrum-one-rpc.publicnode.com',
        explorer: 'https://arbiscan.io',
    },
};

// Cache HTTP providers (they're stateless, reuse them)
const _httpProviders = {};

function getHttpProvider(network = 'ethereum') {
    const cfg = CHAIN_CONFIGS[network] || CHAIN_CONFIGS.ethereum;
    if (!_httpProviders[network]) {
        _httpProviders[network] = new ethers.JsonRpcProvider(cfg.rpcHttp);
    }
    return _httpProviders[network];
}

// WebSocket providers are created fresh each time (stateful streams)
function getWsProvider(network = 'ethereum') {
    const cfg = CHAIN_CONFIGS[network] || CHAIN_CONFIGS.ethereum;
    return new ethers.WebSocketProvider(cfg.rpcWs);
}

function getChainConfig(network = 'ethereum') {
    return CHAIN_CONFIGS[network] || CHAIN_CONFIGS.ethereum;
}

module.exports = { getHttpProvider, getWsProvider, getChainConfig, CHAIN_CONFIGS };
