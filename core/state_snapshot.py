"""
SHADOWGUARD State Snapshot Engine
Captures blockchain state before and after simulation.
Uses parallel RPC calls to minimize latency.
"""

import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from datetime import datetime, timezone
from typing import Dict

import config
from models.simulation import SimulationRequest, StateSnapshot
from rpc.provider import RPCProvider

logger = logging.getLogger(__name__)


class StateSnapshotEngine:
    """Captures pre/post blockchain state for diff analysis."""

    def __init__(self, provider: RPCProvider):
        self.provider = provider

    def capture(self, request: SimulationRequest) -> StateSnapshot:
        """Capture current blockchain state relevant to the transaction.
        Uses parallel RPC calls to minimize latency.
        """
        sender = request.sender
        to = request.to

        # Run all independent RPC calls in parallel with a 5s wall-clock timeout
        sender_balance = 0
        receiver_balance = 0
        code = b""
        block_number = 0
        storage_slots: Dict[int, str] = {s: "0x" + "0" * 64 for s in config.MONITORED_STORAGE_SLOTS}

        def _get_sender_balance():
            return self.provider.get_balance(sender)

        def _get_receiver_balance():
            return self.provider.get_balance(to)

        def _get_code():
            return self.provider.get_code(to)

        def _get_block_number():
            return self.provider.get_block_number()

        def _get_storage(slot):
            return slot, self.provider.get_storage_at(to, slot)

        tasks = {
            "sender_balance": _get_sender_balance,
            "receiver_balance": _get_receiver_balance,
            "code": _get_code,
            "block_number": _get_block_number,
        }

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(fn): name for name, fn in tasks.items()}
            storage_futures = {executor.submit(_get_storage, slot): slot for slot in config.MONITORED_STORAGE_SLOTS}

            for future in as_completed(list(futures.keys()) + list(storage_futures.keys()), timeout=10):
                if future in futures:
                    name = futures[future]
                    try:
                        result = future.result(timeout=0)
                        if name == "sender_balance":
                            sender_balance = result
                        elif name == "receiver_balance":
                            receiver_balance = result
                        elif name == "code":
                            code = result
                        elif name == "block_number":
                            block_number = result
                    except Exception as e:
                        logger.debug(f"State snapshot {name} failed: {e}")
                elif future in storage_futures:
                    try:
                        slot, val = future.result(timeout=0)
                        storage_slots[slot] = val
                    except Exception as e:
                        logger.debug(f"Storage slot fetch failed: {e}")

        code_hash = hashlib.sha256(code).hexdigest() if code else "0" * 64
        code_size = len(code)
        owner_slot = storage_slots.get(0, "0x" + "0" * 64)
        timestamp = datetime.now(timezone.utc).isoformat()

        snapshot = StateSnapshot(
            sender_balance_wei=sender_balance,
            receiver_balance_wei=receiver_balance,
            contract_code_hash=code_hash,
            contract_code_size=code_size,
            storage_slots=storage_slots,
            owner_slot=owner_slot,
            block_number=block_number,
            timestamp=timestamp,
        )

        logger.debug(
            f"State snapshot: sender_bal={sender_balance} receiver_bal={receiver_balance} "
            f"code_size={code_size} block={block_number}"
        )
        return snapshot
