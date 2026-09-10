#!/usr/bin/env python3
"""Acceptance tests for the redacted AI environment comparator."""

from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


SCRIPT = Path(__file__).with_name("compare_ai_environments.py")


def aggregate(count: int, rss: int = 0, cpu: float = 0.0) -> dict[str, object]:
    return {
        "count": count,
        "rssBytes": rss,
        "cpuPercent": cpu,
        "orphanOrService": 0,
        "ageBuckets": {"lt_5m": count},
    }


def report(*, candidate: bool = False) -> dict[str, object]:
    multiplier = 2 if candidate else 1
    process_classes = {
        "claudeCli": aggregate(multiplier, 100_000_000 * multiplier, 2.0 * multiplier),
        "claudeDesktop": aggregate(1, 150_000_000, 1.0),
        "codexCli": aggregate(0),
        "codexDesktop": aggregate(0),
        "browser": aggregate(multiplier, 80_000_000 * multiplier, 3.0 * multiplier),
        "testOrDev": aggregate(multiplier, 70_000_000 * multiplier, 4.0 * multiplier),
        "node": aggregate(multiplier, 60_000_000 * multiplier, 2.0 * multiplier),
        "shell": aggregate(1, 10_000_000, 0.1),
    }
    skill_count = 4 if candidate else 2
    plugin_count = 2 if candidate else 1
    worktree_count = 3 if candidate else 1
    median = 150.0 if candidate else 100.0
    return {
        "schemaVersion": "1.0.0",
        "collectedAt": "2026-09-10T12:00:00Z",
        "collector": {
            "version": "1.0.0",
            "sha256": "a" * 64,
            "python": "3.14.0",
            "privacyPolicy": "allowlist-hmac-v1",
            "activeBenchmarks": True,
            "cacheSizes": True,
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
        "privacyValidation": {"passed": True, "failures": []},
        "run": {
            "subject": "other",
            "pairingKeyId": "pair_" + "b" * 20,
            "pairingMode": "provided",
        },
        "target": {"projectRef": "path_" + "c" * 20, "explicitRepositoryCount": 1},
        "system": {
            "os": "Darwin",
            "osRelease": "25.6.0",
            "osVersion": "15.6",
            "architecture": "arm64",
            "logicalCpu": 10,
            "python": "3.14.0",
            "physicalMemoryBytes": 32_000_000_000,
            "projectDisk": {
                "totalBytes": 1_000_000_000_000,
                "usedBytes": 600_000_000_000 + (10_000_000_000 if candidate else 0),
                "freeBytes": 400_000_000_000 - (10_000_000_000 if candidate else 0),
            },
        },
        "tools": {},
        "environment": {"count": 0, "categories": {}, "namesCollected": False, "valuesCollected": False},
        "claude": {
            "appVersions": [],
            "settings": [{
                "sourceClass": "user",
                "exists": True,
                "validJsonObject": True,
                "safeScalars": {
                    "modelFamily": "opus" if candidate else "sonnet",
                    "effort": "high" if candidate else "medium",
                },
                "enabledPlugins": {},
                "skillOverrides": {"counts": {}, "skills": {}},
                "hooks": [{
                    "event": "PreToolUse",
                    "matcherClass": "wildcard",
                    "conditionPresent": False,
                    "type": "command",
                    "timeoutSeconds": 10,
                    "async": False,
                    "commandSummary": {
                        "argumentCount": 1,
                        "commandRef": "hook_" + "d" * 20,
                        "executableClass": "shell",
                        "scriptPresent": True,
                    },
                }],
                "modelSettings": {"count": 1, "effortCounts": {"high": multiplier}},
            }],
            "claudeJson": {
                "globalMcpServers": [{
                    "serverRef": "mcp_" + "e" * 20,
                    "type": "stdio",
                    "commandPresent": True,
                    "argumentCount": 1,
                    "environmentCount": 0,
                    "headersPresent": False,
                    "authPresent": False,
                }],
                "projectCount": 1,
                "targetProject": {"known": True, "mcpServers": [], "safeBooleanKeys": {}},
            },
            "instructions": {
                "entries": [],
                "logicalFiles": multiplier,
                "uniqueFiles": multiplier,
                "logicalBytes": 1_000 * multiplier,
                "uniqueBytes": 1_000 * multiplier,
                "uniqueApproxTokens": 250 * multiplier,
            },
            "skills": {
                "logicalEntries": skill_count,
                "countsBySource": {"claude-user": skill_count},
                "uniqueContentHashes": skill_count,
                "uniqueRealPaths": skill_count,
                "symlinkedEntries": 0,
                "autoVisibleEntries": skill_count,
                "claudeCatalogEntries": skill_count,
                "crossAgentOnlyEntries": 0,
                "manualOnlyEntries": 0,
                "forkedContextEntries": 0,
                "catalogDescriptionChars": 400 * multiplier,
                "catalogApproxTokens": 100 * multiplier,
                "logicalBodyBytes": 2_000 * multiplier,
                "uniqueBodyBytes": 2_000 * multiplier,
                "duplicateNames": [],
                "duplicateContent": [],
                "duplicateRealPaths": [],
                "topDescriptions": [],
                "topBodies": [],
                "entries": [{
                    "source": "claude-user",
                    "skillRef": "skill_" + format(index, "020x"),
                    "pathRef": "path_" + format(index + 10, "020x"),
                    "realPathRef": "path_" + format(index + 20, "020x"),
                    "isSymlinked": False,
                    "bytes": 1_000,
                    "contentRef": "file_" + format(index + 30, "020x"),
                    "descriptionChars": 200,
                    "disableModelInvocation": False,
                    "userInvocable": True,
                    "context": None,
                    "model": "unknown",
                    "effort": "unknown",
                    "hasHooks": False,
                    "hasPaths": False,
                } for index in range(skill_count)],
            },
            "plugins": {
                "source": {"ref": "path_" + "f" * 20, "exists": True},
                "installations": [{
                    "pluginRef": "plugin_" + format(index, "020x"),
                    "scope": "user",
                    "version": "1.0.0",
                    "projectBound": False,
                    "installPresent": True,
                    "components": {"skills": 1, "agents": 0, "commands": 0, "hookManifests": 0, "mcpManifests": 0},
                } for index in range(plugin_count)],
                "duplicates": [],
            },
            "mcpConfigs": [{"source": {"ref": "path_" + "1" * 20, "exists": True}, "servers": []}],
            "commandsAndAgents": {},
        },
        "codex": {
            "source": {"ref": "path_" + "2" * 20, "exists": True},
            "topLevelKeyCount": 1,
            "modelFamily": "other",
            "reasoningEffort": "high",
            "mcpServerCount": multiplier,
            "profileCount": 0,
        },
        "workspace": {
            "repositoriesDiscovered": 1,
            "worktrees": {
                "repositoryGroups": 1,
                "totalWorktrees": worktree_count,
                "groupsOverThree": 0,
                "prunableWorktrees": 0,
                "missingWorktrees": 0,
                "groups": [{
                    "repositoryRef": "path_" + "3" * 20,
                    "commonGitDirRef": "path_" + "4" * 20,
                    "worktreeCount": worktree_count,
                    "worktrees": [{
                        "worktreeRef": "path_" + format(index + 40, "020x"),
                        "exists": True,
                        "headRef": "head_" + format(index + 50, "020x"),
                        "branchRef": "branch_" + format(index + 60, "020x"),
                        "detached": False,
                        "locked": False,
                        "prunable": False,
                        "caches": {"node_modules": {"exists": True, "bytes": 10_000 * multiplier}},
                    } for index in range(worktree_count)],
                }],
            },
        },
        "runtime": {
            "processes": {
                "available": True,
                "aggregates": process_classes,
                "topology": {
                    "agentLikeProcesses": multiplier,
                    "maxRelevantChildrenPerAgent": multiplier,
                    "relevantProcessCount": 5 * multiplier,
                },
                "rawProcessIdentifiersEmitted": False,
                "commandLinesRead": False,
            },
            "storage": {
                "paths": [{
                    "ref": "path_" + "5" * 20,
                    "exists": True,
                    "bytes": 1_000_000 * multiplier,
                    "files": 10 * multiplier,
                    "directories": multiplier,
                    "countTruncated": False,
                    "storageClass": "cli-projects",
                }],
                "coworkExtensionCount": multiplier,
                "coworkExtensionRefs": [],
            },
            "benchmarks": {
                "zshNoRc": {"samplesMs": [median] * 5, "medianMs": median, "maxMs": median, "exitCodes": [0] * 5},
                "zshLoginInteractive": {"samplesMs": [median * 2] * 5, "medianMs": median * 2, "maxMs": median * 2, "exitCodes": [0] * 5},
                "claudeVersion": {"samplesMs": [median * 3] * 5, "medianMs": median * 3, "maxMs": median * 3, "exitCodes": [0] * 5},
            },
        },
        "observations": [],
    }


class ComparatorAcceptanceTests(unittest.TestCase):
    def run_cli(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *arguments],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    def test_comparison_is_aggregate_portuguese_and_private(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            baseline = root / "baseline.json"
            candidate = root / "candidate.json"
            output = root / "comparison.md"
            baseline.write_text(json.dumps(report()), encoding="utf-8")
            candidate.write_text(json.dumps(report(candidate=True)), encoding="utf-8")

            completed = self.run_cli(
                "--baseline", str(baseline),
                "--candidate", str(candidate),
                "--output", str(output),
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            markdown = output.read_text(encoding="utf-8")
            for section in (
                "Validação e comparabilidade",
                "Modelo e esforço",
                "Skills",
                "Plugins e hooks",
                "Instruções e MCP",
                "Fan-out, worktrees e caches",
                "Processos por classe",
                "Storage e disco",
                "Benchmarks",
                "Hipóteses para teste",
            ):
                self.assertIn(section, markdown)
            self.assertIn("| Skills lógicas | 2 | 4 | +2 | 2,00× |", markdown)
            self.assertIn("| Catálogo Claude | 2 | 4 | +2 | 2,00× |", markdown)
            for experiment in ("SAFE", "FULL", "NO_SKILLS", "NO_MCP"):
                self.assertIn(experiment, markdown)
            forbidden = ("skill_", "plugin_", "path_", "hook_", "/Users/", temporary)
            for value in forbidden:
                self.assertNotIn(value, markdown)
                self.assertNotIn(value, completed.stdout)
                self.assertNotIn(value, completed.stderr)
            mode = stat.S_IMODE(os.stat(output).st_mode)
            self.assertEqual(mode, 0o600)

    def test_unredacted_input_is_rejected_without_echo(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            baseline = root / "baseline.json"
            candidate = root / "candidate.json"
            output = root / "comparison.md"
            unsafe = deepcopy(report())
            unsafe["prompt"] = "conteudo-que-nao-pode-ser-ecoado"
            baseline.write_text(json.dumps(unsafe), encoding="utf-8")
            candidate.write_text(json.dumps(report(candidate=True)), encoding="utf-8")

            completed = self.run_cli(
                "--baseline", str(baseline),
                "--candidate", str(candidate),
                "--output", str(output),
            )

            self.assertNotEqual(completed.returncode, 0)
            self.assertFalse(output.exists())
            combined = completed.stdout + completed.stderr
            self.assertNotIn("conteudo-que-nao-pode-ser-ecoado", combined)
            self.assertNotIn(temporary, combined)

    def test_self_test_mode(self) -> None:
        completed = self.run_cli("--self-test")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(completed.stdout.strip(), "SELF-TEST OK")

    def test_legacy_process_aggregate_names_remain_comparable(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            baseline_data = report()
            candidate_data = report(candidate=True)
            for item in (baseline_data, candidate_data):
                aggregates = item["runtime"]["processes"]["aggregates"]
                aggregates["claude"] = aggregates.pop("claudeCli")
                aggregates["codex"] = aggregates.pop("codexCli")
            baseline = root / "baseline.json"
            candidate = root / "candidate.json"
            output = root / "comparison.md"
            baseline.write_text(json.dumps(baseline_data), encoding="utf-8")
            candidate.write_text(json.dumps(candidate_data), encoding="utf-8")

            completed = self.run_cli(
                "--baseline", str(baseline),
                "--candidate", str(candidate),
                "--output", str(output),
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            markdown = output.read_text(encoding="utf-8")
            self.assertIn("| Claude CLI | 1 | 2 | +1 | 2,00× |", markdown)

    def test_unknown_cache_bytes_are_not_reported_as_zero(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            baseline_data = report()
            baseline_data["workspace"]["worktrees"]["groups"][0]["worktrees"][0]["caches"]["node_modules"]["bytes"] = None
            baseline = root / "baseline.json"
            candidate = root / "candidate.json"
            output = root / "comparison.md"
            baseline.write_text(json.dumps(baseline_data), encoding="utf-8")
            candidate.write_text(json.dumps(report(candidate=True)), encoding="utf-8")

            completed = self.run_cli(
                "--baseline", str(baseline),
                "--candidate", str(candidate),
                "--output", str(output),
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            markdown = output.read_text(encoding="utf-8")
            self.assertIn("| Bytes de cache | n/d |", markdown)

    def test_non_opaque_reference_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            unsafe = report()
            unsafe["target"]["projectRef"] = "raw-reference-value"
            baseline = root / "baseline.json"
            candidate = root / "candidate.json"
            output = root / "comparison.md"
            baseline.write_text(json.dumps(unsafe), encoding="utf-8")
            candidate.write_text(json.dumps(report(candidate=True)), encoding="utf-8")

            completed = self.run_cli(
                "--baseline", str(baseline),
                "--candidate", str(candidate),
                "--output", str(output),
            )

            self.assertNotEqual(completed.returncode, 0)
            self.assertFalse(output.exists())
            self.assertNotIn("raw-reference-value", completed.stdout + completed.stderr)

    def test_wrong_metric_type_is_rejected_by_schema_validation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            invalid = report()
            invalid["claude"]["skills"]["logicalEntries"] = "invalid-private-value"
            baseline = root / "baseline.json"
            candidate = root / "candidate.json"
            output = root / "comparison.md"
            baseline.write_text(json.dumps(invalid), encoding="utf-8")
            candidate.write_text(json.dumps(report(candidate=True)), encoding="utf-8")

            completed = self.run_cli(
                "--baseline", str(baseline),
                "--candidate", str(candidate),
                "--output", str(output),
            )

            self.assertNotEqual(completed.returncode, 0)
            self.assertFalse(output.exists())
            self.assertNotIn("invalid-private-value", completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main()
