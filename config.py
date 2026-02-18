"""
SHADOWGUARD Configuration Module
Ethereum Sepolia Testnet configuration.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ─── Network ──────────────────────────────────────────────────────────────────
NETWORK_NAME = "Ethereum Sepolia Testnet"
CHAIN_ID = 11155111

# Primary RPC
POLYGON_RPC_URL: str = os.getenv(
    "ETH_RPC_URL",
    "https://ethereum-sepolia-rpc.publicnode.com"
)

# Fallback RPCs tried in order if primary fails
RPC_FALLBACKS: list = [
    r.strip() for r in os.getenv(
        "ETH_RPC_FALLBACKS",
        "https://sepolia.drpc.org,https://rpc.sepolia.org,https://rpc2.sepolia.org"
    ).split(",") if r.strip()
]

# ─── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
LOG_LEVEL_INT: int = getattr(logging, LOG_LEVEL.upper(), logging.INFO)

# ─── Storage ──────────────────────────────────────────────────────────────────
DB_PATH: str = os.getenv("DB_PATH", "shadowguard.db")
POLICY_FILE: str = os.getenv("POLICY_FILE", "policy.json")

# ─── Simulation Parameters ────────────────────────────────────────────────────
SIMULATION_TIMEOUT: int = int(os.getenv("SIMULATION_TIMEOUT", "15"))
GAS_ANOMALY_THRESHOLD: int = int(os.getenv("GAS_ANOMALY_THRESHOLD", "80"))
MAX_NESTED_CALLS: int = int(os.getenv("MAX_NESTED_CALLS", "5"))
DEFAULT_GAS_LIMIT: int = 3_000_000

# ─── Risk Scoring Weights ─────────────────────────────────────────────────────
RISK_WEIGHTS = {
    "balance_drain_50pct":      40,
    "ownership_changed":        50,
    "selfdestruct_detected":    30,
    "delegatecall_detected":    20,
    "nested_calls_exceeded":    20,
    "gas_anomaly":              15,
    "create2_detected":         10,
    "multiple_storage_writes":  10,
    "callcode_detected":        15,
    "contract_reverted":         5,
}

# ─── Risk Levels ──────────────────────────────────────────────────────────────
RISK_LEVELS = {
    (0, 25):   "LOW",
    (26, 50):  "MEDIUM",
    (51, 75):  "HIGH",
    (76, 100): "CRITICAL",
}

# ─── Dangerous Opcodes ────────────────────────────────────────────────────────
DANGEROUS_OPCODES = {
    0xFF: "SELFDESTRUCT",
    0xF4: "DELEGATECALL",
    0xF2: "CALLCODE",
    0xF5: "CREATE2",
    0xF0: "CREATE",
    0x55: "SSTORE",
    0xF1: "CALL",
    0xFA: "STATICCALL",
}

# ─── Storage Slots to Monitor ─────────────────────────────────────────────────
MONITORED_STORAGE_SLOTS = [0, 1, 2, 3]  # owner, paused, admin, implementation

# ─── App Info ─────────────────────────────────────────────────────────────────
APP_NAME = "SHADOWGUARD"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "Deterministic Pre-Execution Blockchain Security Proxy"

# ─── Known Sepolia Test Addresses ─────────────────────────────────────────────
# Real deployed contracts on Sepolia for testing
SEPOLIA_TEST_ADDRESSES = {
    # Uniswap V2 Router on Sepolia
    "uniswap_router": "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
    # WETH on Sepolia
    "weth": "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    # USDC on Sepolia (Circle)
    "usdc": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    # Aave V3 Pool on Sepolia
    "aave_pool": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    # Generic test EOA (has ETH on Sepolia faucet)
    "test_sender": "0x0000000000000000000000000000000000000001",
}
