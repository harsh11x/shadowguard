"""
SHADOWGUARD RPC Provider
Ethereum Sepolia Testnet — with automatic fallback across multiple public RPCs.
"""

import logging
import time
from typing import Optional, Dict, Any, List

from web3 import Web3
from web3.exceptions import ContractLogicError
import requests

import config

logger = logging.getLogger(__name__)


class RPCProvider:
    """
    Ethereum Sepolia RPC provider.
    Tries primary RPC first, then falls back to alternates automatically.
    """

    def __init__(self, rpc_url: str = config.POLYGON_RPC_URL):
        self.rpc_url = rpc_url
        self.w3: Optional[Web3] = None
        self._active_url: str = rpc_url
        self._connect_with_fallback()

    def _connect_with_fallback(self):
        """Try primary RPC, then each fallback in order."""
        candidates = [self.rpc_url] + [
            u for u in config.RPC_FALLBACKS if u != self.rpc_url
        ]
        last_err = None
        for url in candidates:
            try:
                w3 = Web3(Web3.HTTPProvider(url, request_kwargs={"timeout": config.SIMULATION_TIMEOUT}))
                if not w3.is_connected():
                    raise ConnectionError("is_connected() returned False")
                chain_id = w3.eth.chain_id
                block    = w3.eth.block_number
                self.w3  = w3
                self._active_url = url
                logger.info(f"Connected: chain_id={chain_id} block={block} rpc={url}")
                return
            except Exception as e:
                logger.warning(f"RPC failed ({url}): {e}")
                last_err = e
        raise ConnectionError(f"All RPC endpoints failed. Last error: {last_err}")

    # ── Basic Queries ─────────────────────────────────────────────────────────

    def get_chain_id(self) -> int:
        return self.w3.eth.chain_id

    def get_block_number(self) -> int:
        return self.w3.eth.block_number

    def get_balance(self, address: str) -> int:
        """Return balance in Wei."""
        try:
            return self.w3.eth.get_balance(Web3.to_checksum_address(address))
        except Exception as e:
            logger.warning(f"get_balance({address}): {e}")
            return 0

    def get_code(self, address: str) -> bytes:
        """Return contract bytecode."""
        try:
            return bytes(self.w3.eth.get_code(Web3.to_checksum_address(address)))
        except Exception as e:
            logger.warning(f"get_code({address}): {e}")
            return b""

    def get_storage_at(self, address: str, slot: int) -> str:
        """Return storage value at slot as hex string."""
        try:
            value = self.w3.eth.get_storage_at(Web3.to_checksum_address(address), slot)
            return value.hex()
        except Exception as e:
            logger.warning(f"get_storage_at({address}, {slot}): {e}")
            return "0x" + "0" * 64

    def get_transaction_count(self, address: str) -> int:
        """Return nonce for address."""
        try:
            return self.w3.eth.get_transaction_count(Web3.to_checksum_address(address))
        except Exception as e:
            logger.warning(f"get_transaction_count({address}): {e}")
            return 0

    def get_block(self, block_identifier: str = "latest") -> Dict[str, Any]:
        """Return block data."""
        try:
            return dict(self.w3.eth.get_block(block_identifier))
        except Exception as e:
            logger.warning(f"get_block({block_identifier}): {e}")
            return {}

    def get_gas_price(self) -> int:
        """Return current gas price in Wei."""
        try:
            return self.w3.eth.gas_price
        except Exception as e:
            logger.warning(f"get_gas_price: {e}")
            return 0

    def get_block_base_fee(self) -> int:
        """Return EIP-1559 base fee per gas."""
        try:
            block = self.w3.eth.get_block("latest")
            return block.get("baseFeePerGas", 0)
        except Exception as e:
            logger.warning(f"get_block_base_fee: {e}")
            return 0

    # ── Simulation ────────────────────────────────────────────────────────────

    def estimate_gas(self, tx: Dict[str, Any]) -> int:
        """Estimate gas for a transaction."""
        try:
            return self.w3.eth.estimate_gas(tx)
        except Exception as e:
            logger.warning(f"estimate_gas failed: {e}")
            return config.DEFAULT_GAS_LIMIT

    def eth_call(self, tx: Dict[str, Any], block: str = "latest") -> bytes:
        """Execute eth_call simulation — returns raw return bytes."""
        return self.w3.eth.call(tx, block)

    def debug_trace_call(self, tx: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Attempt debug_traceCall via raw JSON-RPC.
        Uses callTracer for structured call tree.
        Returns None if not supported.
        """
        payload = {
            "jsonrpc": "2.0",
            "method": "debug_traceCall",
            "params": [
                {
                    "from":  tx.get("from"),
                    "to":    tx.get("to"),
                    "data":  tx.get("data", "0x"),
                    "value": hex(tx.get("value", 0)),
                    "gas":   hex(tx.get("gas", config.DEFAULT_GAS_LIMIT)),
                },
                "latest",
                {"tracer": "callTracer"},
            ],
            "id": 1,
        }
        # Try active URL first, then fallbacks
        for url in [self._active_url] + config.RPC_FALLBACKS:
            try:
                resp = requests.post(url, json=payload, timeout=config.SIMULATION_TIMEOUT)
                data = resp.json()
                if "result" in data and data["result"] is not None:
                    logger.debug(f"debug_traceCall succeeded via {url}")
                    return data["result"]
                err = data.get("error", {})
                logger.debug(f"debug_traceCall not supported at {url}: {err.get('message', '')}")
            except Exception as e:
                logger.debug(f"debug_traceCall request failed ({url}): {e}")
        return None

    def eth_get_transaction_receipt(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Get transaction receipt by hash."""
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return dict(receipt) if receipt else None
        except Exception as e:
            logger.warning(f"get_transaction_receipt({tx_hash}): {e}")
            return None

    def get_contract_creation_block(self, address: str) -> Optional[int]:
        """
        Estimate contract deployment block via binary search on code existence.
        Returns None if address is an EOA or lookup fails.
        """
        try:
            checksum = Web3.to_checksum_address(address)
            code = bytes(self.w3.eth.get_code(checksum))
            if not code:
                return None  # EOA

            current = self.w3.eth.block_number
            lo, hi = 0, current
            while lo < hi:
                mid = (lo + hi) // 2
                try:
                    c = bytes(self.w3.eth.get_code(checksum, mid))
                    if c:
                        hi = mid
                    else:
                        lo = mid + 1
                except Exception:
                    lo = mid + 1
            return lo
        except Exception as e:
            logger.debug(f"get_contract_creation_block({address}): {e}")
            return None
