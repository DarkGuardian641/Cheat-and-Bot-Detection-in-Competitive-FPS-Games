from pathlib import Path
import pandas as pd

def parse_demo(demo_path: str | Path, fields: list[str] | None = None) -> pd.DataFrame:
    """
    Parse a Counter-Strike 2 .dem file using demoparser2.
    Extracts tick, position, view angles, and event data.
    """
    try:
        from demoparser2 import DemoParser
    except ImportError:
        raise ImportError("demoparser2 is not installed. Run: pip install demoparser2")

    if fields is None:
        fields = ["tick", "seconds", "user_id", "player_name", "X", "Y", "Z", "pitch", "yaw"]

    parser = DemoParser(str(demo_path))
    return parser.parse_ticks(fields)
