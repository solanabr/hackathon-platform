# Estado do Felix após a limpeza

**Snapshot:** 2026-09-10, posterior ao baseline histórico.
**Escopo:** configuração e recursos locais; não prova desempenho da Laura.

- Claude Code 2.1.267, `opus/high`, prompts de segurança ativos e zero regras na allowlist local.
- 49 skills válidas (43 físicas e 6 links) e quatro plugins ativos no escopo de usuário.
- Codex 0.154.0, `gpt-6-astra/high`, cinco trusts explícitos.
- LiqPay somente com o checkout principal; as branches dos dois últimos worktrees removidos foram preservadas.
- QVAC local e seu LaunchAgent removidos.
- Shell limpo sem variáveis sensíveis monitoradas exportadas.
- Shells não-login, login e interativos resolvem `node` e o `tsc` pessoal; a duplicata `/usr/local` foi arquivada com checksum e removida.
- PM2 sem daemon, PID, sockets ou autostart ativo; ownership do pacote e dos links corrigido para o usuário.
- 48 GiB livres no volume de dados; aproximadamente 31 GiB recuperados nesta intervenção.
- Históricos receberam passes de redação e JSONL foi revalidado; sessões ativas exigem scan final ao encerrar.

Detalhes, limites e scripts estão em `../../ai-maintenance/2026-09-10/`.
A coleta estrutural pós-limpeza está em `evidence/felix-post-cleanup.redacted.json` e passou no validador do pacote.
