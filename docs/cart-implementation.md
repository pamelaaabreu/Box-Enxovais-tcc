# Carrinho — Box Enxovais

Implementação autenticada, sem checkout, endereço ou pagamento.

## Contrato

As rotas usam o JWT existente (Authorization: Bearer). O usuário vem exclusivamente do contexto validado pelo middleware.

- GET /cart
- POST /cart/items: {"productId": 10, "quantity": 1}
- PATCH /cart/items/:id: {"quantity": 3}
- DELETE /cart/items/:id
- DELETE /cart

Sucesso: {"success": true, "data": {"items": [], "totalItems": 0, "total": 0.00}}.
Itens incluem id, productId, name, image, quantity, stock, available, unitPrice e subtotal.
Erro: envelope existente com success:false e message. Status 400 para corpo inválido, 401 sem autenticação, 404 item que não pertence ao carrinho, 409 indisponibilidade/estoque, 500 erro interno.

Preço e proprietário nunca são aceitos no body. Campos extras são rejeitados. Valores são lidos do NUMERIC do PostgreSQL e calculados como centavos inteiros; promoções ativas dentro da vigência são consultadas no servidor. O carrinho não reserva estoque. GET reflete preço/estoque atuais; itens indisponíveis podem ser removidos.

## Persistência

Migration 000003 cria carts (user_id único) e cart_items (cart_id/product_id únicos). Operações bloqueiam a linha do carrinho dentro de uma transação, evitando duplicações e perda de atualizações concorrentes.

No banco local, a migration foi aplicada com golang-migrate e a versão 3 foi confirmada sem dirty flag. Outros ambientes devem executar as migrations usando o procedimento de backend/migrations/README.md.

## Frontend

/cart usa authGuard. CartService centraliza Signals, respostas confirmadas pela API, fila de alterações e feedback por produto. O badge soma quantidades; login/logout reiniciam o estado e cancelam requisições da sessão anterior. Usuários não autenticados são encaminhados para login; não há carrinho anônimo nem adição automática posterior ao login.

Os botões existentes no detalhe, destaques e promoções foram conectados. Os cards do catálogo mantêm o link para o detalhe. A página reutiliza CatalogLayoutComponent e os elementos de marca existentes, com itens/resumo em colunas no desktop e empilhados no mobile.

O catálogo de demonstração foi retirado do serviço em produção para não misturar seus IDs com IDs reais. ProductService usa GET /products e GET /products/:id. URLs de detalhes aceitam ID ou nome-ID. Não foram criadas variantes fictícias: o banco atual não possui cor/tamanho/estoque por variante.

As categorias da navegação são associadas ao nome de product_types. O banco local contém apenas “Tipo 1” e “Tipo 2”: é necessário cadastrar/associar as categorias reais para preencher Cama, Toalhas etc. Não foi feita associação arbitrária. Produtos continuam acessíveis pelos destaques e por /produto/:id. Antigos slugs demonstrativos sem ID não representam produtos reais e retornam 404.

## Testes

### Verificação confirmada em 06/10/2026 (America/Sao_Paulo)

Foram lidos este documento, os READMEs da raiz, frontend e migrations e o procedimento em `backend/src/routes/cart_test.go`. Nenhum `AGENTS.md` foi encontrado no repositório.

| Verificação | Comando executado | Resultado confirmado |
| --- | --- | --- |
| Angular (diretório `frontend`) | `node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless` | **Aprovado**: 60 testes, 0 falhas, Chrome Headless 154, saída 0. |
| Build frontend (`frontend`) | `npm run build` | **Aprovado com avisos**: saída 0, artefatos em `frontend/dist/frontend`. |
| Testes Go (`backend`) | `go test -count=1 -v ./...` | **Aprovado**: 11 testes principais e 8 subtestes aprovados; `TestCartPostgres` explicitamente pulado nesta rodada sem configuração de integração. Saída 0. |
| Build Go (`backend`) | `go build ./...` | **Aprovado**: saída 0. |
| Integração PostgreSQL (`backend`) | `$env:CART_TEST_LOCAL='1'; go test -count=1 -v ./routes -run '^TestCartPostgres$'` | **Aprovado**: `TestCartPostgres` executado, incluindo 16 subtestes de listagem/paginação e as verificações de carrinho no corpo do teste. Saída 0. |
| Revisão visual desktop/mobile e fluxo completo no navegador local | Não executado nesta rodada | **Pendente / não executado**. Não considerado aprovado por testes automatizados. |

Os comandos Go usaram `-count=1` para evitar aprovação baseada em resultados de testes em cache. Antes da rodada geral, `CART_TEST_LOCAL` e `CART_TEST_DATABASE_URL` foram removidas apenas do ambiente do processo de execução. Depois foi definido `CART_TEST_LOCAL=1` para executar a integração local separadamente. Não houve alteração de `.env` ou de configuração persistente.

### Isolamento da integração

O teste cria um schema temporário exclusivo `cart_test_*`, aplica as migrations 000001–000003 nesse schema, usa usuários/produtos próprios e executa a limpeza prevista ao terminar. As migrations não foram aplicadas ao schema real da aplicação. Não foram alterados dados reais.

A integração exercita handlers autenticados contra PostgreSQL: duplicação, soma, quantidade, estoque, status, remoção, limpeza, isolamento entre usuários, rejeição de preços externos, adições concorrentes, estoque alterado após carregar o produto e preços promocionais válidos/expirados. Os 16 subtestes nomeados adicionais cobrem listagens e paginação; as operações do carrinho são verificadas dentro do teste principal e não correspondem a 16 testes separados de carrinho.

Procedimento alternativo documentado: configurar `CART_TEST_DATABASE_URL` para um PostgreSQL de testes. Essa alternativa não foi executada nesta rodada.

### Limites da validação e avisos

Os testes Angular usam transporte HTTP simulado e componentes/templates reais. Eles validam estado, badge, interações de quantidade, feedback, remoção e falhas, mas não substituem o fluxo completo frontend + API real no navegador nem a revisão visual responsiva. Não foi feita nova tentativa de acesso ao navegador local nesta rodada; o bloqueio mencionado em rodadas anteriores não foi revalidado.

Avisos observados no build frontend, sem falha de compilação:

- Bundle inicial: 856,26 kB, acima do orçamento de aviso de 500 kB.
- `register.component.scss`: 15,44 kB, acima do orçamento de aviso de 14 kB.
- Dependência `sweetalert2` em CommonJS.
- Quatro regras CSS ignoradas por erros de seletor (`.form-floating` e variantes de `.btn-group`).

Nenhum teste ou build falhou ou ficou bloqueado nesta execução. Não foi necessária correção de código. Somente esta seção de documentação foi atualizada; regras de negócio e estrutura visual foram preservadas.

Pendências: validar manualmente login → produto → adicionar → badge → carrinho → aumentar/diminuir → remover → adicionar novamente → limpar, em desktop/mobile; avaliar os avisos do build separadamente.

## Arquivos criados

- backend/src/models/cart.go
- backend/src/repositories/cart_repository.go
- backend/src/handlers/cartHandler.go
- backend/src/routes/cart.go
- backend/src/routes/cart_test.go
- backend/migrations/000003_cart.up.sql
- backend/migrations/000003_cart.down.sql
- frontend/src/app/core/interfaces/cart.interface.ts
- frontend/src/app/core/services/cart.service.ts
- frontend/src/app/core/services/cart.service.spec.ts
- docs/cart-implementation.md

## Arquivos alterados nesta etapa

- backend/src/main.go
- backend/src/models/product.go
- backend/src/handlers/productHandler.go
- backend/src/routes/products.go
- frontend/src/app/shared/models.ts
- frontend/src/app/core/services/product.service.ts
- frontend/src/app/app.routes.ts
- frontend/src/app/components/top-navbar/top-navbar.component.ts
- frontend/src/app/components/top-navbar/top-navbar.component.html
- frontend/src/app/features/cart/cart.component.ts
- frontend/src/app/features/cart/cart.component.html
- frontend/src/app/features/cart/cart.component.css
- frontend/src/app/features/cart/cart.component.spec.ts
- frontend/src/app/features/catalog/services/catalog.service.ts
- frontend/src/app/features/catalog/services/catalog.service.spec.ts
- frontend/src/app/features/catalog/pages/product-detail/product-detail.component.ts
- frontend/src/app/features/catalog/pages/product-detail/product-detail.component.html
- frontend/src/app/features/catalog/pages/product-detail/product-detail.component.spec.ts
- frontend/src/app/features/featured-products/featured-products.component.ts
- frontend/src/app/features/featured-products/featured-products.component.html
- frontend/src/app/features/promo-grid/promo-grid.component.ts
- frontend/src/app/features/promo-grid/promo-grid.component.html


## Validação do estoque no cadastro

A validação de `products.quantity` no cadastro e a migration 000004 estão documentadas em [Validação de estoque no cadastro](product-stock-validation.md), com os resultados executados em 06/10/2026. A migration foi testada em schema temporário e posteriormente aplicada ao banco local bd_box em 06/10/2026, com versão 4 e dirty=false; nenhuma unidade é reservada ou descontada pelo carrinho.
