#!/usr/bin/env python3
"""Remove only clean, registered, inactive worktrees with no local-only commits."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess


def run(*args: str, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True, check=check)


def registered(repo: Path) -> set[Path]:
    output = run("git", "worktree", "list", "--porcelain", cwd=repo).stdout
    return {
        Path(line.removeprefix("worktree ")).resolve()
        for line in output.splitlines()
        if line.startswith("worktree ")
    }


def process_cwds() -> set[Path]:
    result = run("lsof", "-a", "-d", "cwd", "-Fn", check=False)
    if result.returncode not in (0, 1):
        raise RuntimeError("could not inventory process working directories")
    return {
        Path(line[1:]).resolve(strict=False)
        for line in result.stdout.splitlines()
        if line.startswith("n/")
    }


def disk_kib(path: Path) -> int:
    result = run("du", "-sk", str(path))
    return int(result.stdout.split()[0])


def inspect(repo: Path, path: Path, known: set[Path], cwds: set[Path]) -> dict[str, object]:
    lexical = Path(os.path.abspath(os.path.expanduser(str(path))))
    resolved = lexical.resolve(strict=False)
    reasons: list[str] = []
    if lexical != resolved:
        reasons.append("symlink_component")
    if resolved == repo:
        reasons.append("primary_worktree")
    if resolved not in known:
        reasons.append("not_registered")
    if not lexical.is_dir():
        reasons.append("missing")
    if any(cwd == resolved or resolved in cwd.parents for cwd in cwds):
        reasons.append("process_cwd")
    branch = None
    ahead = None
    behind = None
    size = 0
    if lexical.is_dir():
        status = run("git", "status", "--porcelain", "--untracked-files=all", cwd=lexical, check=False)
        if status.returncode or status.stdout.strip():
            reasons.append("dirty_or_unreadable")
        ignored = run(
            "git", "ls-files", "--others", "--ignored", "--exclude-standard", "-z",
            cwd=lexical,
            check=False,
        )
        if ignored.returncode or ignored.stdout:
            reasons.append("ignored_files_present")
        branch_result = run("git", "branch", "--show-current", cwd=lexical, check=False)
        branch = branch_result.stdout.strip() or None
        upstream = run("git", "rev-parse", "--abbrev-ref", "@{upstream}", cwd=lexical, check=False)
        if upstream.returncode:
            reasons.append("no_upstream")
        else:
            counts = run("git", "rev-list", "--left-right", "--count", "HEAD...@{upstream}", cwd=lexical)
            ahead, behind = (int(value) for value in counts.stdout.split())
            if ahead:
                reasons.append("local_only_commits")
        size = disk_kib(lexical)
    return {
        "path": str(lexical),
        "branch": branch,
        "ahead": ahead,
        "behind": behind,
        "diskKiB": size,
        "safe": not reasons,
        "reasons": reasons,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    repo = args.repo.resolve(strict=True)
    known = registered(repo)
    cwds = process_cwds()
    results = [inspect(repo, path, known, cwds) for path in args.paths]
    if args.apply:
        unsafe = [item for item in results if not item["safe"]]
        if unsafe:
            raise RuntimeError("refusing apply because one or more worktrees are unsafe")
        for item in results:
            candidate = Path(str(item["path"]))
            if candidate.is_symlink() or candidate.resolve(strict=True) == repo:
                raise RuntimeError(f"worktree changed or is unsafe: {candidate}")
            run("git", "worktree", "remove", item["path"], cwd=repo)
    print(
        json.dumps(
            {
                "apply": args.apply,
                "count": len(results),
                "safeCount": sum(bool(item["safe"]) for item in results),
                "diskKiB": sum(int(item["diskKiB"]) for item in results),
                "worktrees": results,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
