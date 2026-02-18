"""
SHADOWGUARD Logging System
Structured logging setup for all simulation events.
"""

import logging
import logging.handlers
import os
import sys
from typing import Optional

import config


def setup_logging(log_file: Optional[str] = "shadowguard.log") -> logging.Logger:
    """
    Configure root logger with file and console handlers.
    Returns the root logger.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(config.LOG_LEVEL_INT)

    # Clear existing handlers
    root_logger.handlers.clear()

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    # ── Console handler (WARNING+ only to keep terminal clean) ───────────────
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # ── File handler (all levels) ────────────────────────────────────────────
    if log_file:
        try:
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,
                encoding="utf-8",
            )
            file_handler.setLevel(config.LOG_LEVEL_INT)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except IOError as e:
            root_logger.warning(f"Could not set up file logging: {e}")

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a named logger."""
    return logging.getLogger(name)
