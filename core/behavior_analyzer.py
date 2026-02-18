"""
SHADOWGUARD Behavioral Analyzer
Analyzes simulation results for behavioral risk patterns.
Uses REAL data: actual gas from eth_estimateGas, real event logs from the chain,
and opcode SSTORE/CALL counts from bytecode analysis.
"""

import logging
from typing import Optional, Dict, Any, List, Tuple

import config
from models.simulation import SimulationResult, BehaviorReport
from rpc.provider import RPCProvider

logger = logging.getLogger(__name__)


class BehaviorAnalyzer:
    """Analyzes transaction behavior from simulation results and on-chain data."""

    def __init__(self, provider: Optional[RPCProvider] = None):
        self.provider = provider

    def analyze(
        self,
        result: SimulationResult,
        gas_limit: int,
        to_address: str = "",
        opcode_sstore_count: int = 0,
        opcode_call_count: int = 0,
    ) -> BehaviorReport:
        """
        Analyze behavioral patterns from simulation result.
        Uses real gas data, real event logs, and real opcode counts.
        """
        flags: List[str] = []

        # ── Gas anomaly — uses REAL gas from eth_estimateGas ─────────────────
        gas_usage_pct = 0.0
        gas_anomaly   = False
        if gas_limit > 0:
            gas_usage_pct = (result.gas_used / gas_limit) * 100.0
            if gas_usage_pct >= config.GAS_ANOMALY_THRESHOLD:
                gas_anomaly = True
                flags.append(f"Gas usage anomaly: {gas_usage_pct:.1f}% of limit consumed")

        # ── Trace-based analysis (if debug_traceCall available) ───────────────
        nested_call_depth    = 0
        external_interactions = 0
        storage_write_count  = 0
        static_call_count    = 0

        if result.trace:
            nested_call_depth, external_interactions, storage_write_count, static_call_count = \
                self._analyze_trace(result.trace, flags)
            logger.debug(f"Trace analysis: depth={nested_call_depth} ext={external_interactions} sstore={storage_write_count}")
        else:
            # ── Real event log analysis (no trace needed) ─────────────────────
            # Use opcode counts from bytecode analysis as ground truth
            # These are REAL values from scanning the deployed bytecode
            storage_write_count  = opcode_sstore_count
            external_interactions = opcode_call_count

            # Estimate call depth from gas: each CALL costs ~700+ gas base
            # Complex DeFi txs with many nested calls use proportionally more gas
            if result.gas_used > 500_000:
                nested_call_depth = 4
            elif result.gas_used > 200_000:
                nested_call_depth = 3
            elif result.gas_used > 100_000:
                nested_call_depth = 2
            elif result.gas_used > 50_000:
                nested_call_depth = 1
            else:
                nested_call_depth = 0

            # Fetch real event logs from the chain if provider available
            if self.provider and to_address:
                try:
                    log_count = self._count_recent_logs(to_address)
                    if log_count > 0:
                        flags.append(f"Contract emitted {log_count} events in recent blocks")
                        # High event activity = more external interactions
                        external_interactions = max(external_interactions, min(log_count, 10))
                    logger.debug(f"Real event log count for {to_address[:10]}…: {log_count}")
                except Exception as e:
                    logger.debug(f"Could not fetch event logs: {e}")

        # ── Nested calls threshold ────────────────────────────────────────────
        if nested_call_depth > config.MAX_NESTED_CALLS:
            flags.append(f"Excessive nested calls: depth={nested_call_depth} (threshold={config.MAX_NESTED_CALLS})")

        # ── Multiple storage writes ───────────────────────────────────────────
        if storage_write_count > 5:
            flags.append(f"Multiple storage writes detected: {storage_write_count} SSTORE operations")

        # ── Revert flag ───────────────────────────────────────────────────────
        if result.reverted:
            flags.append(f"Transaction reverted: {result.revert_reason or 'unknown reason'}")

        report = BehaviorReport(
            nested_call_depth=nested_call_depth,
            gas_anomaly=gas_anomaly,
            gas_usage_pct=gas_usage_pct,
            external_interactions=external_interactions,
            storage_write_count=storage_write_count,
            static_call_count=static_call_count,
            behavior_flags=flags,
        )

        logger.info(
            f"Behavior analysis: depth={nested_call_depth} gas_anomaly={gas_anomaly} "
            f"gas_pct={gas_usage_pct:.1f}% external={external_interactions} "
            f"storage_writes={storage_write_count}"
        )
        return report

    def _count_recent_logs(self, address: str, blocks_back: int = 100) -> int:
        """Count real event logs emitted by the contract in recent blocks."""
        try:
            current_block = self.provider.get_block_number()
            from_block    = max(0, current_block - blocks_back)
            logs = self.provider.w3.eth.get_logs({
                "fromBlock": from_block,
                "toBlock":   "latest",
                "address":   address,
            })
            return len(logs)
        except Exception as e:
            logger.debug(f"get_logs failed: {e}")
            return 0

    def _analyze_trace(
        self,
        trace: Dict[str, Any],
        flags: List[str],
    ) -> Tuple[int, int, int, int]:
        """Recursively analyze call trace for behavioral patterns."""
        max_depth     = [0]
        external_count = [0]
        storage_writes = [0]
        static_calls   = [0]

        def recurse(call: Dict[str, Any], depth: int):
            max_depth[0] = max(max_depth[0], depth)
            call_type = call.get("type", "").upper()
            if call_type in ("CALL", "DELEGATECALL", "CALLCODE", "STATICCALL"):
                external_count[0] += 1
            if call_type == "STATICCALL":
                static_calls[0] += 1
            if "opcodes" in call:
                storage_writes[0] += call["opcodes"].count("SSTORE")
            for sub_call in call.get("calls", []):
                recurse(sub_call, depth + 1)

        recurse(trace, 0)

        if external_count[0] > 3:
            flags.append(f"Multiple external contract interactions: {external_count[0]}")

        return max_depth[0], external_count[0], storage_writes[0], static_calls[0]
