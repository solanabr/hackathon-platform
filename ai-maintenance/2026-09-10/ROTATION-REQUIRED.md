# Rotação obrigatória fora do agente

Material com formato de credencial apareceu em configurações ou históricos locais. Como esses valores entraram em contexto de ferramentas, trate-os como expostos. Não cole os valores antigos ou novos em Claude, Codex, issues ou commits.

Rotacione diretamente nos consoles oficiais:

1. chave da API OpenAI;
2. senha usada por `sshpass` e qualquer conta remota associada;
3. chave ElevenLabs;
4. chave Google/Gemini usada por alias antigo;
5. outras credenciais que os consoles mostrem como utilizadas no mesmo período, se não houver certeza de origem.

Depois da rotação, revogue os valores anteriores, revise logs de uso por horário/origem, teste o novo segredo por referência de Keychain/secret manager e registre apenas ID, data, dono e resultado. A IA pode verificar ausência de literais e referências corretas; não pode confirmar que o provedor revogou um segredo sem evidência do console.
