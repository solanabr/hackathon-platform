# Ações que exigem a senha local do Felix

Estas ações não foram executadas porque `sudo -n` confirmou que a senha administrativa é necessária. Feche npm e PM2 antes de rodá-las.

## 1. Reparar PM2 no prefixo npm pessoal

O pacote PM2 tem 5.082 arquivos pertencentes a `root` dentro do prefixo npm do usuário.

```bash
sudo chown -R "$USER":staff "$HOME/.npm-global/lib/node_modules/pm2"
sudo chown -h "$USER":staff \
  "$HOME/.npm-global/bin/pm2" \
  "$HOME/.npm-global/bin/pm2-dev" \
  "$HOME/.npm-global/bin/pm2-docker" \
  "$HOME/.npm-global/bin/pm2-runtime"

find "$HOME/.npm-global" -xdev ! -user "$USER" -print
```

O último comando deve ficar vazio. Depois decida se atualiza PM2 6 para 7 em uma janela própria.

## 2. Remover a cópia legada do TypeScript em `/usr/local`

As duas instalações locais medidas são 5.8.3 e byte a byte iguais. A resolução atual escolhe `~/.npm-global`; a cópia root-owned em `/usr/local` é redundante. O catálogo upstream consultado oferece 7.0.2, que não deve ser misturado com esta remoção.

```bash
sudo env NPM_CONFIG_PREFIX=/usr/local npm uninstall -g typescript
env -i HOME="$HOME" USER="$USER" \
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
  SHELL=/bin/zsh /bin/zsh -lic 'which -a tsc; tsc --version'
```

## Homebrew

O aviso de “diretórios não graváveis” apareceu porque o `brew doctor` rodou dentro do sandbox. A inspeção de owner confirmou `/opt/homebrew` como `felixrodrigues:admin`, sem itens de outro owner; não execute `chown` no Homebrew.

Persistem fórmulas desatualizadas, uma fórmula depreciada, kegs não ligados e taps que exigem confiança explícita. Faça upgrades em lotes pequenos fora de trabalho ativo. Não desative a verificação de taps e não atualize PostgreSQL, Python, ffmpeg, Ollama ou toolchains em massa.

No npm, upgrades principais de Gemini, PM2, pnpm, TypeScript e Vercel também ficaram pendentes para teste individual. O Playwright MCP já foi atualizado de 0.0.78 para 0.0.80.
