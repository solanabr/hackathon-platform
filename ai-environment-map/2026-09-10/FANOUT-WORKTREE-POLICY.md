# Política operacional de fan-out, worktrees e processos auxiliares

**Versão:** 1.0
**Data:** 2026-09-10
**Estado:** rascunho operacional
**Responsável pela política:** gestor do laboratório
**Escopo:** Claude Code, Claude Desktop/Cowork e outros orquestradores de IA usados no laboratório

## 1. Objetivo

Este runbook impede que uma tarefa simples abra subagentes, sessões, worktrees, watchers, test runners ou browsers em quantidade descontrolada. Ele também reduz colisões entre agentes, testes duplicados, processos órfãos e a falsa impressão de que mais paralelismo sempre reduz o tempo total.

Os números deste documento são **defaults internos do laboratório**. Não são limites oficiais da Anthropic, do Claude Code, do sistema operacional ou dos modelos. A calibração deve usar medições repetíveis de cada máquina e projeto.

Na versão Claude Code 2.1.263, [subagentes podem gerar novos subagentes](https://code.claude.com/docs/en/agents) por padrão, com até três camadas; a documentação informa limite concorrente padrão de 20 e ausência de teto total por sessão. A profundidade `1` e o teto de máquina desta política são, portanto, controles internos deliberadamente menores. Não foi encontrada no Felix uma regra explícita de auto-spawn; skills de delegação deixam essa recursão disponível ao modelo.

Esta política não apaga worktrees, branches, arquivos ou sessões automaticamente. Um recurso vencido é cercado, marcado e apresentado para revisão humana.

## 2. Invariantes

1. Todo recurso precisa de dono, finalidade, lease e estado no registro antes de iniciar.
2. Existe no máximo um escritor ativo por worktree.
3. Dois agentes que escrevem em paralelo recebem worktrees diferentes.
4. Agentes leitores não podem adquirir escrita implicitamente.
5. Testes pesados são enfileirados e centralizados por repositório.
6. Cada worktree tem no máximo um watcher de cada classe e um test runner interativo.
7. Browsers são contados por instância lógica raiz; processos auxiliares do mesmo browser não contam como browsers independentes.
8. Expiração de lease impede novas concessões e novas escritas orquestradas, mas não mata processos nem remove dados.
9. Nenhuma exceção é permanente. Toda exceção tem dono, justificativa, métrica e vencimento.
10. O registro compartilhado não contém prompts, conversas, comandos, caminhos, PIDs, tokens ou identificadores privados.

## 3. Papéis

| Papel | Responsabilidade |
|---|---|
| Gestor do laboratório | Accountable pelos limites, exceções e retorno ao modo normal |
| Orquestrador | Concede leases, aplica quotas, mantém o registro e interrompe novas alocações em incidente |
| Líder da tarefa | Divide trabalho, escolhe leitores/escritores e confirma que o fan-out é necessário |
| Dono do recurso | Mantém heartbeat, libera o recurso e registra seu estado final |
| Integrador | Único papel que reúne mudanças e solicita a suíte central |
| Operador de recuperação | Revisa órfãos, worktrees e locks antes de qualquer limpeza manual |

Uma pessoa pode exercer mais de um papel, mas o registro deve mostrar qual papel ela exerce em cada operação.

## 4. Limites padrão

### 4.1 Limite calculado da máquina

Calcule o teto técnico inicial:

```text
cap_maquina = mínimo de:
  4
  máximo(1, piso(CPUs_lógicas / 4))
  máximo(1, piso(RAM_disponível_GiB / 4))
```

Esse cálculo é apenas um teto. O perfil da tarefa pode impor um limite menor.

### 4.2 Quotas normais

| Recurso | Default | Limite de alerta | Observação |
|---|---:|---:|---|
| Líderes ativos por tarefa | 1 | 2 | Um segundo líder exige divisão formal de escopo |
| Agentes de modelo simultâneos em design interativo | 2 | 3 | Prioriza resposta rápida e revisão visual |
| Agentes de modelo simultâneos em análise independente | 3 | 4 | Cada agente deve ter subproblema independente |
| Agentes de modelo no host | `cap_maquina` | acima do cap | Inclui líderes, subagentes, teammates e background agents |
| Profundidade de delegação | 1 | 2 | Delegação aninhada precisa de exceção |
| Agentes escritores por worktree | 1 | acima de 1 | Violação bloqueadora |
| Agentes leitores por worktree | 2 | acima de 2 | Use um agente sintetizador em vez de novos leitores |
| Worktrees ativos por repositório | 4 | 5 | Inclui sessões Desktop e worktrees de subagentes |
| Worktrees retidos aguardando revisão | 8 | 9 | Retenção não autoriza remoção automática |
| Watchers por classe e worktree | 1 | 2 | Classes: app, bundler, tipos, testes e arquivos |
| Test runners interativos por worktree | 1 | 2 | A suíte completa não roda nesta categoria |
| Suítes completas simultâneas por repositório | 1 | 2 | Sempre via fila central |
| Browser lógico por worktree | 1 | 2 | Uma instância pode ter vários processos auxiliares |
| Browsers lógicos por repositório | 2 | 3 | Compartilhamento exige prova de isolamento |
| Browsers lógicos no host | 3 | 4 | Reduza se houver pressão de memória |
| Workers Playwright por execução | 2 | 3 | Aumente somente com ganho medido |
| MCP/LSP/daemon duplicado por identidade e escopo | 1 | 2 | Duplicata deve ser consolidada ou justificada |

### 4.3 Redução automática de capacidade

O supervisor coleta uma amostra a cada 30 segundos. O orquestrador para de conceder novos recursos pesados e reduz o fan-out desejado para `1` quando qualquer condição persistir em três amostras consecutivas:

- carga normalizada por CPU acima de `0,80`;
- pressão de memória alta ou crescimento de pageouts/swap;
- descendentes de IA usando mais de 25% da RAM disponível;
- espaço livre inferior a 15%;
- fila de testes pesados com espera superior a dez minutos;
- rate-limit ou erro transitório repetido do provedor;
- writer collision, lock vencido ou heartbeat vencido;
- dois browsers/test runners pesados no mesmo worktree.

Redução de capacidade não encerra o trabalho em andamento. Ela fecha a entrada da fila até o operador avaliar o estado.

Para evitar oscilação, a capacidade só volta a subir depois de cinco amostras consecutivas abaixo de 60% das quotas, sem rate-limit, lease vencido ou incidente aberto. O retorno ocorre uma unidade por vez.

## 5. Registro de recursos

### 5.1 Campos obrigatórios

Cada recurso recebe um identificador ordinal ou HMAC e registra:

| Campo | Regra |
|---|---|
| `resource_ref` | Referência não privada, por exemplo `A03`, `W02` ou HMAC |
| `resource_type` | agent, worktree, writer, watcher, test-runner, browser, MCP, LSP ou daemon |
| `owner_ref` | Dono operacional do recurso |
| `parent_ref` | Recurso que provocou a criação |
| `task_ref` | Referência opaca da tarefa |
| `repo_ref` | Referência HMAC do repositório |
| `worktree_ref` | Referência HMAC; ausente somente quando não se aplica |
| `mode` | read-only, writer, coordinator ou infrastructure |
| `state` | requested, leased, running, idle, suspect, releasing, released ou quarantined |
| `lease_started_at` | Horário UTC arredondado |
| `lease_expires_at` | Vencimento atual |
| `last_liveness_at` | Último sinal de processo vivo |
| `last_progress_at` | Última mudança de estado útil, sem conteúdo da tarefa |
| `fencing_epoch` | Número crescente para impedir retomada por lease antigo |
| `exception_ref` | Exceção ativa, quando houver |
| `cleanup_state` | not-needed, pending-review, approved ou quarantined |

O registro não armazena nome da sessão, prompt, resposta, comando, argumento, caminho, branch, commit, PID, token, URL ou nome de pessoa.

Uma tabela local protegida pode mapear `resource_ref` para dados de runtime necessários à supervisão. Essa tabela não entra no relatório compartilhável e deve ter retenção curta.

O registro tem uma única autoridade de concessão por pool. Se houver replicação, a aquisição de lease e o incremento de epoch precisam de armazenamento fortemente consistente; em partição ou indisponibilidade, novas concessões e novas escritas falham fechadas. TTL usa relógio monotônico para decisões locais e UTC apenas para auditoria, evitando que ajuste do relógio reviva um lease.

### 5.2 Máquina de estados

```text
requested -> leased -> running -> releasing -> released
                         |   |
                         |   -> idle -> running
                         |
                         -> suspect -> releasing
                                   -> quarantined
```

- `requested`: ainda não consome quota.
- `leased`: quota reservada; processo ainda não confirmou início.
- `running`: heartbeat de vida e lease válidos.
- `idle`: vivo, sem progresso recente, mas dentro da tolerância.
- `suspect`: heartbeat, progresso ou dono inválido; novas concessões são bloqueadas.
- `releasing`: dono iniciou encerramento gracioso.
- `released`: recurso confirmado como encerrado.
- `quarantined`: estado incerto ou artefato que requer revisão humana.

Toda transição deve ser atômica e guardar apenas código de razão, nunca texto produzido pelo modelo.

## 6. Leases, TTL e heartbeat

| Recurso | TTL padrão | Heartbeat | Sem progresso | Após dono ausente |
|---|---:|---:|---:|---:|
| Agente/sessão | 20 min | 30 s | warning em 10 min | suspect em 2 min |
| Lease de escritor | 5 min | 15 s | não se aplica | revoga concessão imediatamente |
| Worktree | 2 h | herdado do dono | review após 30 min sem dono | quarantine após 24 h |
| Watcher/dev server | 15 min | 30 s | warning em 10 min | suspect em 2 min |
| Browser lógico | 15 min | 30 s | warning em 10 min | suspect em 2 min |
| Teste rápido | 10 min | 30 s | warning em 5 min | suspect em 2 min |
| Suíte completa | 45 min | 60 s | warning em 15 min | suspect em 3 min |
| MCP/LSP/daemon | 30 min | 60 s | baseado em healthcheck | suspect em 3 min |

O dono pode renovar um lease antes do vencimento. Renovação exige:

1. dono ainda válido;
2. quota ainda disponível;
3. heartbeat recente;
4. progresso ou justificativa operacional codificada;
5. ausência de incidente que tenha fechado novas concessões.

O heartbeat de vida prova apenas que um processo existe. `last_progress_at` prova que houve avanço observável, como mudança de fase, conclusão de uma unidade ou liberação de dependência. Nenhum deles contém texto ou conteúdo da tarefa.

Lease vencido muda o recurso para `suspect`, incrementa a métrica de órfão potencial e impede novas operações mediadas. Ele não dispara remoção, kill ou descarte de dados.

## 7. Fencing e regra de um escritor

O lease de escritor é adquirido por comparação e troca atômica sobre `(repo_ref, worktree_ref)`. A concessão produz um `fencing_epoch` monotônico.

Antes de cada ferramenta que possa modificar arquivos, configuração ou Git, o gate verifica:

1. `resource_ref` é o dono atual;
2. lease ainda está válido;
3. epoch apresentado é o epoch ativo;
4. worktree corresponde ao recurso registrado;
5. não existe incidente com escrita congelada.

Epoch antigo falha fechado. O agente não pode renovar implicitamente durante a tentativa de escrita.

Leitores recebem ferramentas ou permissões read-only. Se um leitor precisar editar, ele solicita promoção. A promoção só ocorre quando:

- não existe escritor ativo naquele worktree;
- a tarefa declara por que a escrita é necessária;
- o orquestrador concede novo lease e novo epoch;
- o agente anterior confirma liberação ou é marcado `suspect` e cercado.

Para escrita paralela, cada agente usa worktree próprio. O integrador reúne os resultados numa etapa sequencial. Teammates de um agent team não devem compartilhar um checkout para alterações, mesmo que os arquivos pareçam diferentes.

## 8. Política de worktrees

### 8.1 Criação

Uma worktree só pode ser criada quando:

- há tarefa registrada e dona;
- a mudança realmente precisa de isolamento;
- a quota do repositório está disponível;
- existe lease com TTL;
- o plano define como integrar e revisar;
- não há worktree existente adequada e livre.

Não crie worktree para uma leitura curta, consulta documental ou tarefa sem edição.

### 8.2 Uso

- Um worktree pertence a uma tarefa de escrita por vez.
- Dependências, watchers e browsers são associados ao mesmo `worktree_ref`.
- Um watcher não pode observar silenciosamente outra worktree.
- O dev server e o browser devem registrar a mesma revisão lógica do código, usando fingerprint redigido.
- Mudança de dono exige liberação do writer lease e novo epoch.
- A worktree principal não funciona como área de edição concorrente de agentes.

### 8.3 Encerramento e retenção

Ao concluir, o dono marca:

- processo encerrado;
- alterações presentes ou ausentes;
- integração pendente, concluída ou descartada por decisão humana;
- testes associados;
- locks presentes ou ausentes;
- `cleanup_state`.

Worktree sem alterações e sem processos pode ser proposta para limpeza. Worktree com alteração, commit não integrado, lock, dono incerto ou teste ativo entra em `pending-review` ou `quarantined`.

O sistema nunca remove automaticamente uma worktree apenas por idade, lease vencido ou ausência aparente de processo.

## 9. Watchers, browsers e processos auxiliares

### 9.1 Identidade lógica

Cada launcher registra PID localmente, classe, dono e worktree. O relatório compartilhável usa somente classe e referência opaca. Processos não instrumentados aparecem como `unknown-child`; o coletor não lê command line para adivinhar sua função.

Browsers são contados pelo processo lógico raiz ou contexto controlado. Helpers, renderers e GPU processes são agregados à raiz para evitar falso alerta.

### 9.2 Reuso permitido

Reuso só é permitido quando o recurso prova:

- mesmo worktree/revisão lógica;
- isolamento de estado entre testes;
- nenhum cookie, token ou perfil pessoal;
- dono e lease atuais;
- reset determinístico entre execuções.

Sem essa prova, abra um recurso isolado dentro da quota.

Portas, perfis de browser, namespaces de cache, bancos locais e schemas de teste também são recursos locáveis. O registro local atribui um slot exclusivo ao worktree; o relatório compartilhável mostra apenas a referência do slot, nunca o número da porta, caminho, DSN ou credencial. Dois worktrees não podem compartilhar um slot mutável sem uma exceção que demonstre isolamento.

### 9.3 Órfãos

Um processo é órfão potencial quando:

- o dono está `released` ou ausente e o processo permanece por dois minutos;
- a sessão terminou e browser, watcher ou teste continua;
- não há heartbeat pelo período definido;
- a worktree foi colocada em quarentena;
- o processo está vivo, mas sem registro correspondente.

Órfão potencial é primeiro observado e correlacionado. O operador tenta encerramento gracioso pelo dono/orquestrador. Se isso falhar, registra evidência mínima e solicita decisão humana. Não há limpeza forçada automática.

## 10. Centralização de testes

### 10.1 Classes

| Classe | Onde roda | Concorrência |
|---|---|---:|
| Check sintático ou teste unitário diretamente afetado | Worktree do escritor | 1 por worktree |
| Watch mode durante edição | Worktree do escritor | 1 por classe |
| Suíte de pacote | Fila do repositório | 1 suíte por repositório |
| Suíte completa, E2E ou browser amplo | Executor central isolado | 1 por repositório |
| Verificação final de integração | Worktree do integrador | Sequencial |

### 10.2 Chave de deduplicação

Uma solicitação central usa a chave:

```text
(repo_ref, revision_fingerprint, suite_id, config_fingerprint, dependency_fingerprint)
```

Solicitações com a mesma chave compartilham o resultado. Um teste só repete quando houver:

- mudança de código, configuração ou dependência relevante;
- falha anterior não determinística sob investigação;
- evidência de ambiente diferente;
- exigência explícita do gate final.

Não repita toda a suíte apenas porque outro agente concluiu a mesma leitura.

### 10.3 Fila e prioridade

Prioridade padrão:

1. gate de integração já aguardando decisão;
2. regressão negativa diretamente ligada à mudança;
3. suíte de pacote;
4. suíte completa;
5. exploração ou teste redundante.

Fila superior a dez minutos fecha novas solicitações de suíte completa até triagem. Testes rápidos locais continuam somente se não agravarem a contenção.

## 11. Exceções mensuradas

Exceção precisa ser registrada antes do recurso extra e conter:

- `exception_ref` e dono;
- hipótese que exige paralelismo;
- recurso e quantidade adicional;
- baseline de tempo, CPU, RAM e fila;
- ganho esperado mensurável;
- escopo e worktrees envolvidos;
- duração máxima;
- sinais para abortar;
- plano de liberação e revisão;
- aprovador.

Defaults:

- aumento máximo de uma unidade por classe;
- duração máxima de 60 minutos;
- nenhum aumento de escritores por worktree;
- nenhuma exceção durante pressão alta, writer collision ou incidente aberto;
- retorno automático da **quota configurada** ao default no vencimento, sem matar ou apagar recursos existentes.

Uma exceção é aceita como útil apenas se reduzir o tempo total ou aumentar cobertura mensurável sem elevar órfãos, colisões ou repetição de testes. Caso contrário, ela não deve ser renovada.

## 12. Sinais e alertas

### 12.1 Métricas mínimas

- agentes ativos por tipo e host;
- fan-out atual, cap calculado e exceções;
- writers ativos por worktree;
- worktrees ativos, retidos e em quarentena;
- watchers, test runners e browsers por worktree;
- processos órfãos potenciais;
- leases vencidos e atraso de heartbeat/progresso;
- fila e duração de testes por classe;
- testes deduplicados e repetições justificadas;
- CPU normalizada, pressão de memória, pageouts/swap e espaço livre;
- rate-limits, timeouts e falhas transitórias por classe;
- tempo p50/p95 das tarefas sintéticas;
- tempo acumulado de hooks e ferramentas, quando medido sem conteúdo.

### 12.2 Níveis

| Nível | Condição | Ação |
|---|---|---|
| INFO | 60% da quota | Apenas registrar tendência |
| WARN | 80% da quota por cinco minutos | Avisar líder e evitar fan-out opcional |
| HIGH | Quota ultrapassada, órfão, lock antigo ou fila acima do limite | Fechar novas alocações da classe e triar |
| CRITICAL | Dois escritores no mesmo worktree, corrupção provável ou host sem resposta | Declarar incidente e congelar novas escritas |

Um alerta precisa apontar `resource_ref`, regra, horário, dono e ação esperada. Não inclua conteúdo da tarefa ou dados privados.

## 13. Protocolo de incidente

### 13.1 Classificação

| Severidade | Critério |
|---|---|
| SEV1 | Risco de perda/corrupção, múltiplos escritores ativos ou host inutilizável |
| SEV2 | Explosão de processos, memória/CPU crítica, testes/browsers descontrolados |
| SEV3 | Órfão isolado, worktree/lock antigo ou quota excedida sem impacto atual |

### 13.2 Primeiros cinco minutos

1. Nomear incidente e responsável.
2. Fechar novas concessões de agente, writer, browser, watcher e suíte pesada.
3. Congelar promoções de read-only para writer.
4. Tirar snapshot redigido do registro e das métricas.
5. Confirmar se existe writer collision ou trabalho não integrado.
6. Preservar worktrees e arquivos como estão.
7. Identificar recursos com dono válido, órfãos potenciais e estado desconhecido.

### 13.3 Contenção

1. Permitir que operações atômicas já iniciadas cheguem a um ponto seguro.
2. Pausar a fila de novas suítes e deduplicar pedidos existentes.
3. Solicitar aos donos o encerramento gracioso de browsers, watchers e testes dispensáveis.
4. Cercar leases vencidos com novo epoch; não reutilizar writer lease antigo.
5. Colocar worktrees incertas em quarentena.
6. Manter um líder, um integrador e no máximo um writer por worktree.
7. Se o host continuar degradado, drenar sequencialmente os recursos registrados, do mais recente e opcional para o mais antigo e necessário.

### 13.4 Investigação

Avaliar, usando apenas métricas e referências:

- qual recurso iniciou o crescimento;
- se houve delegação aninhada;
- quantos recursos não tinham registro;
- se watchers/testes foram duplicados;
- se uma skill/plugin/hook criou processos adicionais;
- se agent team compartilhou checkout;
- se existiam rate-limit, retry ou timeouts;
- se o heartbeat indicava vida sem progresso;
- se o cap calculado estava incorreto para a carga real.
- se houve colisão de porta, cache, perfil de browser, banco ou schema entre worktrees.

Não coletar prompts, histórico, command lines ou saídas completas para responder essas perguntas.

### 13.5 Recuperação

1. Confirmar zero writer collision.
2. Restaurar uma sessão líder e um writer isolado.
3. Liberar leitores somente se houver subtarefa independente.
4. Reiniciar uma única suíte central necessária.
5. Reabrir browsers/watchers um por vez e medir impacto.
6. Liberar a fila somente após cinco minutos estáveis.
7. Manter exceções suspensas até fechamento do incidente.
8. Revisar worktrees em quarentena manualmente antes de qualquer decisão de limpeza.

### 13.6 Encerramento

O incidente só fecha quando:

- quotas estão abaixo de 80%;
- não há múltiplos escritores;
- nenhum processo órfão crítico permanece;
- fila de testes voltou ao normal;
- pressão de CPU/memória cessou;
- worktrees incertas estão atribuídas ou em quarentena;
- evidência redigida e follow-up têm dono e data.

## 14. Limpeza segura em duas fases

### Fase 1 — proposta

O coletor produz uma lista de candidatos, sem agir. Para cada candidato registra:

- referência;
- dono conhecido ou desconhecido;
- idade e último heartbeat;
- presença de alteração, lock ou processo;
- integração conhecida ou desconhecida;
- motivo da proposta;
- recomendação: manter, atribuir, quarentenar ou revisar para remoção.

### Fase 2 — decisão humana

O operador confirma:

- nenhuma sessão usa o recurso;
- nenhuma alteração útil está apenas naquele local;
- nenhum teste ou browser depende dele;
- não há lock ativo;
- integração foi concluída ou descarte foi explicitamente aprovado;
- existe registro da decisão.

Este runbook não inclui comandos de remoção, kill, reset ou limpeza. A execução de uma decisão destrutiva deve seguir procedimento separado, autorizado e auditável.

## 15. Critérios de aceitação

A política está pronta para uso quando os testes abaixo passam com fixtures sem dados privados:

1. A tentativa de criar o agente `cap + 1` é negada e registrada.
2. Duas aquisições simultâneas de writer no mesmo worktree resultam em exatamente uma vencedora.
3. Um writer com epoch antigo não consegue passar pelo gate de escrita.
4. Lease vencido vira `suspect`, mas nenhum processo ou worktree é apagado.
5. Processo cujo dono terminou é detectado em até dois minutos.
6. Duas solicitações de teste com a mesma chave executam uma única suíte.
7. Mudança relevante na chave permite nova suíte.
8. Browser helpers são agregados à raiz e não inflam a contagem.
9. Watcher duplicado no mesmo worktree dispara HIGH.
10. Agent team com dois escritores sem worktrees distintas é bloqueado.
11. Exceção vencida restaura a quota padrão sem encerrar recursos automaticamente.
12. Reinício do orquestrador recupera leases e marca estados ambíguos como `suspect`.
13. Falha do registro provoca comportamento fail-closed para novas escritas e novas alocações.
14. Relatório compartilhado não contém caminhos, PIDs, comandos, prompts, sessão, e-mail, hostname, tokens ou strings de alta entropia.
15. Um game day demonstra contenção, recuperação e revisão de limpeza sem perda de artefatos.
16. Partição ou indisponibilidade do registro não concede um segundo writer.
17. Alteração do relógio de parede não reativa lease vencido.
18. Dois worktrees não recebem o mesmo slot mutável de porta, cache, browser ou banco.

Critérios operacionais após sete dias:

- 100% dos agentes, worktrees, browsers, watchers e testes pesados registrados;
- zero writer collision;
- zero remoção automática;
- zero suíte completa duplicada com a mesma chave;
- 95% dos órfãos potenciais detectados dentro do limite;
- p95 de espera da fila central abaixo de dez minutos;
- nenhuma exceção sem dono ou vencimento;
- pelo menos um teste de recuperação documentado.

## 16. Checklist antes de iniciar trabalho paralelo

- [ ] Tarefa e líder registrados.
- [ ] Cap da máquina e quota do repositório conhecidos.
- [ ] Subtarefas realmente independentes.
- [ ] Um worktree por escritor.
- [ ] Leitores marcados read-only.
- [ ] Leases, TTL e epochs concedidos.
- [ ] Watchers, browsers e testes previstos no orçamento.
- [ ] Suíte pesada encaminhada à fila central.
- [ ] Critério de parada e integração definidos.
- [ ] Exceção aprovada, se necessária.
- [ ] Nenhum incidente ou pressão alta em aberto.

## 17. Checklist ao concluir

- [ ] Agentes marcaram estado final.
- [ ] Writer leases foram liberados.
- [ ] Watchers, browsers e test runners confirmaram encerramento.
- [ ] Resultado de teste foi associado à revisão lógica correta.
- [ ] Alterações foram integradas, atribuídas ou colocadas em quarentena.
- [ ] Locks e órfãos potenciais foram revisados.
- [ ] Worktrees receberam `cleanup_state` sem remoção automática.
- [ ] Exceções foram encerradas.
- [ ] Registro redigido passou pelo DLP.
- [ ] Métricas e follow-ups têm dono e data.

## 18. Limitações conhecidas

- Processo Node genérico não pode ser classificado com segurança sem instrumentação; não se deve ler command line para adivinhar.
- Heartbeat prova vida, não progresso útil.
- Baixo uso de RAM não exclui espera de rede, hook, MCP, rate-limit ou fila.
- Mais agentes podem aumentar tokens e contenção mesmo quando o host parece ocioso.
- Isolamento por worktree separa arquivos, mas não separa automaticamente portas, bancos, caches, browser profiles ou serviços externos.
- Os defaults precisam ser recalibrados após mudança relevante de máquina, projeto, cliente, modelo ou versão do orquestrador.
