# Relatório de limpeza do Mac do Felix

**Data:** 2026-09-10
**Natureza:** manutenção local defensiva; não é certificação de segurança ou desempenho.

## Estado anterior observado

- Claude usava `opus[1m]` e `xhigh` como defaults, além de aliases duplicados e um alias com bypass de permissões.
- A allowlist local acumulava 136 regras e continha credenciais literais e comandos de alto impacto.
- Seis credenciais eram carregadas do Keychain em todo shell e um arquivo de ambiente de banco era carregado automaticamente.
- O catálogo do Claude tinha 271 skills válidas e 229 links; plugins antigos coexistiam em escopos diferentes.
- Codex mantinha 12 releases standalone e trusts amplos ou obsoletos.
- LiqPay tinha 15 worktrees; caches e artefatos ocupavam dezenas de GiB.
- QVAC mantinha runtime, serviço persistente e repositório local mesmo sem uso.
- Históricos locais do Claude e Codex continham material com formato de credencial.

## Mudanças aplicadas

- Claude passou a `opus/high`; o modo longo ficou explícito e sem bypass de permissões.
- A allowlist local foi zerada e os prompts de segurança foram restaurados.
- Credenciais deixaram de ser exportadas em todo shell; o carregamento agora é manual e por provedor.
- O ambiente Kofre deixou de ser carregado automaticamente.
- 12 worktrees LiqPay limpos e sem commits locais foram removidos; branches foram preservadas.
- Skills do Claude foram reduzidas para 49 válidas, por sparse checkout reversível; 6 links usados permaneceram ativos.
- Plugins duplicados/obsoletos foram removidos; os quatro ativos ficaram no escopo de usuário.
- A memória automática LiqPay caiu de 24.812 para 5.898 bytes, com backup protegido fora de repositórios.
- Comandos pessoais ficaram manuais e o Brain deixou de ser importado globalmente.
- Claude Code foi atualizado para 2.1.267; Codex para 0.154.0.
- Codex manteve a versão atual e uma versão de rollback; trusts amplos/obsoletos foram retirados.
- Caches npm/uv e artefatos reconstruíveis inativos foram podados; o passe final removeu mais 4,0 GiB do cache UV e 2,0 GiB de `_npx` sem arquivos abertos.
- O LaunchAgent, serviço e repositório local QVAC foram removidos após validação do remoto.
- Passes de redação removeram os padrões identificados sem invalidar JSONL. O passe concorrente final examinou 864 arquivos, mascarou 64 ocorrências em 7 arquivos e terminou com zero residual; sessões ainda ativas devem receber outro dry scan ao encerrar para garantia terminal.
- A instalação npm obsoleta do Codex 0.142.0 e a duplicata Kilo 1.0.8 foram removidas; o Kimi duplicado byte a byte também foi retirado.
- O Playwright MCP foi atualizado de 0.0.78 para 0.0.80.
- O `rg` passou a resolver por `~/.local/bin` para a release Codex `current`, sem path fixo de versão antiga.
- Context7 deixou de consultar o Keychain em todo shell; PATH e `compinit` duplicados foram consolidados.
- A senha PostgreSQL do Kofre foi migrada para o Keychain; o arquivo local retém apenas host, porta, banco e usuário e passou no secret scan.

## Estado final medido

- Shell: sintaxe válida e nenhuma variável sensível monitorada exportada em shell limpo.
- Claude: 2.1.267, `opus/high`, zero regras locais de allow, quatro plugins de usuário.
- Codex: 0.154.0, `gpt-6-astra/high`, cinco projetos confiáveis explícitos.
- LiqPay: checkout principal e dois worktrees temporários ainda pertencentes a uma sessão ativa.
- QVAC: repositório, LaunchAgent, processo e listener local ausentes.
- Disco de dados: 48 GiB disponíveis, contra cerca de 17 GiB no início desta intervenção.
- Memória: 46% livre no snapshot final. Swap pode demorar a ser devolvido pelo macOS.
- Inicialização do zsh: mediana 44,7 ms e máximo 70,2 ms em 10 amostras após a consolidação.

## Limites e pendências

- O ganho de disco não prova, sozinho, menor latência do modelo.
- Os dois worktrees temporários devem ser retirados pelo processo que os criou quando a sessão terminar.
- Caches de projetos em uso foram preservados.
- Nenhum banco de memória do Codex foi alterado enquanto sessões estavam ativas.
- As credenciais listadas em `ROTATION-REQUIRED.md` precisam ser giradas nos provedores; redigir arquivos locais não invalida credenciais.
- Context7 e Kofre agora exigem `ai-key-load context7` ou `kofre-env-load` antes da sessão que realmente os utiliza.
- O Homebrew pertence corretamente a `felixrodrigues:admin`; o aviso de escrita veio do sandbox. Apenas o PM2 mantém ownership de root e exige a senha local.
- As duas instalações locais do TypeScript são 5.8.3 e byte a byte iguais; a cópia `/usr/local` depende de `sudo` para remoção. O catálogo upstream consultado oferece 7.0.2, que exige teste separado.
- PM2 6.0.5 permanece abaixo do catálogo 7.0.4 e contém 5.082 arquivos com owner `root` no prefixo pessoal. O daemon criado por uma consulta de versão durante a auditoria foi encerrado; corrija ownership antes de testar a atualização.
- Kimi Code 0.28.1 permanece abaixo do catálogo 0.29.0. O `kimi-cli` legado 1.43.0 ocupa aproximadamente 229 MiB; confirme que nenhum fluxo depende dele antes de removê-lo ou migrá-lo.
- O volume continua com 89% de uso. A meta operacional é recuperar mais 20–25 GiB em uma janela própria, revisando dados pessoais e projetos grandes em vez de apagar caches de projetos ativos.
