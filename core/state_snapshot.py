"""
SHADOWGUARD State Snapshot Engine
Captures blockchain state before and after simulation.
"""

import hashlib
import logging
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
        """Capture current blockchain state relevant to the transaction."""
        sender = request.sender
        to = request.to

        # ── Balances ────────────────────────────────────────────────────────
        sender_balance = self.provider.get_balance(sender)
        receiver_balance = self.provider.get_balance(to)

        # ── Contract code ────────────────────────────────────────────────────
        code = self.provider.get_code(to)
        code_hash = hashlib.sha256(code).hexdigest() if code else "0" * 64
        code_size = len(code)

        # ── Storage slots ────────────────────────────────────────────────────
        storage_slots: Dict[int, str] = {}
        for slot in config.MONITORED_STORAGE_SLOTS:
            storage_slots[slot] = self.provider.get_storage_at(to, slot)

        # ── Owner slot (slot 0 typically holds owner in many contracts) ──────
        owner_slot = storage_slots.get(0, "0x" + "0" * 64)

        # ── Block info ───────────────────────────────────────────────────────
        block_number = self.provider.get_block_number()
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
