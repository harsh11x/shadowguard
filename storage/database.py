"""
SHADOWGUARD Database Layer
SQLite persistence for simulation records.
"""

import json
import logging
import sqlite3
from typing import List, Optional, Dict, Any

import config
from models.simulation import SimulationRecord

logger = logging.getLogger(__name__)

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS simulations (
    simulation_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    request TEXT NOT NULL,
    result TEXT NOT NULL,
    state_diff TEXT NOT NULL,
    opcode_profile TEXT NOT NULL,
    behavior_report TEXT NOT NULL,
    risk_report TEXT NOT NULL,
    execution_time_s REAL NOT NULL,
    deterministic_hash TEXT NOT NULL
);
"""

CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_timestamp ON simulations (timestamp);
"""


class SimulationDatabase:
    """SQLite-backed storage for simulation records."""

    def __init__(self, db_path: str = config.DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        """Initialize database schema."""
        with self._connect() as conn:
            conn.execute(CREATE_TABLE_SQL)
            conn.execute(CREATE_INDEX_SQL)
            conn.commit()
        logger.debug(f"Database initialized at {self.db_path}")

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def save_simulation(self, record: SimulationRecord) -> None:
        """Persist a simulation record to the database."""
        sql = """
        INSERT OR REPLACE INTO simulations
        (simulation_id, timestamp, request, result, state_diff, opcode_profile,
         behavior_report, risk_report, execution_time_s, deterministic_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        try:
            with self._connect() as conn:
                conn.execute(sql, (
                    record.simulation_id,
                    record.timestamp,
                    json.dumps(record.request),
                    json.dumps(record.result),
                    json.dumps(record.state_diff),
                    json.dumps(record.opcode_profile),
                    json.dumps(record.behavior_report),
                    json.dumps(record.risk_report),
                    record.execution_time_s,
                    record.deterministic_hash,
                ))
                conn.commit()
            logger.info(f"Simulation saved: {record.simulation_id}")
        except sqlite3.Error as e:
            logger.error(f"Failed to save simulation {record.simulation_id}: {e}")
            raise

    def get_simulation(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a simulation record by ID."""
        sql = "SELECT * FROM simulations WHERE simulation_id = ?"
        try:
            with self._connect() as conn:
                row = conn.execute(sql, (simulation_id,)).fetchone()
                if row is None:
                    return None
                return self._row_to_dict(row)
        except sqlite3.Error as e:
            logger.error(f"Failed to retrieve simulation {simulation_id}: {e}")
            return None

    def list_simulations(self, limit: int = 20) -> List[Dict[str, Any]]:
        """List recent simulations ordered by timestamp descending."""
        sql = "SELECT * FROM simulations ORDER BY timestamp DESC LIMIT ?"
        try:
            with self._connect() as conn:
                rows = conn.execute(sql, (limit,)).fetchall()
                return [self._row_to_dict(row) for row in rows]
        except sqlite3.Error as e:
            logger.error(f"Failed to list simulations: {e}")
            return []

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert a database row to a dictionary with parsed JSON fields."""
        d = dict(row)
        for field in ("request", "result", "state_diff", "opcode_profile",
                      "behavior_report", "risk_report"):
            if field in d and isinstance(d[field], str):
                try:
                    d[field] = json.loads(d[field])
                except json.JSONDecodeError:
                    pass
        return d

    def count(self) -> int:
        """Return total number of stored simulations."""
        with self._connect() as conn:
            result = conn.execute("SELECT COUNT(*) FROM simulations").fetchone()
            return result[0] if result else 0
