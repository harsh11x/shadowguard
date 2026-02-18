"""
SHADOWGUARD Transaction Interceptor
Validates and normalizes raw transaction inputs into SimulationRequest objects.
"""

import logging
from typing import Optional

from web3 import Web3

import config
from models.simulation import SimulationRequest
from rpc.provider import RPCProvider
from utils.helpers import (
    generate_simulation_id,
    is_valid_address,
    is_valid_hex,
    now_iso,
    eth_to_wei,
)

logger = logging.getLogger(__name__)


class InterceptorError(Exception):
    """Raised when transaction validation fails."""
    pass


class TransactionInterceptor:
    """Validates and normalizes transaction parameters before simulation."""

    def __init__(self, provider: RPCProvider):
        self.provider = provider

    def intercept(
        self,
        sender: str,
        to: str,
        value_eth: float,
        data: str,
        gas_limit: Optional[int] = None,
    ) -> SimulationRequest:
        """
        Validate and normalize transaction parameters.
        Returns a SimulationRequest ready for simulation.
        """
        # ── Address validation ──────────────────────────────────────────────
        sender = self._validate_address(sender, "sender (--from)")
        to = self._validate_address(to, "recipient (--to)")

        # ── Value validation ────────────────────────────────────────────────
        if value_eth < 0:
            raise InterceptorError("Transaction value cannot be negative.")
        value_wei = eth_to_wei(value_eth)

        # ── Data validation ─────────────────────────────────────────────────
        data = self._validate_data(data)

        # ── Gas estimation ──────────────────────────────────────────────────
        if gas_limit is None or gas_limit <= 0:
            gas_limit = self._estimate_gas(sender, to, value_wei, data)

        # ── Build request ───────────────────────────────────────────────────
        sim_id = generate_simulation_id(sender, to, value_wei, data)
        timestamp = now_iso()

        request = SimulationRequest(
            sender=sender,
            to=to,
            value_wei=value_wei,
            data=data,
            gas_limit=gas_limit,
            simulation_id=sim_id,
            timestamp=timestamp,
        )

        logger.info(
            f"Intercepted transaction: id={sim_id} from={sender[:10]}... "
            f"to={to[:10]}... value={value_wei} gas={gas_limit}"
        )
        return request

    def _validate_address(self, address: str, label: str) -> str:
        """Validate and checksum-encode an Ethereum address."""
        if not address or not isinstance(address, str):
            raise InterceptorError(f"Missing {label} address.")
        address = address.strip()
        if not is_valid_address(address):
            raise InterceptorError(
                f"Invalid Ethereum address for {label}: '{address}'. "
                "Must be a 42-character hex string starting with 0x."
            )
        return Web3.to_checksum_address(address)

    def _validate_data(self, data: str) -> str:
        """Validate hex calldata payload."""
        if data is None:
            return "0x"
        data = data.strip()
        if data == "":
            return "0x"
        if not data.startswith("0x") and not data.startswith("0X"):
            # Try to be helpful and prefix it
            data = "0x" + data
        if not is_valid_hex(data):
            raise InterceptorError(
                f"Invalid hex data payload: '{data[:40]}...'. "
                "Must be a valid 0x-prefixed hex string."
            )
        return data.lower()

    def _estimate_gas(self, sender: str, to: str, value_wei: int, data: str) -> int:
        """Estimate gas, falling back to default on failure."""
        tx = {
            "from": sender,
            "to": to,
            "value": value_wei,
            "data": data,
        }
        estimated = self.provider.estimate_gas(tx)
        # Add 20% buffer
        buffered = int(estimated * 1.2)
        logger.debug(f"Gas estimated: {estimated} → buffered: {buffered}")
        return min(buffered, config.DEFAULT_GAS_LIMIT)
