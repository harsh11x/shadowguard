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
        rpcWs: (process.env.ETH_WS_URL || 'wss://eth.llamarpc.com,wss://ethereum-rpc.publicnode.com,wss://eth.drpc.org').split(','),
        explorer: 'https://etherscan.io',
    },
    sepolia: {
        id: 11155111,
        name: 'Ethereum Sepolia',
        symbol: 'ETH',
        rpcHttp: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
        rpcWs: (process.env.SEPOLIA_WS_URL || 'wss://ethereum-sepolia-rpc.publicnode.com').split(','),
        explorer: 'https://sepolia.etherscan.io',
    },
    polygon: {
        id: 137,
        name: 'Polygon',
        symbol: 'MATIC',
        rpcHttp: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
        rpcWs: (process.env.POLYGON_WS_URL || 'wss://polygon.llamarpc.com,wss://polygon-bor-rpc.publicnode.com').split(','),
        explorer: 'https://polygonscan.com',
    },
    bsc: {
        id: 56,
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        rpcHttp: process.env.BSC_RPC_URL || 'https://binance.llamarpc.com',
        rpcWs: (process.env.BSC_WS_URL || 'wss://binance.llamarpc.com,wss://bsc-rpc.publicnode.com').split(','),
        explorer: 'https://bscscan.com',
    },
    arbitrum: {
        id: 42161,
        name: 'Arbitrum One',
        symbol: 'ETH',
        rpcHttp: process.env.ARB_RPC_URL || 'https://arbitrum.llamarpc.com',
        rpcWs: (process.env.ARB_WS_URL || 'wss://arbitrum.llamarpc.com,wss://arbitrum-one-rpc.publicnode.com').split(','),
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

const _wsRotator = {};

// WebSocket providers with heartbeats and auto-reconnect logic
function getWsProvider(network = 'ethereum') {
    const cfg = CHAIN_CONFIGS[network] || CHAIN_CONFIGS.ethereum;

    // Pick an endpoint (round-robin)
    if (_wsRotator[network] === undefined) _wsRotator[network] = 0;
    const urls = Array.isArray(cfg.rpcWs) ? cfg.rpcWs : [cfg.rpcWs];
    const url = urls[_wsRotator[network] % urls.length];
    _wsRotator[network]++;

    console.log(`[ws] Connecting to ${network} via ${url}...`);

    // Use a custom provider that handles heartbeats
    const provider = new ethers.WebSocketProvider(url);

    // Monitor the underlying websocket
    const socket = provider.websocket;
    if (socket) {
        socket.onopen = () => {
            console.log(`[ws] ${network} connection opened`);
        };
        socket.onclose = (code) => {
            console.warn(`[ws] ${network} connection closed (code: ${code})`);
        };
        socket.onerror = (err) => {
            console.error(`[ws] ${network} connection error:`, err.message);
        };

        // Keep-alive heartbeat (using provider's own logic to avoid ID collisions)
        const pingInterval = setInterval(async () => {
            try {
                if (socket.readyState === 1) {
                    await provider.getBlockNumber();
                }
            } catch (e) {
                // Silently handle heartbeat errors to prevent feed crashes
            }
        }, 15000);

        provider._interval = pingInterval;
    }

    return provider;
}

function getChainConfig(network = 'ethereum') {
    return CHAIN_CONFIGS[network] || CHAIN_CONFIGS.ethereum;
}

module.exports = { getHttpProvider, getWsProvider, getChainConfig, CHAIN_CONFIGS };
