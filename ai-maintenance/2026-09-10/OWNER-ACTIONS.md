# Ações que exigem a senha local do Felix

Estas ações não foram executadas porque exigem a senha administrativa digitada pelo dono da máquina. O daemon PM2 órfão já foi encerrado, o autostart foi arquivado e o shell já resolve o TypeScript pessoal em sessões de login e interativas.

O executor faz nova pré-validação, cria backup do TypeScript, pede `sudo` uma vez e não atualiza versões:

```bash
~/ai-maintenance/2026-09-10/owner-finish.sh --check
~/ai-maintenance/2026-09-10/owner-finish.sh --apply
```

O segundo comando deve ser executado pelo Felix em um terminal local. Não cole a senha em uma IA.

## 1. Reparar PM2 no prefixo npm pessoal

O pacote PM2 tem 5.082 arquivos pertencentes a `root` dentro do prefixo npm do usuário.

```bash
sudo chown -R "$USER":staff "$HOME/.npm-global/lib/node_modules/pm2"
sudo chown -h "$USER":staff \
  "$HOME/.npm-global/bin/pm2" \
  "$HOME/.npm-global/bin/pm2-dev" \
  "$HOME/.npm-global/bin/pm2-docker" \
  "$HOME/.npm-global/bin/pm2-runtime"

find "$HOME/.npm-global/lib/node_modules/pm2" ! -user "$USER" -print -quit
```

O último comando deve ficar vazio. O pacote continua em 6.0.5; teste a atualização para 7 em outra janela. Não use `pm2 --version` nesta validação, pois esse comando pode iniciar um daemon; leia a versão no `package.json`.

## 2. Remover a cópia legada do TypeScript em `/usr/local`

As duas instalações locais medidas são 5.8.3 e byte a byte iguais. A resolução atual escolhe `~/.npm-global`; a cópia root-owned em `/usr/local` é redundante. O catálogo upstream consultado oferece 7.0.2, que não deve ser misturado com esta remoção.

```bash
mkdir -p -m 700 "$HOME/ai-maintenance/2026-09-10/backups"
tar -cpf "$HOME/ai-maintenance/2026-09-10/backups/typescript-usr-local-5.8.3.tar" \
  -C /usr/local lib/node_modules/typescript bin/tsc bin/tsserver
chmod 600 "$HOME/ai-maintenance/2026-09-10/backups/typescript-usr-local-5.8.3.tar"

sudo env NPM_CONFIG_PREFIX=/usr/local NPM_CONFIG_USERCONFIG=/dev/null \
  /usr/local/bin/npm uninstall -g typescript

env -i HOME="$HOME" USER="$USER" LOGNAME="$USER" \
  PATH="/usr/bin:/bin:/usr/sbin:/sbin" TERM=dumb SHELL=/bin/zsh \
  /bin/zsh -lc 'command -v tsc; tsc --version'
```

O resultado esperado aponta para `~/.npm-global/bin/tsc`, versão 5.8.3. O rollback está implementado em `owner-finish.sh --rollback-typescript` e recusa sobrescrever uma instalação existente.

## Homebrew

O aviso de “diretórios não graváveis” apareceu porque o `brew doctor` rodou dentro do sandbox. A inspeção de owner confirmou `/opt/homebrew` como `felixrodrigues:admin`, sem itens de outro owner; não execute `chown` no Homebrew.

Persistem fórmulas desatualizadas, uma fórmula depreciada, kegs não ligados e taps que exigem confiança explícita. Faça upgrades em lotes pequenos fora de trabalho ativo. Não desative a verificação de taps e não atualize PostgreSQL, Python, ffmpeg, Ollama ou toolchains em massa.

No npm, upgrades principais de Gemini, PM2, pnpm, TypeScript e Vercel também ficaram pendentes para teste individual. O Playwright MCP já foi atualizado de 0.0.78 para 0.0.80.
