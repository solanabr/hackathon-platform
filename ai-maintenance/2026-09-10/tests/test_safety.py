#!/usr/bin/env python3
"""Regression tests for dry-run and destructive-operation guardrails."""

from __future__ import annotations

import json
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"


class SafetyTests(unittest.TestCase):
    @staticmethod
    def load_script_module(name: str):
        path = SCRIPTS / name
        spec = importlib.util.spec_from_file_location(path.stem, path)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"cannot import {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def run_script(
        self, home: Path, name: str, *args: str, path: str | None = None
    ) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment["HOME"] = str(home)
        if path is not None:
            environment["PATH"] = path
        return subprocess.run(
            [sys.executable, str(SCRIPTS / name), *args],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
            check=False,
        )

    def test_claude_normalizer_is_dry_run(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            root = home / ".claude"
            root.mkdir()
            settings = root / "settings.json"
            settings.write_text('{"model":"opus[1m]","effortLevel":"xhigh"}\n')
            (root / "settings.local.json").write_text(
                '{"permissions":{"allow":["Read"]}}\n'
            )
            before = settings.read_bytes()
            result = self.run_script(home, "normalize_ai_config.py")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(settings.read_bytes(), before)
            self.assertFalse(json.loads(result.stdout)["apply"])
            applied = self.run_script(home, "normalize_ai_config.py", "--apply")
            self.assertEqual(applied.returncode, 0, applied.stderr)
            after = json.loads(settings.read_text())
            self.assertEqual(after["model"], "opus[1m]")
            self.assertEqual(after["effortLevel"], "xhigh")
            self.assertFalse(after["skipAutoPermissionPrompt"])

    def test_codex_normalizer_is_dry_run(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            root = home / ".codex"
            root.mkdir()
            config = root / "config.toml"
            config.write_text('model_reasoning_effort = "xhigh"\n')
            before = config.read_bytes()
            result = self.run_script(home, "normalize_codex_config.py")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(config.read_bytes(), before)

    def test_command_hardener_requires_selection_and_changes_false(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            commands = home / ".claude" / "commands"
            commands.mkdir(parents=True)
            command = commands / "review.md"
            command.write_text(
                "---\ndescription: review\ndisable-model-invocation: false\n---\nbody\n"
            )
            preview = self.run_script(home, "harden_claude_commands.py")
            self.assertEqual(preview.returncode, 0, preview.stderr)
            self.assertIn("false", command.read_text())
            refused = self.run_script(home, "harden_claude_commands.py", "--apply")
            self.assertNotEqual(refused.returncode, 0)
            applied = self.run_script(
                home, "harden_claude_commands.py", "--apply", "--command", "review"
            )
            self.assertEqual(applied.returncode, 0, applied.stderr)
            self.assertIn("disable-model-invocation: true", command.read_text())

    def test_command_hardener_rejects_duplicate_key(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            commands = home / ".claude" / "commands"
            commands.mkdir(parents=True)
            command = commands / "review.md"
            original = (
                "---\ndisable-model-invocation: true\n"
                "disable-model-invocation: false\n---\nbody\n"
            )
            command.write_text(original)
            result = self.run_script(home, "harden_claude_commands.py")
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(command.read_text(), original)

    def test_derived_path_symlink_is_refused(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            target = home / "target"
            target.mkdir()
            link = home / "node_modules"
            link.symlink_to(target, target_is_directory=True)
            result = self.run_script(home, "prune_derived_paths.py", str(link))
            self.assertEqual(result.returncode, 0, result.stderr)
            item = json.loads(result.stdout)["items"][0]
            self.assertFalse(item["safe"])
            self.assertIn("symlink_component", item["reasons"])

    def test_derived_path_is_refused_when_project_cwd_is_active(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            project = home / "project"
            target = project / "node_modules"
            target.mkdir(parents=True)
            sleeper = subprocess.Popen(["/bin/sleep", "5"], cwd=project)
            try:
                result = self.run_script(home, "prune_derived_paths.py", str(target))
                self.assertEqual(result.returncode, 0, result.stderr)
                item = json.loads(result.stdout)["items"][0]
                self.assertFalse(item["safe"])
                self.assertIn("process_cwd", item["reasons"])
            finally:
                sleeper.terminate()
                sleeper.wait(timeout=5)

    def test_nested_active_plugin_path_is_preserved(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            cache = home / ".claude" / "plugins" / "cache" / "market" / "plugin"
            active = cache / "v2"
            stale = cache / "v1"
            (active / "nested").mkdir(parents=True)
            stale.mkdir(parents=True)
            registry = home / ".claude" / "plugins" / "installed_plugins.json"
            registry.parent.mkdir(parents=True, exist_ok=True)
            registry.write_text(
                json.dumps(
                    {"plugins": {"plugin": [{"installPath": str(active / "nested")}]}},
                )
            )
            result = self.run_script(home, "prune_claude_plugin_cache.py")
            self.assertEqual(result.returncode, 0, result.stderr)
            paths = json.loads(result.stdout)["paths"]
            self.assertEqual(paths, ["market/plugin/v1"])

    def test_redactor_fails_closed_without_lsof(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            history = home / ".claude" / "history.jsonl"
            history.parent.mkdir()
            canary = "".join(("sk-", "proj-", "abcdefghijklmnopqrstuvwxyz"))
            history.write_text(json.dumps({"token": canary}) + "\n")
            before = history.read_bytes()
            result = self.run_script(
                home,
                "redact_local_ai_secrets.py",
                "--apply",
                str(history),
                path=str(home / "empty-path"),
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(history.read_bytes(), before)

    def test_redactor_preflight_prevents_partial_write(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            histories = home / ".claude" / "projects"
            histories.mkdir(parents=True)
            canary = "".join(("sk-", "proj-", "abcdefghijklmnopqrstuvwxyz"))
            opened = histories / "open.jsonl"
            closed = histories / "closed.jsonl"
            opened.write_text(json.dumps({"token": canary}) + "\n")
            closed.write_text(json.dumps({"token": canary}) + "\n")
            closed_before = closed.read_bytes()
            with opened.open("rb"):
                result = self.run_script(
                    home,
                    "redact_local_ai_secrets.py",
                    "--apply",
                    str(opened),
                    str(closed),
                )
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(closed.read_bytes(), closed_before)

    def test_live_redactor_preserves_append_only_suffix(self) -> None:
        module = self.load_script_module("redact_local_ai_secrets.py")
        with tempfile.TemporaryDirectory() as raw:
            history = Path(raw) / "history.jsonl"
            canary = "".join(("sk-", "proj-", "abcdefghijklmnopqrstuvwxyz"))
            initial = (json.dumps({"token": canary}) + "\n").encode()
            suffix = b'{"event":"later"}\n'
            history.write_bytes(initial)
            before = history.stat()
            identity = module.stat_identity(before)
            digest = hashlib.sha256(initial).digest()
            with history.open("ab") as handle:
                handle.write(suffix)
                handle.flush()
                os.fsync(handle.fileno())
            size_before_redaction = history.stat().st_size
            count, appended = module.in_place_write(
                history, identity, len(initial), digest
            )
            result = history.read_bytes()
            self.assertEqual(count, 1)
            self.assertEqual(appended, len(suffix))
            self.assertEqual(len(result), size_before_redaction)
            self.assertTrue(result.endswith(suffix))
            self.assertNotIn(canary.encode(), result)

    def test_live_redactor_rejects_changed_prefix(self) -> None:
        module = self.load_script_module("redact_local_ai_secrets.py")
        with tempfile.TemporaryDirectory() as raw:
            history = Path(raw) / "history.jsonl"
            canary = "".join(("sk-", "proj-", "abcdefghijklmnopqrstuvwxyz"))
            initial = (json.dumps({"token": canary}) + "\n").encode()
            history.write_bytes(initial)
            identity = module.stat_identity(history.stat())
            digest = hashlib.sha256(initial).digest()
            changed = bytearray(initial)
            changed[0] = ord("[")
            history.write_bytes(changed)
            with self.assertRaisesRegex(RuntimeError, "preflight prefix"):
                module.in_place_write(history, identity, len(initial), digest)

    def test_live_redactor_rejects_truncation(self) -> None:
        module = self.load_script_module("redact_local_ai_secrets.py")
        with tempfile.TemporaryDirectory() as raw:
            history = Path(raw) / "history.jsonl"
            initial = b'{"event":"complete"}\n'
            history.write_bytes(initial)
            identity = module.stat_identity(history.stat())
            digest = hashlib.sha256(initial).digest()
            history.write_bytes(initial[:-1])
            with self.assertRaisesRegex(RuntimeError, "truncated"):
                module.in_place_write(history, identity, len(initial), digest)

    def test_live_redactor_rejects_replaced_inode(self) -> None:
        module = self.load_script_module("redact_local_ai_secrets.py")
        with tempfile.TemporaryDirectory() as raw:
            history = Path(raw) / "history.jsonl"
            replacement = Path(raw) / "replacement.jsonl"
            initial = b'{"event":"complete"}\n'
            history.write_bytes(initial)
            identity = module.stat_identity(history.stat())
            digest = hashlib.sha256(initial).digest()
            replacement.write_bytes(initial)
            os.replace(replacement, history)
            with self.assertRaisesRegex(RuntimeError, "inode"):
                module.in_place_write(history, identity, len(initial), digest)

    def test_live_redactor_leaves_incomplete_record_untouched(self) -> None:
        module = self.load_script_module("redact_local_ai_secrets.py")
        with tempfile.TemporaryDirectory() as raw:
            history = Path(raw) / "history.jsonl"
            complete = b'{"event":"complete"}\n'
            canary = "".join(("sk-", "proj-", "abcdefghijklmnopqrstuvwxyz")).encode()
            partial = b'{"token":"' + canary
            history.write_bytes(complete + partial)
            identity = module.stat_identity(history.stat())
            digest = hashlib.sha256(complete).digest()
            count, appended = module.in_place_write(
                history, identity, len(complete), digest
            )
            self.assertEqual(count, 0)
            self.assertEqual(appended, len(partial))
            self.assertEqual(history.read_bytes(), complete + partial)

    def test_live_redactor_cli_requires_ack_and_preserves_open_jsonl(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            history = home / ".claude" / "history.jsonl"
            history.parent.mkdir()
            canary = "".join(("sk-", "proj-", "abcdefghijklmnopqrstuvwxyz"))
            history.write_text(json.dumps({"token": canary}) + "\n")
            original_size = history.stat().st_size
            refused = self.run_script(
                home,
                "redact_local_ai_secrets.py",
                "--apply",
                "--redact-open-in-place",
                str(history),
            )
            self.assertNotEqual(refused.returncode, 0)
            self.assertIn(canary, history.read_text())
            with history.open("rb"):
                applied = self.run_script(
                    home,
                    "redact_local_ai_secrets.py",
                    "--apply",
                    "--redact-open-in-place",
                    "--ack-live-file-risk",
                    str(history),
                )
            self.assertEqual(applied.returncode, 0, applied.stderr)
            self.assertEqual(history.stat().st_size, original_size)
            self.assertNotIn(canary, history.read_text())
            json.loads(history.read_text().splitlines()[0])

    def test_single_codex_release_has_no_rollback_error(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            standalone = home / ".codex" / "packages" / "standalone"
            release = standalone / "releases" / "0.1.0-arm64"
            release.mkdir(parents=True)
            (standalone / "current").symlink_to(release)
            result = self.run_script(home, "prune_codex_releases.py")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIsNone(json.loads(result.stdout)["rollback"])

    def test_skill_curator_plan_is_read_only_and_apply_requires_acks(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            skills = home / ".claude" / "skills"
            (skills / "physical").mkdir(parents=True)
            (skills / "physical" / "SKILL.md").write_text("---\nname: physical\n---\n")
            (skills / "linked").symlink_to(skills / "physical", target_is_directory=True)
            subprocess.run(["git", "init", "-q"], cwd=skills, check=True)
            subprocess.run(["git", "add", "."], cwd=skills, check=True)
            subprocess.run(
                [
                    "git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                    "commit", "-qm", "fixture",
                ],
                cwd=skills,
                check=True,
            )
            plan = self.run_script(
                home, "curate_claude_skills.py", "--plan", "--keep-link", "linked"
            )
            self.assertEqual(plan.returncode, 0, plan.stderr)
            self.assertIn("linked", json.loads(plan.stdout)["keptSymlinks"])
            sparse = subprocess.run(
                ["git", "config", "--bool", "core.sparseCheckout"],
                cwd=skills,
                text=True,
                stdout=subprocess.PIPE,
                check=False,
            )
            self.assertNotEqual(sparse.stdout.strip(), "true")
            refused = self.run_script(
                home, "curate_claude_skills.py", "--apply", "--keep-link", "linked"
            )
            self.assertNotEqual(refused.returncode, 0)


if __name__ == "__main__":
    unittest.main()
