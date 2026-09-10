# Handoff em três sessões para o Claude Code da Laura

Não cole as três etapas de uma vez. Cada bloco começa numa sessão nova. Os artefatos ficam em `~/.local/state/claude-latency-lab/`, fora do Git.

## Sessão 0 — coleta rápida

```text
Diagnostique a lentidão sem alterar configuração. Não delegue, não crie subagente, worktree, browser, watcher, servidor ou suíte.

Leia apenas `LAURA-MINIMAL-PROFILE.md`. Peça à operadora o path local do projeto uma única vez. Execute os self-tests e a coleta rápida descritos na Etapa 0 de `../../ai-maintenance/2026-09-10/LAURA-REMEDIATION-RUNBOOK.md`.

Não use --active-benchmarks, --include-cache-sizes ou --include-storage-sizes. Não leia conversas, histórico, Keychain, valores de ambiente ou saída debug. Grave tudo em ~/.local/state/claude-latency-lab/2026-09-10, nunca no checkout.

Entregue somente códigos de saída e métricas agregadas: versões, contagens de settings/skills/plugins/hooks/MCP/worktrees/processos e duração total. Pare sem remediar.
```

## Sessão 1 — smoke A/B

```text
Use o relatório rápido já validado. Não delegue e não altere configuração. Leia somente a Etapa 1 de `../../ai-maintenance/2026-09-10/LAURA-REMEDIATION-RUNBOOK.md`.

Confirme que o hash do script e a versão local do Claude serão gravados. Tire o snapshot do gate, execute uma amostra startup de FULL, SAFE, NO_SKILLS e NO_MCP com Sonnet/medium e timeout 60 s, somente após autorização humana para chamadas pagas, e rode o gate final.

Classifique timeout/erro como inválido. Entregue medianas disponíveis, status por modo, tokens, tool calls, deltas de processos/worktrees e a hipótese que a próxima sessão deve testar. Pare sem remediar.
```

## Sessão 2 — uma correção

```text
Leia a hipótese principal da Sessão 1 e a Etapa 2 de `../../ai-maintenance/2026-09-10/LAURA-REMEDIATION-RUNBOOK.md`. Não delegue.

Proponha a menor alteração que isola essa hipótese. Rode qualquer script primeiro em dry-run. Mostre à operadora os arquivos/campos, o efeito esperado, o rollback e o comando que exige --apply. Após autorização, aplique somente essa camada, abra uma sessão de medição nova e repita exatamente a sonda e o gate.

Não copie settings, paths, aliases, trust entries ou seleção de skills do Felix. Não use bypass de permissões; não desligue scanner; não apague sessões, caches, branches ou worktrees sem revisão humana. Termine com antes/depois, limites da evidência e próximo teste.
```
