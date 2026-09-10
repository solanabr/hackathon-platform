# Contrato de coleta, privacidade e interpretação

## 1. Princípio

O relatório compartilhável é construído por **allowlist**. O coletor extrai somente números, booleanos, enums, versões públicas e identificadores HMAC. Ele não exporta um arquivo bruto para depois tentar apagar segredos com regex.

O relatório serve para comparar ambientes. Ele não é backup, inventário de credenciais, log de depuração nem prova isolada de causalidade.

## 2. Dados que nunca entram no relatório

- Conteúdo de conversas, JSONL, sessões, tarefas, memórias ou histórico de shell.
- Prompts, respostas, thinking, descrições de agentes ou nomes de sessões.
- Conteúdo de `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, rules ou arquivos do repositório.
- Valores de variáveis de ambiente, Keychain, headers, tokens ou certificados.
- Comandos e argumentos de hooks, MCPs, aliases ou processos.
- URL completa, usuário, hostname, e-mail, organização ou IP.
- Path absoluto, branch, commit em claro, PID ou PPID.
- Saída bruta de `/status`, `/context`, `/agents`, `/hooks`, `/mcp`, `/doctor`, `--debug` ou testes.

O coletor pode abrir um arquivo de configuração conhecido para projetar campos permitidos. O conteúdo bruto permanece em memória e não é persistido. Diretórios de sessão e histórico recebem somente `stat`/contagem/tamanho; os arquivos internos não são abertos.

## 3. HMAC de pareamento

Paths, nomes privados, fingerprints de arquivo, branches e commits são representados por HMAC-SHA256 truncado, por exemplo `path_…`, `skill_…` ou `branch_…`.

Uma chave efêmera é criada quando `AI_ENV_MAP_PAIRING_KEY` não está definida. Nesse modo, somente métricas agregadas podem ser comparadas entre máquinas. Para comparar a identidade de um item, Felix e Laura fornecem a mesma frase longa nos terminais locais. A chave:

- não aparece no relatório;
- não é gravada pelo coletor;
- não deve ser enviada em chat;
- precisa ter ao menos 16 caracteres;
- deve ser removida do ambiente após a coleta.

SHA simples não é usado para nomes e paths porque permitiria testar valores comuns por dicionário.

## 4. Superfícies distintas

Claude Code CLI, Claude Desktop Code e Cowork devem ser tratados separadamente. Uma instalação pode compartilhar arquivos com outra, mas cada superfície possui processos, extensões, permissões e ciclo de vida próprios.

| Superfície | Evidência automática | Evidência manual |
|---|---|---|
| Claude Code CLI | versão, settings, hooks, skills, plugins, MCP, processos classificados | estado de conexão MCP, contexto e A/B de modelo |
| Claude Desktop Code | versão/build, armazenamento por classe, processos classificados | tarefas, browsers e pastas concedidas |
| Cowork | extensão/storage por classe e processos relacionados | modo de permissão, connectors, tarefas simultâneas e tempos |
| Codex | família de modelo, effort, quantidade de MCP/perfis e processos | sessões e fan-out lógico, se aplicável |

## 5. Campos principais

### `collector`

- `version`: versão do formato lógico do coletor.
- `sha256`: hash público do próprio script. Felix e Laura devem executar o mesmo hash.
- `privacyPolicy`: deve ser `allowlist-hmac-v1`.
- `activeBenchmarks`: indica se timings locais sem modelo foram executados.
- `cacheSizes`: indica se tamanhos conhecidos dentro de worktrees foram medidos.
- `networkRequests`: sempre `false` neste coletor.

### `run`

- `subject`: `felix`, `laura` ou `other`.
- `pairingKeyId`: confirma se duas coletas usaram a mesma chave sem revelá-la.
- `pairingMode`: `provided` ou `ephemeral`.

### `system`

Contém família/versão do sistema, arquitetura, CPUs lógicas, memória física e capacidade/livre/ocupado do volume do projeto. Não contém hostname ou serial.

### `tools`

Versões públicas e presença dos executáveis `claude`, `codex`, Node, gerenciadores de pacote, Python e Git. Não contém o path do binário.

### `claude.settings`

Cada fonte conhecida recebe `sourceClass`: `managed`, `managed-plist`, `user`, `user-local`, `project` ou `project-local`.

Campos permitidos:

- existência, bytes, permissões do arquivo e fingerprint HMAC;
- validade JSON;
- família de modelo, pedido de contexto estendido e effort;
- contagens de allow/ask/deny/additional directories;
- contagem e categorias de variáveis, sem nomes nem valores;
- fingerprints de plugins habilitados e estado booleano;
- distribuição de `skillOverrides`;
- estrutura de hooks.

O coletor registra todas as fontes, mas não tenta substituir a precedência do Claude. O comparador sinaliza conflitos; o teste A/B mede o efeito real.

### `claude.skills`

- `logicalEntries`: referências diretamente inspecionáveis nos escopos permitidos. O coletor registra o symlink como metadado, mas não segue diretórios por symlink; portanto, este campo pode ser um limite inferior ao inventário forense local.
- `uniqueContentHashes`: corpos únicos por HMAC.
- `uniqueRealPaths`: alvos físicos únicos.
- `symlinkedEntries`: entradas simbólicas observadas sem atravessar o alvo.
- `autoVisibleEntries`: referências diretamente inspecionadas sem `disable-model-invocation: true`; não mede sozinho o catálogo resolvido em runtime.
- `manualOnlyEntries`: referências com seleção automática desativada.
- `forkedContextEntries`: skills com `context: fork`.
- `catalogDescriptionChars` e `catalogApproxTokens`: estimativa estrutural; não prova o tamanho do prompt efetivo.
- `logicalBodyBytes` e `uniqueBodyBytes`: peso potencial dos corpos.
- duplicatas por nome, conteúdo e alvo físico.

Uma contagem lógica pode superar o valor mostrado por `/context` ou telemetria porque o Claude resolve precedência, namespaces e escopos em runtime. Compare os dois; não some cegamente.

### `claude.plugins`

Cada instalação inclui HMAC do nome, escopo, versão pública quando parseável e quantidade de skills, agentes, comandos, hooks e MCPs. Duplicata de registro não significa necessariamente duas execuções simultâneas; pode significar resolução diferente conforme o `cwd`.

### `claude.mcpConfigs` e `claude.claudeJson`

Contêm quantidade e estrutura por transporte, endpoint local/remoto, presença de auth/header/env e contagem de argumentos. Nomes e hosts são HMAC. Estado connected/pending/failed deve ser preenchido no formulário manual, porque uma tentativa no sandbox pode distorcer DNS e autenticação.

### `claude.instructions`

Contagens, bytes e tokens aproximados de arquivos candidatos a instrução automática. O conteúdo nunca entra. Imports explícitos podem ser contados, sem registrar o path em claro.

### `workspace.worktrees`

Somente repositórios passados explicitamente ao coletor entram. Por repositório:

- quantidade de worktrees;
- existentes, detached, locked, prunable ou ausentes;
- HMAC de worktree, branch e HEAD;
- caches conhecidos por classe e tamanho.

Worktree existente e antigo não é automaticamente órfão. A classificação exige dono/lease e confirmação humana.

### `runtime.processes`

O adaptador lê `ps` sem argumentos de processo. PIDs e executáveis são usados apenas em memória para agregar:

- Claude CLI e Desktop;
- Codex CLI e Desktop;
- browser/webview;
- test/dev runner identificável pelo nome do executável;
- Node/Bun/Deno;
- shells.

Saem apenas contagem, RSS total, CPU instantânea, faixas de idade e quantidade adotada pelo PID 1. Um processo Node genérico não é chamado de watcher, MCP ou test runner sem registro do launcher.

### `runtime.storage`

Tamanho e cardinalidade por classe: projetos/sessões/tasks/teams/daemon do CLI, sessions/extensões/VM bundles/cache/git-shadow do Desktop. Nenhum conteúdo é aberto.

### `runtime.benchmarks`

Cinco execuções de inicialização de shell limpo, shell interativo e `claude --version`. Esses números mostram overhead local antes de qualquer chamada ao modelo.

### `observations`

Regras determinísticas do coletor. Elas apontam condições a testar; não certificam a causa.

## 6. Formulário manual permitido

O formulário da Laura aceita somente números, booleanos e enums. Ele não possui campo livre para comentário. Se uma observação não cabe no schema, adicione um código ao schema antes de coletar; não cole saída bruta.

Permitido:

- contagem de tarefas, agentes, worktrees, browsers, watchers e connectors;
- estado agregado de MCP (`connected`, `pending`, `failed`);
- modelo/effort;
- percentual de contexto por categoria;
- tempos, tokens, tool calls, timeouts e códigos HTTP por classe;
- modo de permissão (`manual`, `auto`, `skip`, `unknown`).

## 7. Validação e retenção

O DLP interno e o validador independente rejeitam:

- paths absolutos;
- e-mails, URLs, IPv4 e UUIDs;
- JWT, PEM, chaves conhecidas e URIs com usuário/senha;
- chaves JSON proibidas como `prompt`, `messages`, `pid`, `command` ou `url`;
- versão de schema ou asserção de privacidade inválida.

O arquivo é gravado atomicamente com modo `0600`. Guarde-o fora de iCloud, Dropbox e pastas compartilhadas. Exclua-o conforme a política local após concluir a comparação; este pacote não automatiza a exclusão.

## 8. Limites

- Contagem de processos é um snapshot e pode variar em segundos.
- RSS pode contar páginas compartilhadas mais de uma vez.
- APFS, hardlinks e clones alteram o espaço que seria recuperado.
- `comm` não identifica com certeza a função de um processo Node.
- Settings presentes não provam settings efetivos.
- Correlação entre tokens, agentes e duração não prova que um único deles causou a lentidão.
- A/B com `--safe-mode` é o teste decisivo para separar customizações de cliente/rede/modelo.
