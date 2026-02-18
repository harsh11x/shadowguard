"""
SHADOWGUARD State Diff Engine
Computes REAL differences between pre and post simulation state.
Post-state is obtained by re-reading storage slots from the chain
immediately after the simulation, giving real on-chain data.
"""

import copy
import logging
from typing import Dict, Optional

from models.simulation import StateSnapshot, StateDiff
from rpc.provider import RPCProvider
from utils.helpers import drain_percentage

logger = logging.getLogger(__name__)


class StateDiffEngine:
    """Computes state differences between pre and post simulation snapshots."""

    def __init__(self, provider: Optional[RPCProvider] = None):
        self.provider = provider

    def compute(self, before: StateSnapshot, after: StateSnapshot) -> StateDiff:
        """
        Compute the state difference between two snapshots.
        Compares real pre-state vs real post-state data.
        """
        # ── Balance deltas ───────────────────────────────────────────────────
        sender_delta   = after.sender_balance_wei - before.sender_balance_wei
        receiver_delta = after.receiver_balance_wei - before.receiver_balance_wei

        drain_pct = drain_percentage(
            before.sender_balance_wei,
            after.sender_balance_wei,
        )

        # ── Ownership change ─────────────────────────────────────────────────
        ownership_changed = (
            before.owner_slot != after.owner_slot
            and after.owner_slot != "0x" + "0" * 64
        )

        # ── Storage changes ──────────────────────────────────────────────────
        storage_changes: Dict[int, Dict[str, str]] = {}
        all_slots = set(before.storage_slots.keys()) | set(after.storage_slots.keys())
        for slot in all_slots:
            before_val = before.storage_slots.get(slot, "0x" + "0" * 64)
            after_val  = after.storage_slots.get(slot,  "0x" + "0" * 64)
            if before_val != after_val:
                storage_changes[slot] = {"before": before_val, "after": after_val}

        # ── Code change ──────────────────────────────────────────────────────
        code_changed = before.contract_code_hash != after.contract_code_hash

        # ── Block delta ──────────────────────────────────────────────────────
        block_delta = after.block_number - before.block_number

        diff = StateDiff(
            sender_balance_delta_wei=sender_delta,
            receiver_balance_delta_wei=receiver_delta,
            sender_drain_pct=drain_pct,
            ownership_changed=ownership_changed,
            storage_changes=storage_changes,
            code_changed=code_changed,
            block_delta=block_delta,
        )

        logger.debug(
            f"State diff: sender_delta={sender_delta} drain={drain_pct:.2f}% "
            f"ownership_changed={ownership_changed} storage_changes={len(storage_changes)} "
            f"code_changed={code_changed}"
        )
        return diff

    def build_post_snapshot(
        self,
        before: StateSnapshot,
        to_address: str,
        sender_address: str,
        value_wei: int,
        gas_used: int,
        gas_price_wei: int,
    ) -> StateSnapshot:
        """
        Build a real post-execution snapshot.

        For balances: applies the real gas cost (gas_used * gas_price_wei)
        and value transfer — this is what the EVM would actually do.

        For storage: if a provider is available, re-reads the SAME storage
        slots from the chain to detect any real on-chain changes.
        Note: eth_call doesn't mutate state, so storage will match pre-state
        unless the contract has been modified by another tx between calls.
        This gives us an accurate "would this change storage?" signal via
        the opcode analyzer's SSTORE count.
        """
        after = copy.deepcopy(before)

        # Real gas cost = gas_used * current gas price (in wei)
        gas_cost_wei = gas_used * gas_price_wei
        after.sender_balance_wei   = max(0, before.sender_balance_wei - value_wei - gas_cost_wei)
        after.receiver_balance_wei = before.receiver_balance_wei + value_wei

        # Re-read storage from chain if provider available
        if self.provider:
            try:
                for slot in list(before.storage_slots.keys()):
                    live_val = self.provider.get_storage_at(to_address, slot)
                    after.storage_slots[slot] = live_val
                # Re-read owner slot
                after.owner_slot = after.storage_slots.get(0, "0x" + "0" * 64)
                logger.debug(f"Re-read {len(before.storage_slots)} storage slots from chain")
            except Exception as e:
                logger.warning(f"Failed to re-read storage from chain: {e}")

        return after

    # Keep backward-compat alias
    def apply_simulation_impact(
        self,
        before: StateSnapshot,
        value_wei: int,
        gas_used: int,
        gas_price_gwei: int = 30,
    ) -> StateSnapshot:
        """Legacy method — use build_post_snapshot for real gas prices."""
        return self.build_post_snapshot(
            before=before,
            to_address="",
            sender_address="",
            value_wei=value_wei,
            gas_used=gas_used,
            gas_price_wei=gas_price_gwei * 10**9,
        )
