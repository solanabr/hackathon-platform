# Runbook de diagnóstico — Claude Code/Cowork da Laura

> Use `LAURA-COPY-PASTE.md` como entrada operacional. Ele divide este material em três sessões; este documento é referência, não deve ser carregado inteiro antes da primeira coleta.

## 1. Objetivo e critério de sucesso

O objetivo é localizar a camada que transforma tarefas básicas em execuções de 20–40 minutos. O diagnóstico termina quando o mesmo teste, repetido sob condições controladas, identifica um delta estável entre duas configurações e a correção mantém os controles de segurança.

Critérios iniciais do laboratório, a calibrar com o projeto:

- tarefa de resposta mínima: nenhuma execução acima de 60 segundos;
- tarefa de leitura única: máximo abaixo de 120 segundos na bateria curta; p95 abaixo desse valor somente numa série com ao menos 20 amostras;
- razão `FULL/SAFE` abaixo de 2, com delta abaixo de 2 segundos na inicialização simples;
- nenhuma tarefa básica cria subagente ou worktree;
- design interativo inicia com um líder e no máximo um crítico;
- um escritor por worktree;
- no máximo um watcher, um test runner interativo e um browser lógico por worktree;
- nenhum processo auxiliar permanece sem dono após a sessão;
- scanner de segurança mantém equivalência de detecção e p95 abaixo de 2 segundos por evento comum.

Esses valores são metas internas, não limites oficiais da Anthropic.

## 2. O que já sabemos e o que ainda falta

No ambiente do Felix, o shell e a rede básica são rápidos. Os multiplicadores medidos são contexto grande, `opus[1m]`/`xhigh`, muitas skills selecionáveis, skills Superpowers sobrepostas, hooks síncronos, sessões grandes e fan-out. A telemetria registrou mediana de 11,5 agentes por workflow e máximo de 59. Isso prova que o mecanismo ocorre no ambiente do Felix; não prova a configuração da Laura.

O snapshot histórico usava Claude Code 2.1.263, cuja configuração permitia delegação recursiva. Valide os recursos na versão local. O limite interno deste laboratório é menor: profundidade um e `cap_maquina` de no máximo quatro.

Na captura enviada pela Laura, um turno fez leitura, quatro mudanças, TypeScript, 195 testes, lint e Playwright. O Playwright visível levou segundos; o turno já acumulava mais de nove minutos. Essa sequência é compatível com um agente que ampliou escopo e seguiu rituais de verificação. A imagem não identifica tempo de API, hooks, subagentes ou processos abandonados.

Precisamos medir na Laura:

1. versão/superfície e modelo/effort efetivos;
2. fontes de settings e instruções efetivas;
3. quantidade e seleção automática de skills;
4. plugins/MCPs/hooks ativos no `cwd` real;
5. tamanho de contexto, cache-read e compactações;
6. fan-out, profundidade de delegação e worktrees criados por tarefa;
7. watchers, browsers, dev servers e suítes concorrentes;
8. disco, swap, CPU, I/O e processos no momento do atraso;
9. tempos A/B com customizações retiradas uma camada por vez.

## 3. Congelamento do experimento

Antes da primeira coleta:

- anote o commit apenas localmente; não coloque o hash no relatório compartilhável;
- não atualize Claude, Node, plugins ou dependências entre as variantes;
- use a mesma conta, rede, modelo e effort;
- não retome uma conversa antiga;
- feche apenas atividades que a própria Laura reconhece como dispensáveis; não mate processos por padrão;
- não limpe cache, não remova worktree e não altere settings antes do baseline;
- pause outros agentes e execuções de teste durante a bateria;
- use uma tarefa pública e sintética, sem código de cliente ou dado pessoal.

Se uma alteração for inevitável, descarte a bateria e recomece. Misturar estados invalida o delta.

## 4. Coleta estática

Grave os resultados fora do checkout. Execute a coleta rápida sem shell de inicialização e sem varredura recursiva:

```bash
cd ai-environment-map/2026-09-10
umask 077
export AI_DIAG_OUT="$HOME/.local/state/claude-latency-lab/2026-09-10"
mkdir -p "$AI_DIAG_OUT"
python3 scripts/collect_ai_environment.py \
  --subject laura \
  --project "/caminho/local/do/projeto" \
  --repository "/caminho/local/do/projeto" \
  --output "$AI_DIAG_OUT/laura-ai-environment.redacted.json"

python3 scripts/validate_redacted_report.py \
  "$AI_DIAG_OUT/laura-ai-environment.redacted.json"
```

Adicione um `--repository` para cada repositório que participa do trabalho. Não passe o diretório HOME inteiro.

Resultado esperado do validador:

```json
{"valid": true, "failures": []}
```

Se falhar, não compartilhe o JSON. O código do erro indica o campo a corrigir; não cole o conteúdo que causou a falha.

## 5. Inventário manual do Cowork

Preencha uma cópia de `evidence/LAURA-MANUAL-OBSERVATIONS.template.json` usando apenas números e enums. Não cole `/status`, `/context`, `/agents`, `/mcp`, `/hooks`, `/doctor`, screenshots ou logs.

Registre separadamente:

- `surface.kind`: `claude-code-cli`, `desktop-code` ou `cowork`;
- modo de permissão: `manual`, `auto`, `skip` ou `unknown`;
- modelo: `opus`, `sonnet`, `haiku`, `other` ou `unknown`;
- effort: `low`, `medium`, `high`, `xhigh`, `max` ou `unknown`;
- quantidade de connectors somente leitura e com escrita;
- tarefas simultâneas;
- líderes, subagentes e maior profundidade;
- worktrees ativos e escritores no mesmo worktree;
- watchers, browsers lógicos e test runners;
- MCPs connected/pending/failed;
- utilização percentual do contexto e contagem de skills/tools;
- tokens de cache, compactações, tempos e timeouts.

Se a interface não oferece uma métrica, mantenha `null`. Não transforme “indisponível” em zero e não estime olhando a sensação de velocidade.

## 6. Testes A/B automáticos

Este benchmark mede **Claude Code CLI**. Ele não injeta flags no Cowork. Compare o Cowork com uma tarefa sintética equivalente e métricas manuais separadas; nunca misture os dois produtos na mesma distribuição.

O script abaixo executa chamadas reais ao Claude. A probe `startup` desliga todas as tools; `tool-read` disponibiliza somente `Read`. Cada amostra tem teto de US$ 0,10 e exige `--confirm-paid-calls`. Comece com uma amostra por modo e timeout de 60 segundos: o teto é US$ 0,40 e quatro minutos. Só amplie a bateria quando o smoke test produzir resultados estruturados válidos.

O modo `FULL` carrega as customizações normais e pode executar hooks já habilitados. Antes da bateria, confirme apenas por inventário que esses hooks pertencem ao ambiente, não têm efeito externo e são aceitáveis num projeto controlado sem dados de cliente. Não rode o benchmark num checkout de produção nem “corrija” o baseline desligando um hook silenciosamente.

Primeiro valide o parser sem rede:

```bash
python3 scripts/benchmark_claude_modes.py --self-test
python3 scripts/benchmark_claude_modes.py --check-capabilities
```

Depois rode o smoke test da tarefa mínima no projeto real:

```bash
python3 scripts/benchmark_claude_modes.py \
  --project "/caminho/local/do/projeto" \
  --model sonnet \
  --effort medium \
  --samples 1 \
  --timeout-seconds 60 \
  --probe startup \
  --confirm-paid-calls \
  --output "$AI_DIAG_OUT/laura-ab-startup-smoke.redacted.json"
```

O script testa:

| Modo | O que permanece | O que isola |
|---|---|---|
| `FULL` | configuração normal | referência |
| `SAFE` | auth, modelo, tools nativas, permissões e políticas managed | retira customizações locais como CLAUDE.md, skills, plugins, hooks, MCP e agentes |
| `NO_SKILLS` | settings, hooks, plugins e MCPs | retira skills e commands expostos pelo mesmo mecanismo |
| `NO_MCP` | settings, instruções, skills, plugins e hooks | ignora MCPs configurados |

Antes da primeira chamada, o script consulta `claude --help` e falha fechado se a versão local não anunciar todas as flags usadas. Nesse caso, registre a versão e adapte o protocolo; não substitua silenciosamente uma variante por outra.

Se os quatro modos terminarem sem `timeout`, `process-error`, `protocol-error` ou `result-error`, pare essa sessão. Em outra janela, repita `startup` com três amostras intercaladas e grave o resultado em `$AI_DIAG_OUT`. Essa triagem permite até US$ 1,20 e, com timeout de 120 segundos, até 24 minutos. Um teto de custo atingido invalida a comparação daquela amostra.

Para localizar a fonte de settings, rode depois uma bateria separada com `--include-source-modes`. Isso adiciona `USER_ONLY`, `PROJECT_ONLY` e `LOCAL_ONLY`; faça primeiro uma amostra, pois os sete modos permitem até US$ 0,70 e sete minutos com timeout de 60 segundos.

Somente depois de validar `startup`, rode primeiro uma amostra da leitura pública:

```bash
python3 scripts/benchmark_claude_modes.py \
  --project "/caminho/local/do/projeto" \
  --model sonnet \
  --effort medium \
  --samples 1 \
  --timeout-seconds 60 \
  --probe tool-read \
  --confirm-paid-calls \
  --output "$AI_DIAG_OUT/laura-ab-read-smoke.redacted.json"
```

O script cria uma fixture pública curta, limita tools a `Read`, descarta todo texto do modelo e remove a fixture ao terminar. Ele nunca grava `stdout`/`stderr` brutos. Se o smoke test for válido, repita com três amostras e grave `$AI_DIAG_OUT/laura-ab-read.redacted.json`.

`firstAssistantMs` mede o primeiro evento estruturado do assistente, não o primeiro caractere renderizado na interface. As contagens de processos são do host inteiro e servem para detectar crescimento durante a amostra; não atribuem cada processo à probe. O benchmark registra worktrees antes/depois, mas pode perder uma worktree transitória; o teste manual da seção 7 cobre fan-out e ciclo de vida.

Essas duas probes medem inicialização e uma única tool call. Elas não reproduzem a tarefa `tsc + 195 testes + lint + Playwright` e não medem qualidade de implementação. Depois de localizar a camada suspeita, crie uma fixture E2E pequena que represente o fluxo visual real e tenha o mesmo critério funcional nas variantes. Registre somente métricas agregadas; mantenha código e saída de teste no computador da Laura.

Na fixture E2E, compare primeiro um líder sem delegação e depois a configuração atual. Execute TypeScript, teste focal, lint focal e verificação comportamental uma única vez por variante. Não permita que cada subagente repita a suíte. A mudança só é útil se reduzir tempo e fan-out preservando o mesmo aceite funcional.

Não use `--debug`: o arquivo de debug pode conter prompt, path e entrada/saída de tools.

### Sobre `--bare`

O snapshot histórico em Claude Code 2.1.263 oferecia `--bare`. Verifique a semântica na versão local antes de considerar essa variante. Ela muda o caminho de autenticação; use `--safe-mode` no teste principal.

## 7. Teste específico de fan-out e worktrees

Use uma tarefa sintética de design com escopo fechado, por exemplo: “ler um componente e apontar três hipóteses visuais; não editar, não testar, não delegar”. Faça duas execuções independentes:

1. perfil atual;
2. perfil com política explícita: um agente, zero subagentes, zero worktrees, leitura somente.

Em cada execução, registre apenas:

- tempo ao primeiro progresso e total;
- agentes criados e profundidade máxima;
- worktrees antes/depois;
- browsers/watchers/test runners antes/depois;
- tokens de entrada/cache/saída;
- tool calls;
- timeout/rate-limit por classe.

O teste falha se a tarefa somente leitura cria worktree, abre browser, executa suíte ou delega.

Depois use uma tarefa pequena de escrita. Compare:

- um líder que edita e um crítico somente leitura;
- dois ou mais escritores paralelos.

A segunda variante só é aceitável se terminar mais rápido, preservar um escritor por worktree e não duplicar suite/browser/watchers. Caso contrário, o paralelismo é custo sem ganho.

## 8. Árvore de decisão

### `SAFE` também é lento

Investigue cliente/conta/rede/serviço/host:

- compare CLI e Cowork;
- compare uma sessão nova e não persistida;
- compare TTFT e tempo total;
- registre 429, 5xx e timeout por classe;
- compare DNS/TLS/API com outra rede autorizada;
- confira disco livre, swap ativo, load e I/O durante o atraso;
- verifique se browsers/IDE consomem CPU/RAM mesmo sem agentes.

Não atribua à RAM se não houver pressão/pageout no intervalo.

### `SAFE` rápido e `FULL` lento

O delta está associado ao conjunto de customizações. Continue com `NO_SKILLS`, `NO_MCP` e setting sources para localizar a camada; ainda não atribua causalidade a um componente.

### Somente `NO_SKILLS` melhora

- conte skills automáticas e descrições;
- desligue seleção automática das skills que são manuais;
- deduplique a mesma skill entre diretório e plugin;
- procure skills de delegação, brainstorming, TDD e verificação aplicadas a toda tarefa;
- reative uma família por vez e repita o teste.

### Somente `NO_MCP` melhora

- identifique estado connected/pending/failed sem exportar endpoints;
- compare cold/warm start;
- remova duplicata de escopo;
- desative localmente o MCP não necessário ao projeto e repita;
- não aumente timeout antes de localizar retry/falha.

### `startup` rápido e `tool-read` lento

- meça hooks por evento;
- compare payload de 1 linha e 100 linhas com fixture neutra;
- confira shell, filesystem, scanner, LSP e watcher;
- preserve o scanner de segredos e reimplemente-o em processo único se a equivalência for provada.

### Lentidão aparece apenas com fan-out

- aplique `FANOUT-WORKTREE-POLICY.md`;
- reduza para um líder e um crítico;
- impeça delegação aninhada;
- centralize e deduplique testes;
- mantenha uma instância lógica de browser por worktree;
- bloqueie nova concessão quando disco, swap, load, rate-limit ou fila estiverem pressionados.

### CLI rápido e Cowork lento

- inventarie plugins/connectors do Desktop;
- conte VMs, browsers, tarefas e pastas concedidas;
- teste o mesmo prompt no CLI e Cowork sem sessão anterior;
- inspecione processos por classe, sem command line;
- reative extensões uma a uma.

## 9. Limites para interpretar diferenças

Considere diferença relevante quando houver simultaneamente:

- razão maior ou igual a 2; e
- delta maior ou igual a 2 segundos.

Considere alta quando a razão for maior ou igual a 4 e o delta maior ou igual a dez segundos. Dois timeouts em cinco amostras são High. Com apenas três amostras, qualquer timeout exige repetir cinco vezes antes da conclusão.

Compare mediana, MAD, mínimo, máximo e timeouts. Três ou cinco amostras não sustentam p95; use pelo menos 20 amostras válidas quando essa cauda for necessária. Uma correção é aceita depois de cinco amostras estáveis em dois momentos diferentes, mesmo quando não há orçamento para p95.

## 10. Remediação por camadas

Mude uma camada por PR/commit de configuração e mantenha rollback claro.

1. **Perfil de modelo:** use Sonnet/medium para tarefas rotineiras; reserve Opus/xhigh/1M para análise explicitamente difícil. Não copie o baseline pesado do Felix.
2. **Skills:** torne manual o que não precisa ser selecionado automaticamente, agrupe skills de design e elimine sobreposição diretório/plugin.
3. **Superpowers e rituais:** acione brainstorming, TDD, debugging, delegação e verificação conforme risco/escopo; tarefa visual pequena não precisa rodar toda a suíte por padrão.
4. **Fan-out:** um líder + um crítico no design; profundidade um; worktree apenas para escritor paralelo real.
5. **Testes:** mudança local primeiro, verificação focal depois, suíte central uma vez no fim.
6. **Hooks:** otimize o scanner sem remover regra, fail-closed ou teste; estabeleça latência p95.
7. **MCP/plugins:** mantenha uma instalação efetiva por identidade/escopo e conecte somente o necessário ao projeto.
8. **Sessões:** não retome JSONL enorme para tarefa nova; use handoff curto e sessão limpa.
9. **Processos:** encerre graciosamente somente recursos cujo dono confirmou; nenhum `kill` ou remoção automática.
10. **Disco/cache:** produza lista de candidatos e impacto estimado; Laura aprova cada limpeza depois de identificar o dono.

## 11. Verificação depois da correção

- Reexecute os mesmos A/B com o mesmo hash dos scripts.
- Confirme modelo, effort, versão e commit idênticos.
- Confirme que o scanner ainda detecta seu conjunto de canários e falha fechado.
- Confirme zero regressão em permissões e proteção de secrets.
- Confirme que uma tarefa básica não cria agentes/worktrees auxiliares.
- Confirme ausência de browser/watcher/test runner após encerramento gracioso.
- Compare mediana, MAD, mínimo, máximo, timeouts, tokens, tools e fan-out; inclua p95 apenas com ao menos 20 amostras válidas.
- Registre a decisão e a data de reteste; não declare “resolvido” só porque uma execução foi rápida.

## 12. Quando interromper uma execução

Interrompa o experimento, preserve as métricas já agregadas e investigue quando:

- não há progresso observável por 60 segundos numa tarefa mínima;
- o número de agentes ou worktrees cresce após o escopo já estar dividido;
- dois escritores ocupam o mesmo worktree;
- uma suíte completa começa em mais de uma worktree;
- um browser/test runner permanece cinco minutos após o dono terminar;
- surge rate-limit repetido;
- disco livre cai abaixo de 15%; ou
- há pressão de memória/pageout persistente.

Interromper não autoriza matar processos desconhecidos ou apagar worktrees. Siga a contenção e a revisão humana da política de fan-out.
