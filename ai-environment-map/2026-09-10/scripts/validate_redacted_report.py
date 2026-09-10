#!/usr/bin/env python3
"""Validate the shareable AI environment report without printing its content."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import stat
import sys
from pathlib import Path
from typing import Any


EXPECTED_TOP_LEVEL = {
    "schemaVersion", "collectedAt", "collector", "privacy", "run", "target", "system", "tools",
    "environment", "claude", "codex", "workspace", "runtime", "observations", "privacyValidation",
}
MAX_REPORT_BYTES = 16 * 1024 * 1024
FORBIDDEN_KEYS = {
    "prompt", "messages", "historyContent", "sessionContent", "environmentValues", "hookSource",
    "pid", "ppid", "path", "branch", "head", "command", "args", "headers", "url",
    "secret", "token", "password", "credential", "apiKey", "authorization", "cookie", "stdout",
    "stderr", "argv", "commandLine",
}
PATTERNS = {
    "RAW_PATH": re.compile(r"(?:^|[\"'\s])/(?:Users|home|private|tmp|var|etc|opt|Applications)/"),
    "EMAIL": re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"),
    "URL": re.compile(r"(?i)\b[a-z][a-z0-9+.-]*://"),
    "IPV4": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "UUID": re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b", re.I),
    "JWT": re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b"),
    "PRIVATE_KEY": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "OPENAI_KEY": re.compile(r"sk-(?:proj-)?[A-Za-z0-9_-]{16,}"),
    "ANTHROPIC_KEY": re.compile(r"sk-ant-[A-Za-z0-9_-]{16,}"),
    "GITHUB_TOKEN": re.compile(r"gh[oprsu]_[A-Za-z0-9]{20,}"),
    "SLACK_TOKEN": re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    "AWS_ACCESS_KEY": re.compile(r"AKIA[0-9A-Z]{16}"),
    "BEARER": re.compile(r"(?i)bearer\s+[A-Za-z0-9._-]{16,}"),
    "CREDENTIAL_URI": re.compile(r"(?i)[a-z][a-z0-9+.-]*://[^\s/@:]+:[^\s/@]+@"),
    "WINDOWS_PATH": re.compile(r"(?i)(?:^|[\"'\s])[A-Z]:\\(?:Users|Windows|ProgramData)\\"),
}


def has_symlink_component(path: Path) -> bool:
    try:
        candidate = path.expanduser()
        if not candidate.is_absolute():
            candidate = Path.cwd() / candidate
        current = Path(candidate.anchor)
        for part in candidate.parts[1:]:
            current /= part
            if current.is_symlink():
                return True
    except (OSError, RuntimeError):
        return True
    return False


def no_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def load_report(path: Path) -> Any:
    if has_symlink_component(path):
        raise OSError("symlinked report")
    descriptor: int | None = None
    try:
        flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(path, flags)
        metadata = os.fstat(descriptor)
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > MAX_REPORT_BYTES:
            raise OSError("invalid report file")
        with os.fdopen(descriptor, "r", encoding="utf-8", errors="strict") as handle:
            descriptor = None
            return json.loads(handle.read(MAX_REPORT_BYTES + 1), object_pairs_hook=no_duplicate_keys)
    finally:
        if descriptor is not None:
            os.close(descriptor)


def walk_keys(value: Any, failures: list[str]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key).lower() in {item.lower() for item in FORBIDDEN_KEYS}:
                failures.append("FORBIDDEN_KEY")
            walk_keys(child, failures)
    elif isinstance(value, list):
        for child in value:
            walk_keys(child, failures)
    elif isinstance(value, str):
        if "\n" in value or "\r" in value:
            failures.append("DLP_MULTILINE_VALUE")
        for token in re.findall(r"[A-Za-z0-9_+/=-]{24,}", value):
            if re.fullmatch(r"(?:[a-z][a-z0-9]*_)?[0-9a-f]{20}", token, re.I):
                continue
            if re.fullmatch(r"[0-9a-f]{64}", token, re.I):
                continue
            frequencies = {character: token.count(character) for character in set(token)}
            entropy = -sum(
                (count / len(token)) * math.log2(count / len(token))
                for count in frequencies.values()
            )
            if entropy >= 4.2:
                failures.append("DLP_HIGH_ENTROPY_VALUE")


def validate(data: Any) -> list[str]:
    failures: list[str] = []
    if not isinstance(data, dict):
        return ["ROOT_NOT_OBJECT"]
    unknown = set(data) - EXPECTED_TOP_LEVEL
    missing = EXPECTED_TOP_LEVEL - set(data)
    if unknown:
        failures.append("UNKNOWN_TOP_LEVEL_FIELDS")
    if missing:
        failures.append("MISSING_TOP_LEVEL_FIELDS")
    if data.get("schemaVersion") != "1.0.0":
        failures.append("SCHEMA_VERSION_MISMATCH")
    privacy = data.get("privacy")
    required_false = (
        "environmentValuesCollected", "sessionContentsRead", "historyContentsRead", "promptContentsRead",
        "repositorySourceRead", "mcpArgumentsEmitted", "hookSourceEmitted", "rawOutputPersisted",
        "shellHistoryOpened", "keychainAccessed", "processCommandLinesRead",
    )
    if not isinstance(privacy, dict) or any(privacy.get(key) is not False for key in required_false):
        failures.append("PRIVACY_ASSERTION_FAILED")
    validation = data.get("privacyValidation")
    if not isinstance(validation, dict) or validation.get("passed") is not True or validation.get("failures") != []:
        failures.append("EMBEDDED_VALIDATION_FAILED")
    walk_keys(data, failures)
    serialized = json.dumps(data, ensure_ascii=False)
    for label, pattern in PATTERNS.items():
        if pattern.search(serialized):
            failures.append(f"DLP_{label}")
    return sorted(set(failures))


def self_test() -> int:
    canary = {key: {} for key in EXPECTED_TOP_LEVEL}
    canary["schemaVersion"] = "1.0.0"
    canary["privacy"] = {
        "environmentValuesCollected": False, "sessionContentsRead": False, "historyContentsRead": False,
        "promptContentsRead": False, "repositorySourceRead": False, "mcpArgumentsEmitted": False,
        "hookSourceEmitted": False, "rawOutputPersisted": False, "shellHistoryOpened": False,
        "keychainAccessed": False, "processCommandLinesRead": False,
    }
    canary["privacyValidation"] = {"passed": True, "failures": []}
    clean = validate(canary) == []
    canary["run"] = {"prompt": "".join(("sk-", "ant-", "example-do-not-retain-", "1234567890"))}
    dirty = validate(canary)
    passed = clean and "FORBIDDEN_KEY" in dirty and "DLP_ANTHROPIC_KEY" in dirty
    print(json.dumps({"selfTest": "passed" if passed else "failed"}))
    return 0 if passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", nargs="?")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.report:
        parser.error("report is required unless --self-test is used")
    try:
        data = load_report(Path(args.report))
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError):
        print(json.dumps({"valid": False, "failures": ["REPORT_UNREADABLE"]}))
        return 2
    failures = validate(data)
    print(json.dumps({"valid": not failures, "failures": failures}))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
