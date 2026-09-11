# Manutenção do ambiente de IA — 2026-09-10

Este pacote registra a limpeza feita no Mac do Felix e oferece um roteiro seguro para a Laura. A cópia compartilhada não contém settings, históricos, tokens, backups nem outros dados pessoais. Execuções locais podem criar backups privados em `~/ai-maintenance/2026-09-10/backups/`; eles não devem ser copiados para a branch. Os scripts fazem prévia por padrão; qualquer mutação exige uma ação explícita (`--apply` ou `--restore`) e, quando o risco é maior, uma confirmação adicional.

## Ordem de leitura

1. `CLEANUP-REPORT.md`: o que existia, o que mudou e o que ficou pendente.
2. `ROTATION-REQUIRED.md`: credenciais que precisam ser substituídas fora do terminal de IA.
3. `LAURA-REMEDIATION-RUNBOOK.md`: coleta rápida, A/B e correções em sessões separadas.
4. `OWNER-ACTIONS.md`: registro e rollback das correções administrativas concluídas no Mac do Felix.
5. `owner-finish.sh`: verificação idempotente e rollback guardado dessas correções.
6. `scripts/`: utilitários defensivos e reversíveis. Laura deve executar primeiro sem `--apply`.

O baseline em `ai-environment-map/2026-09-10/evidence/felix-ai-environment.redacted.json` é um snapshot histórico anterior à limpeza. Ele serve para comparar mecanismos e não deve ser copiado como configuração.

## Regras dos scripts

- Python 3.11 ou superior.
- Saída local pode conter paths; não a cole em chats sem revisar.
- Nenhum script deve ser executado por um subagente autônomo.
- `normalize_*` altera apenas campos conservadores de modelo/effort; não mexe em trust de projetos nem em allowlist local.
- `prune_*` lista candidatos sem apagar; `--apply` só entra após revisão humana.
- Backups e registros locais ficam em `~/.config/ai-maintenance/`, nunca neste repositório.
- Históricos em uso só podem ser redigidos com aceitação explícita do risco de arquivo vivo.

## Validação do pacote

```bash
PYTHONPYCACHEPREFIX=/tmp/ai-maintenance-pyc \
  python3 -m py_compile scripts/*.py tests/*.py

python3 -m unittest discover -s tests -v

python3 scripts/normalize_ai_config.py
python3 scripts/normalize_codex_config.py
python3 scripts/harden_claude_commands.py
python3 scripts/curate_claude_skills.py --status
python3 scripts/curate_claude_skills.py --plan --from-usage
```

Esses comandos são somente prévias. A curadoria exige revisão do plano e Claude encerrado antes de aceitar `--apply`; o rollback exige `--restore`, o diretório de archive e a mesma confirmação.
