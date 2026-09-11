# Ações administrativas do Mac do Felix

**Status em 2026-09-11: concluídas e verificadas.** Felix executou `owner-finish.sh --apply` no terminal local. O executor não atualizou versões.

## 1. PM2 no prefixo npm pessoal — concluído

Os 5.082 itens e os quatro links do PM2 agora pertencem a `felixrodrigues:staff`. O LaunchAgent continua arquivado e não há daemon, PID ou sockets PM2. O pacote permanece em 6.0.5; qualquer atualização para 7 deve ocorrer em outra janela.

Não use `pm2 --version` como verificação, pois esse comando pode iniciar um daemon. Leia a versão no `package.json`.

## 2. TypeScript redundante em `/usr/local` — concluído

A cópia de sistema 5.8.3, antes confirmada como idêntica à cópia pessoal, foi removida. Shells não-login, login e interativos resolvem `node` em `/usr/local/bin` e `tsc` em `~/.npm-global/bin/tsc`, versão 5.8.3.

O backup íntegro e privado está em `~/ai-maintenance/2026-09-10/backups/typescript-usr-local-5.8.3.tar`. O rollback permanece disponível em:

```bash
~/ai-maintenance/2026-09-10/owner-finish.sh --rollback-typescript
```

Ele valida o checksum e recusa sobrescrever uma instalação existente.

## Homebrew

O aviso de “diretórios não graváveis” apareceu porque o `brew doctor` rodou dentro do sandbox. A inspeção de owner confirmou `/opt/homebrew` como `felixrodrigues:admin`, sem itens de outro owner; não execute `chown` no Homebrew.

Persistem fórmulas desatualizadas, uma fórmula depreciada, kegs não ligados e taps que exigem confiança explícita. Faça upgrades em lotes pequenos fora de trabalho ativo. Não desative a verificação de taps e não atualize PostgreSQL, Python, ffmpeg, Ollama ou toolchains em massa.

No npm, upgrades principais de Gemini, PM2, pnpm, TypeScript e Vercel também ficaram pendentes para teste individual. O Playwright MCP já foi atualizado de 0.0.78 para 0.0.80.
