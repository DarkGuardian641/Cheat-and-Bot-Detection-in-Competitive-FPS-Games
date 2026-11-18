"""
backend/parser.py
=================
CS2 Demo Parser and Telemetry Extractor using demoparser2.

Extracts player trajectories, view angles, shots, kills, and round events.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def validate_demo_file(file_path: str | Path, max_size_mb: int = 500) -> Tuple[bool, str]:
    """
    Validate that file exists, has a .dem extension, is not empty,
    and does not exceed max_size_mb.
    """
    path = Path(file_path)
    if not path.is_file():
        return False, f"File does not exist: {path}"
    
    if path.suffix.lower() != ".dem":
        return False, f"Invalid extension '{path.suffix}'. Only CS2 .dem files are supported."

    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb == 0:
        return False, "File is empty (0 bytes)."
    
    if size_mb > max_size_mb:
        return False, f"File size ({size_mb:.1f} MB) exceeds maximum allowed size ({max_size_mb} MB)."

    # Basic header check for Valve Demo format
    try:
        with open(path, "rb") as f:
            header = f.read(8)
            # Standard Source / Source 2 demo headers usually start with HL2DEMO or PBDEMS
            if not (header.startswith(b"HL2DEMO") or header.startswith(b"PBDEMS")):
                logger.warning("Demo file %s does not begin with standard demo magic bytes.", path.name)
    except Exception as e:
        return False, f"Failed reading file header: {e}"

    return True, "Valid"


class CS2DemoParser:
    """
    Parser for Counter-Strike 2 (.dem) replay files using demoparser2.
    """

    def __init__(self, demo_path: str | Path):
        self.demo_path = Path(demo_path)
        valid, msg = validate_demo_file(self.demo_path)
        if not valid:
            raise ValueError(f"Invalid demo file: {msg}")

        try:
            from demoparser2 import DemoParser
            self._parser = DemoParser(str(self.demo_path))
        except ImportError:
            raise ImportError("demoparser2 is not installed. Please run: pip install demoparser2")

    def parse_header(self) -> Dict[str, Any]:
        """Parse demo header info (map, server, tick rate, etc.)."""
        try:
            header = self._parser.parse_header()
            return header if isinstance(header, dict) else {}
        except Exception as e:
            logger.warning("Could not parse demo header: %e", e)
            return {}

    def parse_events(self) -> Dict[str, pd.DataFrame]:
        """
        Extract round events, weapon fires, player deaths, and player hurts.
        """
        events: Dict[str, pd.DataFrame] = {}
        for event_name in ["weapon_fire", "player_death", "player_hurt", "round_start", "round_end"]:
            try:
                df = self._parser.parse_event(event_name)
                events[event_name] = df if isinstance(df, pd.DataFrame) else pd.DataFrame()
            except Exception as e:
                logger.debug("Event %s not found or failed to parse: %s", event_name, e)
                events[event_name] = pd.DataFrame()
        return events

    def parse_telemetry(self, extra_fields: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Extract player positions, angles, ticks, and state for ML windowing.
        """
        fields = [
            "tick",
            "seconds",
            "steamid",
            "name",
            "team_num",
            "is_alive",
            "health",
            "X",
            "Y",
            "Z",
            "pitch",
            "yaw",
            "is_airborne",
            "duck_amount",
            "flash_duration",
        ]
        if extra_fields:
            for f in extra_fields:
                if f not in fields:
                    fields.append(f)

        try:
            tick_df = self._parser.parse_ticks(fields)
            if not isinstance(tick_df, pd.DataFrame):
                tick_df = pd.DataFrame(tick_df)
        except Exception as e:
            logger.error("Failed to parse ticks from demo %s: %s", self.demo_path, e)
            raise RuntimeError(f"Failed to parse ticks: {e}")

        # Normalize column names and datatypes
        rename_map = {
            "name": "player_name",
            "seconds": "game_time",
        }
        tick_df = tick_df.rename(columns=rename_map)

        # Fallback steamid resolution if needed
        if "steamid" not in tick_df.columns:
            if "user_id" in tick_df.columns:
                tick_df["steamid"] = tick_df["user_id"].astype(str)
            else:
                tick_df["steamid"] = tick_df.get("player_name", "unknown").astype(str)
        else:
            tick_df["steamid"] = tick_df["steamid"].astype(str)

        # Sort and clean
        tick_df = tick_df.dropna(subset=["tick", "steamid", "X", "Y", "Z", "pitch", "yaw"])
        tick_df = tick_df.sort_values(by=["steamid", "tick"]).reset_index(drop=True)
        return tick_df

    def parse_full(self) -> Tuple[pd.DataFrame, Dict[str, pd.DataFrame], Dict[str, Any]]:
        """
        Parse header, events, and telemetry in one go.
        """
        header = self.parse_header()
        events = self.parse_events()
        telemetry = self.parse_telemetry()
        return telemetry, events, header


def parse_demo(demo_path: str | Path, fields: Optional[List[str]] = None) -> pd.DataFrame:
    """
    Backwards-compatible convenience function.
    """
    parser = CS2DemoParser(demo_path)
    return parser.parse_telemetry(extra_fields=fields)
