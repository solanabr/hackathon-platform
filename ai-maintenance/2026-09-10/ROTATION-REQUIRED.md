# Rotação obrigatória fora do agente

Material com formato de credencial apareceu em configurações ou históricos locais. Como esses valores entraram em contexto de ferramentas, trate-os como expostos. Não cole os valores antigos ou novos em Claude, Codex, issues ou commits.

Rotacione diretamente nos consoles oficiais:

1. chave da API OpenAI;
2. senha usada por `sshpass` e qualquer conta remota associada;
3. chave ElevenLabs;
4. chave Google/Gemini usada por alias antigo;
5. outras credenciais que os consoles mostrem como utilizadas no mesmo período, se não houver certeza de origem.

Depois da rotação, revogue os valores anteriores, revise logs de uso por horário/origem, teste o novo segredo por referência de Keychain/secret manager e registre apenas ID, data, dono e resultado. A IA pode verificar ausência de literais e referências corretas; não pode confirmar que o provedor revogou um segredo sem evidência do console.

## Estado local verificado em 2026-09-10

- Codex usa autenticação ChatGPT; não há `OPENAI_API_KEY` em `~/.codex/auth.json`, no Keychain ou no processo limpo. Um projeto de transcrição ainda aceita essa variável no runtime, então a nova chave deve ir ao secret manager desse consumidor quando ele for usado.
- `.zshrc` oferece `ai-key-load openai`, `ai-key-load elevenlabs` e `ai-key-load gemini`. Os três itens Keychain estão ausentes; o agente não criou credenciais.
- A sessão longa atual ainda herdou valores antigos de ElevenLabs e Gemini. Encerre e reabra Claude/Codex e terminais após a rotação; `unset` em um subprocesso não consegue limpar o processo-pai.
- O acesso SSH já possui uma identidade dedicada e permite abandonar `sshpass`. Valide a chave em uma segunda sessão e mantenha acesso de resgate antes de trocar a senha remota.

## Ordem sem interrupção

1. Crie a nova credencial no console mantendo a antiga ativa e registre somente ID, data e dono.
2. Grave o novo valor por prompt oculto do Keychain ou no secret manager do runtime; nunca passe o valor como argumento, chat ou arquivo versionado.
3. Abra um processo limpo, carregue a referência e faça um smoke que descarte o corpo da resposta.
4. Reinicie somente consumidores long-lived que herdaram a variável antiga.
5. Revogue o ID antigo no console e revise logs de uso por ID, origem e horário.
6. Registre o resultado sem copiar o segredo.
