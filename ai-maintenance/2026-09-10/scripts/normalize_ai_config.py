#!/usr/bin/env python3
"""Preview or apply conservative Claude model and permission-prompt defaults."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import tempfile


HOME = Path.home().resolve()
SETTINGS = HOME / ".claude" / "settings.json"
LOCAL_SETTINGS = HOME / ".claude" / "settings.local.json"
AUDIT_ROOT = HOME / ".config" / "ai-maintenance" / "changes"


def atomic_write(path: Path, data: str) -> None:
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(data)
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
        description="Dry-run by default. This script never changes settings.local.json."
    )
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--model")
    parser.add_argument(
        "--effort", choices=("low", "medium", "high", "xhigh")
    )
    parser.add_argument("--settings", type=Path, default=SETTINGS)
    args = parser.parse_args()

    settings_path = args.settings.expanduser().resolve(strict=True)
    original_bytes = settings_path.read_bytes()
    settings = json.loads(original_bytes)
    previous = {
        key: settings.get(key)
        for key in (
            "model",
            "effortLevel",
            "skipAutoPermissionPrompt",
            "skipDangerousModePermissionPrompt",
        )
    }
    target = {
        "skipAutoPermissionPrompt": False,
        "skipDangerousModePermissionPrompt": False,
    }
    if args.model:
        target["model"] = args.model
    if args.effort:
        target["effortLevel"] = args.effort
    changes = [key for key, value in target.items() if settings.get(key) != value]
    settings.update(target)
    rendered = json.dumps(settings, indent=2, ensure_ascii=False) + "\n"
    json.loads(rendered)

    local_allow_count = None
    if LOCAL_SETTINGS.is_file():
        local = json.loads(LOCAL_SETTINGS.read_text(encoding="utf-8"))
        allow = local.get("permissions", {}).get("allow", [])
        local_allow_count = len(allow) if isinstance(allow, list) else None

    audit_path = None
    if args.apply and changes:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        audit_dir = AUDIT_ROOT / stamp
        audit_dir.mkdir(parents=True, mode=0o700)
        audit_dir.chmod(0o700)
        audit_path = audit_dir / "claude-settings-change.json"
        atomic_write(
            audit_path,
            json.dumps(
                {
                    "changedKeys": changes,
                    "previousValues": previous,
                    "originalSha256": hashlib.sha256(original_bytes).hexdigest(),
                    "settingsPath": str(settings_path),
                },
                indent=2,
            )
            + "\n",
        )
        atomic_write(settings_path, rendered)

    print(
        json.dumps(
            {
                "apply": args.apply,
                "changedKeys": changes,
                "target": target,
                "localAllowRuleCount": local_allow_count,
                "localAllowlistChanged": False,
                "auditRecord": str(audit_path) if audit_path else None,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
