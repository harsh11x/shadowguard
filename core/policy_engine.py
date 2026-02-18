"""
SHADOWGUARD Policy Engine
Manages configurable security policies and applies them to risk reports.
"""

import json
import logging
import os
from typing import Dict, Any, List

import config
from models.simulation import RiskReport

logger = logging.getLogger(__name__)

DEFAULT_POLICY = {
    "max_drain": 50,              # Max allowed balance drain percentage
    "disallow_selfdestruct": False,
    "disallow_delegatecall": False,
    "max_nested_calls": 5,
    "min_block_score": 0,         # Minimum score to auto-block
    "policy_version": 1,
}


class PolicyEngine:
    """Loads, saves, and applies security policies to risk assessments."""

    def __init__(self, policy_file: str = config.POLICY_FILE):
        self.policy_file = policy_file
        self.policy = self._load_policy()

    def _load_policy(self) -> Dict[str, Any]:
        """Load policy from JSON file, creating defaults if not found."""
        if os.path.exists(self.policy_file):
            try:
                with open(self.policy_file, "r") as f:
                    loaded = json.load(f)
                    # Merge with defaults to handle missing keys
                    merged = {**DEFAULT_POLICY, **loaded}
                    logger.info(f"Policy loaded from {self.policy_file} (v{merged.get('policy_version', 1)})")
                    return merged
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load policy file: {e}. Using defaults.")
        return dict(DEFAULT_POLICY)

    def save_policy(self) -> None:
        """Persist current policy to JSON file."""
        try:
            with open(self.policy_file, "w") as f:
                json.dump(self.policy, f, indent=2)
            logger.info(f"Policy saved to {self.policy_file}")
        except IOError as e:
            logger.error(f"Failed to save policy: {e}")
            raise

    def set(self, key: str, value: Any) -> None:
        """Update a policy value and save."""
        if key not in DEFAULT_POLICY:
            raise ValueError(f"Unknown policy key: '{key}'. Valid keys: {list(DEFAULT_POLICY.keys())}")
        self.policy[key] = value
        self.policy["policy_version"] = self.policy.get("policy_version", 1) + 1
        self.save_policy()
        logger.info(f"Policy updated: {key}={value}")

    def get(self, key: str) -> Any:
        """Get a policy value."""
        return self.policy.get(key, DEFAULT_POLICY.get(key))

    def get_all(self) -> Dict[str, Any]:
        """Return all policy settings."""
        return dict(self.policy)

    def apply(
        self,
        risk_report: RiskReport,
        state_diff_drain_pct: float,
        opcode_selfdestruct: bool,
        opcode_delegatecall: bool,
        nested_calls: int,
    ) -> RiskReport:
        """
        Apply policy rules to a risk report.
        May add policy violations and escalate the risk score.
        """
        violations: List[str] = []
        score_boost = 0

        # ── Max drain policy ─────────────────────────────────────────────────
        max_drain = self.policy.get("max_drain", DEFAULT_POLICY["max_drain"])
        if state_diff_drain_pct > max_drain:
            violations.append(
                f"POLICY VIOLATION: Balance drain {state_diff_drain_pct:.1f}% exceeds policy limit of {max_drain}%"
            )
            score_boost += 15

        # ── Selfdestruct policy ──────────────────────────────────────────────
        if self.policy.get("disallow_selfdestruct") and opcode_selfdestruct:
            violations.append("POLICY VIOLATION: SELFDESTRUCT is explicitly disallowed by policy")
            score_boost += 20

        # ── Delegatecall policy ──────────────────────────────────────────────
        if self.policy.get("disallow_delegatecall") and opcode_delegatecall:
            violations.append("POLICY VIOLATION: DELEGATECALL is explicitly disallowed by policy")
            score_boost += 15

        # ── Nested calls policy ──────────────────────────────────────────────
        policy_max_calls = self.policy.get("max_nested_calls", DEFAULT_POLICY["max_nested_calls"])
        if nested_calls > policy_max_calls:
            violations.append(
                f"POLICY VIOLATION: Nested calls {nested_calls} exceeds policy limit of {policy_max_calls}"
            )
            score_boost += 10

        # Apply boosts and violations
        new_score = min(100, risk_report.score + score_boost)
        from utils.helpers import risk_level_from_score, recommendation_from_level
        new_level = risk_level_from_score(new_score)

        return RiskReport(
            score=new_score,
            level=new_level,
            triggered_rules=risk_report.triggered_rules,
            recommendation=recommendation_from_level(new_level),
            policy_violations=violations,
            deterministic_hash=risk_report.deterministic_hash,
        )
