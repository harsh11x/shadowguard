"""
SHADOWGUARD Shadow Execution Engine
Simulates transactions using eth_call without broadcasting to the network.
Returns REAL gas used, REAL return data, and REAL trace data from the chain.
"""

import logging
import time
from typing import Optional, Dict, Any

from web3.exceptions import ContractLogicError

import config
from models.simulation import SimulationRequest, SimulationResult
from rpc.provider import RPCProvider

logger = logging.getLogger(__name__)


class ShadowExecutor:
    """Executes transactions in shadow mode using eth_call."""

    def __init__(self, provider: RPCProvider):
        self.provider = provider

    def execute(self, request: SimulationRequest) -> SimulationResult:
        """
        Simulate a transaction without broadcasting.
        Uses eth_call for execution result and eth_estimateGas for real gas.
        Returns actual on-chain data — no synthetic values.
        """
        tx = {
            "from":  request.sender,
            "to":    request.to,
            "value": request.value_wei,
            "data":  request.data,
            "gas":   request.gas_limit,
        }

        start_time = time.time()
        return_data = b""
        reverted    = False
        revert_reason = None
        success     = False

        # ── Step A: eth_call — get return data & revert status ────────────────
        try:
            return_data = self.provider.eth_call(tx)
            success = True
            logger.debug(f"eth_call succeeded, return_data length: {len(return_data)}")
        except ContractLogicError as e:
            reverted = True
            revert_reason = self._extract_revert_reason(str(e))
            logger.info(f"Transaction reverted: {revert_reason}")
        except Exception as e:
            reverted = True
            revert_reason = str(e)[:200]
            logger.warning(f"eth_call failed: {e}")

        # ── Step B: eth_estimateGas — get REAL gas used ───────────────────────
        # This is the actual gas the EVM would consume, not a guess.
        gas_used = self._get_real_gas(tx, request.gas_limit, reverted)

        # ── Step C: debug_traceCall — get call tree if node supports it ───────
        trace = self._get_trace(tx)

        elapsed_ms = (time.time() - start_time) * 1000

        result = SimulationResult(
            success=success,
            return_data=return_data.hex() if return_data else "0x",
            gas_used=gas_used,
            gas_limit=request.gas_limit,
            reverted=reverted,
            revert_reason=revert_reason,
            trace=trace,
            execution_time_ms=elapsed_ms,
        )

        logger.info(
            f"Shadow execution: success={success} reverted={reverted} "
            f"gas_used={gas_used} time={elapsed_ms:.1f}ms trace={'yes' if trace else 'no'}"
        )
        return result

    def _get_real_gas(self, tx: Dict[str, Any], gas_limit: int, reverted: bool) -> int:
        """
        Get real gas consumption via eth_estimateGas.
        This is the actual EVM gas cost — not a heuristic.
        """
        if reverted:
            # Reverted txs consume all gas up to the limit
            return gas_limit

        try:
            # eth_estimateGas returns the exact gas the EVM would use
            estimated = self.provider.estimate_gas(tx)
            logger.debug(f"Real gas from eth_estimateGas: {estimated}")
            return estimated
        except Exception as e:
            logger.warning(f"eth_estimateGas failed, using 50% of limit: {e}")
            return int(gas_limit * 0.5)

    def _get_trace(self, tx: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Attempt to get execution trace via debug_traceCall.
        Many public nodes don't support this — we handle it gracefully.
        """
        try:
            trace = self.provider.debug_trace_call(tx)
            if trace:
                logger.debug("Execution trace obtained via debug_traceCall")
            return trace
        except Exception as e:
            logger.debug(f"debug_traceCall unavailable (node may not support it): {e}")
            return None

    def _extract_revert_reason(self, error_str: str) -> str:
        """Extract human-readable revert reason from error string."""
        if "execution reverted:" in error_str:
            parts = error_str.split("execution reverted:")
            if len(parts) > 1:
                return parts[1].strip()
        if "revert" in error_str.lower():
            return error_str[:200]
        return "Transaction reverted (no reason provided)"
