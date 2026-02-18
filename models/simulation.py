"""
SHADOWGUARD Data Models
Defines all dataclasses used throughout the system.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class SimulationRequest:
    """Normalized transaction simulation request."""
    sender: str
    to: str
    value_wei: int
    data: str
    gas_limit: int
    simulation_id: str = ""
    timestamp: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sender": self.sender,
            "to": self.to,
            "value_wei": self.value_wei,
            "data": self.data,
            "gas_limit": self.gas_limit,
            "simulation_id": self.simulation_id,
            "timestamp": self.timestamp,
        }


@dataclass
class SimulationResult:
    """Result from shadow execution."""
    success: bool
    return_data: str
    gas_used: int
    gas_limit: int
    reverted: bool
    revert_reason: Optional[str]
    trace: Optional[Dict[str, Any]]
    execution_time_ms: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "return_data": self.return_data,
            "gas_used": self.gas_used,
            "gas_limit": self.gas_limit,
            "reverted": self.reverted,
            "revert_reason": self.revert_reason,
            "execution_time_ms": self.execution_time_ms,
        }


@dataclass
class StateSnapshot:
    """Blockchain state at a point in time."""
    sender_balance_wei: int
    receiver_balance_wei: int
    contract_code_hash: str
    contract_code_size: int
    storage_slots: Dict[int, str]
    owner_slot: str
    block_number: int
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sender_balance_wei": self.sender_balance_wei,
            "receiver_balance_wei": self.receiver_balance_wei,
            "contract_code_hash": self.contract_code_hash,
            "contract_code_size": self.contract_code_size,
            "storage_slots": {str(k): v for k, v in self.storage_slots.items()},
            "owner_slot": self.owner_slot,
            "block_number": self.block_number,
            "timestamp": self.timestamp,
        }


@dataclass
class StateDiff:
    """Difference between two state snapshots."""
    sender_balance_delta_wei: int
    receiver_balance_delta_wei: int
    sender_drain_pct: float
    ownership_changed: bool
    storage_changes: Dict[int, Dict[str, str]]  # slot -> {before, after}
    code_changed: bool
    block_delta: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sender_balance_delta_wei": self.sender_balance_delta_wei,
            "receiver_balance_delta_wei": self.receiver_balance_delta_wei,
            "sender_drain_pct": self.sender_drain_pct,
            "ownership_changed": self.ownership_changed,
            "storage_changes": {
                str(k): v for k, v in self.storage_changes.items()
            },
            "code_changed": self.code_changed,
            "block_delta": self.block_delta,
        }


@dataclass
class OpcodeProfile:
    """Opcode analysis result for a contract."""
    selfdestruct_count: int
    delegatecall_count: int
    callcode_count: int
    create2_count: int
    create_count: int
    sstore_count: int
    call_count: int
    has_dangerous_opcodes: bool
    risk_opcodes: List[str]
    bytecode_size: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "selfdestruct_count": self.selfdestruct_count,
            "delegatecall_count": self.delegatecall_count,
            "callcode_count": self.callcode_count,
            "create2_count": self.create2_count,
            "create_count": self.create_count,
            "sstore_count": self.sstore_count,
            "call_count": self.call_count,
            "has_dangerous_opcodes": self.has_dangerous_opcodes,
            "risk_opcodes": self.risk_opcodes,
            "bytecode_size": self.bytecode_size,
        }


@dataclass
class BehaviorReport:
    """Behavioral analysis of the simulated transaction."""
    nested_call_depth: int
    gas_anomaly: bool
    gas_usage_pct: float
    external_interactions: int
    storage_write_count: int
    static_call_count: int
    behavior_flags: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nested_call_depth": self.nested_call_depth,
            "gas_anomaly": self.gas_anomaly,
            "gas_usage_pct": self.gas_usage_pct,
            "external_interactions": self.external_interactions,
            "storage_write_count": self.storage_write_count,
            "static_call_count": self.static_call_count,
            "behavior_flags": self.behavior_flags,
        }


@dataclass
class RiskReport:
    """Final risk assessment."""
    score: int
    level: str
    triggered_rules: List[str]
    recommendation: str
    policy_violations: List[str]
    deterministic_hash: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "level": self.level,
            "triggered_rules": self.triggered_rules,
            "recommendation": self.recommendation,
            "policy_violations": self.policy_violations,
            "deterministic_hash": self.deterministic_hash,
        }


@dataclass
class SimulationRecord:
    """Complete simulation record for persistence."""
    simulation_id: str
    timestamp: str
    request: Dict[str, Any]
    result: Dict[str, Any]
    state_diff: Dict[str, Any]
    opcode_profile: Dict[str, Any]
    behavior_report: Dict[str, Any]
    risk_report: Dict[str, Any]
    execution_time_s: float
    deterministic_hash: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "simulation_id": self.simulation_id,
            "timestamp": self.timestamp,
            "request": self.request,
            "result": self.result,
            "state_diff": self.state_diff,
            "opcode_profile": self.opcode_profile,
            "behavior_report": self.behavior_report,
            "risk_report": self.risk_report,
            "execution_time_s": self.execution_time_s,
            "deterministic_hash": self.deterministic_hash,
        }
