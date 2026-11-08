# Paginação e filtros

As listagens `GET /products` e `GET /api/promotions/{nome}` usam o mesmo serviço de paginação no PostgreSQL.

- `offset`: inteiro de 0 a 2147483647, padrão 0.
- `limit`: inteiro de 1 a 100, padrão 20.
- Ordem estável por ID do produto, crescente.
- Filtros são combinados com AND. Parâmetros repetidos/desconhecidos, vazios, tipos inválidos e operadores incompatíveis retornam HTTP 400.
- O total é calculado depois dos filtros e antes do limite. Contagem e página são lidas na mesma transação/snapshot.
- Offset além do total retorna `items: []`, mantendo o total real.

## Contrato

```json
{
  "items": [],
  "pagination": { "offset": 0, "limit": 20, "total": 0, "hasMore": false }
}
```

A resposta das duas listagens mudou de array para esse objeto. Consumidores externos precisam atualizar a leitura para `items`.

## Exemplos

```text
/products?offset=20&limit=20
/products?name__contains=cama&stock__gte=1&price__lte=299.90
/products?product_type_id=2&created_at__gte=2026-01-01T00%3A00%3A00Z
/api/promotions/Novidades?offset=0&limit=6&promotional_price__lte=150
```

Campos públicos habilitados:

| Campos | Tipo | Operadores |
| --- | --- | --- |
| id, quantity, stock, brand_id, product_type_id | inteiro | eq, gt, gte, lt, lte |
| price; promotional_price apenas em promoções | decimal (até 2 casas, ponto decimal) | eq, gt, gte, lt, lte |
| name, description, care_instructions, status, category_name | texto | eq, contains |
| created_at, updated_at | data RFC3339 | eq, gt, gte, lt, lte |

Sem sufixo, usa igualdade (`status=active` equivale a `status__eq=active`). `contains` ignora maiúsculas/minúsculas e trata `%` e `_` como caracteres literais. `stock` corresponde à coluna `products.quantity`; `category_name` corresponde a `product_types.name`.

Os filtros não substituem regras de acesso: a listagem pública de produtos continua restrita a status `active`. Promoções continuam restritas ao nome solicitado e à promoção ativa. Nomes SQL vêm exclusivamente do mapa de campos definido no servidor, e valores são parâmetros. Não existe exposição automática de todas as colunas do banco; um novo campo público exige cadastro explícito no mapa.

## Angular

`PaginationService.getPage<T>(url, { offset, limit, filters })` e os métodos `ProductService.getProductsPage`/`PromoService.getPromotionalProductsPage` expõem metadados às telas que usam páginas.

Os métodos existentes que retornam arrays mantêm compatibilidade, carregando sequencialmente as páginas com `getAll`. Dessa forma, a filtragem atual das categorias e as grades existentes não perdem produtos. Destaques consultam somente seis registros. Não foram adicionados controles visuais de paginação nem alterado o layout.

## Recursos que não são listagens

`GET /products/{id}` continua retornando um produto. `GET /cart` continua retornando o agregado completo do usuário autenticado, com todos os itens e totais; não foi truncado nem teve sua validação de estoque alterada. Arquivos estáticos também não são paginados.

## Arquivos desta implementação

Novos:
- backend/src/pagination/pagination.go
- backend/src/pagination/pagination_test.go
- backend/src/routes/pagination_test.go
- frontend/src/app/core/services/pagination.service.ts
- frontend/src/app/core/services/pagination.service.spec.ts
- docs/pagination.md

Alterados:
- backend/src/handlers/productHandler.go
- backend/src/handlers/promotionHandler.go
- backend/src/routes/cart_test.go (reutiliza o schema isolado para a integração das listagens)
- frontend/src/app/core/services/product.service.ts
- frontend/src/app/core/services/promo.service.ts
- frontend/src/app/features/featured-products/featured-products.component.ts

Sem migrations ou dependências novas.

## Verificação

Backend: `CART_TEST_LOCAL=1 go test -count=1 ./...` no ambiente local configurado; alternativamente `CART_TEST_DATABASE_URL` para outro PostgreSQL de teste. A integração usa schema descartável, executa migrations e valida páginas, contagem, filtros, galeria, promoções e entradas inválidas. Sem configuração, o teste de integração é explicitamente pulado.

Frontend: `node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless` e `npm run build`.

Resultado desta implementação: testes Go com PostgreSQL local e `go build ./...` aprovados; 50 testes Angular aprovados; build Angular aprovado com os avisos preexistentes de budgets, CommonJS e seletores de CSS.
