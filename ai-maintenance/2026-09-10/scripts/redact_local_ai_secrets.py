#!/usr/bin/env python3
"""Redact credential-shaped material from local AI history files."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile


TOKEN_PATTERNS = [
    re.compile(rb"sk-(?:proj-)?[A-Za-z0-9_-]{20,}"),
    re.compile(rb"AIza[A-Za-z0-9_-]{20,}"),
]
if len(os.environ.get("ELEVENLABS_API_KEY", "")) > 20:
    TOKEN_PATTERNS.append(
        re.compile(re.escape(os.environ["ELEVENLABS_API_KEY"].encode("utf-8")))
    )
SSHPASS = re.compile(
    rb"(?i)(sshpass[ \t]+-p[ \t]+)(?![\"']?<redacted-rotate-required>)(?:\"[^\"\r\n]*\"|'[^'\r\n]*'|[^ \t\r\n;|&]+)"
)


def redact(data: bytes) -> tuple[bytes, int]:
    count = 0
    for pattern in TOKEN_PATTERNS:
        data, replaced = pattern.subn(b"<redacted-rotate-required>", data)
        count += replaced
    data, replaced = SSHPASS.subn(rb"\1'<redacted-rotate-required>'", data)
    count += replaced
    return data, count


def redact_fixed_width(data: bytes) -> tuple[bytes, int]:
    """Redact without changing file size, suitable for append-only files held open."""
    count = 0
    for pattern in TOKEN_PATTERNS:
        data, replaced = pattern.subn(lambda match: b"X" * len(match.group(0)), data)
        count += replaced
    data, replaced = SSHPASS.subn(lambda match: b"X" * len(match.group(0)), data)
    count += replaced
    return data, count


def stat_identity(stat: os.stat_result) -> tuple[int, int, int, int]:
    return (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns)


def atomic_write(
    path: Path, data: bytes, expected_identity: tuple[int, int, int, int]
) -> None:
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(fd, path.stat().st_mode & 0o777)
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        if stat_identity(path.stat()) != expected_identity:
            raise RuntimeError("file changed immediately before atomic redaction")
        os.replace(temp_name, path)
    finally:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass


def changed_ranges(original: bytes, cleaned: bytes) -> list[tuple[int, int]]:
    """Return contiguous byte ranges changed by a fixed-width transform."""
    if len(cleaned) != len(original):
        raise RuntimeError("fixed-width redaction changed file size")
    ranges: list[tuple[int, int]] = []
    cursor = 0
    while cursor < len(original):
        if original[cursor] == cleaned[cursor]:
            cursor += 1
            continue
        start = cursor
        cursor += 1
        while cursor < len(original) and original[cursor] != cleaned[cursor]:
            cursor += 1
        ranges.append((start, cursor))
    return ranges


def in_place_write(
    path: Path,
    baseline_identity: tuple[int, int, int, int],
    cutoff: int,
    baseline_sha256: bytes,
) -> tuple[int, int]:
    """Redact a stable complete-line snapshot and preserve later appends."""
    flags = os.O_RDWR | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags)
    try:
        current = os.fstat(descriptor)
        if not stat.S_ISREG(current.st_mode):
            raise RuntimeError("live redaction requires a regular file")
        old_device, old_inode, _, _ = baseline_identity
        if (current.st_dev, current.st_ino) != (old_device, old_inode):
            raise RuntimeError("history inode changed before live redaction")
        if current.st_size < cutoff:
            raise RuntimeError("live history was truncated after preflight")
        original = os.pread(descriptor, cutoff, 0)
        if len(original) != cutoff or hashlib.sha256(original).digest() != baseline_sha256:
            raise RuntimeError("live history changed inside the preflight prefix")
        cleaned, count = redact_fixed_width(original)
        for start, end in changed_ranges(original, cleaned):
            if os.pread(descriptor, end - start, start) != original[start:end]:
                raise RuntimeError("matched bytes changed during live redaction")
            written = os.pwrite(descriptor, cleaned[start:end], start)
            if written != end - start:
                raise RuntimeError("short write during live redaction")
        if count:
            os.fsync(descriptor)
        after = os.fstat(descriptor)
        path_now = path.lstat()
        if stat.S_ISLNK(path_now.st_mode) or (
            path_now.st_dev,
            path_now.st_ino,
        ) != (after.st_dev, after.st_ino):
            raise RuntimeError("history path was replaced during live redaction")
        if after.st_size < cutoff:
            raise RuntimeError("live history was truncated during redaction")
        if os.pread(descriptor, cutoff, 0) != cleaned:
            raise RuntimeError("live history prefix changed during redaction")
        return count, after.st_size - cutoff
    finally:
        os.close(descriptor)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--redact-open-in-place", action="store_true")
    parser.add_argument("--ack-live-file-risk", action="store_true")
    parser.add_argument("--allow-any-file", action="store_true")
    parser.add_argument("--claude-histories", action="store_true")
    parser.add_argument("--codex-histories", action="store_true")
    parser.add_argument("paths", nargs="*", type=Path)
    args = parser.parse_args()
    paths = list(args.paths)
    if args.claude_histories:
        home = Path.home()
        paths.append(home / ".claude" / "history.jsonl")
        paths.extend((home / ".claude" / "projects").rglob("*.jsonl"))
    if args.codex_histories:
        paths.extend((Path.home() / ".codex" / "sessions").rglob("*.jsonl"))
    paths = sorted(set(path for path in paths if path.is_file()))
    if not paths:
        parser.error("provide paths or --claude-histories")
    if args.redact_open_in_place and not (args.apply and args.ack_live_file_risk):
        parser.error(
            "--redact-open-in-place requires --apply and --ack-live-file-risk"
        )
    home = Path.home().resolve()
    if not args.allow_any_file:
        allowed_roots = [
            (home / ".claude").resolve(strict=False),
            (home / ".codex" / "sessions").resolve(strict=False),
        ]
        outside = [
            path
            for path in paths
            if not any(root == path.resolve() or root in path.resolve().parents for root in allowed_roots)
        ]
        if outside:
            parser.error("explicit paths outside Claude/Codex history require --allow-any-file")
    open_paths: set[Path] = set()
    if args.apply:
        try:
            opened = subprocess.run(
                ["lsof", "-Fn"], text=True, capture_output=True, check=False
            )
        except FileNotFoundError as exc:
            raise RuntimeError("lsof is required before applying redaction") from exc
        if opened.returncode not in (0, 1):
            raise RuntimeError("lsof failed; refusing to replace possibly open files")
        open_paths = {
            Path(line[1:]).resolve(strict=False)
            for line in opened.stdout.splitlines()
            if line.startswith("n/")
        }
    preflight = []
    for path in paths:
        before = path.stat()
        original = path.read_bytes()
        after = path.stat()
        identity = stat_identity(before)
        if identity != stat_identity(after):
            raise RuntimeError("file changed during redaction preflight")
        _, count = redact(original)
        cutoff = original.rfind(b"\n") + 1
        stable_prefix = original[:cutoff]
        preflight.append(
            (
                path,
                identity,
                cutoff,
                hashlib.sha256(stable_prefix).digest(),
                count,
                redact(stable_prefix)[1],
                path.resolve() in open_paths,
            )
        )
    blocked_open = [
        path
        for path, _, _, _, count, _, is_open in preflight
        if args.apply and count and is_open and not args.redact_open_in_place
    ]
    if blocked_open:
        raise RuntimeError(
            f"refusing partial apply: {len(blocked_open)} matched files are open; "
            "close them or explicitly acknowledge fixed-width live redaction"
        )

    results = []
    skipped_open = 0
    in_place_open = 0
    in_place_files = 0
    appended_after_cutoff = 0
    incomplete_tail_matches = 0
    for (
        path,
        identity,
        cutoff,
        baseline_sha256,
        expected_count,
        prefix_count,
        is_open,
    ) in preflight:
        if not args.apply:
            results.append(
                {
                    "path": str(path),
                    "matches": expected_count,
                    "changed": False,
                    "skippedOpen": False,
                }
            )
            continue
        if expected_count == 0:
            results.append(
                {
                    "path": str(path),
                    "matches": 0,
                    "changed": False,
                    "skippedOpen": False,
                }
            )
            continue
        original = path.read_bytes()
        current = path.stat()
        current_identity = stat_identity(current)
        live_redaction = bool(args.redact_open_in_place and expected_count)
        if current_identity != identity and not live_redaction:
            raise RuntimeError("file changed after redaction preflight")
        cleaned, count = redact(original)
        if not live_redaction and count != expected_count:
            raise RuntimeError("redaction match count changed after preflight")
        if args.apply and live_redaction:
            count, appended = in_place_write(
                path, identity, cutoff, baseline_sha256
            )
            appended_after_cutoff += appended
            incomplete_tail_matches += max(0, expected_count - prefix_count)
            in_place_files += 1
            if is_open:
                in_place_open += 1
        elif args.apply and count:
            atomic_write(path, cleaned, current_identity)
        results.append(
            {
                "path": str(path),
                "matches": count,
                "changed": bool(
                    args.apply and count and (not is_open or args.redact_open_in_place)
                ),
                "skippedOpen": bool(
                    args.apply and count and is_open and not args.redact_open_in_place
                ),
            }
        )
    matched = [item for item in results if item["matches"]]
    report: dict[str, object] = {
        "apply": args.apply,
        "filesScanned": len(results),
        "matchedFiles": len(matched),
        "matches": sum(int(item["matches"]) for item in matched),
        "changedFiles": sum(bool(item["changed"]) for item in matched),
        "skippedOpenFiles": skipped_open,
        "inPlaceOpenFiles": in_place_open,
        "inPlaceFiles": in_place_files,
        "bytesAppendedAfterSnapshotCutoff": appended_after_cutoff,
        "matchesDeferredInIncompleteTail": incomplete_tail_matches,
    }
    if len(results) <= 20:
        report["files"] = results
    if args.apply:
        residual = 0
        for path in paths:
            _, count = redact(path.read_bytes())
            residual += count
        if residual:
            raise RuntimeError(f"post-write verification found {residual} residual matches")
        report["residualMatches"] = residual
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
