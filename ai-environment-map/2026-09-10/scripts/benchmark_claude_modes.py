#!/usr/bin/env python3
"""Benchmark Claude Code customization layers without retaining model content.

This script intentionally performs paid/limited model calls when run normally.
Use --self-test to validate the parser without invoking Claude or the network.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
import platform
import random
import re
import selectors
import signal
import stat
import statistics
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "1.0.0"
BUDGET_USD_PER_SAMPLE = 0.10
MAX_STREAM_BYTES = 16 * 1024 * 1024
MAX_STREAM_LINE_CHARS = 1024 * 1024
PUBLIC_PROMPT = "Return only the word OK."
PUBLIC_TOOL_PROMPT = "Read the file .ai-map-fixture.txt using Read, then return only the word OK."
BASE_FLAGS = [
    "--print",
    "--verbose",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--no-session-persistence",
    "--max-budget-usd", f"{BUDGET_USD_PER_SAMPLE:.2f}",
]
MODE_FLAGS = {
    "FULL": [],
    "SAFE": ["--safe-mode"],
    "NO_SKILLS": ["--disable-slash-commands"],
    "NO_MCP": ["--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}'],
    "USER_ONLY": ["--setting-sources", "user"],
    "PROJECT_ONLY": ["--setting-sources", "project"],
    "LOCAL_ONLY": ["--setting-sources", "local"],
}


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def claude_cli_version(claude: str) -> str | None:
    try:
        completed = subprocess.run(
            [claude, "--version"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=8,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    match = re.search(r"\b\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9.-]+)?\b", completed.stdout)
    return match.group(0) if completed.returncode == 0 and match else None


def capability_flags(modes: list[str], probe: str) -> list[str]:
    flags = {value for value in BASE_FLAGS if value.startswith("--")}
    for mode in modes:
        flags.update(value for value in MODE_FLAGS[mode] if value.startswith("--"))
    flags.update({"--model", "--effort", "--tools"})
    if probe == "tool-read":
        flags.add("--allowedTools")
    return sorted(flags)


def has_symlink_component(path: Path) -> bool:
    """Reject existing symlink components without following them."""
    candidate = path.expanduser()
    if not candidate.is_absolute():
        candidate = Path.cwd() / candidate
    parts = candidate.parts
    current = Path(parts[0]) if candidate.is_absolute() else Path()
    for part in parts[1:] if candidate.is_absolute() else parts:
        current = current / part
        try:
            if current.is_symlink():
                return True
        except OSError:
            return True
    return False


def valid_model_arg(value: str) -> bool:
    """Allow public aliases or a bounded Claude model identifier in argv."""
    return value in {"opus", "sonnet", "haiku"} or bool(
        re.fullmatch(r"claude-[A-Za-z0-9._-]{1,72}", value)
    )


def create_public_fixture(path: Path) -> tuple[int, int]:
    """Create the fixed public fixture without following or replacing a link."""
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    flags |= getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0)
    descriptor = os.open(path, flags, 0o600)
    try:
        identity = os.fstat(descriptor)
        payload = b"public performance fixture\n"
        written = 0
        while written < len(payload):
            written += os.write(descriptor, payload[written:])
        os.fsync(descriptor)
        return identity.st_dev, identity.st_ino
    finally:
        os.close(descriptor)


def remove_owned_fixture(path: Path, identity: tuple[int, int] | None) -> None:
    """Remove only the exact regular file created by this process."""
    if identity is None:
        return
    try:
        current = path.lstat()
    except FileNotFoundError:
        return
    if not stat.S_ISREG(current.st_mode):
        return
    if (current.st_dev, current.st_ino) != identity:
        return
    try:
        path.unlink()
    except FileNotFoundError:
        pass


def missing_capabilities(claude: str, modes: list[str], probe: str) -> list[str]:
    required = {
        "--print", "--verbose", "--output-format", "--include-partial-messages",
        "--no-session-persistence", "--max-budget-usd", "--model", "--effort", "--tools",
    }
    if "SAFE" in modes:
        required.add("--safe-mode")
    if "NO_SKILLS" in modes:
        required.add("--disable-slash-commands")
    if "NO_MCP" in modes:
        required.update({"--strict-mcp-config", "--mcp-config"})
    if any(mode.endswith("_ONLY") for mode in modes):
        required.add("--setting-sources")
    if probe == "tool-read":
        required.add("--allowedTools")
    last_help = ""
    for _ in range(2):
        try:
            completed = subprocess.run(
                [claude, "--help"], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                timeout=8, check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if completed.returncode != 0:
            continue
        last_help = f"{completed.stdout}\n{completed.stderr}"
        missing = sorted(flag for flag in required if flag not in last_help)
        if not missing:
            return []
    return sorted(flag for flag in required if flag not in last_help) if last_help else ["CLI_HELP"]


def process_class_counts() -> dict[str, int]:
    classes = {"claudeCli": 0, "claudeDesktop": 0, "codexCli": 0, "codexDesktop": 0, "browser": 0, "testOrDev": 0, "node": 0}
    try:
        completed = subprocess.run(
            ["ps", "-axo", "comm="], text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=3, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return {}
    if completed.returncode != 0:
        return {}
    for raw in completed.stdout.splitlines():
        basename = Path(raw.strip()).name
        lowered = basename.lower()
        if basename in {"claude", "claude.exe"}:
            classes["claudeCli"] += 1
        elif basename.startswith("Claude"):
            classes["claudeDesktop"] += 1
        if basename in {"codex", "codex.exe"}:
            classes["codexCli"] += 1
        elif basename.startswith("Codex"):
            classes["codexDesktop"] += 1
        if any(token in lowered for token in ("chrome", "chromium", "brave", "safari", "webkit", "playwright", "webview", "electron")):
            classes["browser"] += 1
        if any(token in lowered for token in ("vitest", "jest", "playwright", "cypress", "storybook", "webpack", "next-server", "vite")):
            classes["testOrDev"] += 1
        if lowered in {"node", "npm", "pnpm", "bun", "bare", "deno"}:
            classes["node"] += 1
    return classes


def terminate_process_group(process: subprocess.Popen[str]) -> None:
    """Stop the probe and children without touching unrelated processes."""
    if os.name != "posix":
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=3)
        return

    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        if process.poll() is None:
            process.wait()
        return
    except OSError:
        process.terminate()
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        process.poll()
        try:
            os.killpg(process.pid, 0)
        except ProcessLookupError:
            break
        time.sleep(0.05)
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except (ProcessLookupError, OSError):
        pass
    if process.poll() is None:
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            pass


def worktree_count(project: Path) -> int | None:
    environment = os.environ.copy()
    environment["GIT_OPTIONAL_LOCKS"] = "0"
    try:
        completed = subprocess.run(
            ["git", "-C", str(project), "worktree", "list", "--porcelain"],
            env=environment, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=5, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if completed.returncode != 0:
        return None
    return sum(1 for line in completed.stdout.splitlines() if line.startswith("worktree "))


def percentile(values: list[float], quantile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * quantile
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return round(ordered[lower], 1)
    fraction = index - lower
    return round(ordered[lower] * (1 - fraction) + ordered[upper] * fraction, 1)


def event_metrics(event: Any, elapsed_ms: float, state: dict[str, Any]) -> None:
    if not isinstance(event, dict):
        return
    raw_event_type = event.get("type")
    if not isinstance(raw_event_type, str):
        return
    event_type = raw_event_type if raw_event_type in {
        "system", "assistant", "user", "result", "stream_event", "tool_progress", "auth_status"
    } else "other"
    state["eventCounts"][event_type] = state["eventCounts"].get(event_type, 0) + 1
    if state["firstEventMs"] is None:
        state["firstEventMs"] = round(elapsed_ms, 1)
    if event_type == "system" and event.get("subtype") == "init":
        raw_model = event.get("model")
        if isinstance(raw_model, str):
            lowered_model = raw_model.lower()
            state["resolvedModelFamily"] = next(
                (family for family in ("opus", "sonnet", "haiku") if family in lowered_model), "other"
            )
            if raw_model.startswith("claude-") and re.fullmatch(r"[A-Za-z0-9._-]{1,80}", raw_model):
                state["resolvedModelId"] = raw_model
    if event_type == "assistant" and state["firstAssistantMs"] is None:
        state["firstAssistantMs"] = round(elapsed_ms, 1)
    if event_type == "stream_event":
        inner = event.get("event")
        inner_type = inner.get("type") if isinstance(inner, dict) else None
        if inner_type in {"content_block_start", "content_block_delta", "message_start"} and state["firstAssistantMs"] is None:
            state["firstAssistantMs"] = round(elapsed_ms, 1)

    message = event.get("message")
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_use":
                state["toolCalls"] += 1
                if state["firstToolMs"] is None:
                    state["firstToolMs"] = round(elapsed_ms, 1)

    if event_type == "result":
        state["resultObserved"] = True
        state["resultIsError"] = event.get("is_error") is True
        subtype = event.get("subtype")
        state["resultSubtype"] = subtype if subtype in {
            "success", "error_max_turns", "error_max_budget_usd", "error_during_execution"
        } else "other"
        usage = event.get("usage")
        if isinstance(usage, dict):
            for raw_key, output_key in (
                ("input_tokens", "inputTokens"),
                ("output_tokens", "outputTokens"),
                ("cache_creation_input_tokens", "cacheCreationTokens"),
                ("cache_read_input_tokens", "cacheReadTokens"),
            ):
                value = usage.get(raw_key)
                if isinstance(value, int) and value >= 0:
                    state["usage"][output_key] = value
        total_cost = event.get("total_cost_usd")
        if isinstance(total_cost, (int, float)) and total_cost >= 0:
            state["costUsd"] = round(float(total_cost), 6)


def run_sample(
    claude: str,
    project: Path,
    mode: str,
    model: str,
    effort: str,
    timeout_seconds: int,
    probe: str,
) -> dict[str, Any]:
    flags = [*BASE_FLAGS, "--model", model, "--effort", effort, *MODE_FLAGS[mode]]
    prompt = PUBLIC_PROMPT
    fixture: Path | None = None
    fixture_identity: tuple[int, int] | None = None
    if probe == "tool-read":
        fixture = project / ".ai-map-fixture.txt"
        try:
            fixture_identity = create_public_fixture(fixture)
        except FileExistsError:
            return {"status": "fixture-collision"}
        except OSError:
            return {"status": "fixture-create-error"}
        flags.extend(["--allowedTools", "Read", "--tools", "Read"])
        prompt = PUBLIC_TOOL_PROMPT
    else:
        flags.extend(["--tools", ""])

    command = [claude, *flags, prompt]
    environment = os.environ.copy()
    environment.pop("AI_ENV_MAP_PAIRING_KEY", None)
    environment["CLAUDE_CODE_SKIP_PROMPT_HISTORY"] = "1"
    started = time.monotonic()
    topology_before = process_class_counts()
    worktrees_before = worktree_count(project)
    topology_peak = dict(topology_before)
    last_topology_sample = 0.0
    state: dict[str, Any] = {
        "firstEventMs": None,
        "firstAssistantMs": None,
        "firstToolMs": None,
        "toolCalls": 0,
        "eventCounts": {},
        "resultObserved": False,
        "resultIsError": False,
        "resultSubtype": None,
        "usage": {},
        "costUsd": None,
        "resolvedModelFamily": "unknown",
        "resolvedModelId": None,
    }
    process: subprocess.Popen[str] | None = None
    selector: selectors.BaseSelector | None = None
    stream_bytes = 0
    stream_limit_exceeded = False
    try:
        process = subprocess.Popen(
            command,
            cwd=project,
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
            start_new_session=os.name == "posix",
        )
        assert process.stdout is not None
        selector = selectors.DefaultSelector()
        selector.register(process.stdout, selectors.EVENT_READ)
        timed_out = False
        while True:
            elapsed = time.monotonic() - started
            if elapsed - last_topology_sample >= 1.0:
                snapshot = process_class_counts()
                for key, value in snapshot.items():
                    topology_peak[key] = max(topology_peak.get(key, 0), value)
                last_topology_sample = elapsed
            if elapsed > timeout_seconds:
                timed_out = True
                terminate_process_group(process)
                break
            ready = selector.select(timeout=0.25)
            for key, _ in ready:
                line = key.fileobj.readline(MAX_STREAM_LINE_CHARS + 1)
                if not line:
                    continue
                stream_bytes += len(line.encode("utf-8", errors="replace"))
                if len(line) > MAX_STREAM_LINE_CHARS or stream_bytes > MAX_STREAM_BYTES:
                    stream_limit_exceeded = True
                    terminate_process_group(process)
                    break
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    state["nonJsonLineCount"] = state.get("nonJsonLineCount", 0) + 1
                    continue
                event_metrics(event, (time.monotonic() - started) * 1000, state)
            if stream_limit_exceeded:
                break
            if process.poll() is not None:
                while selector.select(timeout=0):
                    line = process.stdout.readline(MAX_STREAM_LINE_CHARS + 1)
                    if not line:
                        break
                    stream_bytes += len(line.encode("utf-8", errors="replace"))
                    if len(line) > MAX_STREAM_LINE_CHARS or stream_bytes > MAX_STREAM_BYTES:
                        stream_limit_exceeded = True
                        break
                    try:
                        event_metrics(json.loads(line), (time.monotonic() - started) * 1000, state)
                    except json.JSONDecodeError:
                        state["nonJsonLineCount"] = state.get("nonJsonLineCount", 0) + 1
                break
        total_ms = round((time.monotonic() - started) * 1000, 1)
        topology_after = process_class_counts()
        worktrees_after = worktree_count(project)
        if stream_limit_exceeded:
            status = "stream-limit"
        elif timed_out:
            status = "timeout"
        elif state["resultObserved"] and state["resultIsError"]:
            status = "result-error"
        elif process.returncode != 0:
            status = "process-error"
        elif not state["resultObserved"]:
            status = "protocol-error"
        else:
            status = "ok"
        return {
            "status": status,
            "exitCode": process.returncode,
            "totalMs": total_ms,
            "processClassesBefore": topology_before,
            "processClassesPeak": topology_peak,
            "processClassesAfter": topology_after,
            "worktreeCountBefore": worktrees_before,
            "worktreeCountAfter": worktrees_after,
            **state,
            "modelContentRetained": False,
            "stderrRetained": False,
        }
    except OSError:
        return {"status": "launch-error"}
    finally:
        if selector is not None:
            selector.close()
        if process is not None:
            terminate_process_group(process)
        if fixture is not None:
            remove_owned_fixture(fixture, fixture_identity)


def summarize(samples: list[dict[str, Any]]) -> dict[str, Any]:
    totals = [float(item["totalMs"]) for item in samples if item.get("status") == "ok"]
    firsts = [float(item["firstAssistantMs"]) for item in samples if item.get("status") == "ok" and item.get("firstAssistantMs") is not None]
    median = statistics.median(totals) if totals else None
    mad = statistics.median([abs(value - median) for value in totals]) if totals and median is not None else None
    status_counts: dict[str, int] = {}
    for item in samples:
        status = item.get("status") if isinstance(item.get("status"), str) else "unknown"
        status_counts[status] = status_counts.get(status, 0) + 1
    return {
        "sampleCount": len(samples),
        "successCount": len(totals),
        "statusCounts": status_counts,
        "timeoutCount": sum(1 for item in samples if item.get("status") == "timeout"),
        "totalMedianMs": round(median, 1) if median is not None else None,
        "totalMadMs": round(mad, 1) if mad is not None else None,
        "totalMinMs": round(min(totals), 1) if totals else None,
        "totalMaxMs": round(max(totals), 1) if totals else None,
        "totalP95Ms": percentile(totals, 0.95) if len(totals) >= 20 else None,
        "p95Eligible": len(totals) >= 20,
        "firstAssistantMedianMs": round(statistics.median(firsts), 1) if firsts else None,
        "toolCallsMedian": round(statistics.median([item.get("toolCalls", 0) for item in samples]), 1) if samples else None,
    }


def write_atomic(path: Path, data: dict[str, Any]) -> None:
    if has_symlink_component(path):
        raise OSError("unsafe output path")
    path.parent.mkdir(parents=True, exist_ok=True)
    if has_symlink_component(path.parent) or not path.parent.is_dir():
        raise OSError("unsafe output directory")
    serialized = json.dumps(data, indent=2, sort_keys=True) + "\n"
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    flags |= getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0)
    descriptor = os.open(temporary, flags, 0o600)
    identity = os.fstat(descriptor)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            descriptor = -1
            handle.write(serialized)
            handle.flush()
            os.fsync(handle.fileno())
        current = temporary.lstat()
        if not stat.S_ISREG(current.st_mode) or (current.st_dev, current.st_ino) != (identity.st_dev, identity.st_ino):
            raise OSError("temporary output changed")
        os.replace(temporary, path)
        os.chmod(path, 0o600)
        directory_fd = os.open(path.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def self_test() -> int:
    state = {"firstEventMs": None, "firstAssistantMs": None, "firstToolMs": None, "toolCalls": 0, "eventCounts": {}, "resultObserved": False, "resultIsError": False, "resultSubtype": None, "usage": {}, "costUsd": None, "resolvedModelFamily": "unknown", "resolvedModelId": None}
    event_metrics({"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Read", "input": {"secret": "must-not-retain"}}]}}, 120.0, state)
    event_metrics({"type": "result", "result": "must-not-retain", "usage": {"input_tokens": 10, "output_tokens": 2}}, 240.0, state)
    encoded = json.dumps(state)
    provenance = {
        "collectedAt": utc_now(),
        "scriptSha256": file_sha256(Path(__file__)),
        "claudeCliVersion": "test-version",
        "capabilityFlags": capability_flags(["FULL"], "startup"),
    }
    passed = (
        state["toolCalls"] == 1
        and state["resultObserved"]
        and not state["resultIsError"]
        and state["usage"] == {"inputTokens": 10, "outputTokens": 2}
        and "must-not-retain" not in encoded
        and len(provenance["scriptSha256"]) == 64
        and provenance["collectedAt"].endswith("Z")
    )
    print(json.dumps({"selfTest": "passed" if passed else "failed"}))
    return 0 if passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project")
    parser.add_argument("--output")
    parser.add_argument("--model", default="sonnet")
    parser.add_argument("--effort", choices=("low", "medium", "high", "xhigh", "max"), default="medium")
    parser.add_argument("--samples", type=int, default=3)
    parser.add_argument("--timeout-seconds", type=int, default=180)
    parser.add_argument("--probe", choices=("startup", "tool-read"), default="startup")
    parser.add_argument("--include-source-modes", action="store_true")
    parser.add_argument("--confirm-paid-calls", action="store_true")
    parser.add_argument("--check-capabilities", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    claude = "claude"
    modes = ["FULL", "SAFE", "NO_SKILLS", "NO_MCP"]
    if args.include_source_modes:
        modes.extend(["USER_ONLY", "PROJECT_ONLY", "LOCAL_ONLY"])
    if args.check_capabilities:
        missing = missing_capabilities(claude, modes, args.probe)
        print(json.dumps({"compatible": not missing, "missingFlags": missing}))
        return 0 if not missing else 2
    if not args.project or not args.output:
        parser.error("--project and --output are required unless --self-test is used")
    if not args.confirm_paid_calls:
        print("PAID_CALL_CONFIRMATION_REQUIRED: rerun with --confirm-paid-calls", file=sys.stderr)
        return 2
    if not 1 <= args.samples <= 20:
        parser.error("--samples must be between 1 and 20")
    if not 10 <= args.timeout_seconds <= 600:
        parser.error("--timeout-seconds must be between 10 and 600")
    if not valid_model_arg(args.model):
        print("MODEL_INVALID", file=sys.stderr)
        return 2
    project = Path(args.project).expanduser().resolve()
    if not project.is_dir():
        print("PROJECT_INVALID", file=sys.stderr)
        return 2
    missing = missing_capabilities(claude, modes, args.probe)
    if missing:
        print(json.dumps({"error": "UNSUPPORTED_CLI_FLAGS", "flags": missing}), file=sys.stderr)
        return 2
    results: dict[str, Any] = {}
    samples_by_mode: dict[str, list[dict[str, Any]]] = {mode: [] for mode in modes}
    random_source = random.SystemRandom()
    execution_order: list[str] = []
    for _ in range(args.samples):
        round_order = list(modes)
        random_source.shuffle(round_order)
        execution_order.extend(round_order)
    for execution_index, mode in enumerate(execution_order):
        sample = run_sample(claude, project, mode, args.model, args.effort, args.timeout_seconds, args.probe)
        sample["executionIndex"] = execution_index
        sample["orderWithinMode"] = len(samples_by_mode[mode]) + 1
        samples_by_mode[mode].append(sample)
    for mode in modes:
        results[mode] = {"summary": summarize(samples_by_mode[mode]), "samples": samples_by_mode[mode]}
    report = {
        "schemaVersion": SCHEMA_VERSION,
        "protocol": "claude-customization-ab-v1",
        "collectedAt": utc_now(),
        "scriptSha256": file_sha256(Path(__file__)),
        "claudeCliVersion": claude_cli_version(claude),
        "capabilityFlags": capability_flags(modes, args.probe),
        "pythonVersion": platform.python_version(),
        "platform": {"system": platform.system(), "release": platform.release()},
        "modelFamily": args.model if args.model in {"opus", "sonnet", "haiku"} else "other",
        "effort": args.effort,
        "probe": args.probe,
        "samplesPerMode": args.samples,
        "timeoutSecondsPerSample": args.timeout_seconds,
        "budgetUsdPerSample": BUDGET_USD_PER_SAMPLE,
        "executionOrder": execution_order,
        "results": results,
        "privacy": {
            "modelContentRetained": False,
            "stderrRetained": False,
            "sessionPersistence": False,
            "publicFixtureOnly": True,
        },
    }
    try:
        write_atomic(Path(args.output).expanduser(), report)
    except OSError:
        print("OUTPUT_WRITE_FAILED", file=sys.stderr)
        return 2
    print(json.dumps({"written": True, "modes": modes, "samplesPerMode": args.samples}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
