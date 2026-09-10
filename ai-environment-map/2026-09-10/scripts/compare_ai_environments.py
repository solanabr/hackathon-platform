#!/usr/bin/env python3
"""Compare two redacted AI environment inventories and write a private Markdown report.

The comparator accepts only the allowlisted, privacy-validated JSON shape emitted
by collect_ai_environment.py. It reports aggregates and controlled vocabulary;
opaque references and source values are never copied to the output.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import re
import secrets
import stat
import statistics
import sys
import tempfile
from copy import deepcopy
from pathlib import Path
from typing import Any, Callable, Iterable


SUPPORTED_SCHEMA_VERSION = "1.0.0"
SUPPORTED_COLLECTOR_MAJOR = 1
PRIVACY_POLICY = "allowlist-hmac-v1"
MAX_INPUT_BYTES = 64 * 1024 * 1024

PRIVACY_FALSE_FLAGS = (
    "environmentValuesCollected",
    "sessionContentsRead",
    "historyContentsRead",
    "promptContentsRead",
    "repositorySourceRead",
    "mcpArgumentsEmitted",
    "hookSourceEmitted",
    "rawOutputPersisted",
    "shellHistoryOpened",
    "keychainAccessed",
    "processCommandLinesRead",
)
REQUIRED_TOP_LEVEL = {
    "schemaVersion",
    "collectedAt",
    "collector",
    "privacy",
    "privacyValidation",
    "run",
    "target",
    "system",
    "tools",
    "environment",
    "claude",
    "codex",
    "workspace",
    "runtime",
    "observations",
}
FORBIDDEN_KEYS = {
    "prompt",
    "prompts",
    "message",
    "messages",
    "historycontent",
    "sessioncontent",
    "environmentvalues",
    "hooksource",
    "pid",
    "ppid",
    "path",
    "branch",
    "head",
    "command",
    "args",
    "headers",
    "url",
}
SECRET_PATTERNS = (
    re.compile(r"sk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}"),
    re.compile(r"gh[oprsu]_[A-Za-z0-9]{20,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._-]{16,}"),
)
DLP_PATTERNS = (
    re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"),
    re.compile(r"(?i)\b[a-z][a-z0-9+.-]*://"),
    re.compile(r"(?:^|[\"'\s(])/(?:Users|home|private|tmp|var|etc|opt|Applications|Library)/"),
    re.compile(r"(?:^|[\"'\s(])[A-Za-z]:\\"),
    re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b", re.I),
    re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b"),
)
OPAQUE_REF_PATTERN = re.compile(
    r"\b(?:path|skill|plugin|mcp|hook|hookfile|pair|branch|head|file|host|extension|obj)_[0-9a-f]{20}\b"
)
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
PAIR_REF_PATTERN = re.compile(r"^pair_[0-9a-f]{20}$")
SEMVER_PATTERN = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:[-+][A-Za-z0-9.-]+)?$")
TIMESTAMP_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

PROCESS_CLASSES = (
    ("claudeCli", "Claude CLI"),
    ("claudeDesktop", "Claude Desktop"),
    ("codexCli", "Codex CLI"),
    ("codexDesktop", "Codex Desktop"),
    ("browser", "Browser"),
    ("testOrDev", "Teste/desenvolvimento"),
    ("node", "Runtime JavaScript"),
    ("shell", "Shell"),
)
CACHE_CLASSES = (
    "node_modules",
    ".next",
    ".turbo",
    "dist",
    "build",
    "coverage",
    "playwright-report",
    "test-results",
)
STORAGE_CLASSES = (
    "cli-projects",
    "cli-sessions",
    "cli-tasks",
    "cli-teams",
    "cli-daemon",
    "cli-history-file",
    "desktop-local-agent-sessions",
    "desktop-code-sessions",
    "desktop-extensions",
    "desktop-vm-bundles",
    "desktop-partitions",
    "desktop-cache",
    "desktop-gpu-cache",
    "desktop-code-cache",
    "desktop-git-shadow",
)
STORAGE_LABELS = {
    "cli-projects": "Projetos da CLI",
    "cli-sessions": "Sessões da CLI",
    "cli-tasks": "Tarefas da CLI",
    "cli-teams": "Times da CLI",
    "cli-daemon": "Daemon da CLI",
    "cli-history-file": "Histórico da CLI (metadados)",
    "desktop-local-agent-sessions": "Sessões locais do Desktop",
    "desktop-code-sessions": "Sessões de código do Desktop",
    "desktop-extensions": "Extensões do Desktop",
    "desktop-vm-bundles": "Bundles de VM do Desktop",
    "desktop-partitions": "Partições do Desktop",
    "desktop-cache": "Cache do Desktop",
    "desktop-gpu-cache": "Cache de GPU do Desktop",
    "desktop-code-cache": "Cache de código do Desktop",
    "desktop-git-shadow": "Espelho Git do Desktop",
}
BENCHMARKS = (
    ("zshNoRc", "Shell sem configuração"),
    ("zshLoginInteractive", "Shell de login interativo"),
    ("claudeVersion", "Inicialização da CLI"),
)
MODEL_FAMILIES = {"opus", "sonnet", "haiku", "other", "unknown"}
EFFORT_LEVELS = {"low", "medium", "high", "xhigh", "max", "unknown"}
NUMERIC_FIELD_NAMES = {
    "count",
    "directories",
    "bytes",
    "logicalCpu",
    "physicalMemoryBytes",
    "totalBytes",
    "usedBytes",
    "freeBytes",
    "durationMs",
    "topLevelKeyCount",
    "descriptionChars",
    "groupIndex",
    "hookIndex",
    "timeoutSeconds",
    "argumentCount",
    "environmentCount",
    "lines",
    "forLoops",
    "whileLoops",
    "subshells",
    "jqMentions",
    "grepMentions",
    "patternAdds",
    "logicalEntries",
    "claudeCatalogEntries",
    "crossAgentOnlyEntries",
    "uniqueContentHashes",
    "uniqueRealPaths",
    "symlinkedEntries",
    "autoVisibleEntries",
    "manualOnlyEntries",
    "forkedContextEntries",
    "catalogDescriptionChars",
    "catalogApproxTokens",
    "logicalBodyBytes",
    "uniqueBodyBytes",
    "projectCount",
    "logicalFiles",
    "uniqueFiles",
    "logicalBytes",
    "uniqueBytes",
    "uniqueApproxTokens",
    "repositoryGroups",
    "totalWorktrees",
    "groupsOverThree",
    "prunableWorktrees",
    "missingWorktrees",
    "worktreeCount",
    "cpuPercent",
    "memoryPercent",
    "rssBytes",
    "agentLikeProcesses",
    "maxRelevantChildrenPerAgent",
    "relevantProcessCount",
    "orphanOrService",
    "medianMs",
    "maxMs",
    "coworkExtensionCount",
    "mcpServerCount",
    "profileCount",
    "explicitRepositoryCount",
    "repositoriesDiscovered",
}
BOOLEAN_FIELD_NAMES = {
    "exists",
    "isSymlink",
    "metadataError",
    "validJsonObject",
    "proxyPresent",
    "authLikePresent",
    "certificatePresent",
    "valuesCollected",
    "disableModelInvocation",
    "userInvocable",
    "hasHooks",
    "hasPaths",
    "isSymlinked",
    "projectBound",
    "installPresent",
    "commandPresent",
    "headersPresent",
    "authPresent",
    "parseError",
    "known",
    "detached",
    "locked",
    "prunable",
    "available",
    "rawProcessIdentifiersEmitted",
    "commandLinesRead",
    "countTruncated",
    "countError",
    "scriptPresent",
    "scriptReadError",
    "conditionPresent",
    "async",
    "executablePresent",
    "ok",
    "timedOut",
}
NUMERIC_MAP_NAMES = {
    "permissions",
    "counts",
    "countsBySource",
    "effortCounts",
    "ageBuckets",
    "categories",
    "components",
}


class ComparisonError(Exception):
    """A safe, non-content-bearing comparator failure."""


class DuplicateKeyError(ValueError):
    """Raised when JSON contains an ambiguous duplicate object key."""


def no_duplicate_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    for key, value in pairs:
        if key in output:
            raise DuplicateKeyError("duplicate key")
        output[key] = value
    return output


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def at(value: Any, *keys: str) -> Any:
    current = value
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def number(value: Any) -> int | float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(float(value)) or value < 0:
        return None
    return value


def integer(value: Any) -> int | None:
    result = number(value)
    if result is None or int(result) != result:
        return None
    return int(result)


def numeric_at(report: dict[str, Any], *keys: str) -> int | float | None:
    return number(at(report, *keys))


def integer_at(report: dict[str, Any], *keys: str) -> int | None:
    return integer(at(report, *keys))


def safe_enum(value: Any, allowed: set[str], *, fallback: str = "não declarado") -> str:
    return value if isinstance(value, str) and value in allowed else fallback


def scan_report_safety(value: Any) -> list[str]:
    failures: set[str] = set()
    stack = [value]
    visited = 0
    while stack:
        current = stack.pop()
        visited += 1
        if visited > 1_000_000:
            failures.add("STRUCTURE_LIMIT")
            break
        if isinstance(current, dict):
            for key, child in current.items():
                normalized_key = str(key).casefold()
                if normalized_key in FORBIDDEN_KEYS:
                    failures.add("FORBIDDEN_KEY")
                if normalized_key.endswith("ref") and child is not None:
                    if not isinstance(child, str) or not OPAQUE_REF_PATTERN.fullmatch(child):
                        failures.add("REFERENCE_FORMAT")
                if normalized_key.endswith("refs") and isinstance(child, list):
                    if any(not isinstance(item, str) or not OPAQUE_REF_PATTERN.fullmatch(item) for item in child):
                        failures.add("REFERENCE_FORMAT")
                stack.append(child)
        elif isinstance(current, list):
            stack.extend(current)
        elif isinstance(current, str):
            if len(current) > 16_384:
                failures.add("STRING_LIMIT")
            if any(pattern.search(current) for pattern in SECRET_PATTERNS):
                failures.add("SECRET_PATTERN")
            if any(pattern.search(current) for pattern in DLP_PATTERNS):
                failures.add("DLP_PATTERN")
    return sorted(failures)


def scan_schema_types(value: Any) -> list[str]:
    failures: set[str] = set()
    stack = [value]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            for key, child in current.items():
                if key in NUMERIC_FIELD_NAMES and child is not None and number(child) is None:
                    failures.add("NUMERIC_FIELD_TYPE")
                if key in BOOLEAN_FIELD_NAMES and child is not None and not isinstance(child, bool):
                    failures.add("BOOLEAN_FIELD_TYPE")
                if key == "exitCode" and child is not None and (isinstance(child, bool) or not isinstance(child, int)):
                    failures.add("EXIT_CODE_TYPE")
                if key == "samplesMs" and (
                    not isinstance(child, list) or any(number(item) is None for item in child)
                ):
                    failures.add("BENCHMARK_SAMPLE_TYPE")
                if key == "exitCodes" and (
                    not isinstance(child, list)
                    or any(item is not None and (isinstance(item, bool) or not isinstance(item, int)) for item in child)
                ):
                    failures.add("BENCHMARK_EXIT_TYPE")
                if key in NUMERIC_MAP_NAMES and isinstance(child, dict):
                    if any(number(item) is None for item in child.values()):
                        failures.add("NUMERIC_MAP_TYPE")
                if key in {"enabledPlugins", "safeBooleanKeys"} and isinstance(child, dict):
                    if any(not isinstance(item, bool) for item in child.values()):
                        failures.add("BOOLEAN_MAP_TYPE")
                stack.append(child)
        elif isinstance(current, list):
            stack.extend(current)
    return sorted(failures)


def validate_report(report: Any) -> list[str]:
    failures: set[str] = set()
    if not isinstance(report, dict):
        return ["ROOT_OBJECT_REQUIRED"]
    if set(report) != REQUIRED_TOP_LEVEL:
        failures.add("TOP_LEVEL_SCHEMA_MISMATCH")
    if report.get("schemaVersion") != SUPPORTED_SCHEMA_VERSION:
        failures.add("UNSUPPORTED_SCHEMA_VERSION")

    collector = as_dict(report.get("collector"))
    version = collector.get("version")
    version_match = SEMVER_PATTERN.fullmatch(version) if isinstance(version, str) else None
    if not version_match or int(version_match.group(1)) != SUPPORTED_COLLECTOR_MAJOR:
        failures.add("UNSUPPORTED_COLLECTOR_VERSION")
    if collector.get("privacyPolicy") != PRIVACY_POLICY:
        failures.add("PRIVACY_POLICY_MISMATCH")
    if collector.get("networkRequests") is not False:
        failures.add("NETWORK_FREE_COLLECTION_REQUIRED")
    if not isinstance(collector.get("activeBenchmarks"), bool):
        failures.add("BENCHMARK_FLAG_REQUIRED")
    if not isinstance(collector.get("cacheSizes"), bool):
        failures.add("CACHE_FLAG_REQUIRED")
    sha256 = collector.get("sha256")
    if not isinstance(sha256, str) or not SHA256_PATTERN.fullmatch(sha256):
        failures.add("COLLECTOR_DIGEST_REQUIRED")

    privacy = as_dict(report.get("privacy"))
    if privacy.get("redacted") is not True:
        failures.add("REDACTED_REPORT_REQUIRED")
    for key in PRIVACY_FALSE_FLAGS:
        if privacy.get(key) is not False:
            failures.add("PRIVACY_FLAG_MISMATCH")

    validation = as_dict(report.get("privacyValidation"))
    if validation.get("passed") is not True or validation.get("failures") != []:
        failures.add("COLLECTOR_PRIVACY_VALIDATION_REQUIRED")

    run = as_dict(report.get("run"))
    pairing_ref = run.get("pairingKeyId")
    if not isinstance(pairing_ref, str) or not PAIR_REF_PATTERN.fullmatch(pairing_ref):
        failures.add("PAIRING_REFERENCE_REQUIRED")
    if run.get("pairingMode") not in {"provided", "ephemeral"}:
        failures.add("PAIRING_MODE_INVALID")
    if not isinstance(report.get("collectedAt"), str) or not TIMESTAMP_PATTERN.fullmatch(report["collectedAt"]):
        failures.add("COLLECTION_TIME_INVALID")

    for section in ("system", "tools", "environment", "claude", "codex", "workspace", "runtime"):
        if not isinstance(report.get(section), dict):
            failures.add("REQUIRED_SECTION_INVALID")
    if not isinstance(report.get("observations"), list):
        failures.add("OBSERVATIONS_INVALID")
    claude = as_dict(report.get("claude"))
    for key in ("settings", "appVersions", "mcpConfigs"):
        if not isinstance(claude.get(key), list):
            failures.add("CLAUDE_SECTION_INVALID")
    for key in ("instructions", "skills", "plugins", "claudeJson"):
        if not isinstance(claude.get(key), dict):
            failures.add("CLAUDE_SECTION_INVALID")

    environment = as_dict(report.get("environment"))
    if environment.get("namesCollected") is not False or environment.get("valuesCollected") is not False:
        failures.add("ENVIRONMENT_REDACTION_REQUIRED")
    for setting in as_list(claude.get("settings")):
        setting_dict = as_dict(setting)
        environment_summary = setting_dict.get("environment")
        if isinstance(environment_summary, dict) and environment_summary.get("valuesCollected") is not False:
            failures.add("SETTING_ENVIRONMENT_REDACTION_REQUIRED")

    processes = as_dict(at(report, "runtime", "processes"))
    if processes.get("available") is True:
        if processes.get("rawProcessIdentifiersEmitted") is not False:
            failures.add("PROCESS_IDENTIFIER_REDACTION_REQUIRED")
        if processes.get("commandLinesRead") is not False:
            failures.add("PROCESS_CONTENT_REDACTION_REQUIRED")

    failures.update(scan_report_safety(report))
    failures.update(scan_schema_types(report))
    return sorted(failures)


def load_report(path: Path, label: str) -> dict[str, Any]:
    try:
        size = path.stat().st_size
        if size <= 0 or size > MAX_INPUT_BYTES or not path.is_file():
            raise ComparisonError(f"{label}: INPUT_SIZE_OR_TYPE_INVALID")
        with path.open("r", encoding="utf-8") as handle:
            report = json.load(handle, object_pairs_hook=no_duplicate_object)
    except ComparisonError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError, DuplicateKeyError) as error:
        raise ComparisonError(f"{label}: INPUT_JSON_INVALID") from error
    failures = validate_report(report)
    if failures:
        raise ComparisonError(f"{label}: " + ",".join(failures))
    return report


def setting_values(report: dict[str, Any], key: str, allowed: set[str]) -> str:
    values: set[str] = set()
    for setting in as_list(at(report, "claude", "settings")):
        raw = at(setting, "safeScalars", key)
        if isinstance(raw, str) and raw in allowed:
            values.add(raw)
    return ", ".join(sorted(values)) if values else "não declarado"


def settings_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    settings = [as_dict(item) for item in as_list(at(report, "claude", "settings"))]
    existing = sum(1 for item in settings if item.get("exists") is True)
    valid = sum(1 for item in settings if item.get("validJsonObject") is True)
    extended = sum(1 for item in settings if at(item, "safeScalars", "extendedContextRequested") is True)
    model_profiles = sum(integer(at(item, "modelSettings", "count")) or 0 for item in settings)
    return {
        "claudeModels": setting_values(report, "modelFamily", MODEL_FAMILIES),
        "claudeEfforts": setting_values(report, "effort", EFFORT_LEVELS),
        "advisorModels": setting_values(report, "advisorModelFamily", MODEL_FAMILIES),
        "codexModel": safe_enum(at(report, "codex", "modelFamily"), MODEL_FAMILIES),
        "codexEffort": safe_enum(at(report, "codex", "reasoningEffort"), EFFORT_LEVELS),
        "existingSettings": existing,
        "validSettings": valid,
        "extendedContext": extended,
        "modelProfiles": model_profiles,
    }


def duplicate_excess(groups: Any) -> int:
    total = 0
    for group in as_list(groups):
        count = integer(as_dict(group).get("count"))
        if count:
            total += max(0, count - 1)
    return total


def skill_source_class(source: Any) -> str:
    if not isinstance(source, str):
        return "other"
    if source.startswith("plugin:"):
        return "plugin"
    if "project" in source:
        return "project"
    if "user" in source:
        return "user"
    return "other"


def skill_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    skills = as_dict(at(report, "claude", "skills"))
    source_counts = as_dict(skills.get("countsBySource"))
    if not source_counts:
        for entry in as_list(skills.get("entries")):
            source = as_dict(entry).get("source")
            if isinstance(source, str):
                source_counts[source] = (integer(source_counts.get(source)) or 0) + 1
    sources = {name: 0 for name in ("user", "project", "plugin", "other")}
    exact_sources = {
        "claude-user": 0,
        "claude-project": 0,
        "agents-user": 0,
        "agents-project": 0,
    }
    for source, raw_count in source_counts.items():
        count = integer(raw_count) or 0
        sources[skill_source_class(source)] += count
        if source in exact_sources:
            exact_sources[source] += count
    return {
        "logical": integer(skills.get("logicalEntries")),
        "claudeCatalog": integer(skills.get("claudeCatalogEntries")),
        "crossAgentOnly": integer(skills.get("crossAgentOnlyEntries")),
        "uniqueContent": integer(skills.get("uniqueContentHashes")),
        "uniquePaths": integer(skills.get("uniqueRealPaths")),
        "symlinked": integer(skills.get("symlinkedEntries")),
        "autoVisible": integer(skills.get("autoVisibleEntries")),
        "manualOnly": integer(skills.get("manualOnlyEntries")),
        "forked": integer(skills.get("forkedContextEntries")),
        "descriptionChars": integer(skills.get("catalogDescriptionChars")),
        "catalogTokens": integer(skills.get("catalogApproxTokens")),
        "logicalBytes": integer(skills.get("logicalBodyBytes")),
        "uniqueBytes": integer(skills.get("uniqueBodyBytes")),
        "duplicateNames": duplicate_excess(skills.get("duplicateNames")),
        "duplicateContent": duplicate_excess(skills.get("duplicateContent")),
        "duplicatePaths": duplicate_excess(skills.get("duplicateRealPaths")),
        "sourceUser": sources["user"],
        "sourceProject": sources["project"],
        "sourcePlugin": sources["plugin"],
        "sourceOther": sources["other"],
        "sourceClaudeUser": exact_sources["claude-user"],
        "sourceClaudeProject": exact_sources["claude-project"],
        "sourceAgentsUser": exact_sources["agents-user"],
        "sourceAgentsProject": exact_sources["agents-project"],
    }


def plugin_hook_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    plugins = as_dict(at(report, "claude", "plugins"))
    installations = [as_dict(item) for item in as_list(plugins.get("installations"))]
    component_keys = ("skills", "agents", "commands", "hookManifests", "mcpManifests")
    components = {key: 0 for key in component_keys}
    for item in installations:
        for key in component_keys:
            components[key] += integer(at(item, "components", key)) or 0
    enabled = disabled = 0
    hooks: list[dict[str, Any]] = []
    for setting in as_list(at(report, "claude", "settings")):
        setting_dict = as_dict(setting)
        for value in as_dict(setting_dict.get("enabledPlugins")).values():
            enabled += int(value is True)
            disabled += int(value is False)
        hooks.extend(as_dict(item) for item in as_list(setting_dict.get("hooks")))
    return {
        "installations": len(installations),
        "present": sum(1 for item in installations if item.get("installPresent") is True),
        "projectBound": sum(1 for item in installations if item.get("projectBound") is True),
        "duplicateInstallations": duplicate_excess(plugins.get("duplicates")),
        "enabledDeclarations": enabled,
        "disabledDeclarations": disabled,
        "componentSkills": components["skills"],
        "componentAgents": components["agents"],
        "componentActions": components["commands"],
        "componentHooks": components["hookManifests"],
        "componentMcp": components["mcpManifests"],
        "hooks": len(hooks),
        "hooksSync": sum(1 for item in hooks if item.get("async") is not True),
        "hooksAsync": sum(1 for item in hooks if item.get("async") is True),
        "hooksWildcard": sum(1 for item in hooks if item.get("matcherClass") == "wildcard"),
        "hooksConditional": sum(1 for item in hooks if item.get("conditionPresent") is True),
        "hooksExecutable": sum(1 for item in hooks if item.get("type") == "command"),
        "hooksModel": sum(1 for item in hooks if item.get("type") in {"prompt", "agent"}),
        "hookStaticLoops": sum(
            (integer(at(item, "commandSummary", "scriptStaticMetrics", "forLoops")) or 0)
            + (integer(at(item, "commandSummary", "scriptStaticMetrics", "whileLoops")) or 0)
            for item in hooks
        ),
        "hookStaticMatchers": sum(
            (integer(at(item, "commandSummary", "scriptStaticMetrics", "grepMentions")) or 0)
            + (integer(at(item, "commandSummary", "scriptStaticMetrics", "jqMentions")) or 0)
            for item in hooks
        ),
    }


def instruction_mcp_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    instructions = as_dict(at(report, "claude", "instructions"))
    instruction_entries = [as_dict(item) for item in as_list(instructions.get("entries"))]
    servers: list[dict[str, Any]] = []
    for config in as_list(at(report, "claude", "mcpConfigs")):
        servers.extend(as_dict(item) for item in as_list(at(config, "servers")))
    servers.extend(as_dict(item) for item in as_list(at(report, "claude", "claudeJson", "globalMcpServers")))
    servers.extend(as_dict(item) for item in as_list(at(report, "claude", "claudeJson", "targetProject", "mcpServers")))
    unique_servers: dict[str, dict[str, Any]] = {}
    anonymous = 0
    for server in servers:
        reference = server.get("serverRef")
        if isinstance(reference, str) and OPAQUE_REF_PATTERN.fullmatch(reference):
            unique_servers.setdefault(reference, server)
        else:
            anonymous += 1
            unique_servers[f"anonymous-{anonymous}"] = server
    unique = list(unique_servers.values())
    return {
        "instructionFiles": integer(instructions.get("logicalFiles")),
        "instructionUnique": integer(instructions.get("uniqueFiles")),
        "instructionBytes": integer(instructions.get("uniqueBytes")),
        "instructionTokens": integer(instructions.get("uniqueApproxTokens")),
        "instructionImports": sum(integer(item.get("importCount")) or 0 for item in instruction_entries),
        "mcpDeclarations": len(servers),
        "mcpUnique": len(unique),
        "mcpStdio": sum(1 for item in unique if item.get("type") == "stdio"),
        "mcpRemoteTransport": sum(1 for item in unique if item.get("type") in {"http", "sse", "remote"}),
        "mcpLocalEndpoint": sum(1 for item in unique if at(item, "endpoint", "hostClass") == "local"),
        "mcpRemoteEndpoint": sum(1 for item in unique if at(item, "endpoint", "hostClass") == "remote"),
        "mcpAuth": sum(1 for item in unique if item.get("authPresent") is True or item.get("headersPresent") is True),
        "mcpEnvironmentEntries": sum(integer(item.get("environmentCount")) or 0 for item in unique),
        "mcpArgumentEntries": sum(integer(item.get("argumentCount")) or 0 for item in unique),
        "codexMcp": integer_at(report, "codex", "mcpServerCount"),
    }


def worktree_cache_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    worktrees = as_dict(at(report, "workspace", "worktrees"))
    groups = [as_dict(item) for item in as_list(worktrees.get("groups"))]
    cache_sizes = at(report, "collector", "cacheSizes") is True
    cache_instances = 0
    cache_bytes = 0
    cache_bytes_unknown = False
    by_class = {name: 0 for name in CACHE_CLASSES}
    for group in groups:
        for worktree in as_list(group.get("worktrees")):
            caches = as_dict(at(worktree, "caches"))
            for name in CACHE_CLASSES:
                item = as_dict(caches.get(name))
                if item.get("exists") is True:
                    cache_instances += 1
                    size = integer(item.get("bytes"))
                    if size is not None:
                        cache_bytes += size
                        by_class[name] += size
                    else:
                        cache_bytes_unknown = True
    return {
        "repositoryGroups": integer(worktrees.get("repositoryGroups")),
        "totalWorktrees": integer(worktrees.get("totalWorktrees")),
        "groupsOverThree": integer(worktrees.get("groupsOverThree")),
        "prunable": integer(worktrees.get("prunableWorktrees")),
        "missing": integer(worktrees.get("missingWorktrees")),
        "maxPerRepository": max((integer(item.get("worktreeCount")) or 0 for item in groups), default=0),
        "cacheSizesCollected": cache_sizes,
        "cacheInstances": cache_instances if cache_sizes else None,
        "cacheBytes": cache_bytes if cache_sizes and not cache_bytes_unknown else None,
        "cacheByClass": by_class if cache_sizes else {},
        "agentLike": integer_at(report, "runtime", "processes", "topology", "agentLikeProcesses"),
        "maxChildren": integer_at(report, "runtime", "processes", "topology", "maxRelevantChildrenPerAgent"),
        "relevantProcesses": integer_at(report, "runtime", "processes", "topology", "relevantProcessCount"),
    }


def process_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    processes = as_dict(at(report, "runtime", "processes"))
    available = processes.get("available") is True
    output: dict[str, Any] = {"available": available}
    legacy_aliases = {"claudeCli": "claude", "codexCli": "codex"}
    for key, _ in PROCESS_CLASSES:
        raw_aggregate = at(processes, "aggregates", key)
        if not isinstance(raw_aggregate, dict) and key in legacy_aliases:
            raw_aggregate = at(processes, "aggregates", legacy_aliases[key])
        aggregate = as_dict(raw_aggregate)
        output[key] = {
            "count": integer(aggregate.get("count")) if available else None,
            "rss": integer(aggregate.get("rssBytes")) if available else None,
            "cpu": number(aggregate.get("cpuPercent")) if available else None,
            "orphan": integer(aggregate.get("orphanOrService")) if available else None,
        }
    return output


def storage_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    entries = [as_dict(item) for item in as_list(at(report, "runtime", "storage", "paths"))]
    by_class: dict[str, int | None] = {}
    for storage_class in STORAGE_CLASSES:
        matching = [item for item in entries if item.get("storageClass") == storage_class]
        if not matching:
            by_class[storage_class] = None
            continue
        values: list[int] = []
        unknown = False
        for item in matching:
            if item.get("exists") is False:
                values.append(0)
            else:
                size = integer(item.get("bytes"))
                if size is None:
                    unknown = True
                else:
                    values.append(size)
        by_class[storage_class] = None if unknown else sum(values)
    known_values = [value for value in by_class.values() if value is not None]
    total = sum(known_values) if len(known_values) == len(by_class) else None
    return {
        "byClass": by_class,
        "total": total,
        "coworkExtensions": integer_at(report, "runtime", "storage", "coworkExtensionCount"),
    }


def benchmark_snapshot(report: dict[str, Any]) -> dict[str, Any]:
    enabled = at(report, "collector", "activeBenchmarks") is True
    output: dict[str, Any] = {"enabled": enabled}
    benchmarks = as_dict(at(report, "runtime", "benchmarks"))
    for key, _ in BENCHMARKS:
        item = as_dict(benchmarks.get(key))
        samples = [float(value) for value in as_list(item.get("samplesMs")) if number(value) is not None]
        exits = as_list(item.get("exitCodes"))
        median = number(item.get("medianMs"))
        if median is None and samples:
            median = round(statistics.median(samples), 1)
        output[key] = {
            "median": median if enabled else None,
            "maximum": number(item.get("maxMs")) if enabled else None,
            "samples": len(samples) if enabled else 0,
            "successful": sum(1 for code in exits if code == 0) if enabled else 0,
            "spread": ((max(samples) - min(samples)) / median) if enabled and samples and median else None,
        }
    return output


def host_profile(report: dict[str, Any]) -> tuple[Any, ...]:
    return (
        at(report, "system", "os"),
        at(report, "system", "architecture"),
        integer_at(report, "system", "logicalCpu"),
        integer_at(report, "system", "physicalMemoryBytes"),
        integer_at(report, "system", "projectDisk", "totalBytes"),
    )


def collection_gap(baseline: dict[str, Any], candidate: dict[str, Any]) -> str:
    try:
        first = dt.datetime.strptime(str(baseline["collectedAt"]), "%Y-%m-%dT%H:%M:%SZ")
        second = dt.datetime.strptime(str(candidate["collectedAt"]), "%Y-%m-%dT%H:%M:%SZ")
        hours = abs((second - first).total_seconds()) / 3600
    except (KeyError, TypeError, ValueError):
        return "não determinado"
    if hours == 0:
        return "mesma hora arredondada"
    if hours < 6:
        return "menos de 6 horas"
    if hours < 24:
        return "entre 6 e 24 horas"
    if hours < 168:
        return "entre 1 e 7 dias"
    return "7 dias ou mais"


def format_integer(value: int | float | None) -> str:
    if value is None:
        return "n/d"
    return f"{int(round(value)):,}".replace(",", ".")


def format_decimal(value: int | float | None, digits: int = 1) -> str:
    if value is None:
        return "n/d"
    return f"{float(value):.{digits}f}".replace(".", ",")


def format_bytes(value: int | float | None) -> str:
    if value is None:
        return "n/d"
    current = float(value)
    units = ("B", "KiB", "MiB", "GiB", "TiB")
    unit = units[0]
    for unit in units:
        if abs(current) < 1024 or unit == units[-1]:
            break
        current /= 1024
    digits = 0 if unit == "B" else 1
    return f"{format_decimal(current, digits)} {unit}"


def format_percent(value: int | float | None) -> str:
    return "n/d" if value is None else f"{format_decimal(value, 1)}%"


def format_ms(value: int | float | None) -> str:
    return "n/d" if value is None else f"{format_decimal(value, 1)} ms"


def format_ratio(baseline: int | float | None, candidate: int | float | None) -> str:
    if baseline is None or candidate is None:
        return "n/d"
    if baseline == 0:
        return "—" if candidate == 0 else "novo"
    return f"{format_decimal(candidate / baseline, 2)}×"


def format_delta(
    baseline: int | float | None,
    candidate: int | float | None,
    formatter: Callable[[int | float | None], str],
) -> str:
    if baseline is None or candidate is None:
        return "n/d"
    delta = candidate - baseline
    if delta == 0:
        return formatter(0)
    prefix = "+" if delta > 0 else "−"
    return prefix + formatter(abs(delta))


def metric_table(
    rows: Iterable[tuple[str, int | float | None, int | float | None, Callable[[int | float | None], str]]]
) -> str:
    lines = [
        "| Métrica | Base | Candidato | Δ | Razão C/Base |",
        "|---|---:|---:|---:|---:|",
    ]
    for label, baseline, candidate, formatter in rows:
        lines.append(
            f"| {label} | {formatter(baseline)} | {formatter(candidate)} | "
            f"{format_delta(baseline, candidate, formatter)} | {format_ratio(baseline, candidate)} |"
        )
    return "\n".join(lines)


def categorical_change(baseline: str, candidate: str) -> str:
    return "igual" if baseline == candidate else "diferente"


def categorical_table(rows: Iterable[tuple[str, str, str]]) -> str:
    lines = ["| Campo | Base | Candidato | Estado |", "|---|---|---|---|"]
    for label, baseline, candidate in rows:
        lines.append(f"| {label} | {baseline} | {candidate} | {categorical_change(baseline, candidate)} |")
    return "\n".join(lines)


def benchmark_confidence(base: dict[str, Any], candidate: dict[str, Any], compatible_host: bool) -> str:
    if base.get("median") is None or candidate.get("median") is None:
        return "baixa"
    complete = base.get("samples", 0) >= 5 and candidate.get("samples", 0) >= 5
    clean = base.get("successful") == base.get("samples") and candidate.get("successful") == candidate.get("samples")
    stable = (base.get("spread") or 0) <= 0.20 and (candidate.get("spread") or 0) <= 0.20
    return "média" if complete and clean and stable and compatible_host else "baixa"


def build_hypotheses(
    skills_base: dict[str, Any],
    skills_candidate: dict[str, Any],
    plugins_base: dict[str, Any],
    plugins_candidate: dict[str, Any],
    mcp_base: dict[str, Any],
    mcp_candidate: dict[str, Any],
    work_base: dict[str, Any],
    work_candidate: dict[str, Any],
    process_base: dict[str, Any],
    process_candidate: dict[str, Any],
    compatible_host: bool,
) -> list[tuple[str, str, str]]:
    hypotheses: list[tuple[str, str, str]] = []
    if (skills_candidate.get("catalogTokens") or 0) != (skills_base.get("catalogTokens") or 0):
        hypotheses.append((
            "O tamanho agregado do catálogo de skills difere.",
            "O volume do catálogo pode acompanhar parte da diferença observada; a variante NO_SKILLS isola esse sinal.",
            "baixa",
        ))
    if (plugins_candidate.get("hooksSync") or 0) != (plugins_base.get("hooksSync") or 0):
        hypotheses.append((
            "A quantidade de hooks síncronos difere.",
            "O trabalho síncrono pode acompanhar latência adicional; SAFE versus FULL permite medir a diferença.",
            "baixa",
        ))
    if (mcp_candidate.get("mcpUnique") or 0) != (mcp_base.get("mcpUnique") or 0) or (mcp_candidate.get("codexMcp") or 0) != (mcp_base.get("codexMcp") or 0):
        hypotheses.append((
            "A quantidade agregada de servidores MCP difere.",
            "Inicialização e manutenção de conexões podem acompanhar o resultado; FULL versus NO_MCP isola esse fator.",
            "baixa",
        ))
    if (work_candidate.get("agentLike") or 0) != (work_base.get("agentLike") or 0) or (work_candidate.get("totalWorktrees") or 0) != (work_base.get("totalWorktrees") or 0):
        hypotheses.append((
            "Os snapshots de fan-out ou worktrees diferem.",
            "Concorrência e duplicação de caches podem acompanhar uso de CPU, memória ou disco; o teste deve fixar o fan-out.",
            "baixa",
        ))
    runner_base = (at(process_base, "browser", "count") or 0) + (at(process_base, "testOrDev", "count") or 0)
    runner_candidate = (at(process_candidate, "browser", "count") or 0) + (at(process_candidate, "testOrDev", "count") or 0)
    if runner_base != runner_candidate:
        hypotheses.append((
            "As contagens de browser e teste/desenvolvimento diferem e podem se sobrepor.",
            "Carga auxiliar do host pode contaminar a medição; repetir com o host estabilizado testa essa possibilidade.",
            "baixa",
        ))
    if not compatible_host:
        hypotheses.append((
            "O perfil observável do host difere.",
            "A diferença de host é um confundidor; resultados de desempenho precisam ser repetidos no mesmo perfil controlado.",
            "alta para a diferença; baixa para qualquer efeito",
        ))
    if not hypotheses:
        hypotheses.append((
            "Os principais agregados selecionados não mudaram.",
            "Diferenças ainda podem estar em estado transitório, ordem de execução ou fatores não coletados.",
            "baixa",
        ))
    return hypotheses


def render_comparison(baseline: dict[str, Any], candidate: dict[str, Any]) -> str:
    base_settings, candidate_settings = settings_snapshot(baseline), settings_snapshot(candidate)
    base_skills, candidate_skills = skill_snapshot(baseline), skill_snapshot(candidate)
    base_plugins, candidate_plugins = plugin_hook_snapshot(baseline), plugin_hook_snapshot(candidate)
    base_mcp, candidate_mcp = instruction_mcp_snapshot(baseline), instruction_mcp_snapshot(candidate)
    base_work, candidate_work = worktree_cache_snapshot(baseline), worktree_cache_snapshot(candidate)
    base_process, candidate_process = process_snapshot(baseline), process_snapshot(candidate)
    base_storage, candidate_storage = storage_snapshot(baseline), storage_snapshot(candidate)
    base_bench, candidate_bench = benchmark_snapshot(baseline), benchmark_snapshot(candidate)
    compatible_host = host_profile(baseline) == host_profile(candidate) and None not in host_profile(baseline)
    pairing_equal = at(baseline, "run", "pairingKeyId") == at(candidate, "run", "pairingKeyId")
    collector_digest_equal = at(baseline, "collector", "sha256") == at(candidate, "collector", "sha256")

    lines = [
        "# Comparação redigida de ambientes de IA",
        "",
        "Este relatório contém somente enums, contagens e métricas agregadas dos inventários redigidos. "
        "Referências opacas são usadas apenas internamente para deduplicação e não aparecem abaixo.",
        "",
        "Os números são fatos dos dois snapshots. As interpretações são hipóteses; este relatório não atribui causalidade.",
        "",
        "## Validação e comparabilidade",
        "",
        "| Verificação | Resultado | Confiança |",
        "|---|---|---|",
        f"| Schema | {SUPPORTED_SCHEMA_VERSION} validado nos dois arquivos | alta |",
        f"| Coletor | major {SUPPORTED_COLLECTOR_MAJOR} e política de privacidade compatíveis | alta |",
        f"| Implementação do coletor | {'mesmo digest' if collector_digest_equal else 'digests diferentes'} | {'alta' if collector_digest_equal else 'baixa'} |",
        "| Redação | flags negativas e validação do coletor aprovadas | alta |",
        f"| Pareamento de referências | {'compatível' if pairing_equal else 'diferente; comparação limitada a agregados'} | {'alta' if pairing_equal else 'média'} |",
        f"| Intervalo entre coletas | {collection_gap(baseline, candidate)} | alta |",
        f"| Perfil observável do host | {'compatível, sem provar identidade' if compatible_host else 'diferenças detectadas'} | média |",
        f"| Tamanhos de cache | {'presentes nos dois snapshots' if base_work['cacheSizesCollected'] and candidate_work['cacheSizesCollected'] else 'incompletos'} | {'média' if base_work['cacheSizesCollected'] and candidate_work['cacheSizesCollected'] else 'baixa'} |",
        f"| Benchmarks ativos | {'presentes nos dois snapshots' if base_bench['enabled'] and candidate_bench['enabled'] else 'incompletos'} | {'média' if base_bench['enabled'] and candidate_bench['enabled'] else 'baixa'} |",
        "",
        "Versão, digest e flags validam consistência declarada, mas o formato JSON não autentica criptograficamente quem produziu o arquivo.",
        "",
        "As camadas são analisadas separadamente: modelo, skills, plugins, hooks, instruções e MCP são customizações declaradas; "
        "fan-out e worktrees descrevem a topologia de execução; browser e teste/desenvolvimento são classes de processos possivelmente sobrepostas; "
        "storage, disco e perfil do host são contexto operacional.",
        "",
        "## Fatos observados",
        "",
        f"- Skills visíveis automaticamente: {format_integer(base_skills['autoVisible'])} na base e {format_integer(candidate_skills['autoVisible'])} no candidato ({format_ratio(base_skills['autoVisible'], candidate_skills['autoVisible'])}).",
        f"- Worktrees: {format_integer(base_work['totalWorktrees'])} na base e {format_integer(candidate_work['totalWorktrees'])} no candidato ({format_ratio(base_work['totalWorktrees'], candidate_work['totalWorktrees'])}).",
        f"- Processos semelhantes a agentes: {format_integer(base_work['agentLike'])} na base e {format_integer(candidate_work['agentLike'])} no candidato ({format_ratio(base_work['agentLike'], candidate_work['agentLike'])}).",
        "- Contagens de classes de processos podem se sobrepor; browser representa processos do sistema e não instâncias lógicas.",
        "",
        "## Modelo e esforço",
        "",
        categorical_table((
            ("Famílias Claude declaradas", base_settings["claudeModels"], candidate_settings["claudeModels"]),
            ("Esforços Claude declarados", base_settings["claudeEfforts"], candidate_settings["claudeEfforts"]),
            ("Famílias de advisor declaradas", base_settings["advisorModels"], candidate_settings["advisorModels"]),
            ("Família Codex declarada", base_settings["codexModel"], candidate_settings["codexModel"]),
            ("Esforço Codex declarado", base_settings["codexEffort"], candidate_settings["codexEffort"]),
        )),
        "",
        metric_table((
            ("Arquivos de settings existentes", base_settings["existingSettings"], candidate_settings["existingSettings"], format_integer),
            ("Settings JSON válidos", base_settings["validSettings"], candidate_settings["validSettings"], format_integer),
            ("Declarações de contexto estendido", base_settings["extendedContext"], candidate_settings["extendedContext"], format_integer),
            ("Perfis de modelo", base_settings["modelProfiles"], candidate_settings["modelProfiles"], format_integer),
        )),
        "",
        "A coleta registra declarações por escopo e não resolve qual valor venceu em runtime.",
        "",
        "## Skills",
        "",
        metric_table((
            ("Skills lógicas", base_skills["logical"], candidate_skills["logical"], format_integer),
            ("Catálogo Claude", base_skills["claudeCatalog"], candidate_skills["claudeCatalog"], format_integer),
            ("Skills exclusivas de outros agentes", base_skills["crossAgentOnly"], candidate_skills["crossAgentOnly"], format_integer),
            ("Conteúdos únicos", base_skills["uniqueContent"], candidate_skills["uniqueContent"], format_integer),
            ("Caminhos reais únicos", base_skills["uniquePaths"], candidate_skills["uniquePaths"], format_integer),
            ("Skills visíveis automaticamente", base_skills["autoVisible"], candidate_skills["autoVisible"], format_integer),
            ("Skills somente manuais", base_skills["manualOnly"], candidate_skills["manualOnly"], format_integer),
            ("Skills com contexto fork", base_skills["forked"], candidate_skills["forked"], format_integer),
            ("Entradas por symlink", base_skills["symlinked"], candidate_skills["symlinked"], format_integer),
            ("Skills Claude de usuário", base_skills["sourceClaudeUser"], candidate_skills["sourceClaudeUser"], format_integer),
            ("Skills Claude de projeto", base_skills["sourceClaudeProject"], candidate_skills["sourceClaudeProject"], format_integer),
            ("Skills de outros agentes no usuário", base_skills["sourceAgentsUser"], candidate_skills["sourceAgentsUser"], format_integer),
            ("Skills de outros agentes no projeto", base_skills["sourceAgentsProject"], candidate_skills["sourceAgentsProject"], format_integer),
            ("Skills fornecidas por plugins", base_skills["sourcePlugin"], candidate_skills["sourcePlugin"], format_integer),
            ("Tokens aproximados do catálogo", base_skills["catalogTokens"], candidate_skills["catalogTokens"], format_integer),
            ("Bytes lógicos dos corpos", base_skills["logicalBytes"], candidate_skills["logicalBytes"], format_bytes),
            ("Bytes únicos dos corpos", base_skills["uniqueBytes"], candidate_skills["uniqueBytes"], format_bytes),
            ("Duplicatas por nome", base_skills["duplicateNames"], candidate_skills["duplicateNames"], format_integer),
            ("Duplicatas por conteúdo", base_skills["duplicateContent"], candidate_skills["duplicateContent"], format_integer),
        )),
        "",
        "## Plugins e hooks",
        "",
        metric_table((
            ("Instalações de plugins", base_plugins["installations"], candidate_plugins["installations"], format_integer),
            ("Instalações presentes", base_plugins["present"], candidate_plugins["present"], format_integer),
            ("Instalações ligadas ao projeto", base_plugins["projectBound"], candidate_plugins["projectBound"], format_integer),
            ("Instalações duplicadas", base_plugins["duplicateInstallations"], candidate_plugins["duplicateInstallations"], format_integer),
            ("Declarações habilitadas", base_plugins["enabledDeclarations"], candidate_plugins["enabledDeclarations"], format_integer),
            ("Skills vindas de plugins", base_plugins["componentSkills"], candidate_plugins["componentSkills"], format_integer),
            ("Agentes vindos de plugins", base_plugins["componentAgents"], candidate_plugins["componentAgents"], format_integer),
            ("Manifestos MCP em plugins", base_plugins["componentMcp"], candidate_plugins["componentMcp"], format_integer),
            ("Hooks totais", base_plugins["hooks"], candidate_plugins["hooks"], format_integer),
            ("Hooks síncronos", base_plugins["hooksSync"], candidate_plugins["hooksSync"], format_integer),
            ("Hooks assíncronos", base_plugins["hooksAsync"], candidate_plugins["hooksAsync"], format_integer),
            ("Hooks com matcher amplo", base_plugins["hooksWildcard"], candidate_plugins["hooksWildcard"], format_integer),
            ("Hooks condicionais", base_plugins["hooksConditional"], candidate_plugins["hooksConditional"], format_integer),
            ("Hooks executáveis", base_plugins["hooksExecutable"], candidate_plugins["hooksExecutable"], format_integer),
            ("Loops detectados estaticamente", base_plugins["hookStaticLoops"], candidate_plugins["hookStaticLoops"], format_integer),
            ("Buscas detectadas estaticamente", base_plugins["hookStaticMatchers"], candidate_plugins["hookStaticMatchers"], format_integer),
        )),
        "",
        "## Instruções e MCP",
        "",
        metric_table((
            ("Arquivos lógicos de instruções", base_mcp["instructionFiles"], candidate_mcp["instructionFiles"], format_integer),
            ("Arquivos únicos de instruções", base_mcp["instructionUnique"], candidate_mcp["instructionUnique"], format_integer),
            ("Bytes únicos de instruções", base_mcp["instructionBytes"], candidate_mcp["instructionBytes"], format_bytes),
            ("Tokens aproximados de instruções", base_mcp["instructionTokens"], candidate_mcp["instructionTokens"], format_integer),
            ("Imports declarados", base_mcp["instructionImports"], candidate_mcp["instructionImports"], format_integer),
            ("Declarações MCP Claude", base_mcp["mcpDeclarations"], candidate_mcp["mcpDeclarations"], format_integer),
            ("Servidores MCP únicos Claude", base_mcp["mcpUnique"], candidate_mcp["mcpUnique"], format_integer),
            ("Transportes MCP stdio", base_mcp["mcpStdio"], candidate_mcp["mcpStdio"], format_integer),
            ("Transportes MCP remotos", base_mcp["mcpRemoteTransport"], candidate_mcp["mcpRemoteTransport"], format_integer),
            ("Endpoints MCP locais", base_mcp["mcpLocalEndpoint"], candidate_mcp["mcpLocalEndpoint"], format_integer),
            ("Endpoints MCP remotos", base_mcp["mcpRemoteEndpoint"], candidate_mcp["mcpRemoteEndpoint"], format_integer),
            ("Servidores MCP com autenticação declarada", base_mcp["mcpAuth"], candidate_mcp["mcpAuth"], format_integer),
            ("Entradas MCP de ambiente", base_mcp["mcpEnvironmentEntries"], candidate_mcp["mcpEnvironmentEntries"], format_integer),
            ("Argumentos MCP declarados (contagem)", base_mcp["mcpArgumentEntries"], candidate_mcp["mcpArgumentEntries"], format_integer),
            ("Servidores MCP Codex", base_mcp["codexMcp"], candidate_mcp["codexMcp"], format_integer),
        )),
        "",
        "## Fan-out, worktrees e caches",
        "",
        metric_table((
            ("Grupos de repositório", base_work["repositoryGroups"], candidate_work["repositoryGroups"], format_integer),
            ("Worktrees totais", base_work["totalWorktrees"], candidate_work["totalWorktrees"], format_integer),
            ("Máximo de worktrees por repositório", base_work["maxPerRepository"], candidate_work["maxPerRepository"], format_integer),
            ("Grupos acima de três worktrees", base_work["groupsOverThree"], candidate_work["groupsOverThree"], format_integer),
            ("Worktrees podáveis", base_work["prunable"], candidate_work["prunable"], format_integer),
            ("Worktrees ausentes", base_work["missing"], candidate_work["missing"], format_integer),
            ("Processos semelhantes a agentes", base_work["agentLike"], candidate_work["agentLike"], format_integer),
            ("Máximo de filhos relevantes por agente", base_work["maxChildren"], candidate_work["maxChildren"], format_integer),
            ("Processos relevantes", base_work["relevantProcesses"], candidate_work["relevantProcesses"], format_integer),
            ("Instâncias de cache", base_work["cacheInstances"], candidate_work["cacheInstances"], format_integer),
            ("Bytes de cache", base_work["cacheBytes"], candidate_work["cacheBytes"], format_bytes),
        )),
        "",
        "Worktrees medem cópias registradas; processos semelhantes a agentes medem o snapshot do host. Um valor não prova que o outro o criou.",
        "",
        "## Processos por classe",
        "",
        metric_table(
            (label, at(base_process, key, "count"), at(candidate_process, key, "count"), format_integer)
            for key, label in PROCESS_CLASSES
        ),
        "",
        "| Classe | RSS base | RSS candidato | Δ RSS | CPU base | CPU candidato | Δ CPU |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for key, label in PROCESS_CLASSES:
        rss_base, rss_candidate = at(base_process, key, "rss"), at(candidate_process, key, "rss")
        cpu_base, cpu_candidate = at(base_process, key, "cpu"), at(candidate_process, key, "cpu")
        lines.append(
            f"| {label} | {format_bytes(rss_base)} | {format_bytes(rss_candidate)} | "
            f"{format_delta(rss_base, rss_candidate, format_bytes)} | {format_percent(cpu_base)} | "
            f"{format_percent(cpu_candidate)} | {format_delta(cpu_base, cpu_candidate, format_percent)} |"
        )
    lines.extend([
        "",
        "As classes podem se sobrepor. Em especial, automação de browser pode também aparecer em teste/desenvolvimento; "
        "a contagem de browser inclui subprocessos e não equivale a browsers lógicos independentes.",
        "",
        "## Storage e disco",
        "",
        metric_table((
            (STORAGE_LABELS[name], base_storage["byClass"].get(name), candidate_storage["byClass"].get(name), format_bytes)
            for name in STORAGE_CLASSES
        )),
        "",
        metric_table((
            ("Storage total mensurável", base_storage["total"], candidate_storage["total"], format_bytes),
            ("Extensões Cowork", base_storage["coworkExtensions"], candidate_storage["coworkExtensions"], format_integer),
            ("Disco total", integer_at(baseline, "system", "projectDisk", "totalBytes"), integer_at(candidate, "system", "projectDisk", "totalBytes"), format_bytes),
            ("Disco usado", integer_at(baseline, "system", "projectDisk", "usedBytes"), integer_at(candidate, "system", "projectDisk", "usedBytes"), format_bytes),
            ("Disco livre", integer_at(baseline, "system", "projectDisk", "freeBytes"), integer_at(candidate, "system", "projectDisk", "freeBytes"), format_bytes),
            ("Memória física", integer_at(baseline, "system", "physicalMemoryBytes"), integer_at(candidate, "system", "physicalMemoryBytes"), format_bytes),
            ("CPUs lógicas", integer_at(baseline, "system", "logicalCpu"), integer_at(candidate, "system", "logicalCpu"), format_integer),
        )),
        "",
        "Disco, memória e CPU descrevem o host observado. Mesmo quando coincidem, esses campos não provam que as coletas ocorreram no mesmo host nem no mesmo estado térmico ou de carga.",
        "",
        "## Benchmarks",
        "",
        "| Caso | Mediana base | Mediana candidato | Δ | Razão C/Base | Amostras válidas B/C | Confiança factual |",
        "|---|---:|---:|---:|---:|---:|---|",
    ])
    for key, label in BENCHMARKS:
        base_item, candidate_item = base_bench[key], candidate_bench[key]
        base_median, candidate_median = base_item["median"], candidate_item["median"]
        lines.append(
            f"| {label} | {format_ms(base_median)} | {format_ms(candidate_median)} | "
            f"{format_delta(base_median, candidate_median, format_ms)} | {format_ratio(base_median, candidate_median)} | "
            f"{base_item['successful']}/{candidate_item['successful']} | {benchmark_confidence(base_item, candidate_item, compatible_host)} |"
        )

    hypotheses = build_hypotheses(
        base_skills,
        candidate_skills,
        base_plugins,
        candidate_plugins,
        base_mcp,
        candidate_mcp,
        base_work,
        candidate_work,
        base_process,
        candidate_process,
        compatible_host,
    )
    lines.extend([
        "",
        "Medições menores são melhores para estes três casos. Cinco amostras em um snapshot sustentam o fato observado, mas não uma explicação causal.",
        "",
        "## Hipóteses para teste",
        "",
        "| Sinal observado | Hipótese não causal | Confiança atual |",
        "|---|---|---|",
    ])
    for signal, hypothesis, confidence in hypotheses:
        lines.append(f"| {signal} | {hypothesis} | {confidence} |")
    lines.extend([
        "",
        "## Próximo passo experimental",
        "",
        "Um A/B controlado com SAFE, FULL, NO_SKILLS e NO_MCP ainda é necessário antes de atribuir qualquer diferença a uma customização.",
        "",
        "| Variante | Configuração observada no teste | Pergunta isolada |",
        "|---|---|---|",
        "| SAFE | Perfil mínimo aprovado, com modelo e esforço fixos | Qual é a linha de base controlada? |",
        "| FULL | Customizações completas do candidato | Qual é o efeito conjunto observável? |",
        "| NO_SKILLS | FULL com carregamento de skills removido | O catálogo acompanha a diferença? |",
        "| NO_MCP | FULL com MCP removido | A camada MCP acompanha a diferença? |",
        "",
        "Execute as variantes com a mesma implementação do coletor, no mesmo perfil de host e worktree, fixe modelo, esforço e fan-out, estabilize runners e browsers, "
        "altere uma camada por vez, randomize a ordem e repita medições frias e quentes. Registre distribuição e dispersão, não apenas a mediana.",
        "",
        "Confiança: alta significa leitura direta de um campo validado; média significa snapshot agregado com limitações conhecidas; "
        "baixa significa hipótese observacional que exige experimento.",
        "",
    ])
    markdown = "\n".join(lines)
    validate_markdown_privacy(markdown)
    return markdown


def validate_markdown_privacy(markdown: str) -> None:
    if OPAQUE_REF_PATTERN.search(markdown):
        raise ComparisonError("OUTPUT_PRIVACY_REFERENCE")
    if any(pattern.search(markdown) for pattern in SECRET_PATTERNS + DLP_PATTERNS):
        raise ComparisonError("OUTPUT_PRIVACY_PATTERN")


def atomic_write_private(path: Path, text: str) -> None:
    parent = path.parent
    temporary: Path | None = None
    descriptor: int | None = None
    try:
        parent.mkdir(parents=True, exist_ok=True)
        for _ in range(16):
            candidate = parent / f".{path.name}.tmp-{secrets.token_hex(8)}"
            flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            try:
                descriptor = os.open(candidate, flags, 0o600)
                temporary = candidate
                break
            except FileExistsError:
                continue
        if descriptor is None or temporary is None:
            raise OSError("temporary allocation failed")
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            descriptor = None
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        temporary = None
        os.chmod(path, 0o600)
        directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
        directory_fd = os.open(parent, directory_flags)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    except OSError as error:
        raise ComparisonError("OUTPUT_WRITE_FAILED") from error
    finally:
        if descriptor is not None:
            os.close(descriptor)
        if temporary is not None:
            try:
                temporary.unlink()
            except OSError:
                pass


def _self_test_fixture(candidate: bool = False) -> dict[str, Any]:
    multiplier = 2 if candidate else 1
    privacy = {"redacted": True, **{key: False for key in PRIVACY_FALSE_FLAGS}}
    aggregate = {
        "count": multiplier,
        "rssBytes": 1_000_000 * multiplier,
        "cpuPercent": float(multiplier),
        "orphanOrService": 0,
        "ageBuckets": {"lt_5m": multiplier},
    }
    return {
        "schemaVersion": SUPPORTED_SCHEMA_VERSION,
        "collectedAt": "2026-09-10T12:00:00Z",
        "collector": {
            "version": "1.0.0",
            "sha256": "a" * 64,
            "python": "3.14.0",
            "privacyPolicy": PRIVACY_POLICY,
            "activeBenchmarks": True,
            "cacheSizes": True,
            "networkRequests": False,
        },
        "privacy": privacy,
        "privacyValidation": {"passed": True, "failures": []},
        "run": {"subject": "other", "pairingKeyId": "pair_" + "b" * 20, "pairingMode": "provided"},
        "target": {"projectRef": "path_" + "c" * 20, "explicitRepositoryCount": 1},
        "system": {
            "os": "Darwin",
            "architecture": "arm64",
            "logicalCpu": 8,
            "physicalMemoryBytes": 16_000_000_000,
            "projectDisk": {"totalBytes": 1_000_000_000, "usedBytes": 500_000_000, "freeBytes": 500_000_000},
        },
        "tools": {},
        "environment": {"count": 0, "categories": {}, "namesCollected": False, "valuesCollected": False},
        "claude": {
            "appVersions": [],
            "settings": [{
                "exists": True,
                "validJsonObject": True,
                "safeScalars": {"modelFamily": "sonnet", "effort": "high"},
                "enabledPlugins": {},
                "hooks": [],
                "modelSettings": {"count": 0, "effortCounts": {}},
            }],
            "claudeJson": {"globalMcpServers": [], "targetProject": {"mcpServers": []}},
            "instructions": {"entries": [], "logicalFiles": 0, "uniqueFiles": 0, "uniqueBytes": 0, "uniqueApproxTokens": 0},
            "skills": {
                "logicalEntries": multiplier,
                "countsBySource": {"claude-user": multiplier},
                "uniqueContentHashes": multiplier,
                "uniqueRealPaths": multiplier,
                "symlinkedEntries": 0,
                "autoVisibleEntries": multiplier,
                "claudeCatalogEntries": multiplier,
                "crossAgentOnlyEntries": 0,
                "manualOnlyEntries": 0,
                "forkedContextEntries": 0,
                "catalogDescriptionChars": 100 * multiplier,
                "catalogApproxTokens": 25 * multiplier,
                "logicalBodyBytes": 400 * multiplier,
                "uniqueBodyBytes": 400 * multiplier,
                "duplicateNames": [],
                "duplicateContent": [],
                "duplicateRealPaths": [],
                "entries": [],
            },
            "plugins": {"installations": [], "duplicates": []},
            "mcpConfigs": [],
            "commandsAndAgents": {},
        },
        "codex": {"modelFamily": "other", "reasoningEffort": "high", "mcpServerCount": 0},
        "workspace": {
            "repositoriesDiscovered": 1,
            "worktrees": {
                "repositoryGroups": 1,
                "totalWorktrees": multiplier,
                "groupsOverThree": 0,
                "prunableWorktrees": 0,
                "missingWorktrees": 0,
                "groups": [{"worktreeCount": multiplier, "worktrees": []}],
            },
        },
        "runtime": {
            "processes": {
                "available": True,
                "aggregates": {key: deepcopy(aggregate) for key, _ in PROCESS_CLASSES},
                "topology": {"agentLikeProcesses": multiplier, "maxRelevantChildrenPerAgent": multiplier, "relevantProcessCount": multiplier},
                "rawProcessIdentifiersEmitted": False,
                "commandLinesRead": False,
            },
            "storage": {"paths": [], "coworkExtensionCount": 0, "coworkExtensionRefs": []},
            "benchmarks": {
                key: {"samplesMs": [100.0 * multiplier] * 5, "medianMs": 100.0 * multiplier, "maxMs": 100.0 * multiplier, "exitCodes": [0] * 5}
                for key, _ in BENCHMARKS
            },
        },
        "observations": [],
    }


def run_self_test() -> None:
    baseline = _self_test_fixture()
    candidate = _self_test_fixture(candidate=True)
    if validate_report(baseline) or validate_report(candidate):
        raise ComparisonError("SELF_TEST_VALIDATION")
    unsafe = deepcopy(baseline)
    unsafe["prompt"] = "private-content"
    if "FORBIDDEN_KEY" not in validate_report(unsafe):
        raise ComparisonError("SELF_TEST_PRIVACY_REJECTION")
    invalid_schema = deepcopy(baseline)
    invalid_schema["schemaVersion"] = "9.0.0"
    if "UNSUPPORTED_SCHEMA_VERSION" not in validate_report(invalid_schema):
        raise ComparisonError("SELF_TEST_SCHEMA_REJECTION")
    invalid_privacy = deepcopy(baseline)
    invalid_privacy["privacy"]["redacted"] = False
    if "REDACTED_REPORT_REQUIRED" not in validate_report(invalid_privacy):
        raise ComparisonError("SELF_TEST_PRIVACY_FLAGS")
    markdown = render_comparison(baseline, candidate)
    for required in ("Skills lógicas", "SAFE", "FULL", "NO_SKILLS", "NO_MCP"):
        if required not in markdown:
            raise ComparisonError("SELF_TEST_RENDER")
    if OPAQUE_REF_PATTERN.search(markdown):
        raise ComparisonError("SELF_TEST_OUTPUT_PRIVACY")
    with tempfile.TemporaryDirectory() as temporary_directory:
        output = Path(temporary_directory) / "comparison.md"
        atomic_write_private(output, markdown)
        if stat.S_IMODE(output.stat().st_mode) != 0o600:
            raise ComparisonError("SELF_TEST_MODE")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", help="Relatório JSON redigido de base")
    parser.add_argument("--candidate", help="Relatório JSON redigido candidato")
    parser.add_argument("--output", help="Arquivo Markdown privado de saída")
    parser.add_argument("--self-test", action="store_true", help="Executar teste interno sem dados reais")
    args = parser.parse_args(argv)
    if args.self_test:
        if any((args.baseline, args.candidate, args.output)):
            parser.error("--self-test não aceita outros argumentos")
        return args
    if not all((args.baseline, args.candidate, args.output)):
        parser.error("--baseline, --candidate e --output são obrigatórios")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        if args.self_test:
            run_self_test()
            print("SELF-TEST OK")
            return 0
        baseline_path = Path(args.baseline).expanduser()
        candidate_path = Path(args.candidate).expanduser()
        output_path = Path(args.output).expanduser()
        output_resolved = output_path.resolve(strict=False)
        if output_resolved in {baseline_path.resolve(strict=False), candidate_path.resolve(strict=False)}:
            raise ComparisonError("OUTPUT_MUST_DIFFER_FROM_INPUTS")
        baseline = load_report(baseline_path, "baseline")
        candidate = load_report(candidate_path, "candidate")
        markdown = render_comparison(baseline, candidate)
        atomic_write_private(output_path, markdown)
        print("OK: relatório comparativo privado gravado")
        return 0
    except ComparisonError as error:
        print(f"ERRO: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
