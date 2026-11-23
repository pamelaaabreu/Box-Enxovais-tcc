# Guia de estudos do backend da Box Enxovais

Revisão estrutural de 22/11/2026. Este guia descreve o código existente, sem propor novas funcionalidades. Os nomes HTTP, JSON e PostgreSQL foram preservados.

## 1. Mapa das responsabilidades

| Pasta | Responsabilidade no projeto |
| --- | --- |
| `src/models` | Entidades, contratos de entrada e saída, filtros e tipos de valor. |
| `src/repositories` | SQL, leitura de resultados, persistência e transações PostgreSQL. |
| `src/services` | Validação e processamento das operações. |
| `src/handlers` | Leitura de requisições HTTP e produção de respostas. |
| `src/routes` | Registro dos caminhos e aplicação dos middlewares. |
| `src/middleware` | Autenticação, autorização e restrições de método. |
| `src/pagination` | Infraestrutura compartilhada de filtros, ordenação e paginação. |
| `src/response` | Respostas JSON e mensagens HTTP padronizadas. |
| `src/config` | Carregamento e validação de configurações. |
| `src/db` | Configuração e abertura do pool PostgreSQL. |
| `src/templates` | Templates de e-mails já utilizados pela aplicação. |
| `src/main.go` | Montagem das dependências e ciclo de vida do servidor. |
| `cmd/import-catalog` | Programa de importação: manifesto, arquivos, persistência e coordenação CLI. |
| `migrations` | Evolução versionada do schema; nenhum arquivo foi alterado nesta refatoração. |

Models descrevem dados. Um repository sabe buscar ou gravar esses dados. O service decide se uma operação é válida. O handler traduz a operação para HTTP. Routes conectam o caminho ao handler. Essa separação permite estudar uma etapa sem misturar SQL, validação e respostas HTTP no mesmo arquivo.

Nem todo `struct` pertence a models. `ProductRepository` contém uma dependência (`*sql.DB`), portanto permanece em repositories. `AuthService` contém dependências e configurações. Os tipos privados do importador pertencem ao seu formato de arquivo, sem necessidade de se tornarem contratos da API. Pequenos corpos locais de requisição continuam no handler quando não justificam um tipo compartilhado.

O projeto já possui algumas operações simples em que o handler consulta um repository diretamente, como Home. A revisão preservou essa arquitetura; não criou services que apenas repetiriam chamadas.

## 2. Caminho de uma requisição

```text
Angular → HTTP → routes/middleware → handler → service → repository → PostgreSQL
                                      ↓                         ↑
                                response.JSON ← models/resultados
```

A autorização é validada na API. Em `routes/route_helpers.go`, `adminRoute` combina `AuthMiddleware`, `AdminMiddleware` e a restrição do método. Esconder um botão no Angular não substitui essa proteção.

`r.Context()` acompanha a requisição até o banco. Falhas são retornadas como `error`; o handler seleciona a mensagem e o código HTTP apropriados. Não se devem registrar senhas, tokens ou dados pessoais para depurar esse fluxo.

## 3. Exemplo real: criação de produto

1. `routes/products.go` registra a criação em `/products` por `adminRoute`, com método POST.
2. `handlers/product_create.go`, em `CreateProduct`, decodifica o JSON. `Quantity *int32` permite distinguir quantidade ausente de quantidade zero.
3. `services/product_creation_service.go`, em `ProductService.Create`, valida variantes, quantidade e formato do SKU quando informado. Com variantes, calcula o menor preço e soma o estoque conforme a regra já existente.
4. `repositories/product_creation_repository.go`, em `ProductRepository.Create`, serializa as características e abre uma transação.
5. A inserção em `products` utiliza `RETURNING id`. As variantes são inseridas na mesma transação. O SKU vazio segue para a geração PostgreSQL já existente.
6. Após `Commit`, o handler devolve o identificador. O contrato de criação continua devolvendo `id`; não foi acrescentado outro formato de resposta.

Os métodos `Create` de service e repository possuem receivers diferentes, portanto não são funções duplicadas: cada um realiza sua própria etapa. Edição, imagens, filtros e relações coordenadas continuam nos arquivos especializados já existentes.

## 4. Exemplo real: avaliações de compra

As rotas estão em `routes/home.go`:

- `GET /home/reviews`: leitura pública das avaliações elegíveis.
- `GET` e `POST /orders/{id}/review`: consulta e envio pelo cliente autenticado.
- `GET /admin/experience-reviews` e `PATCH /admin/experience-reviews/{id}`: administração protegida.

`handlers/home_reviews.go` interpreta a requisição. `services/review_service.go` valida as notas de 1 a 5, os critérios opcionais e o comentário de até 1000 caracteres, preservando as mensagens originais. `repositories/home_reviews_repository.go` consulta a elegibilidade do pedido e persiste a avaliação.

A consulta pública exige, simultaneamente:

```sql
WHERE r.status = 'approved'
    AND r.publication_consent
    AND o.status = 'simulated_approved'
    AND o.stock_debited
```

Uma avaliação pendente ou rejeitada não é pública. Ao reabrir uma avaliação aprovada para `pending`, ela deixa de atender ao filtro. O cliente deve ser dono do pedido, e o pedido deve ser elegível. A criação mantém o bloqueio `FOR UPDATE` no pedido e `ON CONFLICT (order_id) DO NOTHING`; zero linhas afetadas gera `ErrReviewDuplicate`. A refatoração não flexibilizou essas regras.

## 5. Conceitos Go com exemplos do projeto

### Struct e campos

Um `struct` agrupa campos relacionados. Em `models/email_recipient.go`:

```go
type EmailRecipient struct {
    Name  string
    Email string
}
```

`Name` e `Email` iniciam com maiúscula e são exportados. Tags como ``json:"resetToken"`` determinam o nome externo de um campo; renomear uma variável Go não autoriza mudar essa tag.

### Métodos e receiver

Em `repositories/user_contact_repository.go`, o receiver associa o método ao repository:

```go
func (repo UserRepository) GetEmailRecipient(ctx context.Context, userID int) (models.EmailRecipient, error)
```

`repo` fornece acesso a `repo.DB`. O método devolve dois valores: o destinatário e um erro. `if err != nil` deve ser tratado antes de usar o resultado.

### Interfaces

Uma interface descreve operações, sem exigir uma implementação específica. `scanCustomer`, em `repositories/admin_customers.go`, recebe `interface{ Scan(...any) error }`. Tanto uma linha individual quanto um cursor de linhas podem satisfazer esse contrato. Go verifica a compatibilidade pelos métodos, sem uma declaração `implements`.

### Ponteiros e ausência

`*models.ExperienceReview` permite normalizar o comentário no objeto recebido. `*int`, `*int32` e `*bool` também representam ausência: `nil` é diferente de zero ou `false`. Isso é importante na validação de estoque e das faixas de CEP. Não desreferencie um ponteiro antes de verificar se ele existe.

### Slices

`[]models.ExperienceReview` é uma sequência de avaliações. `append(reviews, review)` acrescenta um elemento. O repository inicializa `reviews := []models.ExperienceReview{}` para manter uma lista vazia no JSON em vez de mudar o contrato para `null`. Um slice contém uma referência ao armazenamento de elementos; ele não é um array de tamanho fixo.

### Context

`context.Context` transporta cancelamento e limites de tempo, não um cliente de banco. Os métodos recebem `ctx` e usam `QueryContext`, `QueryRowContext` e `ExecContext`. Não substitua `r.Context()` por `context.Background()` numa operação HTTP normal. O envio de e-mail de pedido possui contexto próprio limitado porque ocorre após a operação comercial e segue o fluxo já implementado.

### Erros e defer

`errors.Is(err, sql.ErrNoRows)` identifica uma ausência conhecida, inclusive quando houver encapsulamento do erro. `defer rows.Close()` libera o cursor ao sair. `defer tx.Rollback()` protege caminhos de erro; depois de um `Commit` bem-sucedido, ele não desfaz a transação concluída.

## 6. database/sql e transações

`*sql.DB` é um pool de conexões, não uma única conexão permanente. `db.Open` monta a conexão a partir de `db.Config` e verifica a disponibilidade com timeout.

| Método | Uso real |
| --- | --- |
| `BeginTx(ctx, options)` | Inicia uma operação transacional. |
| `QueryContext(ctx, sql, args...)` | Consulta várias linhas; exige percorrer `Next`, usar `Scan`, verificar `Err` e fechar o cursor. |
| `QueryRowContext(ctx, sql, args...)` | Consulta uma linha; a execução e a ausência são observadas em `Scan`. Também recebe `INSERT ... RETURNING`. |
| `ExecContext(ctx, sql, args...)` | Gravação sem cursor de resultados; permite consultar `RowsAffected`. |
| `Scan(&campo, ...)` | Copia colunas para os destinos na mesma ordem do SELECT. |
| `Commit()` | Confirma todas as operações da transação. |
| `Rollback()` | Abandona as alterações da transação ainda aberta. |

Exemplo real da consulta do destinatário:

```go
err := repo.DB.QueryRowContext(ctx, `SELECT
    full_name,
    email
FROM users
WHERE id = $1`, userID).Scan(&recipient.Name, &recipient.Email)
```

`$1` recebe `userID` separadamente. Não concatene valores fornecidos pelo cliente no SQL. Na infraestrutura de paginação, colunas e ordenações vêm de mapeamentos controlados pelo servidor; os valores permanecem parametrizados.

Na criação de produto, produto e variantes precisam confirmar juntos. No checkout, a transação protege pedido, preços e estoque conforme as regras existentes. `FOR UPDATE` bloqueia linhas durante operações concorrentes. Consultas de paginação usam uma transação somente leitura com `RepeatableRead` para contar e ler a página no mesmo snapshot.

## 7. Como ler o SQL

- **SELECT / Scan:** a ordem das colunas é parte do contrato interno com o leitor Go. `storeProductColumns` deve acompanhar `scanStoreProduct`.
- **JOIN:** combina registros relacionados. Avaliações usam `JOIN checkout_orders o ON o.id = r.order_id`; sem pedido correspondente, não há linha resultante.
- **LEFT JOIN:** preserva o registro à esquerda mesmo sem correspondência. Relatórios utilizam isso para apresentar produtos e clientes com dados complementares opcionais.
- **CTE / WITH:** nomeia um resultado intermediário. `repositories/reports.go` cria `orders`, `filtered` e `page`; `report_inventory.go` compartilha o cálculo de inventário.
- **CASE:** escolhe uma expressão conforme uma condição. O relatório de estoque distingue `out`, `low` e `available`; a ordenação coordenada prioriza famílias visuais.
- **EXISTS:** testa a existência de registros. A Home exige produtos elegíveis para mostrar uma campanha.
- **GROUP BY:** agrupa linhas para agregações, como unidades e receita por produto nos relatórios.
- **COALESCE:** seleciona o primeiro valor não nulo, por exemplo estoque de variantes ou estoque geral.
- **json_agg / json_build_object / jsonb_build_object:** montam listas e objetos no banco, consumidos pelos modelos Go. As chaves JSON existentes foram preservadas.
- **OVER / PARTITION BY:** calculam resultados por grupo sem reduzir as linhas, usados na coordenação dos produtos e em participações nos relatórios.
- **RETURNING:** devolve dados da gravação, como o novo identificador do produto.
- **ON CONFLICT:** trata uma restrição de unicidade; na avaliação duplicada, não insere novamente.
- **Casts:** `::bigint`, `::jsonb` e demais conversões fazem parte do cálculo ou tipo esperado; foram mantidos.
- **ORDER BY:** a última coluna pode desempatar a ordenação. Não a remova por parecer redundante.

Consultas compostas devem ser lidas na ordem da concatenação. A formatação de cada fragmento precisa preservar os separadores entre palavras e os marcadores usados pelo Go: `$%d` em `fmt.Sprintf` não pode virar `$ % d`.

## 8. Importador de catálogo

A organização de `cmd/import-catalog` agora separa:

- `main.go`: flags, coordenação e modo de execução.
- `manifest.go`: tipos privados e leitura/validação do manifesto.
- `assets.go`: preparação, inspeção e escrita dos arquivos de imagem.
- `persistence.go`: consultas, transações e persistência da importação.
- `main_test.go`: testes existentes, com referências atualizadas aos nomes privados.

O executável continua sendo o pacote, por exemplo `go run ./cmd/import-catalog -help` a partir de backend. Nenhuma importação foi executada contra o catálogo principal nesta tarefa. As opções e proteções de destino existentes foram mantidas.

## 9. Glossário

| Nome | Significado |
| --- | --- |
| `ctx` | Contexto da operação. |
| `err` | Erro retornado por uma função. |
| `db` / `database` | Pool de conexões SQL. |
| `repo` | Receiver de um repository. |
| `tx` | Transação SQL. |
| `rows` | Cursor com várias linhas SQL. |
| `query` | Comando SQL a executar. |
| `queryPrefix` | Parte inicial compartilhada de uma consulta composta. |
| `affectedRows` | Quantidade de registros afetados por uma gravação. |
| `review` | Avaliação de experiência de compra. |
| `campaign` | Campanha promocional. |
| `variant` | Variação de tamanho, preço e estoque de um produto. |
| `recipient` | Destinatário de um e-mail. |
| `DTO` | Estrutura que transporta dados entre camadas ou pela API. |
| `ID` | Identificador interno. |
| `SKU` | Código externo da loja. |
| `CEP` | Código de endereço postal. |
| `URL` | Endereço de um recurso HTTP. |
| `cents` / `Money` | Valores monetários inteiros em centavos nos contratos que utilizam esse tipo. |
| `nil` | Ausência de um ponteiro, slice, interface ou outro valor compatível. |

## 10. Registro da refatoração

### Responsabilidades ajustadas

- Handlers de faixas de CEP e cotação saíram de routes; routes mantém registro e middleware.
- A validação das faixas passou para `services/shipping_service.go`.
- A validação das notas e comentários passou para `services/review_service.go`.
- A consulta SQL do destinatário saiu de `services/checkout_email.go` para `repositories/user_contact_repository.go`.
- Validações de cadastro de usuário foram separadas da coordenação de persistência em `services/user_validation_service.go`.
- Os contratos de recuperação/validação de senha e verificação foram movidos para `models/auth_requests.go`. Aliases nos handlers preservam os nomes Go exportados anteriores.
- A resposta de upload foi movida para `models/product_image_upload.go`; o alias anterior também foi mantido.
- `models/email_recipient.go` representa o resultado da consulta de destinatário.
- O importador foi dividido sem mudar flags, SQL de persistência ou regras editoriais.
- Arquivos de produção com nomes mistos foram padronizados em snake_case.

### Módulos revisados e preservados

Configuração, inicialização do banco, montagem do servidor, middleware, resposta HTTP, autenticação, usuários, conta, clientes, pedidos, cancelamentos, carrinho, checkout, frete, favoritos, newsletter, produtos, variantes, imagens, categorias, marcas, Home, campanhas, avaliações, Dashboard, relatórios e paginação foram abrangidos pela revisão. As separações anteriores de Home, Produtos e Promoções foram mantidas.

Configuração, conexão, inicialização, autorização, infraestrutura de resposta, memória de tokens/verificação, templates e regras comerciais que já tinham responsabilidade definida não foram reescritos. Alguns arquivos receberam somente `gofmt` ou formatação SQL. Métodos públicos existentes foram preservados quando o receiver já esclarece sua finalidade.

Não foi criada uma validação única de senha: cadastro e recuperação possuem critérios distintos no código atual. Unificá-los mudaria comportamento. Também não foram movidos os tipos de dependências, metadados privados de persistência ou os tipos de infraestrutura de paginação.

### Padronização de nomes

| Antes | Depois | Arquivo | Motivo |
| --- | --- | --- | --- |
| `e` | `err` | `src/repositories/home_reviews_repository.go` | Evidenciar o erro retornado. |
| `v` | `review` | `src/repositories/home_reviews_repository.go` | Identificar a avaliação processada. |
| `user`, `order` | `userID`, `orderID` | `src/repositories/home_reviews_repository.go` | Explicitar que são identificadores. |
| `n` | `affectedRows` | `src/repositories/home_reviews_repository.go` | Explicar o resultado de RowsAffected. |
| `where` | `visibilityClause` | `src/repositories/home_reviews_repository.go` | Distinguir o filtro de publicação pública. |
| `user` | `moderatorID` | `src/handlers/home_reviews.go` | Identificar o administrador responsável pela moderação. |
| `p`, `loc` | `period`, `location` | `src/handlers/dashboard_handler.go` | Tornar a interpretação do período legível. |
| `source`, `rows`, `stats`, `order` | `queryPrefix`, `rowsQuery`, `statisticsQuery`, `ordering` | `src/repositories/reports.go` | Diferenciar os fragmentos SQL de resultados e entidades. |
| `c` | `customer` | `src/repositories/admin_customers.go` | Identificar o cliente retornado por Scan. |
| `p` | `product` | `src/services/product_admin.go` e `src/repositories/product_admin.go` | Explicitar o produto editado. |
| `n` | `installmentCount` | `src/models/payment_plan.go` | Explicitar a quantidade de parcelas. |
| `decode`, `prepare`, `option`, `existing`, `put` | `decodeManifest`, `prepareProducts`, `resolveCatalogOption`, `productExists`, `writeAsset` | `cmd/import-catalog` | Explicar a operação de cada função privada. |
| `row`, `asset`, `product`, `manifest` | `preparedProduct`, `catalogAsset`, `manifestProduct`, `catalogManifest` | `cmd/import-catalog` | Distinguir os dados do importador dos modelos HTTP. |

### SQL e proteção contra regressões

SELECTs, gravações, JOINs, filtros, CTEs, agregações, JSON e consultas compartilhadas foram reorganizados. A comparação dos tokens SQL conferiu os operadores, literais, placeholders, casts e aliases. A suíte PostgreSQL conferiu a composição executável, pois apenas comparar fragmentos não detecta todos os problemas de concatenação ou de formatação do Go.

Durante a refatoração, os testes detectaram que a formatação automática afetava `limit`/`offset` e `$%d` na paginação. Os trechos foram corrigidos preservando os testes originais. Não foram ajustadas regras comerciais para obter aprovação.

### Preservação e limites

Não foram alterados frontend, contratos HTTP/JSON, mensagens destinadas à interface, migrations, dependências ou toolchain. Não houve importação, cadastro comercial, reinício de servidor nem comandos de escrita direcionados às tabelas da aplicação no schema principal. Testes de integração criam e removem somente seus schemas ou tabelas temporárias de teste; os testes específicos de avaliações utilizam `search_path=pg_temp`.

A detecção dinâmica de concorrência depende de CGO e de um compilador C. O ambiente atual possui `CGO_ENABLED=0` e não disponibiliza `gcc`; `go test -race ./...` foi tentado e recusado com `-race requires cgo`. Nenhuma ferramenta ou configuração permanente foi alterada para contornar esse requisito.

### Validação final executada

- `go test ./...` com integração PostgreSQL habilitada: **276 testes/subtestes aprovados, 0 falhas e 1 teste ignorado**. A contagem inclui testes-pai e seus subtestes.
- Ignorado: `TestBrowserAuditServer`, servidor opcional de auditoria de navegador, fora do escopo desta refatoração.
- Os testes de avaliações em tabelas temporárias foram executados, incluindo publicação, moderação, reabertura e duplicidade.
- `go vet ./...`: concluído sem apontamentos.
- `go build ./...`: concluído.
- `go test -race ./...`: bloqueado pelo requisito de CGO descrito acima; não contado como aprovado.
- `gofmt`: aplicado aos arquivos Go. `git diff --check`: sem erros de whitespace; somente avisos da configuração LF/CRLF do Git.
- Conferência final: **191 fragmentos SQL distintos** comparados com os tokens anteriores à formatação; nenhuma divergência final. Essa conferência complementa os testes executáveis.
- Novos testes de serviço cobrem normalização, campos obrigatórios/opcionais, valores negativos, faixas invertidas, notas e limites Unicode dos comentários.

### Arquivos criados

- `cmd/import-catalog/assets.go`: preparação e escrita de imagens do importador.
- `cmd/import-catalog/manifest.go`: tipos privados e validação do manifesto.
- `cmd/import-catalog/persistence.go`: SQL e transações do importador.
- `src/models/auth_requests.go`: contratos de autenticação extraídos.
- `src/models/email_recipient.go`: dados do destinatário.
- `src/models/product_image_upload.go`: contrato da resposta de upload.
- `src/repositories/user_contact_repository.go`: consulta do destinatário.
- `src/services/review_service.go`: validação de avaliações.
- `src/services/review_service_test.go`: regressão das validações de avaliações.
- `src/services/shipping_service.go`: validação das faixas de CEP.
- `src/services/shipping_service_test.go`: regressão da validação de CEP e limites.
- `src/services/user_validation_service.go`: validações de cadastro de usuário.
- `docs/backend-guide.md`: guia e registro desta refatoração.

### Arquivos movidos ou renomeados

- `src/handlers/authForgot.go` → `src/handlers/auth_password_reset.go`.
- `src/handlers/validateResetToken.go` → `src/handlers/auth_reset_token.go`.
- `src/handlers/authHandler.go` → `src/handlers/auth_handler.go`.
- `src/handlers/cartHandler.go` → `src/handlers/cart_handler.go`.
- `src/handlers/checkoutHandler.go` → `src/handlers/checkout_handler.go`.
- `src/handlers/favoritesHandler.go` → `src/handlers/favorites_handler.go`.
- `src/handlers/productHandler.go` → `src/handlers/product_handler.go`.
- `src/handlers/productVariants.go` → `src/handlers/product_variants.go`.
- `src/handlers/uploadPic.go` → `src/handlers/product_image_upload.go`.
- `src/handlers/userHandler.go` → `src/handlers/user_handler.go`.
- `src/middleware/authMiddleware.go` → `src/middleware/auth_middleware.go`.
- `src/middleware/methodMiddleware.go` → `src/middleware/method_middleware.go`.
- `src/handlers/promotionHandler.go` → `src/handlers/promotion_handler.go`.
- `src/routes/shipping_admin.go` → `src/handlers/shipping_ranges.go`.
- `src/routes/shipping_public.go` → `src/handlers/shipping_quote.go`.

### Demais arquivos modificados

A relação abaixo considera o estado do workspace ao iniciar esta tarefa, preservando alterações locais anteriores. Inclui arquivos com alterações apenas de formatação.

```text
cmd/import-catalog/main.go
cmd/import-catalog/main_test.go
src/handlers/dashboard_handler.go
src/handlers/home_campaigns.go
src/handlers/home_categories.go
src/handlers/home_products.go
src/handlers/home_reviews.go
src/handlers/product_catalog.go
src/handlers/product_create.go
src/handlers/product_details.go
src/handlers/product_options.go
src/handlers/promotion_images_test.go
src/models/catalog_registration.go
src/models/dashboard_metrics.go
src/models/home_category.go
src/models/payment_plan.go
src/models/report.go
src/models/shipping_quote.go
src/models/shipping_range.go
src/pagination/pagination.go
src/repositories/account.go
src/repositories/admin_customers.go
src/repositories/admin_orders.go
src/repositories/cart_reorder.go
src/repositories/cart_repository.go
src/repositories/catalog_registration.go
src/repositories/checkout_repository.go
src/repositories/dashboard_repository.go
src/repositories/favorites_repository.go
src/repositories/home_campaigns_repository.go
src/repositories/home_categories_repository.go
src/repositories/home_products_repository.go
src/repositories/home_reviews_repository.go
src/repositories/home_reviews_repository_test.go
src/repositories/order_cancellation.go
src/repositories/order_history.go
src/repositories/product_admin.go
src/repositories/product_catalog_repository.go
src/repositories/product_creation_repository.go
src/repositories/product_image_repository.go
src/repositories/product_images_admin.go
src/repositories/product_options_repository.go
src/repositories/product_queries.go
src/repositories/product_related_repository.go
src/repositories/product_repository.go
src/repositories/product_variants.go
src/repositories/promotion_campaign_repository.go
src/repositories/promotion_list_repository.go
src/repositories/promotion_products_repository.go
src/repositories/report_inventory.go
src/repositories/reports.go
src/repositories/shipping.go
src/repositories/shipping_ranges.go
src/repositories/subscriber_repository.go
src/repositories/user_repository.go
src/routes/audit_browser_test.go
src/routes/cart_test.go
src/routes/catalog_cushion_covers_test.go
src/routes/catalog_decoracao_test.go
src/routes/catalog_mesa_test.go
src/routes/catalog_towels_test.go
src/routes/checkout_stock_test.go
src/routes/favorites_test.go
src/routes/home_test.go
src/routes/mesa_gallery_roles_test.go
src/routes/product_admin_crud_test.go
src/routes/product_create_test.go
src/routes/product_variants_admin_test.go
src/routes/reports_test.go
src/routes/shipping.go
src/services/checkout_email.go
src/services/product_admin.go
src/services/product_creation_service.go
src/services/product_filters_service.go
src/services/product_queries_service.go
src/services/promotion_products_service.go
src/services/promotion_validate_service.go
src/services/promotion_validation_service_test.go
src/services/user_service.go
```

### Arquivos mantidos sem alteração nesta tarefa

```text
src/config/config.go
src/db/conn.go
src/handlers/account.go
src/handlers/admin_customers.go
src/handlers/admin_orders.go
src/handlers/authForgot_test.go
src/handlers/catalog_registration.go
src/handlers/checkoutHandler_test.go
src/handlers/dashboard_handler_test.go
src/handlers/home.go
src/handlers/newsletter.go
src/handlers/order_history.go
src/handlers/product_admin.go
src/handlers/product_images_admin.go
src/handlers/promotion_campaigns.go
src/handlers/promotion_images.go
src/handlers/promotion_products.go
src/handlers/reports.go
src/handlers/reports_test.go
src/handlers/userHandler_test.go
src/main.go
src/middleware/auth_security_test.go
src/middleware/authorization_test.go
src/middleware/middlewares.go
src/models/account.go
src/models/admin_customers.go
src/models/admin_orders.go
src/models/cart.go
src/models/checkout.go
src/models/dashboard.go
src/models/home.go
src/models/order_history.go
src/models/payment_plan_test.go
src/models/product.go
src/models/product_admin.go
src/models/subscription.go
src/models/user.go
src/pagination/pagination_test.go
src/repositories/home_repository.go
src/repositories/promotion_repository.go
src/response/response.go
src/routes/admin_customers.go
src/routes/admin_customers_test.go
src/routes/admin_orders.go
src/routes/admin_orders_test.go
src/routes/auth.go
src/routes/cart.go
src/routes/catalog_registration_test.go
src/routes/dashboard_metrics_test.go
src/routes/dashboard_test.go
src/routes/favorites.go
src/routes/home.go
src/routes/installments_down_test.go
src/routes/installments_test.go
src/routes/newsletter.go
src/routes/order_history_test.go
src/routes/pagination_test.go
src/routes/product_sku_test.go
src/routes/products.go
src/routes/promotions.go
src/routes/purchase_review_test.go
src/routes/route_helpers.go
src/routes/shipping_snapshot_test.go
src/routes/shipping_test.go
src/services/admin_customers.go
src/services/auth_service.go
src/services/checkout_installments_test.go
src/services/emails.go
src/services/emails_test.go
src/services/favorites_service.go
src/services/newsletter_service.go
src/services/newsletter_service_test.go
src/services/password_reset_test.go
src/services/password_reset_token.go
src/services/product_image_service.go
src/services/product_service.go
src/services/product_variants.go
src/services/promotion_service.go
src/services/user_service_test.go
src/services/verification_code.go
```

### Pendências

Somente a execução com `-race` permanece dependente de um ambiente com CGO e compilador C compatível. Não foi identificada necessidade de migration para esta refatoração. Nenhum teste foi removido para obter aprovação. Os artefatos auxiliares de análise e execução foram temporários e não fazem parte da implementação.
