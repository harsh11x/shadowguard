"""
SHADOWGUARD Risk Engine
Computes weighted risk scores from all analysis components.
"""

import logging
from typing import List

import config
from models.simulation import StateDiff, OpcodeProfile, BehaviorReport, RiskReport
from utils.helpers import risk_level_from_score, recommendation_from_level, compute_deterministic_hash

logger = logging.getLogger(__name__)


class RiskEngine:
    """Combines all analysis signals into a final weighted risk score."""

    def compute(
        self,
        state_diff: StateDiff,
        opcode_profile: OpcodeProfile,
        behavior_report: BehaviorReport,
        simulation_id: str,
    ) -> RiskReport:
        """
        Compute final risk score from all analysis components.
        Returns a RiskReport with score, level, triggered rules, and recommendation.
        """
        score = 0
        triggered_rules: List[str] = []
        weights = config.RISK_WEIGHTS

        # ── State Diff Rules ─────────────────────────────────────────────────
        if state_diff.sender_drain_pct > 50:
            points = weights["balance_drain_50pct"]
            score += points
            triggered_rules.append(
                f"{state_diff.sender_drain_pct:.0f}% balance drain detected (+{points})"
            )

        if state_diff.ownership_changed:
            points = weights["ownership_changed"]
            score += points
            triggered_rules.append(f"Contract ownership transferred (+{points})")

        if state_diff.code_changed:
            score += 20
            triggered_rules.append("Contract bytecode modified (+20)")

        if len(state_diff.storage_changes) > 3:
            points = weights["multiple_storage_writes"]
            score += points
            triggered_rules.append(
                f"Multiple critical storage slots modified: {len(state_diff.storage_changes)} (+{points})"
            )

        # ── Opcode Rules ─────────────────────────────────────────────────────
        if opcode_profile.selfdestruct_count > 0:
            points = weights["selfdestruct_detected"]
            score += points
            triggered_rules.append(
                f"SELFDESTRUCT opcode detected (×{opcode_profile.selfdestruct_count}) (+{points})"
            )

        if opcode_profile.delegatecall_count > 0:
            points = weights["delegatecall_detected"]
            score += points
            triggered_rules.append(
                f"DELEGATECALL opcode detected (×{opcode_profile.delegatecall_count}) (+{points})"
            )

        if opcode_profile.callcode_count > 0:
            points = weights["callcode_detected"]
            score += points
            triggered_rules.append(
                f"CALLCODE opcode detected (×{opcode_profile.callcode_count}) (+{points})"
            )

        if opcode_profile.create2_count > 0:
            points = weights["create2_detected"]
            score += points
            triggered_rules.append(
                f"CREATE2 opcode detected (×{opcode_profile.create2_count}) (+{points})"
            )

        # ── Behavior Rules ───────────────────────────────────────────────────
        if behavior_report.nested_call_depth > config.MAX_NESTED_CALLS:
            points = weights["nested_calls_exceeded"]
            score += points
            triggered_rules.append(
                f"Nested external calls: {behavior_report.nested_call_depth} (threshold={config.MAX_NESTED_CALLS}) (+{points})"
            )

        if behavior_report.gas_anomaly:
            points = weights["gas_anomaly"]
            score += points
            triggered_rules.append(
                f"Gas anomaly: {behavior_report.gas_usage_pct:.1f}% of limit consumed (+{points})"
            )

        if behavior_report.storage_write_count > 5:
            points = weights["multiple_storage_writes"]
            score += points
            triggered_rules.append(
                f"Excessive SSTORE operations: {behavior_report.storage_write_count} (+{points})"
            )

        # ── Clamp score to 0-100 ─────────────────────────────────────────────
        score = max(0, min(100, score))

        level = risk_level_from_score(score)
        recommendation = recommendation_from_level(level)

        # ── Deterministic hash ───────────────────────────────────────────────
        det_hash = compute_deterministic_hash({
            "simulation_id": simulation_id,
            "request": {},
            "state_diff": state_diff.to_dict(),
            "opcode_profile": opcode_profile.to_dict(),
            "risk_report": {
                "score": score,
                "level": level,
                "triggered_rules": triggered_rules,
            },
        })

        report = RiskReport(
            score=score,
            level=level,
            triggered_rules=triggered_rules,
            recommendation=recommendation,
            policy_violations=[],
            deterministic_hash=det_hash,
        )

        logger.info(
            f"Risk assessment: score={score}/100 level={level} "
            f"rules_triggered={len(triggered_rules)}"
        )
        return report
