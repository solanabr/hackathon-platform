# Handoff pronto para o Claude Cowork da Laura

Cole o bloco abaixo numa sessão **nova** do Cowork, aberta na pasta `ai-environment-map/2026-09-10`. Substitua apenas o path do projeto no marcador indicado.

```text
Você está diagnosticando uma lentidão anormal: tarefas básicas levam 20–40 minutos. Trabalhe diretamente nesta sessão. Não delegue, não crie subagentes, agent teams ou worktrees, não abra browser e não rode suíte do projeto durante a fase de diagnóstico.

Objetivo: comparar meu ambiente com o baseline redigido do Felix e localizar, com testes A/B, a camada que produz a lentidão. Não copie a configuração do Felix; ela também é deliberadamente pesada.

Leia primeiro, nesta ordem:
1. README.md
2. FIELD-SCHEMA.md
3. LAURA-COWORK-RUNBOOK.md

Use FELIX-BASELINE-ANALYSIS.md e FANOUT-WORKTREE-POLICY.md como referências consultadas por seção depois da coleta. Não carregue os dois documentos inteiros antes da primeira microsonda; estamos medindo justamente o custo de contexto amplo. Antes do teste de fan-out, leia as invariantes e quotas da política.

Restrições de privacidade:
- nunca leia nem exporte conversa, JSONL, sessão, tarefa, memória, histórico de shell ou Keychain;
- nunca mostre valores de env, tokens, headers, URLs, paths, branches, commits, PIDs ou command lines;
- não use --debug;
- não cole saída bruta de /status, /context, /agents, /mcp, /hooks ou /doctor;
- use somente contagens, enums, tempos e referências HMAC do schema;
- se o validador falhar, não compartilhe o arquivo.

Fase 1 — diagnóstico sem alterações:
1. Execute os self-tests de collect_ai_environment.py, validate_redacted_report.py, benchmark_claude_modes.py e compare_ai_environments.py quando disponíveis. Depois execute `python3 scripts/benchmark_claude_modes.py --check-capabilities`; essa checagem não faz chamada ao modelo e não exige confirmação paga.
2. Execute collect_ai_environment.py com:
   subject=laura
   project=[PATH_LOCAL_DO_PROJETO]
   repository=[PATH_LOCAL_DO_PROJETO]
   active-benchmarks=true
   include-cache-sizes=true
   output=evidence/laura-ai-environment.redacted.json
3. Valide o relatório com validate_redacted_report.py. Pare a exportação se houver qualquer falha de DLP.
4. Preencha uma cópia de evidence/LAURA-MANUAL-OBSERVATIONS.template.json somente com números e enums. Não invente métrica indisponível.
5. O benchmark faz chamadas reais e pagas. Peça à operadora para iniciar cada bateria com `--confirm-paid-calls`; silêncio não é confirmação. Antes disso, confirme por inventário que os hooks do modo FULL pertencem ao ambiente, não têm efeito externo e são aceitáveis num projeto controlado sem dados de cliente. Faça primeiro uma amostra de `startup`, timeout 60 s, nos quatro modos. Só se todos os resultados forem estruturados e válidos, amplie para três amostras intercaladas, timeout 120 s. Depois siga a mesma progressão para `tool-read`. O script deve descartar conteúdo do modelo e não persistir sessão.
6. Compare FULL, SAFE, NO_SKILLS e NO_MCP. Se necessário, faça uma bateria separada com USER_ONLY, PROJECT_ONLY e LOCAL_ONLY, começando por uma amostra. Não conte timeout, erro de protocolo ou teto de custo como sucesso/latência normal.
7. Trate startup e tool-read como microsondas. Depois de localizar a camada suspeita, execute uma fixture E2E visual pequena com o mesmo aceite funcional, primeiro sem delegação e depois no perfil atual. Não repita a suíte por subagente.
8. Execute compare_ai_environments.py entre o baseline Felix e o relatório Laura.
9. Gere evidence/LAURA-DIAGNOSTICO.md com: fatos medidos, diferenças, hipóteses em ordem, força da evidência, evidência que falta e teste que confirma/refuta cada hipótese. Não afirme causalidade por correlação.

Meça explicitamente a explosão relatada:
- agentes por workflow, simultâneos e totais;
- maior profundidade de delegação;
- worktrees antes/depois de uma tarefa mínima;
- escritores por worktree;
- watchers, browsers lógicos, test runners e dev servers;
- recursos ainda vivos depois do dono terminar;
- tokens de cache, compactações, tool calls e duração.

Uma tarefa somente leitura deve falhar no gate se criar worktree, browser, suíte ou subagente. Claude Code 2.1.263 pode permitir delegação recursiva; neste laboratório a profundidade máxima é 1 e o teto por host é o cap definido em FANOUT-WORKTREE-POLICY.md. Mantenha esta sessão de Cowork como orquestrador sem delegação; execute a variante de fan-out numa sessão-alvo separada e controlada, depois volte apenas com métricas agregadas.

Não altere configuração durante a Fase 1. Entregue o diagnóstico completo antes da remediação.

Fase 2 — correções persistentes, somente após o diagnóstico:
1. Proponha a menor mudança capaz de testar a hipótese principal.
2. Faça backup local protegido da configuração que será alterada; não mostre seu conteúdo.
3. Aplique uma camada por vez e registre arquivo, campo, motivo, rollback e métrica esperada.
4. Para tarefas rotineiras, prefira Sonnet/medium; deixe Opus/xhigh/1M sob acionamento explícito.
5. Torne manuais as skills que não precisam de seleção automática e elimine sobreposição de mesma skill entre diretório e plugin.
6. Limite design a um líder e um crítico, profundidade 1; nenhuma tarefa básica cria worktree.
7. Centralize testes: teste focal durante edição e suíte completa uma vez após integração.
8. Consolide plugin/MCP duplicado somente depois de provar qual escopo é efetivo.
9. Se o scanner de segredos estiver lento, reimplemente em processo único com testes diferenciais, mesmo conjunto de regras, fail-closed e orçamento p95. Nunca o desligue, não reduza cobertura e não crie allowlist para esconder latência.
10. Não use bypass de permissões. Não mate processos desconhecidos. Não apague cache, worktree, branch, sessão ou VM automaticamente; produza candidatos para decisão humana.
11. Repita exatamente os benchmarks e compare mediana, MAD, mínimo, máximo, timeouts, tokens, tool calls, fan-out e recursos residuais. Calcule p95 somente com pelo menos 20 amostras válidas.
12. Só aceite uma correção após cinco amostras estáveis em dois momentos distintos e sem regressão de segurança.

Entregáveis finais:
- evidence/LAURA-DIAGNOSTICO.md
- evidence/laura-ai-environment.redacted.json validado
- evidence/laura-ab-startup.redacted.json
- evidence/laura-ab-read.redacted.json
- evidence/comparison-felix-laura.md
- evidence/LAURA-REMEDIATION-REPORT.md, contendo mudanças, rollback e medidas antes/depois

Se precisar de informação da operadora, faça uma única pergunta objetiva e continue todo trabalho independente enquanto aguarda.
```

## Resultado esperado

O Cowork deve devolver evidência comparável e uma remediação por camadas. “Máquina rápida”, “RAM livre”, “skills demais” ou “modelo lento” sem A/B não encerram o diagnóstico.
