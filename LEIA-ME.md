# Kit Codex econômico — Box Enxovais

Copie **os conteúdos** deste ZIP para a **raiz** do repositório, mantendo pastas ocultas `.codex/` e `.agents/`.
Se já existir `AGENTS.md` ou `.codex/config.toml`, faça backup e **mescle** as instruções: não sobrescreva configurações existentes indiscriminadamente.

## Estrutura
- `AGENTS.md`: regras curtas de economia e segurança, carregadas automaticamente.
- `.codex/config.toml`: habilita multiagentes, no máximo 1 simultâneo.
- `.codex/agents/{revisor,testador,infra}.toml`: especialistas disponíveis; solicitados explicitamente.
- `.agents/skills/*/SKILL.md`: procedimentos carregados sob demanda.

## Como chamar (no chat do Codex)
- `Use o agente revisor para revisar somente meu diff atual. Sem editar nem rodar testes.`
- `Use o agente testador para criar os testes mínimos da alteração no login e execute só esses testes.`
- `Use o agente infra em modo consultivo para comparar Docker Compose e deploy. Não altere arquivos.`
- `Implemente esta correção sozinho, sem delegação e sem executar a suíte completa.`

## Dicas
- Reinicie a sessão do Codex se os novos agentes não aparecerem.
- Confira a versão do Codex, pois modelos/subagentes variam conforme instalação e plano.
- Os arquivos **não criam automações** e não fazem mudanças no código por conta própria.
- Economia não é garantida por configuração: subagentes também consomem tokens. Delegue só quando valer a pena.
