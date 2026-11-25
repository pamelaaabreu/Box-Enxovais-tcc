---
name: testes-sob-demanda
description: "Planejar ou gerar apenas os testes necessários para uma mudança específica no Angular ou Go. Use somente quando testes forem solicitados explicitamente."
---
# Testes sob demanda
1. Localize testes existentes para a função/endpoint alterado.
2. Escolha o menor conjunto que detecta regressões relevantes, com preferência por teste isolado e sem banco externo.
3. Só modifique testes se solicitado; preserve os atuais.
4. Angular: `npx ng test --watch=false --include="src/caminho/componente.spec.ts"` dentro de `frontend`.
5. Go: `go test ./pacote -run 'TestNome' -count=1` dentro de `backend`.
6. Não rode `ng test` geral, `npm run build` ou `go test ./...` sem solicitação explícita. Relate limites de cobertura.

## Referências atuais
- Arquitetura: AGENTS.md, docs/ESTRUTURA_ANGULAR.md e README.md. Angular em features/admin e features/authentication/auth; API net/http em backend/src.
- Banco principal não é alvo de teste de escrita. Preserve migrations, uploads, backups e servidores existentes. Nunca exponha DSNs/credenciais.
- Sem delegação automática; escopo e execução seguem a autorização expressa do usuário.
- PostgreSQL opt-in: CART_TEST_DATABASE_URL e REVIEW_TEST_DATABASE_URL devem apontar para banco descartável; race exige CGO e compilador C, configurados somente no processo. E2E atual: frontend/e2e/frontend-audit.cjs com TestBrowserAuditServer; exige DB_NAME box_frontend_audit_* e AUDIT_ISOLATED_DATABASE correspondente. Não execute sem preparar ambiente isolado.
- Capture resultados reais; não some rodadas sobrepostas. Inspeção visual requer abrir imagens, separadamente dos asserts. Encerre somente processos temporários criados no teste.
