# Box Enxovais — instruções mínimas para Codex

Projeto: e-commerce Angular (frontend), Go + net/http (backend), PostgreSQL. Preserve a arquitetura e o visual já existentes.

## Operação econômica
- Trabalhe com o agente principal por padrão. **Nunca crie subagentes automaticamente**; só quando eu pedir explicitamente `revisor`, `testador` ou `infra`.
- Leia primeiro o arquivo citado e suas dependências diretas; evite varrer o repositório, reler arquivos inteiros ou pesquisar a web sem necessidade.
- Faça a menor alteração que resolva o pedido. Não reformate, refatore ou atualize dependências fora do escopo.
- Não execute a suíte completa, builds repetidos ou testes de integração sem pedido explícito. Prefira uma verificação direcionada; se o risco justificar testes mais amplos, explique antes.
- Não gere documentação longa, relatórios, imagens ou arquivos auxiliares sem pedido.
- Responda de forma breve: arquivos modificados, motivo, testes executados (ou não) e riscos pendentes.
- Não afirme que testes passaram sem executá-los. Não inclua segredos, tokens, senhas nem dados de clientes em logs.

## Cuidados técnicos
- Angular: preserve Reactive Forms, Signals, guards, interceptors, rotas, responsividade e acessibilidade quando pertinentes. Login e cadastro usam `AuthComponent` em `frontend/src/app/features/authorization/register`.
- Go: segurança e autorização **sempre validadas no backend**; não dependa de botões desabilitados nem de guards Angular. Preserve contratos HTTP e migrações existentes.
- Se o pedido for só discutir ou revisar, **não edite nada**.

## Especialistas opcionais (somente sob comando)
- `revisor`: auditoria de diff sem editar; use skill `revisao-cirurgica`.
- `testador`: proponha/implemente testes mínimos; use skill `testes-sob-demanda`.
- `infra`: discuta infraestrutura, riscos e opções; use skill `infra-planejamento`; não execute comandos de deploy.
- Nunca acione todos em cadeia por padrão. Se bastar uma resposta rápida do agente principal, não delegue.
