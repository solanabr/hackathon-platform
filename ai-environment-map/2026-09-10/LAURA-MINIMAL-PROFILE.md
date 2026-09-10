# Perfil mínimo para medir a lentidão

Durante o diagnóstico:

- 1 líder e 0 subagentes para tarefas básicas;
- profundidade máxima 1 somente no experimento específico de delegação;
- 0 worktrees em tarefas somente leitura;
- 1 writer por worktree quando uma mudança exigir isolamento;
- 0 browser, watcher, dev server ou suíte fora da sonda declarada;
- teste focal durante edição e suíte completa uma vez após integração;
- Sonnet/medium na triagem; Opus/xhigh/1M apenas por escolha explícita;
- sessão nova por etapa, sem resume/continue;
- resultados fora do checkout em `~/.local/state/claude-latency-lab/`.

Rollback: feche a sessão de teste, encerre somente os processos que ela criou, restaure o arquivo registrado no plano de mudança e repita o gate. Não copie configuração do Felix; compare mecanismos e métricas.
