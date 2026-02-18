"""
SHADOWGUARD Utility Helpers
Shared utility functions used across all modules.
"""

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict

from web3 import Web3


def generate_simulation_id(sender: str, to: str, value: int, data: str) -> str:
    """
    Generate a UNIQUE simulation ID.
    Combines transaction params with high-resolution timestamp + random bytes
    so every run produces a different ID even for identical inputs.
    """
    entropy = f"{time.time_ns()}:{os.urandom(4).hex()}"
    raw = f"{sender.lower()}:{to.lower()}:{value}:{data.lower()}:{entropy}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return "0x" + digest[:12].upper()


def compute_deterministic_hash(record: Dict[str, Any]) -> str:
    """Compute a deterministic hash of a simulation record for replay verification."""
    stable = {
        "simulation_id": record.get("simulation_id"),
        "request": record.get("request"),
        "state_diff": record.get("state_diff"),
        "opcode_profile": record.get("opcode_profile"),
        "risk_report": {
            k: v for k, v in (record.get("risk_report") or {}).items()
            if k != "deterministic_hash"
        },
    }
    serialized = json.dumps(stable, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


def format_eth(wei: int) -> str:
    """Convert Wei to ETH string with 6 decimal places."""
    eth = wei / 1e18
    return f"{eth:.6f} ETH"


def format_wei(wei: int) -> str:
    """Format Wei value with commas."""
    return f"{wei:,} Wei"


def truncate_address(addr: str) -> str:
    """Shorten address for display: 0x1234...ABCD"""
    if len(addr) < 10:
        return addr
    return f"{addr[:6]}...{addr[-4:]}"


def is_valid_address(address: str) -> bool:
    """Check if string is a valid Ethereum address."""
    return Web3.is_address(address)


def is_valid_hex(data: str) -> bool:
    """Check if string is valid hex data (0x-prefixed or empty)."""
    if data in ("0x", "", "0X"):
        return True
    pattern = re.compile(r"^0x[0-9a-fA-F]*$")
    return bool(pattern.match(data))


def now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def wei_to_eth(wei: int) -> float:
    """Convert Wei to ETH float."""
    return wei / 1e18


def eth_to_wei(eth: float) -> int:
    """Convert ETH float to Wei int."""
    return int(eth * 1e18)


def drain_percentage(before_wei: int, after_wei: int) -> float:
    """Calculate percentage of balance drained."""
    if before_wei == 0:
        return 0.0
    delta = before_wei - after_wei
    if delta <= 0:
        return 0.0
    return (delta / before_wei) * 100.0


def risk_level_from_score(score: int) -> str:
    """Map numeric score to risk level string."""
    if score <= 25:
        return "LOW"
    elif score <= 50:
        return "MEDIUM"
    elif score <= 75:
        return "HIGH"
    else:
        return "CRITICAL"


def recommendation_from_level(level: str) -> str:
    """Generate recommendation text from risk level."""
    recommendations = {
        "LOW":      "Transaction appears safe. Proceed with standard caution.",
        "MEDIUM":   "Transaction has moderate risk. Review triggered rules before proceeding.",
        "HIGH":     "Transaction poses significant risk. Manual audit recommended before execution.",
        "CRITICAL": "BLOCK TRANSACTION IMMEDIATELY. High probability of malicious activity detected.",
    }
    return recommendations.get(level, "Unknown risk level.")
