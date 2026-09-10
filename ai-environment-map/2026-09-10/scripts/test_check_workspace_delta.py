#!/usr/bin/env python3
"""Regression tests for the workspace delta gate."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


MODULE_PATH = Path(__file__).with_name("check_workspace_delta.py")
SPEC = importlib.util.spec_from_file_location("check_workspace_delta", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("cannot import workspace delta gate")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class WorkspaceDeltaTests(unittest.TestCase):
    def test_missing_process_inventory_fails_closed(self) -> None:
        before = {"worktreeCount": 1, "processClasses": None}
        current = {"worktreeCount": 1, "processClasses": None}
        report = MODULE.compare_snapshots(before, current)
        self.assertEqual(report["gate"], "fail")
        self.assertIn("browser", report["violations"])
        self.assertIn("testOrDev", report["violations"])

    def test_unchanged_observed_workspace_passes(self) -> None:
        processes = {"browser": 1, "testOrDev": 0, "nodeRuntime": 2, "claude": 1}
        before = {"worktreeCount": 2, "processClasses": processes}
        current = {"worktreeCount": 2, "processClasses": dict(processes)}
        report = MODULE.compare_snapshots(before, current)
        self.assertEqual(report["gate"], "pass")
        self.assertEqual(report["violations"], [])

    def test_cli_check_returns_gate_status_without_traceback(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            project = root / "project"
            project.mkdir()
            subprocess.run(["git", "init", "-q"], cwd=project, check=True)
            before = root / "before.json"
            created = subprocess.run(
                [
                    sys.executable,
                    str(MODULE_PATH),
                    "snapshot",
                    "--project",
                    str(project),
                    "--output",
                    str(before),
                ],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            self.assertEqual(created.returncode, 0, created.stderr)
            checked = subprocess.run(
                [
                    sys.executable,
                    str(MODULE_PATH),
                    "check",
                    "--project",
                    str(project),
                    "--before",
                    str(before),
                ],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            self.assertIn(checked.returncode, (0, 3), checked.stderr)
            self.assertNotIn("Traceback", checked.stderr)
            self.assertIn(json.loads(checked.stdout)["gate"], ("pass", "fail"))


if __name__ == "__main__":
    unittest.main()
