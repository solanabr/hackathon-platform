#!/usr/bin/env python3
"""Keep the active Codex standalone release and one rollback release."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shutil


ROOT = Path.home().resolve() / ".codex" / "packages" / "standalone"
RELEASES = ROOT / "releases"
CURRENT = ROOT / "current"


def version_key(path: Path) -> tuple[int, ...]:
    match = re.match(r"(\d+)\.(\d+)\.(\d+)-", path.name)
    if not match:
        raise ValueError(f"unexpected release name: {path.name}")
    return tuple(int(part) for part in match.groups())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--ack-codex-stopped", action="store_true")
    args = parser.parse_args()
    if args.apply and not args.ack_codex_stopped:
        parser.error("--apply requires --ack-codex-stopped")
    current = CURRENT.resolve(strict=True)
    if current.parent != RELEASES.resolve() or not current.is_dir():
        raise RuntimeError("current Codex release is outside the releases directory")
    releases = sorted(
        (path for path in RELEASES.iterdir() if path.is_dir() and not path.is_symlink()),
        key=version_key,
    )
    if current not in releases:
        raise RuntimeError("current release is not present in inventory")
    older = [path for path in releases if version_key(path) < version_key(current)]
    previous = max(older, key=version_key) if older else None
    keep = {current} | ({previous} if previous else set())
    remove = [path for path in releases if path not in keep]
    logical_bytes = sum(
        file.stat().st_size for path in remove for file in path.rglob("*") if file.is_file()
    )
    if args.apply:
        for path in remove:
            if CURRENT.resolve(strict=True) != current:
                raise RuntimeError("active Codex release changed after inventory")
            if path.resolve().parent != RELEASES.resolve():
                raise RuntimeError(f"refusing unsafe path: {path}")
            shutil.rmtree(path)
    print(
        json.dumps(
            {
                "apply": args.apply,
                "current": current.name,
                "rollback": previous.name if previous else None,
                "removed": [path.name for path in remove],
                "logicalBytes": logical_bytes,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
