# Resumo executivo

1. O baseline do Felix também é pesado; ele não deve ser copiado para Laura.
2. Felix usa Claude `opus[1m]` com effort `xhigh` como default estrutural.
3. Há 271 skills pessoais candidatas à seleção automática; runtime mediano 318, máximo 392.
4. As 14 skills Superpowers também existem no catálogo pessoal, criando sobreposição.
5. A telemetria de 202 workflows mostra mediana de 3m46s e p95 de 19m21s.
6. Dez workflows passaram de 20 minutos e oito passaram de 40.
7. Fan-out mediano foi 11,5 agentes e chegou a 59; o número não prova simultaneidade.
8. Subagentes podem delegar novamente; a política interna limita profundidade a 1.
9. Cache read mediano foi 371 mil tokens; p95 916 mil.
10. Compactações próximas de 1 milhão de tokens levaram 94–182 segundos.
11. O scanner síncrono mede ~0,17 s em input curto e ~6,37 s em Write de 100 linhas.
12. Shell, startup do CLI e rede básica mediram milissegundos; não sustentam espera universal de 20–40 min.
13. Disco em 97%, swap usado e browsers/IDE aumentam a cauda, sem provar a causa principal.
14. LiqPay tem 15 worktrees/18,7 GiB; nenhuma secundária era CWD de agente no snapshot.
15. Na Laura, worktrees só explicam lentidão se houver agentes, watchers, browsers ou testes associados.
16. O pacote coleta configuração e topologia sem exportar prompts, paths, PIDs ou credenciais.
17. O teste decisivo compara FULL, SAFE, NO_SKILLS e NO_MCP com modelo/effort fixos.
18. Microsondas isolam overhead; uma fixture E2E confirma o efeito no fluxo visual real.
19. A remediação reduz uma camada por vez e preserva scanner, permissões e testes relevantes.
20. A causa na Laura permanece hipótese até o relatório redigido e os A/B dela.
