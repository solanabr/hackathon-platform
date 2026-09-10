# Runbook de remediação para Laura

O objetivo é descobrir por que tarefas simples levam 20–40 minutos sem criar outra tarefa de 40 minutos. Cada etapa usa uma sessão nova, sem delegação. Os resultados ficam fora do checkout.

## Perfil mínimo durante o diagnóstico

- um líder, zero subagentes;
- zero worktrees para tarefa somente leitura;
- zero browser, dev server ou suíte até o teste pedir;
- modelo Sonnet e effort medium para triagem;
- nenhuma sessão retomada;
- nenhuma mudança de configuração antes da medida inicial.

## Etapa 0 — coleta determinística

Feche sessões antigas, watchers e browsers do projeto que não façam parte do teste. Em um terminal humano:

```bash
umask 077
export AI_DIAG_OUT="$HOME/.local/state/claude-latency-lab/2026-09-10"
mkdir -p "$AI_DIAG_OUT"
cd /caminho/para/hackathon-platform/ai-environment-map/2026-09-10

python3 scripts/collect_ai_environment.py --self-test
python3 scripts/validate_redacted_report.py --self-test
python3 scripts/benchmark_claude_modes.py --self-test
python3 scripts/benchmark_claude_modes.py --check-capabilities

python3 scripts/collect_ai_environment.py \
  --subject laura \
  --project "/caminho/local/do/projeto" \
  --repository "/caminho/local/do/projeto" \
  --output "$AI_DIAG_OUT/laura-fast.redacted.json"

python3 scripts/validate_redacted_report.py \
  "$AI_DIAG_OUT/laura-fast.redacted.json"
```

Não use `--active-benchmarks`, `--include-cache-sizes` ou `--include-storage-sizes` nesta etapa. A primeira opção executa `.zshrc`; as outras fazem varreduras recursivas.

Pare a sessão após interpretar somente métricas agregadas: versões, settings efetivos, skills, plugins, hooks, MCPs, worktrees e processos.

## Etapa 1 — smoke A/B

Abra outra sessão. Tire um snapshot antes e execute uma única amostra por modo, com timeout de 60 segundos. Isso faz chamadas pagas somente após `--confirm-paid-calls`.

```bash
python3 scripts/check_workspace_delta.py snapshot \
  --project "/caminho/local/do/projeto" \
  --output "$AI_DIAG_OUT/before.json"

python3 scripts/benchmark_claude_modes.py \
  --project "/caminho/local/do/projeto" \
  --output "$AI_DIAG_OUT/startup-smoke.redacted.json" \
  --model sonnet --effort medium --samples 1 --timeout-seconds 60 \
  --probe startup --confirm-paid-calls

python3 scripts/check_workspace_delta.py check \
  --project "/caminho/local/do/projeto" \
  --before "$AI_DIAG_OUT/before.json"
```

Se qualquer modo falhar, pare e classifique o erro; timeout e teto de custo não contam como latência válida. Se todos passarem, repita em outra janela com três amostras. Só calcule p95 com ao menos 20 amostras válidas.

## Etapa 2 — uma hipótese por sessão

Priorize pelo delta observado:

1. FULL lento e SAFE rápido: customização; separar skills, hooks, plugins, MCP e instruções.
2. NO_SKILLS rápido: reduzir catálogo e tornar comandos manuais.
3. NO_MCP rápido: desabilitar duplicatas/servidores ociosos por escopo.
4. Todos lentos, tool-read pior: watchers, browsers, testes, disco e I/O do projeto.
5. Todos lentos, startup também: modelo/effort, fila/serviço, autenticação ou wrapper local.

Antes de cada mudança, rode o script correspondente sem `--apply`. Aplique uma mudança, reinicie a sessão e repita a mesma sonda. Registre arquivo, campos, motivo, métrica esperada e rollback. Não copie os paths, aliases, trust entries ou seleção de skills do Felix.

## Critério de aceite

Uma correção só entra como persistente depois de cinco amostras estáveis em duas janelas, mesmo hash de benchmark, mesma versão do Claude, mesmo modelo/effort e nenhum aumento de worktrees/browser/test runner no gate. Segurança, scanner de segredos e testes focais continuam ativos.
