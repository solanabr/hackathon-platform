# Mapa técnico do ambiente de IA — Felix × Laura

Este pacote transforma a lentidão de 20–40 minutos em uma comparação reproduzível. Ele registra a configuração estrutural do Claude Code/Desktop/Cowork, o peso de skills e instruções, hooks, plugins, MCPs, worktrees, processos e tempos locais. Ele não lê conversas, histórico, código do projeto, valores de ambiente, tokens, Keychain ou argumentos de processos. O benchmark envia somente os dois prompts sintéticos públicos declarados no próprio script e descarta o conteúdo retornado.

O diagnóstico atual é um **baseline**, não uma certificação e ainda não prova a causa no computador da Laura. O baseline do Felix também é pesado; ele serve para comparar mecanismos e medidas, não como configuração a copiar.

Por segurança, o coletor compartilhável não atravessa diretórios por symlink. O baseline detalhado reconcilia essa contagem conservadora com o inventário forense local e a telemetria de runtime.

## Arquivos

- `EXECUTIVE-SUMMARY.md`: leitura de 20 linhas com os fatos e o próximo passo.
- `FELIX-BASELINE-ANALYSIS.md`: catálogo técnico e interpretação das medições do Felix.
- `LAURA-COWORK-RUNBOOK.md`: coleta, testes A/B e árvore de decisão para a Laura.
- `FANOUT-WORKTREE-POLICY.md`: limites operacionais para agentes, worktrees, browsers, watchers e testes.
- `LAURA-COPY-PASTE.md`: handoff pronto para o Claude Cowork da Laura.
- `FIELD-SCHEMA.md`: contrato de privacidade e significado dos campos.
- `scripts/collect_ai_environment.py`: coletor local, por allowlist e sem rede.
- `scripts/benchmark_claude_modes.py`: microsondas FULL/SAFE/NO_SKILLS/NO_MCP; faz chamadas ao modelo somente quando Laura o executa explicitamente.
- `scripts/compare_ai_environments.py`: comparação Felix × Laura e relatório em Markdown.
- `scripts/validate_redacted_report.py`: validação independente do relatório compartilhável.
- `evidence/felix-ai-environment.redacted.json`: baseline redigido do Felix.
- `evidence/FELIX-MANUAL-OBSERVATIONS.redacted.json`: telemetria e snapshots agregados do Felix.
- `evidence/LAURA-MANUAL-OBSERVATIONS.template.json`: formulário numérico, sem texto livre.

## Ordem de execução

1. Laura lê `FIELD-SCHEMA.md` e copia esta pasta para um diretório local que não seja sincronizado.
2. Ela executa o coletor com o repositório visual relevante e cada repositório adicional explicitamente informado.
3. Ela valida o JSON antes de compartilhar.
4. Ela executa os A/B do runbook com a mesma conta, modelo, effort, tarefa e rede.
5. Ela preenche apenas números e enums no formulário manual.
6. O comparador gera o delta entre os dois ambientes.
7. O Cowork propõe mudanças uma camada por vez e repete os mesmos testes.

O coletor não procura repositórios pelo disco. Cada `--repository` é informado pela própria operadora; isso evita varrer pastas pessoais.

## Coleta segura no computador da Laura

Use Python 3.11 ou mais recente. O exemplo abaixo deve ser adaptado localmente com o caminho do projeto. O caminho só existe no comando local; o relatório guarda um HMAC.

```bash
cd ai-environment-map/2026-09-10
python3 scripts/collect_ai_environment.py \
  --subject laura \
  --project "/caminho/local/do/projeto" \
  --repository "/caminho/local/do/projeto" \
  --active-benchmarks \
  --include-cache-sizes \
  --output evidence/laura-ai-environment.redacted.json

python3 scripts/validate_redacted_report.py \
  evidence/laura-ai-environment.redacted.json
```

Sem `AI_ENV_MAP_PAIRING_KEY`, o coletor cria uma chave efêmera: contagens continuam comparáveis, mas fingerprints entre máquinas não. Para comparar fingerprints, Felix e Laura definem a mesma frase longa somente nos terminais locais, sem gravá-la em arquivo, conversa ou relatório:

```bash
read -s AI_ENV_MAP_PAIRING_KEY
export AI_ENV_MAP_PAIRING_KEY
# executar o coletor
unset AI_ENV_MAP_PAIRING_KEY
```

O baseline incluído foi produzido em modo efêmero. Ele já compara todas as métricas agregadas. Se for necessário provar que um mesmo plugin/skill aparece nas duas máquinas, Felix deve rerodar o baseline na mesma janela de pareamento usada pela Laura; a frase não entra no pacote.

O relatório é escrito com modo `0600`. Se o DLP interno detectar path absoluto, URL, e-mail, IP, UUID de sessão, credencial ou chave proibida, o coletor falha antes de escrever.

## Comparação

```bash
python3 scripts/compare_ai_environments.py \
  --baseline evidence/felix-ai-environment.redacted.json \
  --candidate evidence/laura-ai-environment.redacted.json \
  --output evidence/comparison-felix-laura.md
```

Um delta mostra associação, não causalidade. A causa só ganha confiança quando uma única camada é retirada e o mesmo teste fica repetidamente mais rápido.

## Condições mínimas do teste

- Mesmo commit e mesma tarefa pública/sintética.
- Mesmo modelo e mesmo effort em todas as variantes.
- Três amostras intercaladas na triagem e cinco em duas baterias de confirmação; registrar mediana, MAD, mínimo, máximo e timeouts. Calcular p95 somente com pelo menos 20 amostras válidas.
- Nenhuma sessão retomada.
- Nenhum outro agente ou teste iniciado durante a bateria.
- Contar agentes, worktrees, watchers, browsers e processos antes e depois.
- Descartar o texto retornado pelo modelo; guardar somente tempos, eventos e tokens.
- Não usar `--debug`, porque logs podem conter prompts, paths e tool inputs.

## O que este pacote não faz

- Não lê nem publica conversas ou sessões.
- Não mata processos, remove caches, worktrees ou branches.
- Não desliga o scanner de segredos para melhorar benchmark.
- Não copia settings do Felix para Laura.
- Não conclui que RAM baixa ou skills são a causa antes dos A/B.

## Fontes oficiais consultadas

- [Settings e precedência](https://code.claude.com/docs/en/settings)
- [Hooks](https://code.claude.com/docs/en/hooks-guide)
- [Modelos e effort](https://code.claude.com/docs/en/model-config)
- [Skills e contexto](https://code.claude.com/docs/en/slash-commands)
- [CLI do Claude Code](https://code.claude.com/docs/en/cli-usage)
- [Subagentes](https://code.claude.com/docs/en/agents)
- [Worktrees](https://code.claude.com/docs/en/worktrees)
