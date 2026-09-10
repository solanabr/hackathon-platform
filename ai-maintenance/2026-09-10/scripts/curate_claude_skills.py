#!/usr/bin/env python3
"""Reduce Claude's auto-discovered symlink catalog without deleting skill sources."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone


HOME = Path.home().resolve()
ACTIVE = HOME / ".claude" / "skills"
ARCHIVE_ROOT = HOME / ".config" / "ai-maintenance" / "disabled-claude-skill-links"
USAGE = HOME / ".claude.json"
PLUGIN_SKILLS = {
    "brainstorming",
    "dispatching-parallel-agents",
    "executing-plans",
    "finishing-a-development-branch",
    "receiving-code-review",
    "requesting-code-review",
    "subagent-driven-development",
    "systematic-debugging",
    "test-driven-development",
    "using-git-worktrees",
    "using-superpowers",
    "verification-before-completion",
    "writing-plans",
    "writing-skills",
}


def used_skill_names() -> set[str]:
    data = json.loads(USAGE.read_text(encoding="utf-8"))
    usage = data.get("skillUsage", {})
    return {
        name
        for name, item in usage.items()
        if isinstance(item, dict) and item.get("usageCount", 0) > 0
    }


def git(*args: str, input_text: str | None = None) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ACTIVE,
        input=input_text,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout


def assert_dedicated_repo() -> None:
    if not ACTIVE.is_dir():
        raise RuntimeError(f"Claude skills directory not found: {ACTIVE}")
    top = Path(git("rev-parse", "--show-toplevel").strip()).resolve()
    if top != ACTIVE:
        raise RuntimeError(
            f"refusing sparse checkout: {ACTIVE} is not the Git repository root ({top})"
        )
    dirty = git("status", "--porcelain", "--untracked-files=no").strip()
    if dirty:
        raise RuntimeError("refusing sparse checkout while tracked skill files are modified")


def tracked_inventory() -> tuple[list[str], set[str], set[str]]:
    rows = git("ls-tree", "-rz", "HEAD").split("\0")
    tracked: list[str] = []
    symlinks: set[str] = set()
    physical: set[str] = set()
    for row in rows:
        if not row:
            continue
        metadata, path = row.split("\t", 1)
        mode = metadata.split(" ", 1)[0]
        tracked.append(path)
        top = path.split("/", 1)[0]
        if mode == "120000" and "/" not in path:
            symlinks.add(top)
        if path.endswith("/SKILL.md"):
            physical.add(top)
    return tracked, symlinks, physical


def selection(
    *, requested_links: set[str], from_usage: bool
) -> tuple[list[str], set[str], set[str], set[str]]:
    assert_dedicated_repo()
    tracked, symlinks, physical = tracked_inventory()
    inferred = (used_skill_names() - PLUGIN_SKILLS) if from_usage else set()
    unknown = requested_links - symlinks
    if unknown:
        raise RuntimeError(f"requested links are not tracked symlinks: {sorted(unknown)}")
    keep_links = (inferred & symlinks) | requested_links
    return tracked, symlinks, physical, keep_links


def plan(*, requested_links: set[str], from_usage: bool) -> dict[str, object]:
    _, symlinks, physical, keep_links = selection(
        requested_links=requested_links, from_usage=from_usage
    )
    return {
        "apply": False,
        "keptPhysicalSkills": sorted(physical),
        "keptSymlinks": sorted(keep_links),
        "excludedTrackedSymlinks": sorted(symlinks - keep_links),
        "excludedTrackedSymlinkCount": len(symlinks - keep_links),
        "sourceDirectoriesDeleted": 0,
    }


def apply(*, requested_links: set[str], from_usage: bool) -> dict[str, object]:
    tracked, symlinks, physical, keep_links = selection(
        requested_links=requested_links, from_usage=from_usage
    )
    selected = physical | keep_links
    patterns = [f"/{path}" for path in tracked if path.split("/", 1)[0] in selected]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive = ARCHIVE_ROOT / stamp
    archive.mkdir(parents=True, exist_ok=False, mode=0o700)
    ARCHIVE_ROOT.chmod(0o700)
    archive.chmod(0o700)
    git("sparse-checkout", "set", "--no-cone", "--stdin", input_text="\n".join(patterns) + "\n")
    moved_untracked: list[str] = []
    untracked = [name for name in git("ls-files", "--others", "--exclude-standard", "-z").split("\0") if name]
    for name in untracked:
        source = ACTIVE / name
        if "/" in name or not source.is_symlink() or source.name in keep_links:
            continue
        target = archive / source.name
        if target.exists() or target.is_symlink():
            raise RuntimeError(f"archive collision: {target}")
        os.replace(source, target)
        moved_untracked.append(source.name)
    manifest = {
        "activeDirectory": str(ACTIVE),
        "archiveDirectory": str(archive),
        "mechanism": "git sparse-checkout",
        "keptPhysicalSkills": sorted(physical),
        "keptUsedSymlinks": sorted(keep_links),
        "excludedTrackedSymlinks": len(symlinks - keep_links),
        "movedUntrackedSymlinks": moved_untracked,
        "sourceDirectoriesDeleted": 0,
    }
    manifest_path = archive / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    manifest_path.chmod(0o600)
    return manifest


def restore(archive: Path) -> dict[str, int]:
    assert_dedicated_repo()
    git("sparse-checkout", "disable")
    restored = 0
    collisions = 0
    if not archive.exists():
        return {"restored": 0, "collisions": 0}
    for source in sorted(archive.iterdir()):
        if not source.is_symlink():
            continue
        target = ACTIVE / source.name
        if target.exists() or target.is_symlink():
            collisions += 1
            continue
        os.replace(source, target)
        restored += 1
    return {"restored": restored, "collisions": collisions}


def status() -> dict[str, int]:
    active_links = sum(1 for path in ACTIVE.iterdir() if path.is_symlink())
    archives = (
        [path for path in ARCHIVE_ROOT.iterdir() if path.is_dir()]
        if ARCHIVE_ROOT.exists()
        else []
    )
    archived_links = sum(
        1 for archive in archives for path in archive.iterdir() if path.is_symlink()
    )
    physical = sum(1 for path in ACTIVE.iterdir() if path.is_dir() and not path.is_symlink())
    return {"activeSymlinks": active_links, "archivedSymlinks": archived_links, "physical": physical}


def main() -> int:
    parser = argparse.ArgumentParser()
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument("--apply", action="store_true")
    actions.add_argument("--plan", action="store_true")
    actions.add_argument("--restore", action="store_true")
    actions.add_argument("--status", action="store_true")
    parser.add_argument("--keep-link", action="append", default=[])
    parser.add_argument("--from-usage", action="store_true")
    parser.add_argument("--archive-dir", type=Path)
    parser.add_argument("--ack-plan-reviewed", action="store_true")
    parser.add_argument("--ack-claude-stopped", action="store_true")
    args = parser.parse_args()
    if args.apply or args.plan:
        if not (args.keep_link or args.from_usage):
            parser.error("--plan/--apply requires --keep-link NAME or --from-usage")
        if args.apply:
            if not (args.ack_plan_reviewed and args.ack_claude_stopped):
                parser.error(
                    "--apply requires --ack-plan-reviewed and --ack-claude-stopped"
                )
            result = apply(requested_links=set(args.keep_link), from_usage=args.from_usage)
        else:
            result = plan(requested_links=set(args.keep_link), from_usage=args.from_usage)
    elif args.restore:
        if not args.archive_dir:
            parser.error("--restore requires --archive-dir from the apply report")
        if not args.ack_claude_stopped:
            parser.error("--restore requires --ack-claude-stopped")
        result = restore(args.archive_dir.expanduser().resolve(strict=True))
    else:
        result = status()
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
