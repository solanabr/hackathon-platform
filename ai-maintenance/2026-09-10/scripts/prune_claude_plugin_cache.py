#!/usr/bin/env python3
"""Remove plugin cache versions that are not referenced by Claude's registry."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil


HOME = Path.home().resolve()
ROOT = (HOME / ".claude" / "plugins" / "cache").resolve()
REGISTRY = HOME / ".claude" / "plugins" / "installed_plugins.json"


def candidates() -> list[tuple[Path, int]]:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    referenced = {
        Path(item["installPath"]).resolve()
        for items in registry.get("plugins", {}).values()
        for item in items
        if item.get("installPath")
    }
    stale: list[tuple[Path, int]] = []
    for marketplace in ROOT.iterdir():
        if not marketplace.is_dir():
            continue
        for plugin in marketplace.iterdir():
            if not plugin.is_dir():
                continue
            for version in plugin.iterdir():
                if version.is_symlink():
                    continue
                resolved = version.resolve()
                if not version.is_dir() or ROOT not in resolved.parents:
                    continue
                if any(resolved == active or resolved in active.parents for active in referenced):
                    continue
                size = sum(path.stat().st_size for path in version.rglob("*") if path.is_file())
                stale.append((version, size))
    return stale


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--ack-claude-stopped", action="store_true")
    args = parser.parse_args()
    if args.apply and not args.ack_claude_stopped:
        parser.error("--apply requires --ack-claude-stopped")
    stale = candidates()
    result = {
        "apply": args.apply,
        "count": len(stale),
        "bytes": sum(size for _, size in stale),
        "paths": [str(path.relative_to(ROOT)) for path, _ in stale],
    }
    if args.apply:
        for path, _ in stale:
            current = {candidate.resolve() for candidate, _ in candidates()}
            resolved = path.resolve(strict=True)
            if resolved not in current or resolved.parent.parent.parent != ROOT:
                raise RuntimeError(f"cache inventory changed or path is unsafe: {path}")
            shutil.rmtree(path)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
