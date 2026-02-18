"""
SHADOWGUARD Opcode Analyzer
Analyzes contract bytecode for dangerous opcode patterns.
"""

import logging
from typing import List, Dict

import config
from models.simulation import OpcodeProfile
from rpc.provider import RPCProvider

logger = logging.getLogger(__name__)

# Opcode byte values
OPCODE_SELFDESTRUCT = 0xFF
OPCODE_DELEGATECALL = 0xF4
OPCODE_CALLCODE = 0xF2
OPCODE_CREATE2 = 0xF5
OPCODE_CREATE = 0xF0
OPCODE_SSTORE = 0x55
OPCODE_CALL = 0xF1
OPCODE_STATICCALL = 0xFA

# PUSH opcodes range (PUSH1=0x60 to PUSH32=0x7F)
PUSH1 = 0x60
PUSH32 = 0x7F


class OpcodeAnalyzer:
    """Analyzes EVM bytecode for dangerous opcode patterns."""

    def __init__(self, provider: RPCProvider):
        self.provider = provider

    def analyze(self, contract_address: str) -> OpcodeProfile:
        """
        Fetch and analyze contract bytecode for dangerous opcodes.
        Properly skips PUSH data to avoid false positives.
        """
        bytecode = self.provider.get_code(contract_address)

        if not bytecode:
            logger.debug(f"No bytecode at {contract_address} (EOA or empty contract)")
            return self._empty_profile()

        counts = self._scan_bytecode(bytecode)

        risk_opcodes: List[str] = []
        if counts["selfdestruct"] > 0:
            risk_opcodes.append(f"SELFDESTRUCT (×{counts['selfdestruct']})")
        if counts["delegatecall"] > 0:
            risk_opcodes.append(f"DELEGATECALL (×{counts['delegatecall']})")
        if counts["callcode"] > 0:
            risk_opcodes.append(f"CALLCODE (×{counts['callcode']})")
        if counts["create2"] > 0:
            risk_opcodes.append(f"CREATE2 (×{counts['create2']})")

        has_dangerous = len(risk_opcodes) > 0

        profile = OpcodeProfile(
            selfdestruct_count=counts["selfdestruct"],
            delegatecall_count=counts["delegatecall"],
            callcode_count=counts["callcode"],
            create2_count=counts["create2"],
            create_count=counts["create"],
            sstore_count=counts["sstore"],
            call_count=counts["call"],
            has_dangerous_opcodes=has_dangerous,
            risk_opcodes=risk_opcodes,
            bytecode_size=len(bytecode),
        )

        logger.info(
            f"Opcode analysis: size={len(bytecode)} dangerous={has_dangerous} "
            f"selfdestruct={counts['selfdestruct']} delegatecall={counts['delegatecall']} "
            f"sstore={counts['sstore']}"
        )
        return profile

    def _scan_bytecode(self, bytecode: bytes) -> Dict[str, int]:
        """
        Scan bytecode byte-by-byte, correctly skipping PUSH data.
        This prevents false positives from data bytes matching opcode values.
        """
        counts = {
            "selfdestruct": 0,
            "delegatecall": 0,
            "callcode": 0,
            "create2": 0,
            "create": 0,
            "sstore": 0,
            "call": 0,
            "staticcall": 0,
        }

        i = 0
        while i < len(bytecode):
            byte = bytecode[i]

            if byte == OPCODE_SELFDESTRUCT:
                counts["selfdestruct"] += 1
            elif byte == OPCODE_DELEGATECALL:
                counts["delegatecall"] += 1
            elif byte == OPCODE_CALLCODE:
                counts["callcode"] += 1
            elif byte == OPCODE_CREATE2:
                counts["create2"] += 1
            elif byte == OPCODE_CREATE:
                counts["create"] += 1
            elif byte == OPCODE_SSTORE:
                counts["sstore"] += 1
            elif byte == OPCODE_CALL:
                counts["call"] += 1
            elif byte == OPCODE_STATICCALL:
                counts["staticcall"] += 1

            # Skip PUSH data bytes to avoid false positives
            if PUSH1 <= byte <= PUSH32:
                push_size = byte - PUSH1 + 1
                i += push_size + 1
            else:
                i += 1

        return counts

    def _empty_profile(self) -> OpcodeProfile:
        """Return an empty opcode profile for EOAs or empty contracts."""
        return OpcodeProfile(
            selfdestruct_count=0,
            delegatecall_count=0,
            callcode_count=0,
            create2_count=0,
            create_count=0,
            sstore_count=0,
            call_count=0,
            has_dangerous_opcodes=False,
            risk_opcodes=[],
            bytecode_size=0,
        )

    def compute_trust_score(self, profile: OpcodeProfile, deployment_block: int = 0, current_block: int = 0) -> int:
        """
        Compute a contract trust score (0-100, higher = more trusted).
        Based on code size, dangerous opcodes, and deployment recency.
        """
        score = 100

        # Penalize for dangerous opcodes
        score -= profile.selfdestruct_count * 25
        score -= profile.delegatecall_count * 15
        score -= profile.callcode_count * 20
        score -= profile.create2_count * 10

        # Very small contracts are suspicious (< 100 bytes)
        if 0 < profile.bytecode_size < 100:
            score -= 20

        # Very recently deployed contracts (< 1000 blocks ago)
        if deployment_block > 0 and current_block > 0:
            age_blocks = current_block - deployment_block
            if age_blocks < 1000:
                score -= 15

        return max(0, min(100, score))
