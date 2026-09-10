#!/usr/bin/env python3
"""Delete explicitly listed inactive build/dependency directories with guardrails."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess


HOME = Path.home().resolve()
ALLOWED_NAMES = {".next", ".turbo", "node_modules"}


def process_cwds() -> set[Path]:
    result = subprocess.run(
        ["lsof", "-a", "-d", "cwd", "-Fn"], text=True, capture_output=True, check=False
    )
    if result.returncode not in (0, 1):
        raise RuntimeError("could not inventory process working directories")
    return {
        Path(line[1:]).resolve(strict=False)
        for line in result.stdout.splitlines()
        if line.startswith("n/")
    }


def disk_kib(path: Path) -> int:
    result = subprocess.run(["du", "-sk", str(path)], text=True, capture_output=True, check=True)
    return int(result.stdout.split()[0])


def cwd_conflict(path: Path, cwds: set[Path]) -> bool:
    project = path.parent
    return any(
        cwd == path
        or path in cwd.parents
        or cwd == project
        or project in cwd.parents
        for cwd in cwds
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    cwds = process_cwds()
    items: list[dict[str, object]] = []
    for requested in args.paths:
        lexical = Path(os.path.abspath(os.path.expanduser(str(requested))))
        path = lexical.resolve(strict=False)
        reasons: list[str] = []
        if lexical.name not in ALLOWED_NAMES:
            reasons.append("unsupported_basename")
        if HOME not in path.parents:
            reasons.append("outside_home")
        if lexical != path:
            reasons.append("symlink_component")
        if not lexical.is_dir() or lexical.is_symlink():
            reasons.append("missing_or_symlink")
        if cwd_conflict(path, cwds):
            reasons.append("process_cwd")
        items.append(
            {
                "path": str(lexical),
                "diskKiB": disk_kib(lexical) if not reasons else 0,
                "safe": not reasons,
                "reasons": reasons,
            }
        )
    if args.apply:
        if any(not item["safe"] for item in items):
            raise RuntimeError("refusing apply because one or more paths are unsafe")
        for item in items:
            lexical = Path(str(item["path"]))
            if lexical.is_symlink() or lexical.resolve(strict=True) != lexical:
                raise RuntimeError(f"path changed or became a symlink: {lexical}")
            if cwd_conflict(lexical, process_cwds()):
                raise RuntimeError(f"process entered project before deletion: {lexical}")
            shutil.rmtree(lexical)
    print(
        json.dumps(
            {
                "apply": args.apply,
                "count": len(items),
                "diskKiB": sum(int(item["diskKiB"]) for item in items),
                "items": items,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
