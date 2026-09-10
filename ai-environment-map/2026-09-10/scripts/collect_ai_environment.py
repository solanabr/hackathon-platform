#!/usr/bin/env python3
"""Collect a redacted Claude/Cowork/AI-workspace performance inventory.

The collector reads configuration structure and filesystem metadata. It never
emits environment values, prompt/session/history contents, MCP arguments,
credentials, hook source, or repository source code.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import math
import os
import platform
import plistlib
import re
import secrets
import shlex
import shutil
import stat
import statistics
import subprocess
import sys
import tempfile
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = "1.0.0"
COLLECTOR_VERSION = "1.0.1"
_PAIRING_KEY = secrets.token_bytes(32)
MAX_STRUCTURED_FILE_BYTES = 8 * 1024 * 1024
PRUNE_DIRS = {
    ".git",
    ".next",
    ".turbo",
    ".venv",
    "Library",
    "Applications",
    "Movies",
    "Music",
    "Pictures",
    "node_modules",
    "target",
    "vendor",
}
VERSION_COMMANDS = {
    "claude": ["claude", "--version"],
    "codex": ["codex", "--version"],
    "node": ["node", "--version"],
    "npm": ["npm", "--version"],
    "pnpm": ["pnpm", "--version"],
    "bun": ["bun", "--version"],
    "python3": ["python3", "--version"],
    "git": ["git", "--version"],
}
SECRET_VALUE_PATTERNS = [
    re.compile(r"sk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}"),
    re.compile(r"gh[oprsu]_[A-Za-z0-9]{20,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._-]{16,}"),
    re.compile(r"[a-z][a-z0-9+.-]*://[^\s/@:]+:[^\s/@]+@", re.I),
]
SAFE_SETTING_SCALARS = {
    "model",
    "effortLevel",
    "advisorModel",
    "language",
    "disableAllHooks",
    "disableSkillShellExecution",
    "enableAllProjectMcpServers",
    "fastModePerSessionOptIn",
    "permissions.defaultMode",
    "skipDangerousModePermissionPrompt",
    "skipAutoPermissionPrompt",
}


def utc_now() -> str:
    now = dt.datetime.now(dt.timezone.utc).replace(minute=0, second=0, microsecond=0)
    return now.isoformat().replace("+00:00", "Z")


def age_bucket(seconds: float) -> str:
    if seconds < 300:
        return "lt_5m"
    if seconds < 3600:
        return "5m_to_1h"
    if seconds < 86400:
        return "1h_to_1d"
    if seconds < 7 * 86400:
        return "1d_to_7d"
    if seconds < 30 * 86400:
        return "7d_to_30d"
    return "gte_30d"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str | None:
    try:
        hasher = hashlib.sha256()
        with path.open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                hasher.update(block)
        return hasher.hexdigest()
    except (OSError, PermissionError):
        return None


def private_ref(value: str | bytes, prefix: str = "obj") -> str:
    raw = value if isinstance(value, bytes) else value.encode("utf-8", errors="replace")
    digest = hmac.new(_PAIRING_KEY, prefix.encode() + b"\x00" + raw, hashlib.sha256).hexdigest()[:20]
    return f"{prefix}_{digest}"


def derive_pairing_key(value: str) -> bytes | None:
    """Stretch a user-provided pairing phrase before it becomes an HMAC key."""
    if not 16 <= len(value) <= 4096:
        return None
    try:
        encoded = value.encode("utf-8", errors="strict")
    except UnicodeError:
        return None
    return hashlib.pbkdf2_hmac(
        "sha256", encoded, b"ai-environment-map/pairing/v1", 600_000, dklen=32
    )


def model_family(value: Any) -> str:
    raw = str(value or "").lower()
    for family in ("opus", "sonnet", "haiku"):
        if family in raw:
            return family
    return "other" if raw else "unknown"


def safe_effort(value: Any) -> str:
    raw = str(value or "").lower()
    return raw if raw in {"low", "medium", "high", "xhigh", "max"} else "unknown"


def safe_version(value: Any) -> str | None:
    match = re.search(r"\b\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9.-]+)?\b", str(value or ""))
    return match.group(0)[:64] if match else None


def has_symlink_component(path: Path) -> bool:
    """Fail closed when any existing component redirects traversal."""
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


def safe_regular_file(path: Path, max_bytes: int = MAX_STRUCTURED_FILE_BYTES) -> bool:
    if has_symlink_component(path):
        return False
    try:
        metadata = path.lstat()
    except OSError:
        return False
    return stat.S_ISREG(metadata.st_mode) and metadata.st_size <= max_bytes


def read_text_limited(path: Path, max_bytes: int = MAX_STRUCTURED_FILE_BYTES) -> str | None:
    if not safe_regular_file(path, max_bytes):
        return None
    descriptor: int | None = None
    try:
        flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(path, flags)
        metadata = os.fstat(descriptor)
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > max_bytes:
            os.close(descriptor)
            return None
        with os.fdopen(descriptor, "r", encoding="utf-8", errors="strict") as handle:
            descriptor = None
            return handle.read(max_bytes + 1)
    except (OSError, UnicodeError):
        return None
    finally:
        if descriptor is not None:
            os.close(descriptor)


def file_fingerprint(path: Path) -> str | None:
    if not safe_regular_file(path):
        return None
    try:
        hasher = hmac.new(_PAIRING_KEY, b"file\x00", hashlib.sha256)
        with path.open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                hasher.update(block)
        return f"file_{hasher.hexdigest()[:20]}"
    except (OSError, PermissionError):
        return None


def normalize_path(path: Path | str, home: Path, project: Path) -> str:
    raw = str(path)
    try:
        expanded = Path(raw).expanduser().resolve(strict=False)
    except (OSError, RuntimeError):
        expanded = Path(raw).expanduser()
    return private_ref(str(expanded), "path")


def redact_text(value: str, home: Path, project: Path) -> str:
    value = value.replace(str(project), "$PROJECT").replace(str(home), "$HOME")
    for pattern in SECRET_VALUE_PATTERNS:
        value = pattern.sub("[REDACTED]", value)
    return value[:500]


def run_safe(command: list[str], timeout: float = 8, cwd: Path | None = None) -> dict[str, Any]:
    started = time.perf_counter()
    child_environment = {
        key: os.environ[key]
        for key in ("PATH", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR", "SYSTEMROOT", "WINDIR")
        if key in os.environ
    }
    executable_name = Path(command[0]).name.lower() if command else ""
    if executable_name in {"zsh", "bash", "sh"}:
        for key in ("HOME", "SHELL"):
            if key in os.environ:
                child_environment[key] = os.environ[key]
    if executable_name == "git":
        child_environment.update({
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
        })
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            check=False,
            env=child_environment,
        )
        duration = round((time.perf_counter() - started) * 1000, 1)
        return {
            "ok": completed.returncode == 0,
            "exitCode": completed.returncode,
            "durationMs": duration,
            "stdout": completed.stdout,
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "exitCode": None,
            "durationMs": round((time.perf_counter() - started) * 1000, 1),
            "timedOut": True,
            "stdout": "",
        }
    except OSError as error:
        return {
            "ok": False,
            "exitCode": None,
            "durationMs": round((time.perf_counter() - started) * 1000, 1),
            "errorType": type(error).__name__,
            "stdout": "",
        }


def load_json(path: Path) -> Any | None:
    text = read_text_limited(path)
    if text is None:
        return None
    try:
        def no_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
            result: dict[str, Any] = {}
            for key, value in pairs:
                if key in result:
                    raise ValueError("duplicate JSON key")
                result[key] = value
            return result

        return json.loads(text, object_pairs_hook=no_duplicate_keys)
    except (json.JSONDecodeError, ValueError):
        return None


def file_meta(path: Path, home: Path, project: Path, *, hash_content: bool = True) -> dict[str, Any]:
    exists = os.path.lexists(path)
    result: dict[str, Any] = {"ref": normalize_path(path, home, project), "exists": exists}
    try:
        is_symlinked = has_symlink_component(path)
        result["isSymlink"] = path.is_symlink()
        result["hasSymlinkComponent"] = is_symlinked
        if path.is_symlink():
            result["symlinkTargetRef"] = normalize_path(path.resolve(strict=False), home, project)
        if not exists:
            return result
        stat_result = path.lstat()
        result.update(
            {
                "bytes": stat_result.st_size,
                "mtimeAgeBucket": age_bucket(max(0, time.time() - stat_result.st_mtime)),
                "mode": oct(stat_result.st_mode & 0o777),
            }
        )
        if hash_content and safe_regular_file(path):
            result["contentRef"] = file_fingerprint(path)
    except (OSError, PermissionError):
        result["metadataError"] = True
    return result


def directory_summary(path: Path, home: Path, project: Path) -> dict[str, Any]:
    result: dict[str, Any] = {"ref": normalize_path(path, home, project), "exists": path.exists()}
    if not path.exists():
        return result
    if has_symlink_component(path) or not path.is_dir():
        result["traversalSkipped"] = True
        return result
    du = run_safe(["du", "-sk", str(path)], timeout=30)
    if du["ok"] and du["stdout"].strip():
        try:
            result["bytes"] = int(du["stdout"].split()[0]) * 1024
        except (ValueError, IndexError):
            result["bytes"] = None
    files = 0
    directories = 0
    truncated = False
    try:
        for _, dirnames, filenames in os.walk(path, followlinks=False):
            directories += len(dirnames)
            files += len(filenames)
            if files + directories > 250_000:
                truncated = True
                break
    except (OSError, PermissionError):
        result["countError"] = True
    result.update({"files": files, "directories": directories, "countTruncated": truncated})
    return result


def summarize_hook_command(command: str, home: Path, project: Path) -> dict[str, Any]:
    result: dict[str, Any] = {
        "argumentCount": None,
        "commandRef": private_ref(command, "hook"),
        "executableClass": "unknown",
        "scriptPresent": None,
    }
    try:
        parts = shlex.split(command)
    except ValueError:
        parts = command.split()
        result["parseError"] = True
    if not parts:
        return result
    result["argumentCount"] = max(0, len(parts) - 1)
    executable = Path(parts[0]).name.lower()
    if executable in {"bash", "sh", "zsh"}:
        result["executableClass"] = "shell"
    elif executable in {"python", "python3"}:
        result["executableClass"] = "python"
    elif executable in {"node", "bun", "deno"}:
        result["executableClass"] = "javascript"
    else:
        result["executableClass"] = "other"
    # The command is fingerprinted, but its referenced script is deliberately
    # not resolved or read. A hook may point anywhere on the host.
    result["scriptReferencePresent"] = (
        (Path(parts[0]).name in {"bash", "sh", "zsh", "python", "python3", "node", "ruby", "perl"}
         and len(parts) > 1 and not parts[1].startswith("-"))
        or "/" in parts[0]
        or parts[0].startswith("~")
    )
    return result


def summarize_settings(path: Path, home: Path, project: Path) -> dict[str, Any]:
    result = file_meta(path, home, project)
    data = load_json(path)
    if not isinstance(data, dict):
        result["validJsonObject"] = False if path.exists() else None
        return result
    result["validJsonObject"] = True
    result["topLevelKeyCount"] = len(data)
    scalars: dict[str, Any] = {}
    for key in SAFE_SETTING_SCALARS:
        if "." in key:
            parent, child = key.split(".", 1)
            value = data.get(parent, {}).get(child) if isinstance(data.get(parent), dict) else None
        else:
            value = data.get(key)
        if key == "model" and isinstance(value, str):
            scalars["modelFamily"] = model_family(value)
            scalars["extendedContextRequested"] = "1m" in value.lower()
        elif key == "advisorModel" and isinstance(value, str):
            scalars["advisorModelFamily"] = model_family(value)
        elif key == "effortLevel" and isinstance(value, str):
            scalars["effort"] = safe_effort(value)
        elif key == "permissions.defaultMode" and isinstance(value, str):
            scalars[key] = value if value in {"default", "acceptEdits", "plan", "dontAsk", "bypassPermissions"} else "other"
        elif isinstance(value, bool):
            scalars[key] = value
    result["safeScalars"] = scalars
    permissions = data.get("permissions") if isinstance(data.get("permissions"), dict) else {}
    result["permissions"] = {
        key: len(permissions.get(key, [])) if isinstance(permissions.get(key), list) else 0
        for key in ("allow", "ask", "deny", "additionalDirectories")
    }
    env = data.get("env", {}) if isinstance(data.get("env"), dict) else {}
    result["environment"] = {
        "count": len(env),
        "proxyPresent": any(str(key).upper() in {"HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"} for key in env),
        "authLikePresent": any(re.search(r"TOKEN|KEY|SECRET|PASSWORD|AUTH", str(key), re.I) for key in env),
        "certificatePresent": any(re.search(r"CERT|CA_BUNDLE|SSL", str(key), re.I) for key in env),
        "valuesCollected": False,
    }
    result["enabledPlugins"] = {
        private_ref(str(name), "plugin"): bool(enabled)
        for name, enabled in sorted(data.get("enabledPlugins", {}).items())
        if isinstance(enabled, bool)
    } if isinstance(data.get("enabledPlugins"), dict) else {}
    overrides = data.get("skillOverrides") if isinstance(data.get("skillOverrides"), dict) else {}
    allowed_override_states = {"on", "name-only", "user-invocable-only", "off"}
    projected_overrides = {
        private_ref(str(name), "skill"): (
            value if isinstance(value, str) and value in allowed_override_states else "other"
        )
        for name, value in sorted(overrides.items())
    }
    result["skillOverrides"] = {
        "counts": dict(Counter(projected_overrides.values())),
        "skills": projected_overrides,
    }
    hooks_out: list[dict[str, Any]] = []
    hooks = data.get("hooks") if isinstance(data.get("hooks"), dict) else {}
    for event, groups in hooks.items():
        if not isinstance(groups, list):
            continue
        for group_index, group in enumerate(groups):
            if not isinstance(group, dict):
                continue
            entries = group.get("hooks") if isinstance(group.get("hooks"), list) else []
            for hook_index, hook in enumerate(entries):
                if not isinstance(hook, dict):
                    continue
                item = {
                    "event": str(event) if str(event) in {
                        "PreToolUse", "PostToolUse", "PostToolUseFailure", "Notification", "UserPromptSubmit",
                        "SessionStart", "SessionEnd", "Stop", "SubagentStart", "SubagentStop", "PreCompact",
                        "PermissionRequest", "TeammateIdle", "TaskCompleted", "ConfigChange", "WorktreeCreate",
                        "WorktreeRemove", "Elicitation", "ElicitationResult", "InstructionsLoaded",
                    } else "other",
                    "groupIndex": group_index,
                    "hookIndex": hook_index,
                    "matcherClass": (
                        "none" if not group.get("matcher") else "wildcard" if str(group.get("matcher")) in {"*", ".*"} else "specific"
                    ),
                    "conditionPresent": bool(hook.get("if")),
                    "type": hook.get("type") if hook.get("type") in {"command", "prompt", "agent", "http"} else "other",
                    "timeoutSeconds": (
                        hook.get("timeout")
                        if isinstance(hook.get("timeout"), (int, float))
                        and not isinstance(hook.get("timeout"), bool)
                        and 0 <= hook.get("timeout") <= 86_400
                        else None
                    ),
                    "timeoutConfigured": hook.get("timeout") is not None,
                    "async": bool(hook.get("async")),
                }
                if isinstance(hook.get("command"), str):
                    item["commandSummary"] = summarize_hook_command(hook["command"], home, project)
                hooks_out.append(item)
    result["hooks"] = hooks_out
    model_settings = data.get("modelSettings") if isinstance(data.get("modelSettings"), dict) else {}
    result["modelSettings"] = {
        "count": len(model_settings),
        "effortCounts": dict(Counter(
            safe_effort(settings.get("effortLevel"))
            for settings in model_settings.values() if isinstance(settings, dict)
        )),
    }
    return result


def parse_frontmatter(path: Path) -> dict[str, Any]:
    result: dict[str, Any] = {
        "name": path.parent.name,
        "descriptionChars": 0,
        "disableModelInvocation": False,
        "userInvocable": True,
        "context": None,
        "model": None,
        "effort": None,
        "hasHooks": False,
        "hasPaths": False,
    }
    text = read_text_limited(path)
    if text is None:
        result["readError"] = True
        return result
    if not text.startswith("---"):
        return result
    end = text.find("\n---", 3)
    if end < 0:
        result["frontmatterMalformed"] = True
        return result
    front = text[3:end]
    values: dict[str, str] = {}
    current_key: str | None = None
    for line in front.splitlines():
        match = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$", line)
        if match:
            current_key, raw = match.groups()
            values[current_key] = raw.strip().strip("'\"")
        elif current_key and line.startswith((" ", "\t")):
            values[current_key] += " " + line.strip()
    if values.get("name"):
        result["name"] = values["name"][:160]
    result["descriptionChars"] = len(values.get("description", ""))
    result["disableModelInvocation"] = values.get("disable-model-invocation", "false").lower() == "true"
    result["userInvocable"] = values.get("user-invocable", "true").lower() != "false"
    for key in ("context", "model", "effort"):
        if values.get(key):
            result[key] = values[key][:80]
    result["hasHooks"] = "hooks:" in front
    result["hasPaths"] = "paths:" in front
    return result


def skill_candidates(root: Path) -> list[Path]:
    if not root.exists() or has_symlink_component(root) or not root.is_dir():
        return []
    candidates: set[Path] = set()
    try:
        for entry in root.iterdir():
            if entry.is_symlink():
                continue
            direct = entry / "SKILL.md"
            if safe_regular_file(direct):
                candidates.add(direct)
    except OSError:
        pass
    for directory, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = [
            name for name in dirnames
            if name not in {".git", "node_modules"}
            and not (Path(directory) / name).is_symlink()
        ]
        if "SKILL.md" in filenames:
            candidate = Path(directory) / "SKILL.md"
            if safe_regular_file(candidate):
                candidates.add(candidate)
    return sorted(candidates, key=str)


def path_within(path: Path, roots: Iterable[Path]) -> bool:
    try:
        resolved = path.expanduser().resolve(strict=False)
        for root in roots:
            root_resolved = root.expanduser().resolve(strict=False)
            try:
                resolved.relative_to(root_resolved)
                return True
            except ValueError:
                continue
    except (OSError, RuntimeError):
        return False
    return False


def plugin_install_inspectable(path: Path, home: Path, project: Path) -> bool:
    allowed_roots = (
        home / ".claude" / "plugins",
        home / ".codex" / "plugins",
        project / ".claude" / "plugins",
        project / ".agents" / "plugins",
    )
    return (
        path.exists()
        and path.is_dir()
        and not has_symlink_component(path)
        and path_within(path, allowed_roots)
    )


def count_named_files(root: Path, names: set[str]) -> int:
    if not root.exists() or not root.is_dir() or has_symlink_component(root):
        return 0
    count = 0
    try:
        for directory, dirnames, filenames in os.walk(root, followlinks=False):
            dirnames[:] = [
                name for name in dirnames
                if not (Path(directory) / name).is_symlink()
            ]
            count += sum(
                1 for name in filenames
                if name in names and safe_regular_file(Path(directory) / name)
            )
    except OSError:
        return 0
    return count


def summarize_skills(
    roots: list[tuple[str, Path]], home: Path, project: Path
) -> dict[str, Any]:
    entries: list[dict[str, Any]] = []
    seen_logical: set[str] = set()
    for source, root in roots:
        for path in skill_candidates(root):
            logical = str(path)
            if logical in seen_logical:
                continue
            seen_logical.add(logical)
            try:
                resolved = path.resolve(strict=True)
                size = resolved.stat().st_size
            except (OSError, RuntimeError):
                resolved = path.resolve(strict=False)
                size = None
            frontmatter = parse_frontmatter(path)
            private_name = str(frontmatter.pop("name", path.parent.name))
            frontmatter["model"] = model_family(frontmatter.get("model"))
            frontmatter["effort"] = safe_effort(frontmatter.get("effort"))
            if frontmatter.get("context") not in {None, "fork"}:
                frontmatter["context"] = "other"
            entries.append(
                {
                    "source": source,
                    "skillRef": private_ref(private_name, "skill"),
                    "nameChars": len(private_name),
                    "pathRef": normalize_path(path, home, project),
                    "realPathRef": normalize_path(resolved, home, project),
                    "isSymlinked": path.is_symlink() or path.parent.is_symlink(),
                    "bytes": size,
                    "contentRef": file_fingerprint(path),
                    **frontmatter,
                }
            )
    names: dict[str, list[dict[str, Any]]] = defaultdict(list)
    hashes: dict[str, list[dict[str, Any]]] = defaultdict(list)
    real_paths: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        names[entry["skillRef"]].append(entry)
        if entry.get("contentRef"):
            hashes[entry["contentRef"]].append(entry)
        real_paths[entry["realPathRef"]].append(entry)

    def duplicate_groups(groups: dict[str, list[dict[str, Any]]], key_name: str) -> list[dict[str, Any]]:
        output = []
        for key, values in groups.items():
            if len(values) < 2:
                continue
            output.append(
                {
                    "groupRef": key,
                    "count": len(values),
                    "skillRefs": sorted({str(value["skillRef"]) for value in values}),
                    "sources": sorted({str(value["source"]) for value in values}),
                }
            )
        return sorted(output, key=lambda item: (-item["count"], str(item["groupRef"])))

    claude_sources = ("claude-user", "claude-project", "plugin:")
    claude_entries = [entry for entry in entries if entry["source"].startswith(claude_sources)]
    visible = [entry for entry in claude_entries if not entry["disableModelInvocation"]]
    unique_hash_sizes: dict[str, int] = {}
    for entry in entries:
        if entry.get("contentRef") and isinstance(entry.get("bytes"), int):
            unique_hash_sizes.setdefault(entry["contentRef"], entry["bytes"])
    top_descriptions = sorted(entries, key=lambda item: item["descriptionChars"], reverse=True)[:30]
    top_bodies = sorted(entries, key=lambda item: item.get("bytes") or 0, reverse=True)[:30]
    return {
        "logicalEntries": len(entries),
        "countsBySource": dict(Counter(entry["source"] for entry in entries)),
        "uniqueContentHashes": len(hashes),
        "uniqueRealPaths": len(real_paths),
        "symlinkedEntries": sum(1 for entry in entries if entry["isSymlinked"]),
        "autoVisibleEntries": len(visible),
        "claudeCatalogEntries": len(claude_entries),
        "crossAgentOnlyEntries": len(entries) - len(claude_entries),
        "manualOnlyEntries": sum(1 for entry in claude_entries if entry["disableModelInvocation"]),
        "forkedContextEntries": sum(1 for entry in claude_entries if entry.get("context") == "fork"),
        "catalogDescriptionChars": sum(entry["descriptionChars"] + entry["nameChars"] for entry in visible),
        "catalogApproxTokens": round(
            sum(entry["descriptionChars"] + entry["nameChars"] for entry in visible) / 4
        ),
        "logicalBodyBytes": sum(entry.get("bytes") or 0 for entry in entries),
        "uniqueBodyBytes": sum(unique_hash_sizes.values()),
        "duplicateNames": duplicate_groups(names, "name"),
        "duplicateContent": duplicate_groups(hashes, "content"),
        "duplicateRealPaths": duplicate_groups(real_paths, "realPath"),
        "topDescriptions": [
            {
                "skillRef": item["skillRef"],
                "chars": item["descriptionChars"],
                "source": item["source"],
            }
            for item in top_descriptions
        ],
        "topBodies": [
            {"skillRef": item["skillRef"], "bytes": item["bytes"], "source": item["source"]}
            for item in top_bodies
        ],
        "entries": entries,
    }


def summarize_plugin_installations(path: Path, home: Path, project: Path) -> dict[str, Any]:
    data = load_json(path)
    result: dict[str, Any] = {"source": file_meta(path, home, project), "installations": [], "duplicates": []}
    plugins = data.get("plugins") if isinstance(data, dict) and isinstance(data.get("plugins"), dict) else {}
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for name, raw_entries in plugins.items():
        entries = raw_entries if isinstance(raw_entries, list) else [raw_entries]
        for raw in entries:
            if not isinstance(raw, dict):
                continue
            install_path = Path(str(raw.get("installPath", ""))).expanduser() if raw.get("installPath") else None
            component_counts = {"skills": 0, "agents": 0, "commands": 0, "hookManifests": 0, "mcpManifests": 0}
            inspectable = bool(install_path and plugin_install_inspectable(install_path, home, project))
            if install_path and inspectable:
                component_counts["skills"] = len(skill_candidates(install_path / "skills"))
                component_counts["agents"] = sum(
                    1 for candidate in (install_path / "agents").glob("*.md")
                    if safe_regular_file(candidate)
                ) if (install_path / "agents").is_dir() else 0
                component_counts["commands"] = sum(
                    1 for candidate in (install_path / "commands").glob("*.md")
                    if safe_regular_file(candidate)
                ) if (install_path / "commands").is_dir() else 0
                component_counts["hookManifests"] = count_named_files(install_path, {"hooks.json"})
                component_counts["mcpManifests"] = count_named_files(install_path, {".mcp.json"})
            item = {
                "pluginRef": private_ref(str(name), "plugin"),
                "scope": raw.get("scope") if raw.get("scope") in {"user", "project", "local", "managed"} else "unknown",
                "version": safe_version(raw.get("version")),
                "projectBound": bool(raw.get("projectPath")),
                "installPresent": bool(install_path and install_path.exists()),
                "inspectionSkipped": bool(install_path and install_path.exists() and not inspectable),
                "components": component_counts,
            }
            result["installations"].append(item)
            by_name[str(name)].append(item)
    for name, entries in by_name.items():
        if len(entries) > 1:
            result["duplicates"].append(
                {
                    "pluginRef": private_ref(name, "plugin"),
                    "count": len(entries),
                    "scopes": sorted({str(entry.get("scope")) for entry in entries}),
                    "versions": sorted({str(entry.get("version")) for entry in entries if entry.get("version")}),
                }
            )
    return result


def classify_url(raw_url: str) -> dict[str, Any]:
    from urllib.parse import urlsplit

    try:
        parsed = urlsplit(raw_url)
        host = parsed.hostname or ""
        local = host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local")
        return {
            "scheme": parsed.scheme if parsed.scheme in {"http", "https", "ws", "wss"} else "other",
            "hostClass": "local" if local else "remote",
            "hostRef": private_ref(host, "host") if host else None,
            "hasUserInfo": parsed.username is not None or parsed.password is not None,
            "hasQuery": bool(parsed.query),
        }
    except ValueError:
        return {"parseError": True}


def summarize_mcp_servers(data: Any) -> list[dict[str, Any]]:
    if not isinstance(data, dict):
        return []
    servers = data.get("mcpServers") if isinstance(data.get("mcpServers"), dict) else data
    if not isinstance(servers, dict):
        return []
    output = []
    for name, raw in sorted(servers.items()):
        if not isinstance(raw, dict):
            continue
        raw_type = raw.get("type") or ("stdio" if raw.get("command") else "remote" if raw.get("url") else "unknown")
        item: dict[str, Any] = {
            "serverRef": private_ref(str(name), "mcp"),
            "type": raw_type if raw_type in {"stdio", "http", "sse", "remote", "sdk"} else "unknown",
            "commandPresent": bool(raw.get("command")),
            "argumentCount": len(raw.get("args", [])) if isinstance(raw.get("args"), list) else 0,
            "environmentCount": len(raw.get("env", {})) if isinstance(raw.get("env"), dict) else 0,
            "headersPresent": bool(raw.get("headers")),
            "authPresent": bool(raw.get("auth") or raw.get("oauth")),
        }
        if isinstance(raw.get("url"), str):
            item["endpoint"] = classify_url(raw["url"])
        output.append(item)
    return output


def summarize_mcp_config(path: Path, home: Path, project: Path) -> dict[str, Any]:
    return {"source": file_meta(path, home, project), "servers": summarize_mcp_servers(load_json(path))}


def summarize_claude_json(path: Path, home: Path, project: Path) -> dict[str, Any]:
    result = {"source": file_meta(path, home, project), "globalMcpServers": [], "projectCount": 0, "targetProject": {}}
    data = load_json(path)
    if not isinstance(data, dict):
        return result
    result["topLevelKeyCount"] = len(data)
    result["globalMcpServers"] = summarize_mcp_servers({"mcpServers": data.get("mcpServers", {})})
    projects = data.get("projects") if isinstance(data.get("projects"), dict) else {}
    result["projectCount"] = len(projects)
    target = projects.get(str(project)) if isinstance(projects.get(str(project)), dict) else {}
    result["targetProject"] = {
        "known": bool(target),
        "mcpServers": summarize_mcp_servers({"mcpServers": target.get("mcpServers", {})}),
        "booleanKeyCount": sum(1 for value in target.values() if isinstance(value, bool)),
        "trueBooleanCount": sum(1 for value in target.values() if value is True),
        "falseBooleanCount": sum(1 for value in target.values() if value is False),
    }
    return result


def instruction_candidates(home: Path, project: Path) -> list[tuple[str, Path]]:
    candidates: list[tuple[str, Path]] = []
    fixed = [
        ("user", home / ".claude" / "CLAUDE.md"),
        ("codex-user", home / ".codex" / "AGENTS.md"),
        ("home", home / "CLAUDE.md"),
        ("project", project / "CLAUDE.md"),
        ("project", project / "AGENTS.md"),
    ]
    candidates.extend(fixed)
    try:
        relative = project.relative_to(home)
        current = home
        for part in relative.parts[:-1]:
            current /= part
            candidates.extend((("ancestor", current / "CLAUDE.md"), ("ancestor", current / "AGENTS.md")))
    except ValueError:
        pass
    rules = project / ".claude" / "rules"
    if rules.exists():
        candidates.extend(("project-rule", path) for path in rules.rglob("*.md"))
    unique: dict[str, tuple[str, Path]] = {}
    for source, path in candidates:
        unique.setdefault(str(path), (source, path))
    return list(unique.values())


def summarize_instructions(home: Path, project: Path) -> dict[str, Any]:
    entries: list[dict[str, Any]] = []
    total_imports = 0
    for source, path in instruction_candidates(home, project):
        if not path.exists():
            continue
        meta = file_meta(path, home, project)
        import_count = 0
        text = read_text_limited(path)
        if text is not None:
            imports = re.findall(r"@((?:~|/|\./|\.\./)[^\s`]+)", text)
            import_count = len(imports)
            total_imports += import_count
        entries.append({"source": source, **meta, "approxTokens": round((meta.get("bytes") or 0) / 4), "importCount": import_count})
    all_entries = entries
    unique_hashes: dict[str, int] = {}
    for entry in all_entries:
        if entry.get("contentRef"):
            unique_hashes.setdefault(entry["contentRef"], entry.get("bytes") or 0)
    return {
        "entries": all_entries,
        "logicalFiles": len(all_entries),
        "uniqueFiles": len(unique_hashes),
        "logicalBytes": sum(entry.get("bytes") or 0 for entry in all_entries),
        "uniqueBytes": sum(unique_hashes.values()),
        "uniqueApproxTokens": round(sum(unique_hashes.values()) / 4),
        "explicitImportCount": total_imports,
        "explicitImportsFollowed": False,
    }


def find_git_repositories(scan_roots: list[Path], max_depth: int = 6) -> list[Path]:
    repositories: set[Path] = set()
    for scan_root in scan_roots:
        if not scan_root.exists():
            continue
        scan_root = scan_root.resolve(strict=False)
        if (scan_root / ".git").exists():
            repositories.add(scan_root)
        for root, dirnames, filenames in os.walk(scan_root, followlinks=False):
            current = Path(root)
            try:
                depth = len(current.relative_to(scan_root).parts)
            except ValueError:
                depth = max_depth + 1
            if depth >= max_depth:
                dirnames[:] = []
                continue
            if ".git" in dirnames:
                repositories.add(current)
                dirnames.remove(".git")
            if ".git" in filenames:
                repositories.add(current)
            dirnames[:] = [name for name in dirnames if name not in PRUNE_DIRS and not name.startswith(".Trash")]
    return sorted(repositories, key=str)


def parse_worktree_porcelain(text: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    current: dict[str, Any] = {}
    for line in text.splitlines() + [""]:
        if not line:
            if current:
                blocks.append(current)
                current = {}
            continue
        key, _, value = line.partition(" ")
        if key in {"detached", "bare"}:
            current[key] = True
        elif key in {"locked", "prunable"}:
            current[key] = value or True
        else:
            current[key] = value
    return blocks


def cache_summary(worktree: Path) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for name in ("node_modules", ".next", ".turbo", "dist", "build", "coverage", "playwright-report", "test-results"):
        target = worktree / name
        if not target.exists() or has_symlink_component(target) or not target.is_dir():
            continue
        du = run_safe(["du", "-sk", str(target)], timeout=20)
        size = None
        if du["ok"] and du["stdout"].strip():
            try:
                size = int(du["stdout"].split()[0]) * 1024
            except (ValueError, IndexError):
                pass
        result[name] = {"exists": True, "bytes": size}
    return result


def summarize_worktrees(repositories: list[Path], home: Path, project: Path, include_cache_sizes: bool) -> dict[str, Any]:
    groups: list[dict[str, Any]] = []
    seen_common_dirs: set[str] = set()
    total_worktrees = 0
    for repository in repositories:
        common = run_safe(["git", "-C", str(repository), "rev-parse", "--path-format=absolute", "--git-common-dir"], timeout=5)
        if not common["ok"]:
            continue
        common_dir = common["stdout"].strip()
        if common_dir in seen_common_dirs:
            continue
        seen_common_dirs.add(common_dir)
        listed = run_safe(["git", "-C", str(repository), "worktree", "list", "--porcelain"], timeout=10)
        if not listed["ok"]:
            continue
        parsed = parse_worktree_porcelain(listed["stdout"])
        items = []
        for raw in parsed:
            path = Path(raw.get("worktree", ""))
            branch = str(raw.get("branch", ""))
            item: dict[str, Any] = {
                "worktreeRef": normalize_path(path, home, project),
                "exists": path.exists(),
                "headRef": private_ref(str(raw.get("HEAD", "")), "head") if raw.get("HEAD") else None,
                "branchRef": private_ref(branch, "branch") if branch else None,
                "detached": bool(raw.get("detached")),
                "locked": bool(raw.get("locked")),
                "prunable": bool(raw.get("prunable")),
            }
            if include_cache_sizes and path.exists():
                item["caches"] = cache_summary(path)
            items.append(item)
        total_worktrees += len(items)
        groups.append(
            {
                "repositoryRef": normalize_path(repository, home, project),
                "commonGitDirRef": normalize_path(common_dir, home, project),
                "worktreeCount": len(items),
                "worktrees": items,
            }
        )
    groups.sort(key=lambda item: (-item["worktreeCount"], item["repositoryRef"]))
    return {
        "repositoryGroups": len(groups),
        "totalWorktrees": total_worktrees,
        "groupsOverThree": sum(1 for group in groups if group["worktreeCount"] > 3),
        "prunableWorktrees": sum(1 for group in groups for item in group["worktrees"] if item["prunable"]),
        "missingWorktrees": sum(1 for group in groups for item in group["worktrees"] if not item["exists"]),
        "groups": groups,
    }


def relevant_processes(home: Path, project: Path) -> dict[str, Any]:
    captured = run_safe(["ps", "-axo", "pid=,ppid=,%cpu=,%mem=,rss=,etime=,comm="], timeout=5)
    if not captured["ok"]:
        return {"available": False, "error": "ps-unavailable"}
    category_names = (
        "claudeCli", "claudeDesktop", "codexCli", "codexDesktop", "browser", "testOrDev", "node", "shell"
    )
    entries = []
    for line in captured["stdout"].splitlines():
        parts = line.split(None, 6)
        if len(parts) < 7:
            continue
        pid, ppid, cpu, mem, rss, elapsed, command = parts
        basename = Path(command).name
        lowered = basename.lower()
        categories: list[str] = []
        if basename in {"claude", "claude.exe"}:
            categories.append("claudeCli")
        elif basename.startswith("Claude"):
            categories.append("claudeDesktop")
        if basename in {"codex", "codex.exe"}:
            categories.append("codexCli")
        elif basename.startswith("Codex"):
            categories.append("codexDesktop")
        if re.search(r"chrome|chromium|brave|playwright|webview", lowered):
            categories.append("browser")
        if re.search(r"vitest|jest|playwright|next-server|vite", lowered):
            categories.append("testOrDev")
        if lowered in {"node", "npm", "pnpm", "bun", "bare", "deno"} or lowered.startswith(("node ", "npm ", "pnpm ")):
            categories.append("node")
        if lowered in {"zsh", "bash", "sh"}:
            categories.append("shell")
        if not categories:
            continue
        try:
            item = {
                "pid": int(pid),
                "ppid": int(ppid),
                "cpuPercent": float(cpu),
                "memoryPercent": float(mem),
                "rssBytes": int(rss) * 1024,
                "ageBucket": process_elapsed_bucket(elapsed),
                "categories": categories,
                "orphanOrService": int(ppid) == 1,
            }
        except ValueError:
            continue
        entries.append(item)
    by_category: dict[str, dict[str, Any]] = {}
    for category in category_names:
        matching = [entry for entry in entries if category in entry["categories"]]
        by_category[category] = {
            "count": len(matching),
            "rssBytes": sum(entry["rssBytes"] for entry in matching),
            "cpuPercent": round(sum(entry["cpuPercent"] for entry in matching), 1),
            "orphanOrService": sum(1 for entry in matching if entry["orphanOrService"]),
            "ageBuckets": dict(Counter(entry["ageBucket"] for entry in matching)),
        }
    child_counts = Counter(entry["ppid"] for entry in entries)
    agent_pids = {
        entry["pid"] for entry in entries
        if "claudeCli" in entry["categories"] or "codexCli" in entry["categories"]
    }
    return {
        "available": True,
        "aggregates": by_category,
        "topology": {
            "agentLikeProcesses": len(agent_pids),
            "maxRelevantChildrenPerAgent": max((child_counts[pid] for pid in agent_pids), default=0),
            "relevantProcessCount": len(entries),
        },
        "rawProcessIdentifiersEmitted": False,
        "commandLinesRead": False,
    }


def process_elapsed_bucket(value: str) -> str:
    try:
        days = 0
        rest = value
        if "-" in rest:
            raw_days, rest = rest.split("-", 1)
            days = int(raw_days)
        parts = [int(part) for part in rest.split(":")]
        if len(parts) == 3:
            hours, minutes, seconds = parts
        elif len(parts) == 2:
            hours, (minutes, seconds) = 0, parts
        else:
            hours, minutes, seconds = 0, 0, parts[0]
        return age_bucket(days * 86400 + hours * 3600 + minutes * 60 + seconds)
    except (ValueError, IndexError):
        return "unknown"


def shell_benchmark() -> dict[str, Any]:
    cases = {
        "zshNoRc": ["zsh", "-dfc", "exit"],
        "zshLoginInteractive": ["zsh", "-lic", "exit"],
        "claudeVersion": ["claude", "--version"],
    }
    output: dict[str, Any] = {}
    for name, command in cases.items():
        samples = []
        exits = []
        for _ in range(5):
            result = run_safe(command, timeout=15)
            samples.append(result["durationMs"])
            exits.append(result.get("exitCode"))
        output[name] = {
            "samplesMs": samples,
            "medianMs": round(statistics.median(samples), 1),
            "maxMs": max(samples),
            "exitCodes": exits,
        }
    return output


def system_summary(home: Path, project: Path) -> dict[str, Any]:
    result: dict[str, Any] = {
        "os": platform.system(),
        "osRelease": platform.release(),
        "osVersion": platform.mac_ver()[0] or platform.version(),
        "architecture": platform.machine(),
        "logicalCpu": os.cpu_count(),
        "python": platform.python_version(),
    }
    memory = run_safe(["sysctl", "-n", "hw.memsize"], timeout=3)
    if memory["ok"]:
        try:
            result["physicalMemoryBytes"] = int(memory["stdout"].strip())
        except ValueError:
            pass
    try:
        disk = shutil.disk_usage(project)
        result["projectDisk"] = {"totalBytes": disk.total, "usedBytes": disk.used, "freeBytes": disk.free}
    except OSError:
        pass
    return result


def tool_versions(home: Path, project: Path) -> dict[str, Any]:
    output = {}
    for name, command in VERSION_COMMANDS.items():
        result = run_safe(command, timeout=8)
        first_line = result.pop("stdout", "").strip().splitlines()[:1]
        output[name] = {
            **result,
            "version": safe_version(first_line[0]) if first_line else None,
            "executablePresent": bool(shutil.which(command[0])),
        }
    return output


def command_and_agent_catalog(home: Path, project: Path) -> dict[str, Any]:
    roots = [
        ("userCommands", home / ".claude" / "commands", "*.md"),
        ("projectCommands", project / ".claude" / "commands", "*.md"),
        ("userAgents", home / ".claude" / "agents", "*.md"),
        ("projectAgents", project / ".claude" / "agents", "*.md"),
    ]
    output = {}
    for name, root, pattern in roots:
        paths = [
            path for path in sorted(root.rglob(pattern), key=str)
            if safe_regular_file(path)
        ] if root.exists() and not has_symlink_component(root) else []
        files = [file_meta(path, home, project) for path in paths]
        output[name] = {
            "root": normalize_path(root, home, project),
            "count": len(paths),
            "bytes": sum(item.get("bytes") or 0 for item in files),
            "files": files,
        }
    return output


def claude_runtime_storage(home: Path, project: Path) -> dict[str, Any]:
    claude = home / ".claude"
    app = home / "Library" / "Application Support" / "Claude"
    paths = [
        ("cli-projects", claude / "projects"),
        ("cli-sessions", claude / "sessions"),
        ("cli-tasks", claude / "tasks"),
        ("cli-teams", claude / "teams"),
        ("cli-daemon", claude / "daemon"),
        ("cli-history-file", claude / "history.jsonl"),
        ("desktop-local-agent-sessions", app / "local-agent-mode-sessions"),
        ("desktop-code-sessions", app / "claude-code-sessions"),
        ("desktop-extensions", app / "Claude Extensions"),
        ("desktop-vm-bundles", app / "vm_bundles"),
        ("desktop-partitions", app / "Partitions"),
        ("desktop-cache", app / "Cache"),
        ("desktop-gpu-cache", app / "GPUCache"),
        ("desktop-code-cache", app / "Code Cache"),
        ("desktop-git-shadow", app / "git-shadow"),
    ]
    output = []
    for storage_class, path in paths:
        item = directory_summary(path, home, project) if path.is_dir() else file_meta(path, home, project, hash_content=False)
        item["storageClass"] = storage_class
        output.append(item)
    extensions_root = app / "Claude Extensions"
    extensions = [path for path in extensions_root.iterdir() if path.is_dir()] if extensions_root.exists() else []
    return {
        "paths": output,
        "coworkExtensionCount": len(extensions),
        "coworkExtensionRefs": sorted(private_ref(path.name, "extension") for path in extensions),
    }


def app_versions(home: Path, project: Path) -> list[dict[str, Any]]:
    candidates = [Path("/Applications/Claude.app"), home / "Applications" / "Claude.app"]
    output = []
    for app in candidates:
        plist = app / "Contents" / "Info.plist"
        if not safe_regular_file(plist):
            continue
        try:
            data = plistlib.loads(plist.read_bytes())
        except (OSError, plistlib.InvalidFileException):
            data = {}
        output.append(
            {
                "appRef": normalize_path(app, home, project),
                "version": safe_version(data.get("CFBundleShortVersionString")),
                "build": safe_version(data.get("CFBundleVersion")),
            }
        )
    return output


def codex_summary(home: Path, project: Path) -> dict[str, Any]:
    path = home / ".codex" / "config.toml"
    result: dict[str, Any] = {"source": file_meta(path, home, project)}
    try:
        import tomllib

        text = read_text_limited(path)
        data = tomllib.loads(text) if text is not None else {}
    except (ImportError, OSError, ValueError):
        data = {}
    if isinstance(data, dict):
        result["topLevelKeyCount"] = len(data)
        result["modelFamily"] = model_family(data.get("model"))
        result["reasoningEffort"] = safe_effort(data.get("model_reasoning_effort"))
        result["mcpServerCount"] = len(data.get("mcp_servers", {})) if isinstance(data.get("mcp_servers"), dict) else 0
        result["profileCount"] = len(data.get("profiles", {})) if isinstance(data.get("profiles"), dict) else 0
    return result


def environment_name_summary() -> dict[str, Any]:
    patterns = re.compile(r"^(ANTHROPIC|CLAUDE|MCP|CODEX|HTTP_PROXY|HTTPS_PROXY|NO_PROXY|ALL_PROXY|NODE_OPTIONS|SSL_CERT|NODE_EXTRA_CA)", re.I)
    names = [name for name in os.environ if patterns.search(name)]
    categories = {
        "anthropicOrClaude": sum(1 for name in names if re.match(r"^(ANTHROPIC|CLAUDE)", name, re.I)),
        "mcp": sum(1 for name in names if re.match(r"^MCP", name, re.I)),
        "codex": sum(1 for name in names if re.match(r"^CODEX", name, re.I)),
        "proxy": sum(1 for name in names if re.search(r"PROXY", name, re.I)),
        "tls": sum(1 for name in names if re.search(r"SSL|CERT|CA", name, re.I)),
        "nodeOptions": sum(1 for name in names if name.upper() == "NODE_OPTIONS"),
    }
    return {"count": len(names), "categories": categories, "namesCollected": False, "valuesCollected": False}


def risk_observations(report: dict[str, Any]) -> list[dict[str, Any]]:
    observations: list[dict[str, Any]] = []
    settings = report["claude"]["settings"]
    effective_models = []
    for setting in settings:
        if not setting.get("effectiveCandidate", True):
            continue
        scalars = setting.get("safeScalars", {})
        if scalars.get("modelFamily") or scalars.get("effort"):
            effective_models.append({"sourceRef": setting["ref"], "modelFamily": scalars.get("modelFamily"), "effort": scalars.get("effort")})
    if any(item.get("effort") in {"xhigh", "max"} for item in effective_models):
        observations.append({"id": "PERF-MODEL-001", "severity": "high", "fact": "Persistent xhigh/max effort is configured.", "evidence": effective_models})
    skills = report["claude"]["skills"]
    if skills["autoVisibleEntries"] > 50 or skills["catalogApproxTokens"] > 10_000:
        observations.append(
            {
                "id": "PERF-SKILLS-001",
                "severity": "high",
                "fact": "The automatically visible skill catalog is large.",
                "evidence": {
                    "autoVisibleEntries": skills["autoVisibleEntries"],
                    "catalogApproxTokens": skills["catalogApproxTokens"],
                },
            }
        )
    plugins = report["claude"]["plugins"]
    if plugins["duplicates"]:
        observations.append({"id": "PERF-PLUGINS-001", "severity": "medium", "fact": "Plugins are installed at multiple scopes.", "evidence": plugins["duplicates"]})
    hooks = [hook for setting in settings for hook in setting.get("hooks", [])]
    expensive = []
    for hook in hooks:
        static = hook.get("commandSummary", {}).get("scriptStaticMetrics", {})
        if static.get("whileLoops", 0) and static.get("grepMentions", 0) and static.get("patternAdds", 0) > 10:
            expensive.append({"event": hook["event"], "matcherClass": hook.get("matcherClass"), "metrics": static})
    if expensive:
        observations.append({"id": "PERF-HOOKS-001", "severity": "high", "fact": "A synchronous hook performs line-by-pattern subprocess matching.", "evidence": expensive})
    worktrees = report["workspace"]["worktrees"]
    for group in worktrees["groups"]:
        if group["worktreeCount"] > 5:
            observations.append(
                {
                    "id": "PERF-WORKTREES-001",
                    "severity": "high",
                    "fact": "A repository has more than five worktrees.",
                    "evidence": {"repositoryRef": group["repositoryRef"], "count": group["worktreeCount"]},
                }
            )
    processes = report["runtime"]["processes"]
    if processes.get("available"):
        agents = processes["aggregates"].get("claudeCli", {}).get("count", 0) + processes["aggregates"].get("codexCli", {}).get("count", 0)
        if agents > 4:
            observations.append({"id": "PERF-AGENTS-001", "severity": "high", "fact": "More than four Claude/Codex processes are concurrent.", "evidence": {"processCount": agents}})
        tests = processes["aggregates"].get("testOrDev", {}).get("count", 0)
        if tests > 2:
            observations.append({"id": "PERF-RUNNERS-001", "severity": "high", "fact": "Multiple test/dev/browser runners are concurrent.", "evidence": {"processCount": tests}})
    for entry in report["runtime"]["storage"]["paths"]:
        if entry.get("storageClass") == "cli-projects" and (entry.get("bytes") or 0) > 500 * 1024 * 1024:
            observations.append({"id": "PERF-HISTORY-001", "severity": "medium", "fact": "Claude project session storage exceeds 500 MiB.", "evidence": {"storageClass": "cli-projects", "bytes": entry.get("bytes")}})
    return observations


def validate_report(report: dict[str, Any], home: Path) -> list[str]:
    failures = []
    serialized = json.dumps(report, ensure_ascii=False)
    if str(home) in serialized:
        failures.append("raw home path leaked")
    for pattern in SECRET_VALUE_PATTERNS:
        if pattern.search(serialized):
            failures.append("DLP_SECRET_VALUE")
    dlp_patterns = {
        "email": re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"),
        "url": re.compile(r"(?i)\b[a-z][a-z0-9+.-]*://"),
        "absolute-path": re.compile(r"(?:^|[\"'\s])/(?:Users|home|private|tmp|var|etc|opt|Applications)/"),
        "ipv4": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
        "uuid": re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b", re.I),
        "jwt": re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b"),
    }
    for label, pattern in dlp_patterns.items():
        if pattern.search(serialized):
            failures.append(f"DLP_{label.upper().replace('-', '_')}")
    banned_keys = {
        "prompt", "messages", "historyContent", "sessionContent", "environmentValues", "hookSource",
        "pid", "ppid", "path", "branch", "head", "command", "args", "headers", "url",
    }

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if str(key).lower() in {item.lower() for item in banned_keys}:
                    failures.append("DLP_BANNED_KEY")
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
        elif isinstance(value, str):
            if "\n" in value or "\r" in value:
                failures.append("DLP_MULTILINE_VALUE")
            for token in re.findall(r"[A-Za-z0-9_+/=-]{24,}", value):
                if re.fullmatch(r"(?:[a-z][a-z0-9]*_)?[0-9a-f]{20}", token, re.I):
                    continue
                if re.fullmatch(r"[0-9a-f]{64}", token, re.I):
                    continue
                frequencies = Counter(token)
                entropy = -sum(
                    (count / len(token)) * math.log2(count / len(token))
                    for count in frequencies.values()
                )
                if entropy >= 4.2:
                    failures.append("DLP_HIGH_ENTROPY_VALUE")

    walk(report)
    return sorted(set(failures))


def write_report_atomic(output: Path, serialized: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if has_symlink_component(output.parent) or output.is_symlink():
        raise OSError("unsafe output path")
    temporary = output.with_name(f".{output.name}.{os.getpid()}.tmp")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(temporary, flags, 0o600)
    expected_device: int | None = None
    expected_inode: int | None = None
    try:
        metadata = os.fstat(descriptor)
        expected_device, expected_inode = metadata.st_dev, metadata.st_ino
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            descriptor = -1
            handle.write(serialized)
            handle.flush()
            os.fsync(handle.fileno())
        current = temporary.lstat()
        if (current.st_dev, current.st_ino) != (expected_device, expected_inode):
            raise OSError("temporary output changed")
        os.replace(temporary, output)
        os.chmod(output, 0o600)
        directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
        directory_fd = os.open(output.parent, directory_flags)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if temporary.exists() and not temporary.is_symlink():
            temporary.unlink()


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    home = Path.home().resolve()
    project = Path(args.project).expanduser().resolve()
    plugin_file = home / ".claude" / "plugins" / "installed_plugins.json"
    plugins = summarize_plugin_installations(plugin_file, home, project)
    skill_roots: list[tuple[str, Path]] = [
        ("claude-user", home / ".claude" / "skills"),
        ("agents-user", home / ".agents" / "skills"),
        ("codex-user", home / ".codex" / "skills"),
        ("codex-plugin-cache", home / ".codex" / "plugins" / "cache"),
        ("claude-project", project / ".claude" / "skills"),
        ("agents-project", project / ".agents" / "skills"),
    ]
    plugin_data = load_json(plugin_file)
    if isinstance(plugin_data, dict) and isinstance(plugin_data.get("plugins"), dict):
        for name, entries in plugin_data["plugins"].items():
            for entry in entries if isinstance(entries, list) else [entries]:
                if isinstance(entry, dict) and entry.get("installPath"):
                    install_path = Path(str(entry["installPath"])).expanduser()
                    scope = entry.get("scope") if entry.get("scope") in {"user", "project", "local", "managed"} else "unknown"
                    if plugin_install_inspectable(install_path, home, project):
                        skill_roots.append((f"plugin:{private_ref(str(name), 'plugin')}:{scope}", install_path / "skills"))

    settings_paths = [
        ("user", home / ".claude" / "settings.json", True),
        ("home-project-local", home / ".claude" / "settings.local.json", project == home),
        ("project", project / ".claude" / "settings.json", True),
        ("project-local", project / ".claude" / "settings.local.json", True),
        ("managed", Path("/Library/Application Support/ClaudeCode/managed-settings.json"), True),
        ("managed-plist", Path("/Library/Managed Preferences/com.anthropic.claudecode.plist"), True),
    ]
    repository_candidates = [project, *(Path(raw).expanduser().resolve() for raw in args.repository)]
    repositories: list[Path] = []
    seen_repositories: set[str] = set()
    for candidate in repository_candidates:
        key = str(candidate)
        if key in seen_repositories or not (candidate / ".git").exists():
            continue
        seen_repositories.add(key)
        repositories.append(candidate)

    report: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "collectedAt": utc_now(),
        "collector": {
            "version": COLLECTOR_VERSION,
            "sha256": sha256_file(Path(__file__)),
            "python": platform.python_version(),
            "privacyPolicy": "allowlist-hmac-v1",
            "activeBenchmarks": bool(args.active_benchmarks),
            "cacheSizes": bool(args.include_cache_sizes),
            "networkRequests": False,
        },
        "privacy": {
            "redacted": True,
            "environmentValuesCollected": False,
            "sessionContentsRead": False,
            "historyContentsRead": False,
            "promptContentsRead": False,
            "repositorySourceRead": False,
            "mcpArgumentsEmitted": False,
            "hookSourceEmitted": False,
            "rawOutputPersisted": False,
            "shellHistoryOpened": False,
            "keychainAccessed": False,
            "processCommandLinesRead": False,
        },
        "run": {
            "subject": args.subject,
            "pairingKeyId": private_ref("pairing-key-id", "pair"),
            "pairingMode": "provided" if os.environ.get("AI_ENV_MAP_PAIRING_KEY") else "ephemeral",
        },
        "target": {"projectRef": normalize_path(project, home, project), "explicitRepositoryCount": len(repositories)},
        "system": system_summary(home, project),
        "tools": tool_versions(home, project),
        "environment": environment_name_summary(),
        "claude": {
            "appVersions": app_versions(home, project),
            "settings": [
                {"sourceClass": source, "effectiveCandidate": effective, **summarize_settings(path, home, project)}
                for source, path, effective in settings_paths
            ],
            "claudeJson": summarize_claude_json(home / ".claude.json", home, project),
            "instructions": summarize_instructions(home, project),
            "skills": summarize_skills(skill_roots, home, project),
            "plugins": plugins,
            "mcpConfigs": [
                summarize_mcp_config(path, home, project)
                for path in (home / ".claude" / ".mcp.json", project / ".mcp.json")
            ],
            "commandsAndAgents": command_and_agent_catalog(home, project),
        },
        "codex": codex_summary(home, project),
        "workspace": {
            "repositoriesDiscovered": len(repositories),
            "worktrees": summarize_worktrees(repositories, home, project, args.include_cache_sizes),
        },
        "runtime": {
            "processes": relevant_processes(home, project),
            "storage": claude_runtime_storage(home, project),
            "benchmarks": shell_benchmark() if args.active_benchmarks else {"executed": False},
        },
    }
    report["observations"] = risk_observations(report)
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", help="Project root to compare")
    parser.add_argument("--output", help="Redacted JSON output path")
    parser.add_argument("--subject", choices=("felix", "laura", "other"), default="other")
    parser.add_argument(
        "--repository",
        action="append",
        default=[],
        help="Explicit Git repository to inventory; repeat as needed. No disk-wide discovery is performed.",
    )
    parser.add_argument("--active-benchmarks", action="store_true", help="Run safe local shell/CLI startup timings")
    parser.add_argument("--include-cache-sizes", action="store_true", help="Measure build/cache sizes inside worktrees")
    parser.add_argument("--self-test", action="store_true", help="Run privacy projection canaries without inspecting the host")
    return parser.parse_args()


def self_test() -> int:
    canary = "".join(("sk-", "ant-", "self-test-canary-", "abcdefghijklmnopqrstuvwxyz"))
    with tempfile.TemporaryDirectory(prefix="ai-map-self-test-") as raw:
        root = Path(raw)
        project = root / "project"
        project.mkdir()
        settings_path = root / "settings.json"
        settings_path.write_text(json.dumps({
            "model": "sonnet",
            "effortLevel": "medium",
            "env": {"PRIVATE_TOKEN": canary},
            "hooks": {"PreToolUse": [{"matcher": "Write", "hooks": [{"type": "command", "command": f"echo {canary}"}]}]},
        }), encoding="utf-8")
        mcp_path = root / "mcp.json"
        mcp_path.write_text(json.dumps({"mcpServers": {"private-name": {"url": f"https://user:{canary}@example.invalid/api"}}}), encoding="utf-8")
        skill_root = root / "skills" / "private-skill"
        skill_root.mkdir(parents=True)
        (skill_root / "SKILL.md").write_text(f"---\nname: private-skill\ndescription: {canary}\n---\n{canary}\n", encoding="utf-8")
        projected = {
            "settings": summarize_settings(settings_path, root, project),
            "mcp": summarize_mcp_config(mcp_path, root, project),
            "skills": summarize_skills([("claude-user", root / "skills")], root, project),
        }
        serialized = json.dumps(projected)
        passed = canary not in serialized and "example.invalid" not in serialized and "private-skill" not in serialized
    print(json.dumps({"selfTest": "passed" if passed else "failed"}))
    return 0 if passed else 1


def main() -> int:
    args = parse_args()
    if args.self_test:
        return self_test()
    if not args.project or not args.output:
        print("PROJECT_AND_OUTPUT_REQUIRED", file=sys.stderr)
        return 2
    project = Path(args.project).expanduser().resolve()
    if not project.is_dir():
        print("project is not a directory", file=sys.stderr)
        return 2
    global _PAIRING_KEY
    provided_key = os.environ.get("AI_ENV_MAP_PAIRING_KEY")
    if provided_key:
        derived_key = derive_pairing_key(provided_key)
        if derived_key is None:
            print("PAIRING_KEY_TOO_SHORT", file=sys.stderr)
            return 2
        _PAIRING_KEY = derived_key
    try:
        report = build_report(args)
    except Exception:
        print("COLLECTION_FAILED", file=sys.stderr)
        return 1
    failures = validate_report(report, Path.home().resolve())
    if failures:
        print(json.dumps({"written": False, "privacyValidation": failures}, ensure_ascii=False), file=sys.stderr)
        return 1
    report["privacyValidation"] = {"passed": True, "failures": []}
    output = Path(args.output).expanduser()
    serialized = json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    try:
        write_report_atomic(output, serialized)
    except OSError:
        print("OUTPUT_WRITE_FAILED", file=sys.stderr)
        return 1
    print(
        json.dumps(
            {
                "written": True,
                "bytes": len(serialized.encode()),
                "sha256": sha256_bytes(serialized.encode()),
                "observations": len(report["observations"]),
                "privacyValidation": "passed",
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
