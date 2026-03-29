#!/usr/bin/env python3
"""Print canonical FinTrack agent instructions (same content as `make agent-instructions`)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    copilot = ROOT / ".github" / "copilot-instructions.md"
    print(copilot.read_text(encoding="utf-8"))
    print()
    print("--- Also read: .roo/rules/01-memory-bank-protocol.md ---")
    print("--- If memory-bank/ exists: productContext.md, activeContext.md, systemPatterns.md ---")


if __name__ == "__main__":
    main()
