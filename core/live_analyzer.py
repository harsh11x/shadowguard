"""
SHADOWGUARD Live Analyzer
Provides fast-path risk assessment for real-time transaction streams.
Designed for low-latency analysis without full simulation.
"""

import logging
from typing import Dict, Any, List

from core.opcode_analyzer import OpcodeAnalyzer
from rpc.provider import RPCProvider
from utils.helpers import risk_level_from_score

logger = logging.getLogger(__name__)

class LiveAnalyzer:
    """Performs light-weight, real-time risk assessment on transactions."""

    def __init__(self, provider: RPCProvider):
        self.provider = provider
        self.opcode_analyzer = OpcodeAnalyzer(provider)

    def analyze(self, tx: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a single transaction and return a risk score/report.
        Heuristics:
        - Contract vs EOA (Code Size)
        - Dangerous Opcodes (if contract)
        - Value Thresholds
        - Input Data complexity
        """
        score = 0
        reasons = []
        to_addr = tx.get('to')
        from_addr = tx.get('from')
        value_eth = tx.get('value_eth', 0)
        input_data = tx.get('input_data', '0x')

        # 1. Destination Analysis
        if not to_addr:
            score += 20
            reasons.append("Contract deployment (high risk context)")
        else:
            code = self.provider.get_code(to_addr)
            if code:
                score += 10
                reasons.append("Interaction with smart contract")
                
                # Fast opcode scan
                profile = self.opcode_analyzer.analyze(to_addr)
                if profile.has_dangerous_opcodes:
                    score += 30
                    reasons.extend(profile.risk_opcodes)
            else:
                # EOA interaction is generally lower risk unless value is high
                pass

        # 2. Value Analysis
        if value_eth > 10:
            score += 25
            reasons.append(f"High value transaction: {value_eth:.2f} ETH")
        elif value_eth > 1:
            score += 10
            reasons.append(f"Significant value: {value_eth:.2f} ETH")

        # 3. Data Complexity
        if input_data and input_data != '0x':
            if len(input_data) > 1000:
                score += 15
                reasons.append("Highly complex input data (potential exploit payload)")
            elif len(input_data) > 10:
                score += 5
                reasons.append("Function call detected")

        # 4. Burner/Freshness (Mocked for now as it requires history)
        # If we had account age, we'd add +20 for < 1 day old accounts

        # Finalize
        score = min(100, score)
        level = risk_level_from_score(score)

        return {
            "score": score,
            "level": level,
            "reasons": reasons[:3], # Only top 3 reasons
            "is_contract": bool(to_addr and self.provider.get_code(to_addr))
        }
