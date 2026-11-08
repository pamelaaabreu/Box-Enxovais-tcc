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
