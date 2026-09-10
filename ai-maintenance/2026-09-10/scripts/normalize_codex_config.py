#!/usr/bin/env python3
"""Preview or apply a conservative top-level Codex reasoning effort."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import tomllib


HOME = Path.home().resolve()
CONFIG = HOME / ".codex" / "config.toml"
AUDIT_ROOT = HOME / ".config" / "ai-maintenance" / "changes"
EFFORT = re.compile(r'^(model_reasoning_effort\s*=\s*)"[^"]*"\s*$')


def atomic_write(path: Path, text: str) -> None:
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Dry-run by default. Project trust entries are reported, never changed."
    )
    parser.add_argument("--apply", action="store_true")
    parser.add_argument(
        "--effort", choices=("low", "medium", "high", "xhigh")
    )
    parser.add_argument("--config", type=Path, default=CONFIG)
    args = parser.parse_args()

    config_path = args.config.expanduser().resolve(strict=True)
    original_bytes = config_path.read_bytes()
    original = original_bytes.decode("utf-8")
    parsed = tomllib.loads(original)
    previous = parsed.get("model_reasoning_effort")
    rendered = original
    if args.effort:
        lines = original.splitlines()
        effort_index = None
        for index, line in enumerate(lines):
            if line.lstrip().startswith("["):
                break
            if EFFORT.match(line):
                effort_index = index
                break
        if effort_index is None:
            lines.insert(0, f'model_reasoning_effort = "{args.effort}"')
        else:
            prefix = EFFORT.match(lines[effort_index]).group(1)
            lines[effort_index] = f'{prefix}"{args.effort}"'
        rendered = "\n".join(lines) + ("\n" if original.endswith("\n") else "")
    tomllib.loads(rendered)
    changed = rendered != original
    projects = parsed.get("projects", {})
    broad = [
        path
        for path, item in projects.items()
        if isinstance(item, dict)
        and item.get("trust_level") == "trusted"
        and Path(path).expanduser().resolve(strict=False) in {HOME, HOME / "Developer"}
    ]

    audit_path = None
    if args.apply and changed:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        audit_dir = AUDIT_ROOT / stamp
        audit_dir.mkdir(parents=True, mode=0o700)
        audit_dir.chmod(0o700)
        audit_path = audit_dir / "codex-config-change.json"
        atomic_write(
            audit_path,
            json.dumps(
                {
                    "previousEffort": previous,
                    "newEffort": args.effort,
                    "originalSha256": hashlib.sha256(original_bytes).hexdigest(),
                    "configPath": str(config_path),
                },
                indent=2,
            )
            + "\n",
        )
        atomic_write(config_path, rendered)

    print(
        json.dumps(
            {
                "apply": args.apply,
                "changed": changed,
                "previousEffort": previous,
                "targetEffort": args.effort,
                "trustedProjectCount": sum(
                    isinstance(item, dict) and item.get("trust_level") == "trusted"
                    for item in projects.values()
                ),
                "broadTrustedProjects": broad,
                "projectTrustChanged": False,
                "auditRecord": str(audit_path) if audit_path else None,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
