#!/usr/bin/env python3
"""Local sanity check: Railway Docker settings must match repo layout (no secrets).

Prints PASS/FAIL to stdout. Optional NDJSON file when FINTRACK_LAYOUT_CHECK_NDJSON_LOG
is set (path relative to repo root or absolute).
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path


def _maybe_ndjson(
    hypothesis_id: str,
    message: str,
    data: dict,
    log_path: Path | None,
    location: str = "scripts/railway_docker_layout_check.py",
) -> None:
    if log_path is None:
        return
    payload = {
        "timestamp": int(time.time() * 1000),
        "location": location,
        "message": message,
        "data": data,
        "hypothesisId": hypothesis_id,
        "runId": os.environ.get("DEBUG_RUN_ID", "layout-check"),
    }
    sid = os.environ.get("FINTRACK_DEBUG_SESSION_ID")
    if sid:
        payload["sessionId"] = sid
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    ndjson_env = os.environ.get("FINTRACK_LAYOUT_CHECK_NDJSON_LOG", "").strip()
    if ndjson_env:
        p = Path(ndjson_env).expanduser()
        log_path = p.resolve() if p.is_absolute() else (root / p).resolve()
    else:
        log_path = None
    readme_text = (root / "README.md").read_text(encoding="utf-8")
    readme_step4_ok = (
        "**Root Directory** | `/` (repo root" in readme_text
        and "backend/api/Dockerfile" in readme_text
        and "backend/genai/Dockerfile" in readme_text
    )
    api_df = (root / "backend" / "api" / "Dockerfile").read_text(encoding="utf-8")
    genai_df = (root / "backend" / "genai" / "Dockerfile").read_text(encoding="utf-8")
    api_cmd_ok = "uvicorn api.main:app" in api_df
    genai_cmd_ok = "backend.genai.main:app" in genai_df

    checks = [
        ("A", "Root requirements.txt exists (API Dockerfile COPY)", (root / "requirements.txt").is_file()),
        ("A", "shared/ exists (both Dockerfiles COPY shared/)", (root / "shared").is_dir()),
        ("B", "backend/api/Dockerfile exists", (root / "backend" / "api" / "Dockerfile").is_file()),
        ("B", "backend/genai/Dockerfile exists", (root / "backend" / "genai" / "Dockerfile").is_file()),
        ("A", "README Step 4 documents repo-root + both Dockerfile paths", readme_step4_ok),
        ("D", "API Dockerfile CMD uses uvicorn api.main:app", api_cmd_ok),
        ("E", "GenAI Dockerfile CMD uses uvicorn backend.genai.main:app", genai_cmd_ok),
    ]

    failed = False
    for hid, msg, ok in checks:
        _maybe_ndjson(hid, msg, {"ok": ok, "root": str(root)}, log_path)
        status = "PASS" if ok else "FAIL"
        if not ok:
            failed = True
        print(f"[{status}] {msg}")

    contract = {
        "api_dockerfile_path": "backend/api/Dockerfile",
        "genai_dockerfile_path": "backend/genai/Dockerfile",
        "wrong_readme_api_root": "backend/api",
        "note": "Subfolder root breaks COPY requirements.txt and shared/ unless Dockerfile is rewritten.",
    }
    _maybe_ndjson(
        "A",
        "Railway contract: Root Directory = repo root for BOTH Dockerfile builds",
        contract,
        log_path,
    )
    print("Railway UI: repo root + Dockerfile paths as above; do not use backend/api or backend/genai as Root Directory for these Dockerfiles.")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
