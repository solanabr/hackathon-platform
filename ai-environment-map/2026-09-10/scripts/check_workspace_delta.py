#!/usr/bin/env python3
"""Gate read-only AI tasks using aggregate worktree and process-class deltas."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile


SCHEMA_VERSION = "1.0.0"


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def script_hash() -> str:
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def worktree_count(project: Path) -> int | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(project), "worktree", "list", "--porcelain"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
            env={
                "PATH": os.environ.get("PATH", ""),
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_CONFIG_GLOBAL": os.devnull,
                "GIT_OPTIONAL_LOCKS": "0",
                "GIT_TERMINAL_PROMPT": "0",
            },
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode:
        return None
    return sum(line.startswith("worktree ") for line in result.stdout.splitlines())


def process_counts() -> dict[str, int] | None:
    classes = {"claude": 0, "browser": 0, "testOrDev": 0, "nodeRuntime": 0}
    try:
        result = subprocess.run(
            ["ps", "-axo", "comm="],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=3,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode:
        return None
    for line in result.stdout.splitlines():
        name = Path(line.strip()).name.lower()
        if name in {"claude", "claude.exe"} or name.startswith("claude"):
            classes["claude"] += 1
        if any(token in name for token in ("chrome", "chromium", "brave", "safari", "webkit", "playwright")):
            classes["browser"] += 1
        if any(token in name for token in ("vitest", "jest", "playwright", "cypress", "storybook", "next-server", "vite")):
            classes["testOrDev"] += 1
        if name in {"node", "npm", "pnpm", "bun", "deno"}:
            classes["nodeRuntime"] += 1
    return classes


def snapshot(project: Path) -> dict[str, object]:
    processes = process_counts()
    return {
        "schemaVersion": SCHEMA_VERSION,
        "collectedAt": now(),
        "scriptSha256": script_hash(),
        "worktreeCount": worktree_count(project),
        "processClasses": processes,
        "processInventoryAvailable": processes is not None,
        "privacy": {"pathsRetained": False, "pidsRetained": False, "commandsRetained": False},
    }


def compare_snapshots(
    before: dict[str, object], current: dict[str, object]
) -> dict[str, object]:
    deltas: dict[str, int | None] = {}
    before_worktrees = before.get("worktreeCount")
    after_worktrees = current.get("worktreeCount")
    deltas["worktreeCount"] = (
        int(after_worktrees) - int(before_worktrees)
        if isinstance(before_worktrees, int) and isinstance(after_worktrees, int)
        else None
    )
    before_processes = before.get("processClasses")
    after_processes = current.get("processClasses")
    for name in ("browser", "testOrDev", "nodeRuntime", "claude"):
        old = before_processes.get(name) if isinstance(before_processes, dict) else None
        new = after_processes.get(name) if isinstance(after_processes, dict) else None
        deltas[name] = (
            int(new) - int(old)
            if isinstance(old, int) and isinstance(new, int)
            else None
        )
    violations = [
        name
        for name in ("worktreeCount", "browser", "testOrDev")
        if deltas.get(name) is None or int(deltas[name]) > 0
    ]
    return {
        "gate": "pass" if not violations else "fail",
        "deltas": deltas,
        "violations": violations,
        "manualFields": ["subagentCount", "delegationDepth", "writerCountPerWorktree"],
    }


def write_json(path: Path, payload: dict[str, object]) -> None:
    path = path.expanduser()
    parent_existed = path.parent.exists()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not parent_existed:
        path.parent.chmod(0o700)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def read_before(path: Path) -> dict[str, object]:
    if path.is_symlink() or not path.is_file() or not stat.S_ISREG(path.stat().st_mode):
        raise ValueError("before snapshot must be a regular non-symlink file")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schemaVersion") != SCHEMA_VERSION:
        raise ValueError("unsupported before snapshot")
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("snapshot")
    create.add_argument("--project", required=True, type=Path)
    create.add_argument("--output", required=True, type=Path)
    check = sub.add_parser("check")
    check.add_argument("--project", required=True, type=Path)
    check.add_argument("--before", required=True, type=Path)
    args = parser.parse_args()
    project = args.project.expanduser().resolve(strict=True)

    current = snapshot(project)
    if args.command == "snapshot":
        write_json(args.output, current)
        print(json.dumps({"written": True, "snapshot": current}, sort_keys=True))
        return 0

    before = read_before(args.before.expanduser().resolve(strict=True))
    report = compare_snapshots(before, current)
    print(json.dumps(report, sort_keys=True))
    return 0 if report["gate"] == "pass" else 3


if __name__ == "__main__":
    raise SystemExit(main())
