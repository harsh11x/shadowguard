"""
SHADOWGUARD — Main CLI Entry Point
Deterministic Pre-Execution Blockchain Security Proxy

Usage:
  python main.py simulate --from <addr> --to <addr> --value <eth> --data <hex>
  python main.py replay <simulation_id>
  python main.py view_logs [--limit N]
  python main.py set_policy --max_drain N --disallow_selfdestruct true/false
"""

import argparse
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.rule import Rule
from rich.text import Text
from rich.columns import Columns
from rich import box
from rich.align import Align
from rich.live import Live
from rich.spinner import Spinner

import config
from storage.logger import setup_logging
from storage.database import SimulationDatabase
from rpc.provider import RPCProvider
from core.interceptor import TransactionInterceptor, InterceptorError
from core.shadow_executor import ShadowExecutor
from core.state_snapshot import StateSnapshotEngine
from core.state_diff import StateDiffEngine
from core.opcode_analyzer import OpcodeAnalyzer
from core.behavior_analyzer import BehaviorAnalyzer
from core.risk_engine import RiskEngine
from core.policy_engine import PolicyEngine
from models.simulation import SimulationRecord
from utils.helpers import (
    format_eth, truncate_address, now_iso, wei_to_eth, compute_deterministic_hash
)

console = Console()

LEVEL_COLORS = {
    "LOW":      "bright_green",
    "MEDIUM":   "yellow",
    "HIGH":     "dark_orange",
    "CRITICAL": "bright_red",
}
LEVEL_ICONS = {
    "LOW":      "✅",
    "MEDIUM":   "⚠️ ",
    "HIGH":     "🔶",
    "CRITICAL": "🚨",
}


# ─────────────────────────────────────────────────────────────────────────────
# Step printer — prints each step live and permanently
# ─────────────────────────────────────────────────────────────────────────────

def step(n: int, total: int, label: str):
    """Print a numbered step header that stays on screen."""
    console.print(
        f"  [dim][[/dim][bold bright_cyan]{n}/{total}[/bold bright_cyan][dim]][/dim]"
        f"  [bright_white]{label}[/bright_white]"
    )

def step_ok(detail: str = ""):
    """Print a ✓ success line under the current step."""
    if detail:
        console.print(f"       [bright_green]✓[/bright_green]  [dim]{detail}[/dim]")
    else:
        console.print(f"       [bright_green]✓[/bright_green]  [dim]done[/dim]")

def step_data(key: str, value: str, color: str = "bright_white"):
    """Print a key-value data line under the current step."""
    console.print(f"       [dim]{key}:[/dim]  [{color}]{value}[/{color}]")

def step_warn(msg: str):
    console.print(f"       [yellow]⚠[/yellow]  [yellow]{msg}[/yellow]")

def step_flag(msg: str):
    console.print(f"       [bright_red]▸[/bright_red]  [bright_red]{msg}[/bright_red]")


# ─────────────────────────────────────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────────────────────────────────────

def print_banner():
    banner = Text()
    banner.append("\n")
    banner.append("  ███████╗██╗  ██╗ █████╗ ██████╗  ██████╗ ██╗    ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ \n", style="bold bright_cyan")
    banner.append("  ██╔════╝██║  ██║██╔══██╗██╔══██╗██╔═══██╗██║    ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗\n", style="bold cyan")
    banner.append("  ███████╗███████║███████║██║  ██║██║   ██║██║ █╗ ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║\n", style="bold blue")
    banner.append("  ╚════██║██╔══██║██╔══██║██║  ██║██║   ██║██║███╗██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║\n", style="bold dark_blue")
    banner.append("  ███████║██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝\n", style="bold bright_blue")
    banner.append("  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ \n", style="bold blue")
    banner.append("\n")
    banner.append("  ⬡  Deterministic Pre-Execution Blockchain Security Proxy  ⬡\n", style="bold bright_white")
    banner.append(f"  Version {config.APP_VERSION}  •  {config.NETWORK_NAME}  •  Powered by web3.py\n", style="dim white")
    banner.append("\n")
    console.print(Panel(banner, border_style="bright_cyan", padding=(0, 2)))


# ─────────────────────────────────────────────────────────────────────────────
# Simulation — fully transparent, every step printed live
# ─────────────────────────────────────────────────────────────────────────────

def cmd_simulate(args, provider: RPCProvider, db: SimulationDatabase, policy: PolicyEngine):
    """Run a simulation with full transparent step-by-step output."""
    start_time = time.time()
    TOTAL_STEPS = 8

    console.print()
    console.print(Rule("[bold bright_cyan]SHADOWGUARD — LIVE SIMULATION PIPELINE[/bold bright_cyan]", style="bright_cyan"))
    console.print()

    # ── Step 1: Intercept & Validate ─────────────────────────────────────────
    step(1, TOTAL_STEPS, "Transaction Interception & Validation")
    t0 = time.time()
    interceptor = TransactionInterceptor(provider)
    try:
        request = interceptor.intercept(
            sender=args.sender,
            to=args.to,
            value_eth=args.value,
            data=args.data or "0x",
            gas_limit=args.gas,
        )
    except InterceptorError as e:
        console.print(f"\n[bold bright_red]✗ Validation Error:[/bold bright_red] {e}\n")
        sys.exit(1)

    step_ok(f"{time.time()-t0:.2f}s")
    step_data("Simulation ID",  request.simulation_id, "bright_cyan")
    step_data("From",           request.sender, "cyan")
    step_data("To",             request.to, "cyan")
    step_data("Value",          format_eth(request.value_wei))
    step_data("Gas Limit",      f"{request.gas_limit:,}")
    step_data("Calldata",       (request.data[:42] + "…") if len(request.data) > 42 else request.data, "dim")
    step_data("Timestamp",      request.timestamp)
    console.print()

    # ── Step 2: Pre-execution State Snapshot ─────────────────────────────────
    step(2, TOTAL_STEPS, "Pre-Execution State Snapshot  (reading on-chain state)")
    t0 = time.time()
    snapshot_engine = StateSnapshotEngine(provider)
    pre_snapshot = snapshot_engine.capture(request)
    # Fetch real gas price NOW — used for accurate cost calculation
    real_gas_price_wei = provider.get_gas_price()
    real_gas_price_gwei = real_gas_price_wei / 1e9
    step_ok(f"{time.time()-t0:.2f}s")
    step_data("Sender balance",   format_eth(pre_snapshot.sender_balance_wei))
    step_data("Receiver balance", format_eth(pre_snapshot.receiver_balance_wei))
    step_data("Target code size", f"{pre_snapshot.contract_code_size:,} bytes")
    step_data("Storage slots",    f"{len(pre_snapshot.storage_slots)} monitored")
    step_data("Block number",     f"#{pre_snapshot.block_number:,}")
    step_data("Gas price (live)", f"{real_gas_price_gwei:.2f} Gwei")
    console.print()

    # ── Step 3: Shadow Execution (eth_call) ───────────────────────────────────
    step(3, TOTAL_STEPS, "Shadow Execution  (eth_call on Sepolia — no gas spent)")
    t0 = time.time()
    executor = ShadowExecutor(provider)
    sim_result = executor.execute(request)
    elapsed_exec = time.time() - t0
    step_ok(f"{elapsed_exec:.2f}s")
    reverted = sim_result.reverted
    exec_color = "bright_red" if reverted else "bright_green"
    exec_text  = "REVERTED" if reverted else "SUCCESS"
    step_data("Execution status", exec_text, exec_color)
    step_data("Gas used",         f"{sim_result.gas_used:,}")
    step_data("Gas efficiency",   f"{sim_result.gas_used / request.gas_limit * 100:.1f}% of limit")
    step_data("Return data",      (sim_result.return_data[:40] + "…") if len(sim_result.return_data) > 40 else sim_result.return_data or "0x", "dim")
    if reverted and sim_result.revert_reason:
        step_warn(f"Revert reason: {sim_result.revert_reason[:80]}")
    console.print()

    # ── Step 4: State Diff ────────────────────────────────────────────────────
    step(4, TOTAL_STEPS, "State Diff Computation  (pre vs post state — real gas price)")
    t0 = time.time()
    diff_engine = StateDiffEngine(provider=provider)
    post_snapshot = diff_engine.build_post_snapshot(
        before=pre_snapshot,
        to_address=request.to,
        sender_address=request.sender,
        value_wei=request.value_wei,
        gas_used=sim_result.gas_used,
        gas_price_wei=real_gas_price_wei,
    )
    state_diff = diff_engine.compute(pre_snapshot, post_snapshot)
    step_ok(f"{time.time()-t0:.2f}s")

    drain = state_diff.sender_drain_pct
    drain_color = "bright_red" if drain > 50 else "yellow" if drain > 20 else "bright_green"
    step_data("Balance drain",      f"{drain:.2f}%", drain_color)
    step_data("Sender Δ balance",   f"{state_diff.sender_balance_delta_wei / 1e18:.8f} ETH",
              "bright_red" if state_diff.sender_balance_delta_wei < 0 else "bright_green")
    step_data("Gas cost (real)",    f"{sim_result.gas_used * real_gas_price_wei / 1e18:.8f} ETH  ({real_gas_price_gwei:.2f} Gwei)", "dim")
    step_data("Ownership changed",  "YES ⚠" if state_diff.ownership_changed else "NO",
              "bright_red" if state_diff.ownership_changed else "bright_green")
    step_data("Storage mutations",  f"{len(state_diff.storage_changes)} slot(s)",
              "bright_red" if state_diff.storage_changes else "bright_green")
    step_data("Code modified",      "YES ⚠" if state_diff.code_changed else "NO",
              "bright_red" if state_diff.code_changed else "bright_green")
    if state_diff.storage_changes:
        for slot, val in list(state_diff.storage_changes.items())[:3]:
            step_data(f"  slot {str(slot)[:10]}…", str(val)[:40], "yellow")
    console.print()

    # ── Step 5: Opcode Analysis ───────────────────────────────────────────────
    step(5, TOTAL_STEPS, "Opcode Analysis  (scanning contract bytecode)")
    t0 = time.time()
    opcode_analyzer = OpcodeAnalyzer(provider)
    opcode_profile = opcode_analyzer.analyze(request.to)
    step_ok(f"{time.time()-t0:.2f}s")
    step_data("Bytecode size",    f"{opcode_profile.bytecode_size:,} bytes",
              "dim" if opcode_profile.bytecode_size == 0 else "bright_white")
    step_data("Contract type",    "EOA (no code)" if opcode_profile.bytecode_size == 0 else "Smart Contract")

    for name, count in [
        ("SELFDESTRUCT", opcode_profile.selfdestruct_count),
        ("DELEGATECALL", opcode_profile.delegatecall_count),
        ("CALLCODE",     opcode_profile.callcode_count),
        ("CREATE2",      opcode_profile.create2_count),
    ]:
        if count > 0:
            step_flag(f"{name}: {count} occurrence(s) detected")
        else:
            step_data(name, "0  ✓", "bright_green")

    step_data("SSTORE writes",    str(opcode_profile.sstore_count))
    step_data("CALL (external)",  str(opcode_profile.call_count))
    console.print()

    # ── Step 6: Behavioral Analysis ───────────────────────────────────────────
    step(6, TOTAL_STEPS, "Behavioral Analysis  (real gas + opcode counts + event logs)")
    t0 = time.time()
    behavior_analyzer = BehaviorAnalyzer(provider=provider)
    behavior_report = behavior_analyzer.analyze(
        result=sim_result,
        gas_limit=request.gas_limit,
        to_address=request.to,
        opcode_sstore_count=opcode_profile.sstore_count,
        opcode_call_count=opcode_profile.call_count,
    )
    step_ok(f"{time.time()-t0:.2f}s")
    step_data("Nested call depth",     str(behavior_report.nested_call_depth),
              "bright_red" if behavior_report.nested_call_depth > 5 else "bright_white")
    step_data("External interactions", str(behavior_report.external_interactions))
    step_data("Storage writes",        str(behavior_report.storage_write_count))
    step_data("Gas usage",             f"{behavior_report.gas_usage_pct:.1f}%",
              "bright_red" if behavior_report.gas_usage_pct >= 80 else
              "yellow" if behavior_report.gas_usage_pct >= 50 else "bright_green")
    if behavior_report.gas_anomaly:
        step_warn(f"Gas anomaly: {behavior_report.gas_usage_pct:.1f}% of limit consumed")
    step_data("Behavior risk score",   str(behavior_report.risk_score if hasattr(behavior_report, 'risk_score') else 'N/A'))
    console.print()

    # ── Step 7: Risk Scoring ──────────────────────────────────────────────────
    step(7, TOTAL_STEPS, "Risk Score Computation  (weighted rule engine)")
    t0 = time.time()
    risk_engine = RiskEngine()
    risk_report = risk_engine.compute(
        state_diff, opcode_profile, behavior_report, request.simulation_id
    )
    step_ok(f"{time.time()-t0:.2f}s")
    step_data("Raw risk score",       str(risk_report.score))
    step_data("Triggered rules",      str(len(risk_report.triggered_rules)))
    for rule in risk_report.triggered_rules:
        step_flag(rule)
    step_data("Deterministic hash",   (risk_report.deterministic_hash or "")[:32] + "…", "dim")
    console.print()

    # ── Step 8: Policy Application ────────────────────────────────────────────
    step(8, TOTAL_STEPS, "Security Policy Application")
    t0 = time.time()
    risk_report = policy.apply(
        risk_report,
        state_diff.sender_drain_pct,
        opcode_profile.selfdestruct_count > 0,
        opcode_profile.delegatecall_count > 0,
        behavior_report.nested_call_depth,
    )
    step_ok(f"{time.time()-t0:.2f}s")
    step_data("Policy version",     str(policy.get("policy_version")))
    step_data("Max drain allowed",  f"{policy.get('max_drain')}%")
    step_data("Block SELFDESTRUCT", str(policy.get("disallow_selfdestruct")))
    step_data("Block DELEGATECALL", str(policy.get("disallow_delegatecall")))
    if risk_report.policy_violations:
        for v in risk_report.policy_violations:
            step_flag(f"POLICY VIOLATION: {v}")
    else:
        step_data("Policy violations", "None", "bright_green")
    console.print()

    # ── Save ──────────────────────────────────────────────────────────────────
    execution_time_s = time.time() - start_time
    record = SimulationRecord(
        simulation_id=request.simulation_id,
        timestamp=request.timestamp,
        request=request.to_dict(),
        result=sim_result.to_dict(),
        state_diff=state_diff.to_dict(),
        opcode_profile=opcode_profile.to_dict(),
        behavior_report=behavior_report.to_dict(),
        risk_report=risk_report.to_dict(),
        execution_time_s=execution_time_s,
        deterministic_hash=risk_report.deterministic_hash,
    )
    db.save_simulation(record)

    # ── Final Result ──────────────────────────────────────────────────────────
    print_simulation_result(record.to_dict(), execution_time_s)


# ─────────────────────────────────────────────────────────────────────────────
# Result Renderer
# ─────────────────────────────────────────────────────────────────────────────

def print_simulation_result(record: dict, execution_time_s: float):
    req      = record["request"]
    result   = record["result"]
    diff     = record["state_diff"]
    opcodes  = record["opcode_profile"]
    behavior = record["behavior_report"]
    risk     = record["risk_report"]
    sim_id   = record["simulation_id"]

    level       = risk["level"]
    score       = risk["score"]
    level_color = LEVEL_COLORS.get(level, "white")
    level_icon  = LEVEL_ICONS.get(level, "")

    console.print()
    console.print(Rule(f"[bold {level_color}]RISK ASSESSMENT[/bold {level_color}]", style=level_color))
    console.print()

    score_bar = _render_score_bar(score, level_color)
    console.print(f"  RISK SCORE: [{level_color}][bold]{score} / 100[/bold][/{level_color}]  {score_bar}")
    console.print(f"  LEVEL:      [{level_color}][bold]{level_icon} {level}[/bold][/{level_color}]")
    console.print()

    triggered = risk.get("triggered_rules", [])
    if triggered:
        console.print("  [bold]Triggered Rules:[/bold]")
        for rule in triggered:
            console.print(f"    [bright_red]▶[/bright_red] {rule}")
        console.print()

    violations = risk.get("policy_violations", [])
    if violations:
        console.print("  [bold bright_red]Policy Violations:[/bold bright_red]")
        for v in violations:
            console.print(f"    [bold bright_red]⛔[/bold bright_red] {v}")
        console.print()

    rec = risk.get("recommendation", "")
    console.print(Panel(
        f"[bold {level_color}]{rec}[/bold {level_color}]",
        title="[bold]Recommendation[/bold]",
        border_style=level_color,
        padding=(0, 2),
    ))
    console.print()

    # Summary table
    console.print(Rule("[bold]Simulation Summary[/bold]", style="dim cyan"))
    t = Table(show_header=False, box=box.SIMPLE, padding=(0, 2))
    t.add_column("Key",   style="dim white", width=26)
    t.add_column("Value", style="bright_white")
    t.add_row("Simulation ID",      f"[bold bright_cyan]{sim_id}[/bold bright_cyan]")
    t.add_row("Network",            config.NETWORK_NAME)
    t.add_row("Timestamp",          record.get("timestamp", "")[:19].replace("T", " "))
    t.add_row("Total Pipeline Time",f"[bold]{execution_time_s:.2f}s[/bold]")
    t.add_row("From",               f"[cyan]{req.get('sender', '')}[/cyan]")
    t.add_row("To",                 f"[cyan]{req.get('to', '')}[/cyan]")
    t.add_row("Value",              format_eth(req.get("value_wei", 0)))
    t.add_row("Gas Limit",          f"{req.get('gas_limit', 0):,}")
    t.add_row("Gas Used",           f"{result.get('gas_used', 0):,}")
    t.add_row("Execution",          "[bright_red]REVERTED[/bright_red]" if result.get("reverted") else "[bright_green]SUCCESS[/bright_green]")
    t.add_row("Deterministic Hash", f"[dim]{(risk.get('deterministic_hash') or '')[:32]}…[/dim]")
    console.print(t)
    console.print()
    console.print(Rule(style="dim"))
    console.print()


def _flag_count(count: int) -> str:
    if count > 0:
        return f"[bright_red][bold]{count}[/bold] DETECTED ⚠[/bright_red]"
    return "[bright_green]0[/bright_green]"


def _render_score_bar(score: int, color: str) -> str:
    filled = score // 5
    empty  = 20 - filled
    return f"[{color}][{'█' * filled}{'░' * empty}][/{color}]"


# ─────────────────────────────────────────────────────────────────────────────
# Other Commands
# ─────────────────────────────────────────────────────────────────────────────

def cmd_replay(args, provider: RPCProvider, db: SimulationDatabase, policy: PolicyEngine):
    sim_id = args.simulation_id
    with console.status(f"[cyan]Loading simulation {sim_id}…", spinner="dots"):
        record = db.get_simulation(sim_id)

    if record is None:
        console.print(f"\n[bold bright_red]✗ Simulation not found:[/bold bright_red] {sim_id}\n")
        console.print("  Run [cyan]python main.py view_logs[/cyan] to see available simulations.\n")
        sys.exit(1)

    console.print(f"\n[bold bright_cyan]↺ Replaying simulation:[/bold bright_cyan] {sim_id}\n")
    req = record["request"]
    original_hash = record.get("deterministic_hash", "")

    class ReplayArgs:
        sender = req["sender"]
        to     = req["to"]
        value  = req["value_wei"] / 1e18
        data   = req["data"]
        gas    = req["gas_limit"]

    cmd_simulate(ReplayArgs(), provider, db, policy)

    new_record = db.get_simulation(sim_id)
    if new_record:
        new_hash = new_record.get("deterministic_hash", "")
        if original_hash and new_hash:
            if original_hash == new_hash:
                console.print(f"[bright_green]✓ Deterministic verification PASSED[/bright_green]")
                console.print(f"  Hash: [dim]{original_hash[:32]}…[/dim]\n")
            else:
                console.print(f"[yellow]⚠ Hash differs (state changed on-chain)[/yellow]")
                console.print(f"  Original: [dim]{original_hash[:32]}…[/dim]")
                console.print(f"  Replayed: [dim]{new_hash[:32]}…[/dim]\n")


def cmd_view_logs(args, db: SimulationDatabase):
    limit   = getattr(args, "limit", 20)
    records = db.list_simulations(limit=limit)

    console.print()
    console.print(Rule("[bold bright_cyan]SIMULATION LOG[/bold bright_cyan]", style="bright_cyan"))
    console.print()

    if not records:
        console.print("  [dim]No simulations recorded yet.[/dim]\n")
        console.print("  Run [cyan]python main.py simulate --from <addr> --to <addr> --value 0 --data 0x[/cyan]\n")
        return

    table = Table(
        title=f"Recent Simulations  (showing {len(records)} of {db.count()} total)",
        box=box.ROUNDED,
        border_style="bright_cyan",
        header_style="bold bright_cyan",
        show_lines=True,
    )
    table.add_column("Simulation ID",  style="cyan",       width=16)
    table.add_column("Timestamp",      style="dim white",  width=20)
    table.add_column("From",           style="white",      width=14)
    table.add_column("To",             style="white",      width=14)
    table.add_column("Value",          style="white",      width=14)
    table.add_column("Score",          justify="center",   width=7)
    table.add_column("Level",          justify="center",   width=10)
    table.add_column("Gas Used",       justify="right",    width=10)
    table.add_column("Time(s)",        justify="right",    width=7)

    for rec in records:
        req   = rec.get("request", {})
        res   = rec.get("result", {})
        risk  = rec.get("risk_report", {})
        level = risk.get("level", "N/A")
        score = risk.get("score", 0)
        color = LEVEL_COLORS.get(level, "white")
        icon  = LEVEL_ICONS.get(level, "")
        table.add_row(
            rec.get("simulation_id", "N/A"),
            rec.get("timestamp", "")[:19].replace("T", " "),
            truncate_address(req.get("sender", "")),
            truncate_address(req.get("to", "")),
            format_eth(req.get("value_wei", 0)),
            f"[{color}]{score}[/{color}]",
            f"[{color}]{icon} {level}[/{color}]",
            f"{res.get('gas_used', 0):,}",
            f"{rec.get('execution_time_s', 0):.2f}",
        )

    console.print(table)
    console.print()


def cmd_set_policy(args, policy: PolicyEngine):
    updated = False

    if args.max_drain is not None:
        policy.set("max_drain", args.max_drain)
        console.print(f"  [bright_green]✓[/bright_green] max_drain → [bold]{args.max_drain}%[/bold]")
        updated = True

    if args.disallow_selfdestruct is not None:
        val = args.disallow_selfdestruct.lower() in ("true", "1", "yes")
        policy.set("disallow_selfdestruct", val)
        console.print(f"  [bright_green]✓[/bright_green] disallow_selfdestruct → [bold]{val}[/bold]")
        updated = True

    if args.disallow_delegatecall is not None:
        val = args.disallow_delegatecall.lower() in ("true", "1", "yes")
        policy.set("disallow_delegatecall", val)
        console.print(f"  [bright_green]✓[/bright_green] disallow_delegatecall → [bold]{val}[/bold]")
        updated = True

    if args.max_nested_calls is not None:
        policy.set("max_nested_calls", args.max_nested_calls)
        console.print(f"  [bright_green]✓[/bright_green] max_nested_calls → [bold]{args.max_nested_calls}[/bold]")
        updated = True

    if not updated:
        console.print("  [yellow]No policy changes specified. Use --help for options.[/yellow]")
        return

    console.print()
    console.print(f"  [dim]Saved to:[/dim] [cyan]{config.POLICY_FILE}[/cyan]  "
                  f"[dim]version:[/dim] [cyan]{policy.get('policy_version')}[/cyan]")
    console.print()
    console.print(Rule("[bold]Current Policy[/bold]", style="dim cyan"))
    t = Table(show_header=False, box=box.SIMPLE, padding=(0, 2))
    t.add_column("Setting", style="dim white", width=28)
    t.add_column("Value",   style="bright_white")
    for k, v in policy.get_all().items():
        t.add_row(k, str(v))
    console.print(t)
    console.print()


# ─────────────────────────────────────────────────────────────────────────────
# Argument Parser
# ─────────────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="shadowguard",
        description="SHADOWGUARD — Deterministic Pre-Execution Blockchain Security Proxy",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py simulate --from 0xABC... --to 0xDEF... --value 0.1 --data 0x
  python main.py simulate --from 0x001 --to 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9 --value 0 --data 0x
  python main.py replay 0xA34F92
  python main.py view_logs --limit 10
  python main.py set_policy --max_drain 20 --disallow_selfdestruct true
        """,
    )
    parser.add_argument("--rpc",       default=None, help="Override RPC endpoint URL")
    parser.add_argument("--no-banner", action="store_true", help="Suppress banner")
    parser.add_argument("--json",      action="store_true", help="Output machine-readable JSON (for API bridge)")

    subparsers = parser.add_subparsers(dest="command", required=True)

    sim_parser = subparsers.add_parser("simulate", help="Simulate a transaction")
    sim_parser.add_argument("--from",  dest="sender", required=True, metavar="ADDRESS")
    sim_parser.add_argument("--to",    dest="to",     required=True, metavar="ADDRESS")
    sim_parser.add_argument("--value", dest="value",  type=float, default=0.0, metavar="ETH")
    sim_parser.add_argument("--data",  dest="data",   default="0x", metavar="HEX")
    sim_parser.add_argument("--gas",   dest="gas",    type=int, default=None, metavar="GAS")

    replay_parser = subparsers.add_parser("replay", help="Replay a previous simulation")
    replay_parser.add_argument("simulation_id", metavar="SIMULATION_ID")

    logs_parser = subparsers.add_parser("view_logs", help="View simulation history")
    logs_parser.add_argument("--limit", type=int, default=20, metavar="N")

    policy_parser = subparsers.add_parser("set_policy", help="Configure security policies")
    policy_parser.add_argument("--max_drain",             type=float, default=None, metavar="PCT")
    policy_parser.add_argument("--disallow_selfdestruct", default=None, metavar="BOOL")
    policy_parser.add_argument("--disallow_delegatecall", default=None, metavar="BOOL")
    policy_parser.add_argument("--max_nested_calls",      type=int, default=None, metavar="N")

    subparsers.add_parser("network", help="Get live network status (JSON)")

    addr_parser = subparsers.add_parser("address_info", help="Get on-chain info for an address")
    addr_parser.add_argument("--address", required=True, metavar="ADDR", help="Ethereum address")

    stream_parser = subparsers.add_parser("stream_transactions", help="Stream transactions from latest blocks")
    stream_parser.add_argument("--limit", type=int, default=15, help="Max txs per block")

    return parser



# ─────────────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def emit_json(obj: dict):
    """Write a single JSON line to stdout (for Node.js bridge)."""
    print(json.dumps(obj, default=str), flush=True)


def cmd_simulate_json(args, provider: RPCProvider, db: SimulationDatabase, policy: PolicyEngine):
    """JSON-mode simulation: emits one JSON line per step, then final result."""
    start_time = time.time()

    def step_event(step: int, label: str, data: dict = None):
        emit_json({"type": "step", "step": step, "total": 8, "label": label, "data": data or {}})

    def error_event(msg: str):
        emit_json({"type": "error", "message": msg})
        sys.exit(1)

    # Step 1
    step_event(1, "Transaction Interception & Validation")
    interceptor = TransactionInterceptor(provider)
    try:
        request = interceptor.intercept(
            sender=args.sender, to=args.to,
            value_eth=args.value, data=args.data or "0x", gas_limit=args.gas,
        )
    except InterceptorError as e:
        error_event(str(e))
        return
    step_event(1, "Transaction Interception & Validation", {
        "simulation_id": request.simulation_id, "from": request.sender,
        "to": request.to, "value_eth": request.value_wei / 1e18,
        "gas_limit": request.gas_limit, "data": request.data,
    })

    # Step 2
    step_event(2, "Pre-Execution State Snapshot")
    snapshot_engine = StateSnapshotEngine(provider)
    pre_snapshot = snapshot_engine.capture(request)
    real_gas_price_wei = provider.get_gas_price()
    step_event(2, "Pre-Execution State Snapshot", {
        "sender_balance_eth": pre_snapshot.sender_balance_wei / 1e18,
        "receiver_balance_eth": pre_snapshot.receiver_balance_wei / 1e18,
        "code_size": pre_snapshot.contract_code_size,
        "block": pre_snapshot.block_number,
        "gas_price_gwei": real_gas_price_wei / 1e9,
    })

    # Step 3
    step_event(3, "Shadow Execution (eth_call — no gas spent)")
    executor = ShadowExecutor(provider)
    sim_result = executor.execute(request)
    step_event(3, "Shadow Execution (eth_call — no gas spent)", {
        "success": sim_result.success, "reverted": sim_result.reverted,
        "gas_used": sim_result.gas_used,
        "gas_pct": round(sim_result.gas_used / request.gas_limit * 100, 1),
        "return_data": sim_result.return_data[:40],
        "revert_reason": sim_result.revert_reason,
    })

    # Step 4
    step_event(4, "State Diff Computation")
    diff_engine = StateDiffEngine(provider=provider)
    post_snapshot = diff_engine.build_post_snapshot(
        before=pre_snapshot, to_address=request.to, sender_address=request.sender,
        value_wei=request.value_wei, gas_used=sim_result.gas_used,
        gas_price_wei=real_gas_price_wei,
    )
    state_diff = diff_engine.compute(pre_snapshot, post_snapshot)
    step_event(4, "State Diff Computation", {
        "drain_pct": round(state_diff.sender_drain_pct, 2),
        "balance_delta_eth": state_diff.sender_balance_delta_wei / 1e18,
        "gas_cost_eth": sim_result.gas_used * real_gas_price_wei / 1e18,
        "ownership_changed": state_diff.ownership_changed,
        "storage_mutations": len(state_diff.storage_changes),
        "code_changed": state_diff.code_changed,
    })

    # Step 5
    step_event(5, "Opcode Analysis")
    opcode_analyzer = OpcodeAnalyzer(provider)
    opcode_profile = opcode_analyzer.analyze(request.to)
    step_event(5, "Opcode Analysis", {
        "bytecode_size": opcode_profile.bytecode_size,
        "selfdestruct": opcode_profile.selfdestruct_count,
        "delegatecall": opcode_profile.delegatecall_count,
        "callcode": opcode_profile.callcode_count,
        "create2": opcode_profile.create2_count,
        "sstore": opcode_profile.sstore_count,
        "call": opcode_profile.call_count,
        "dangerous": opcode_profile.has_dangerous_opcodes,
    })

    # Step 6
    step_event(6, "Behavioral Analysis")
    behavior_analyzer = BehaviorAnalyzer(provider=provider)
    behavior_report = behavior_analyzer.analyze(
        result=sim_result, gas_limit=request.gas_limit,
        to_address=request.to,
        opcode_sstore_count=opcode_profile.sstore_count,
        opcode_call_count=opcode_profile.call_count,
    )
    step_event(6, "Behavioral Analysis", {
        "nested_depth": behavior_report.nested_call_depth,
        "external_interactions": behavior_report.external_interactions,
        "storage_writes": behavior_report.storage_write_count,
        "gas_anomaly": behavior_report.gas_anomaly,
        "gas_pct": round(behavior_report.gas_usage_pct, 1),
    })

    # Step 7
    step_event(7, "Risk Score Computation")
    risk_engine = RiskEngine()
    risk_report = risk_engine.compute(state_diff, opcode_profile, behavior_report, request.simulation_id)
    step_event(7, "Risk Score Computation", {
        "score": risk_report.score, "level": risk_report.level,
        "triggered_rules": risk_report.triggered_rules,
        "hash": risk_report.deterministic_hash[:32],
    })

    # Step 8
    step_event(8, "Security Policy Application")
    risk_report = policy.apply(
        risk_report, state_diff.sender_drain_pct,
        opcode_profile.selfdestruct_count > 0,
        opcode_profile.delegatecall_count > 0,
        behavior_report.nested_call_depth,
    )
    step_event(8, "Security Policy Application", {
        "final_score": risk_report.score, "final_level": risk_report.level,
        "policy_violations": risk_report.policy_violations,
    })

    execution_time_s = time.time() - start_time
    record = SimulationRecord(
        simulation_id=request.simulation_id, timestamp=request.timestamp,
        request=request.to_dict(), result=sim_result.to_dict(),
        state_diff=state_diff.to_dict(), opcode_profile=opcode_profile.to_dict(),
        behavior_report=behavior_report.to_dict(), risk_report=risk_report.to_dict(),
        execution_time_s=execution_time_s, deterministic_hash=risk_report.deterministic_hash,
    )
    db.save_simulation(record)

    emit_json({"type": "result", "record": record.to_dict(), "execution_time_s": execution_time_s})


def cmd_network_json(provider: RPCProvider):
    """Emit live network info as JSON."""
    emit_json({
        "chain_id": provider.get_chain_id(),
        "block": provider.get_block_number(),
        "gas_price_gwei": round(provider.get_gas_price() / 1e9, 3),
        "base_fee_gwei": round(provider.get_block_base_fee() / 1e9, 3),
        "rpc_url": provider._active_url,
        "network": config.NETWORK_NAME,
    })


def main():
    setup_logging()
    parser = build_parser()
    args   = parser.parse_args()

    json_mode = getattr(args, "json", False)

    if not json_mode and not getattr(args, "no_banner", False):
        print_banner()

    rpc_url = args.rpc or config.POLYGON_RPC_URL
    db      = SimulationDatabase()
    policy  = PolicyEngine()

    if args.command == "view_logs":
        if json_mode:
            records = db.list_simulations(limit=getattr(args, "limit", 20))
            emit_json({"records": records, "total": db.count()})
        else:
            cmd_view_logs(args, db)
        return

    if args.command == "address_info":
        # Connect RPC for real on-chain data
        provider = RPCProvider(rpc_url)
        try:
            from web3 import Web3
            addr = Web3.to_checksum_address(args.address)
            balance_wei = provider.get_balance(addr)
            nonce = provider._call_with_retry("get_transaction_count", addr)
            code = provider.get_code(addr)
            code_size = len(code) if code else 0
            emit_json({
                "address": addr,
                "balance_wei": balance_wei,
                "balance_eth": round(balance_wei / 1e18, 6),
                "nonce": nonce,
                "code_size": code_size,
                "is_contract": code_size > 0,
            })
        except Exception as e:
            emit_json({"address": args.address, "error": str(e)})
        return

    if args.command == "stream_transactions":

        provider = RPCProvider(rpc_url)
        last_block = 0
        while True:
            try:
                current_block = provider.get_block_number()
                if current_block > last_block:
                    start_b = last_block + 1 if last_block > 0 else current_block
                    for b_num in range(start_b, current_block + 1):
                        block = provider._call_with_retry("get_block", b_num, True)
                        if not block: continue
                        txs = block.get('transactions', [])
                        # Emit each transaction
                        for tx in txs[:args.limit]:
                            emit_json({
                                "type": "transaction",
                                "hash": tx['hash'].hex() if hasattr(tx['hash'], 'hex') else tx['hash'],
                                "from": tx['from'],
                                "to": tx['to'],
                                "value_eth": float(provider.w3.from_wei(tx['value'], 'ether')),
                                "gas": tx['gas'],
                                "block": b_num,
                                "timestamp": block.get('timestamp')
                            })
                    last_block = current_block
            except Exception as e:
                emit_json({"type": "stream_error", "error": str(e)})
            time.sleep(4) # Block time is ~12s, 4s polling is safe
        return


    if args.command == "set_policy":
        cmd_set_policy(args, policy)
        if json_mode:
            emit_json({"policy": policy.get_all()})
        return

    # Connect RPC
    if json_mode:
        emit_json({"type": "connecting", "rpc": rpc_url})
    else:
        console.print(Rule("[bold]Network Connection[/bold]", style="dim cyan"))
        console.print()
        console.print(f"  [dim]Primary RPC:[/dim]  [cyan]{rpc_url}[/cyan]")
        for fb in config.RPC_FALLBACKS:
            console.print(f"  [dim]Fallback:    [/dim]  [dim]{fb}[/dim]")
        console.print()

    try:
        provider = RPCProvider(rpc_url)
        chain_id  = provider.get_chain_id()
        block     = provider.get_block_number()
        gas_price = provider.get_gas_price() / 1e9
        base_fee  = provider.get_block_base_fee() / 1e9

        if json_mode:
            emit_json({"type": "connected", "chain_id": chain_id, "block": block,
                       "gas_price_gwei": round(gas_price, 3), "rpc": provider._active_url})
        else:
            console.print(f"  [bright_green]✓[/bright_green]  Connected via [cyan]{provider._active_url}[/cyan]")
            console.print(f"  [dim]Chain ID:[/dim]   [bold]{chain_id}[/bold]  [dim](Ethereum Sepolia)[/dim]")
            console.print(f"  [dim]Block:   [/dim]   [bold]#{block:,}[/bold]")
            console.print(f"  [dim]Gas Price:[/dim]  [bold]{gas_price:.2f} Gwei[/bold]  [dim](base fee: {base_fee:.2f} Gwei)[/dim]")
            console.print()

    except ConnectionError as e:
        if json_mode:
            emit_json({"type": "error", "message": str(e)})
        else:
            console.print(f"\n[bold bright_red]✗ All RPC endpoints failed:[/bold bright_red] {e}\n")
        sys.exit(1)

    # Handle network command
    if args.command == "network":
        cmd_network_json(provider)
        return

    try:
        if args.command == "simulate":
            if json_mode:
                cmd_simulate_json(args, provider, db, policy)
            else:
                cmd_simulate(args, provider, db, policy)
        elif args.command == "replay":
            cmd_replay(args, provider, db, policy)
    except KeyboardInterrupt:
        if not json_mode:
            console.print("\n\n[yellow]Interrupted by user.[/yellow]\n")
        sys.exit(0)
    except Exception as e:
        if json_mode:
            emit_json({"type": "error", "message": str(e), "traceback": traceback.format_exc()})
        else:
            console.print(f"\n[bold bright_red]✗ Unexpected Error:[/bold bright_red] {e}\n")
            console.print(f"[dim]{traceback.format_exc()}[/dim]")
        sys.exit(1)


if __name__ == "__main__":
    main()
