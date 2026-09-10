#!/usr/bin/env python3
"""Audit or make personal Claude slash commands manual-only."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import tempfile


HOME = Path.home().resolve()
COMMANDS = HOME / ".claude" / "commands"
BACKUP_ROOT = HOME / ".config" / "ai-maintenance" / "backups"
DESCRIPTIONS = {
    "cria-prd": "Cria um PRD após perguntas de esclarecimento",
    "cria-techspec": "Cria uma especificação técnica a partir de um PRD",
    "criar-tasks": "Cria tarefas incrementais a partir de PRD e especificação",
    "deploy": "Executa checklist manual de deploy",
    "refactor": "Refatora manualmente o escopo informado",
    "review": "Revisa manualmente o código informado",
    "security-scan": "Executa auditoria defensiva manual no escopo informado",
    "test": "Gera testes manualmente para o escopo informado",
}


def harden(text: str, stem: str) -> str:
    lines = text.splitlines()
    if lines and lines[0] == "---":
        try:
            closing = lines.index("---", 1)
        except ValueError as exc:
            raise ValueError(f"frontmatter sem fechamento: {stem}") from exc
        keys = [
            index
            for index in range(1, closing)
            if lines[index].strip().startswith("disable-model-invocation:")
        ]
        if len(keys) > 1:
            raise ValueError(f"duplicate disable-model-invocation keys: {stem}")
        if keys:
            lines[keys[0]] = "disable-model-invocation: true"
            return "\n".join(lines) + "\n"
        lines.insert(closing, "disable-model-invocation: true")
        return "\n".join(lines) + "\n"
    description = DESCRIPTIONS.get(stem, f"Executa manualmente o comando {stem}")
    return (
        "---\n"
        f"description: {description}\n"
        "disable-model-invocation: true\n"
        "---\n\n"
        + text.lstrip("\n")
    )


def atomic_write(path: Path, text: str) -> None:
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(fd, path.stat().st_mode & 0o777)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Preview by default; pass --apply to write protected backups and changes."
    )
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--commands-dir", type=Path, default=COMMANDS)
    parser.add_argument("--command", action="append", default=[])
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    commands = args.commands_dir.expanduser().resolve(strict=True)
    if args.apply and not (args.command or args.all):
        parser.error("--apply requires one or more --command NAME values, or --all")
    if args.command and args.all:
        parser.error("choose explicit --command values or --all")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = BACKUP_ROOT / f"{stamp}-claude-commands"
    inventory = sorted(commands.glob("*.md"))
    if args.command:
        selected = {f"{name.removesuffix('.md')}.md" for name in args.command}
        inventory = [path for path in inventory if path.name in selected]
        missing = selected - {path.name for path in inventory}
        if missing:
            parser.error(f"commands not found: {', '.join(sorted(missing))}")
    plans: list[tuple[Path, str, str]] = []
    for path in inventory:
        original = path.read_text(encoding="utf-8")
        updated = harden(original, path.stem)
        if updated == original:
            continue
        plans.append((path, original, updated))
    if args.apply and plans:
        backup.mkdir(parents=True, exist_ok=False, mode=0o700)
        backup.chmod(0o700)
        for path, _, _ in plans:
            target = backup / path.name
            shutil.copy2(path, target)
            target.chmod(0o600)
        for path, _, updated in plans:
            atomic_write(path, updated)
    print(
        json.dumps(
            {
                "apply": args.apply,
                "candidateFiles": [path.name for path, _, _ in plans],
                "count": len(plans),
                "backup": str(backup) if args.apply and plans else None,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
