# 11 — Mapa navegável de arquivos

Os links apontam ao código próprio a partir desta pasta. Siga uma funcionalidade do componente ao endpoint, ao repository e ao teste, em vez de estudar arquivos sem contexto.

## Entrada e navegação

| Arquivo | Função |
|---|---|
| [README.md](../../README.md) | Execução e panorama técnico. |
| [frontend/src/app/app.routes.ts](../../frontend/src/app/app.routes.ts) | Rotas e lazy loading. |
| [frontend/src/app/app.config.ts](../../frontend/src/app/app.config.ts) | Providers da aplicação. |
| [frontend/src/app/features/admin/admin.routes.ts](../../frontend/src/app/features/admin/admin.routes.ts) | Navegação administrativa. |
| [backend/src/main.go](../../backend/src/main.go) | Inicialização e injeção de dependências. |
| [backend/src/config/config.go](../../backend/src/config/config.go) | Configuração validada. |
| [backend/src/db/conn.go](../../backend/src/db/conn.go) | Conexão PostgreSQL. |

## Autenticação e conta

| Arquivo | Função |
|---|---|
| [frontend/src/app/features/authentication/auth/auth.component.ts](../../frontend/src/app/features/authentication/auth/auth.component.ts) | AuthComponent de login e cadastro. |
| [frontend/src/app/core/services/auth.service.ts](../../frontend/src/app/core/services/auth.service.ts) | Sessão, expiração e recuperação. |
| [frontend/src/app/core/interceptors/auth.interceptor.ts](../../frontend/src/app/core/interceptors/auth.interceptor.ts) | Integração de autenticação HTTP. |
| [frontend/src/app/core/guards/admin.guard.ts](../../frontend/src/app/core/guards/admin.guard.ts) | Navegação administrativa. |
| [frontend/src/app/core/services/account.service.ts](../../frontend/src/app/core/services/account.service.ts) | Perfil e endereços salvos. |
| [backend/src/routes/auth.go](../../backend/src/routes/auth.go) | Endpoints de autenticação. |
| [backend/src/services/auth_service.go](../../backend/src/services/auth_service.go) | JWT, bcrypt e recuperação. |
| [backend/src/middleware/auth_middleware.go](../../backend/src/middleware/auth_middleware.go) | Verificação do Bearer. |
| [backend/src/repositories/user_repository.go](../../backend/src/repositories/user_repository.go) | Persistência de usuários. |
| [backend/src/repositories/account_repository.go](../../backend/src/repositories/account_repository.go) | Conta e endereços. |

## Catálogo e cadastro

| Arquivo | Função |
|---|---|
| [frontend/src/app/features/catalog/services/catalog.service.ts](../../frontend/src/app/features/catalog/services/catalog.service.ts) | Adaptação de produtos da API. |
| [frontend/src/app/core/services/product.service.ts](../../frontend/src/app/core/services/product.service.ts) | Leitura pública e CRUD. |
| [frontend/src/app/core/services/pagination.service.ts](../../frontend/src/app/core/services/pagination.service.ts) | Paginação e filtros HTTP. |
| [frontend/src/app/features/catalog/pages/product-detail/product-detail.component.ts](../../frontend/src/app/features/catalog/pages/product-detail/product-detail.component.ts) | Galeria e seleção de tamanho. |
| [frontend/src/app/features/admin/products/product-manage/register/product-create/product-create.component.ts](../../frontend/src/app/features/admin/products/product-manage/register/product-create/product-create.component.ts) | Formulário de criação e edição. |
| [frontend/src/app/shared/components/product-commerce-summary/product-commerce-summary.component.ts](../../frontend/src/app/shared/components/product-commerce-summary/product-commerce-summary.component.ts) | Resumo derivado de variantes. |
| [frontend/src/app/features/admin/products/product-manage/images/product-image-upload/product-image-upload.component.ts](../../frontend/src/app/features/admin/products/product-manage/images/product-image-upload/product-image-upload.component.ts) | Galeria administrativa. |
| [backend/src/routes/products.go](../../backend/src/routes/products.go) | Contrato HTTP de produtos e cadastros. |
| [backend/src/repositories/product_repository.go](../../backend/src/repositories/product_repository.go) | Catálogo e recomendações. |
| [backend/src/repositories/product_variants_repository.go](../../backend/src/repositories/product_variants_repository.go) | Persistência de variantes. |
| [backend/src/repositories/product_admin_repository.go](../../backend/src/repositories/product_admin_repository.go) | Edição e exclusão segura. |
| [backend/src/repositories/product_images_admin_repository.go](../../backend/src/repositories/product_images_admin_repository.go) | Ordem e imagem principal. |

## Compra e experiência

| Arquivo | Função |
|---|---|
| [frontend/src/app/core/services/cart.service.ts](../../frontend/src/app/core/services/cart.service.ts) | Carrinho do cliente. |
| [frontend/src/app/core/services/favorites.service.ts](../../frontend/src/app/core/services/favorites.service.ts) | Favoritos. |
| [frontend/src/app/features/checkout/checkout.component.ts](../../frontend/src/app/features/checkout/checkout.component.ts) | Entrega, pagamento e revisão. |
| [frontend/src/app/shared/utils/installments.ts](../../frontend/src/app/shared/utils/installments.ts) | Prévia e texto de parcelas. |
| [frontend/src/app/features/checkout/checkout-success/checkout-success.component.ts](../../frontend/src/app/features/checkout/checkout-success/checkout-success.component.ts) | Confirmação consultada na API. |
| [frontend/src/app/features/order-history/order-history.component.ts](../../frontend/src/app/features/order-history/order-history.component.ts) | Histórico e cancelamento. |
| [frontend/src/app/features/purchase-review/purchase-review.component.ts](../../frontend/src/app/features/purchase-review/purchase-review.component.ts) | Avaliação reutilizada. |
| [backend/src/handlers/checkout_handler.go](../../backend/src/handlers/checkout_handler.go) | Entrada HTTP do checkout. |
| [backend/src/repositories/checkout_repository.go](../../backend/src/repositories/checkout_repository.go) | Transação de compra e idempotência. |
| [backend/src/repositories/shipping_repository.go](../../backend/src/routes/shipping.go) | Cobertura e cotação por CEP. |
| [backend/src/repositories/order_history_repository.go](../../backend/src/repositories/order_history_repository.go) | Histórico congelado. |
| [backend/src/repositories/order_cancellation_repository.go](../../backend/src/repositories/order_cancellation_repository.go) | Cancelamento e reposição. |
| [backend/src/repositories/home_repository.go](../../backend/src/repositories/home_repository.go) | Home e avaliações. |
| [backend/src/models/payment_plan.go](../../backend/src/models/payment_plan.go) | Validação e divisão inteira das parcelas. |
| [backend/src/services/checkout_email.go](../../backend/src/services/checkout_email.go) | Recibos e cancelamentos. |

## Painel e componentes compartilhados

| Arquivo | Função |
|---|---|
| [frontend/src/app/features/admin/promotions/promotion-manager/create-promotion.component.ts](../../frontend/src/app/features/admin/promotions/promotion-manager/create-promotion.component.ts) | Editor de campanha. |
| [frontend/src/app/features/admin/orders/admin-orders.service.ts](../../frontend/src/app/features/admin/orders/services/admin-orders.service.ts) | Pedidos administrativos. |
| [frontend/src/app/features/admin/customers/admin-customers.service.ts](../../frontend/src/app/features/admin/customers/services/admin-customers.service.ts) | Consulta de clientes. |
| [frontend/src/app/shared/components/confirm-dialog/confirm-dialog.service.ts](../../frontend/src/app/shared/components/confirm-dialog/confirm-dialog.service.ts) | Confirmação reutilizável. |
| [backend/src/routes/admin_orders.go](../../backend/src/routes/admin_orders.go) | Endpoints administrativos de pedidos. |
| [backend/src/routes/admin_customers.go](../../backend/src/routes/admin_customers.go) | Consulta protegida de clientes. |
| [backend/src/routes/promotions.go](../../backend/src/routes/promotions.go) | Campanhas e upload. |
| [backend/src/repositories/dashboard_repository.go](../../backend/src/repositories/dashboard_repository.go) | Indicadores. |
| [backend/src/repositories/reports_repository.go](../../backend/src/repositories/reports_repository.go) | Consultas de relatórios. |
| [backend/src/repositories/report_inventory.go](../../backend/src/repositories/report_inventory.go) | Estoque em relatórios. |

## Contratos e validação

| Arquivo | Função |
|---|---|
| [frontend/src/app/shared/types/products/product.ts](../../frontend/src/app/shared/types/products/product.ts) | Produto público. |
| [frontend/src/app/shared/types/products/admin-product.ts](../../frontend/src/app/shared/types/products/admin-product.ts) | DTO administrativo de produto e imagem. |
| [frontend/src/app/shared/types/promotions/promotion.ts](../../frontend/src/app/shared/types/promotions/promotion.ts) | Promoção e campanha. |
| [frontend/src/app/shared/types/checkout/checkout.ts](../../frontend/src/app/shared/types/checkout/checkout.ts) | Pedido confirmado, cotação e plano. |
| [frontend/src/app/shared/types/orders/admin-order.ts](../../frontend/src/app/shared/types/orders/admin-order.ts) | Detalhes administrativos do pedido. |
| [frontend/src/app/shared/types/api/pagination.ts](../../frontend/src/app/shared/types/api/pagination.ts) | Página e opções genéricas. |
| [frontend/src/app/shared/types/ui/alert.ts](../../frontend/src/app/shared/types/ui/alert.ts) | Feedback de UI. |
| [frontend/src/app/shared/types/products/product.ts](../../frontend/src/app/shared/types/products/product.ts) | Contrato Product atual. |
| [backend/migrations/000052_purchase_review_optional_criteria.up.sql](../../backend/migrations/000052_purchase_review_optional_criteria.up.sql) | Critérios opcionais, implantação histórica concluída. |
| [backend/migrations/000053_checkout_installments.up.sql](../../backend/migrations/000053_checkout_installments.up.sql) | Parcelas, implantação histórica concluída. |
| [backend/src/routes/purchase_review_test.go](../../backend/src/routes/purchase_review_test.go) | Integração/concorrência da avaliação. |
| [backend/src/routes/installments_test.go](../../backend/src/routes/installments_test.go) | Integração e rollback do parcelamento. |
| [frontend/e2e/regression.cjs](../../frontend/e2e/regression.cjs) | Sete suítes finais isoladas. |
| [frontend/e2e/post-purchase-review.cjs](../../frontend/e2e/post-purchase-review.cjs) | Navegação real da avaliação. |
| [frontend/e2e/installments.cjs](../../frontend/e2e/installments.cjs) | Navegação real do parcelamento. |
| [docs/auditoria/CODIGO_NAO_UTILIZADO.md](../../docs/auditoria/CODIGO_NAO_UTILIZADO.md) | Decisões de remoção. |
| [AUDITORIA_FINAL.md](../../AUDITORIA_FINAL.md) | Relatório consolidado. |

## Percursos recomendados

Para explicar uma compra, abra CheckoutComponent → checkoutHandler.go → CheckoutRepository → installments_test.go. Para explicar segurança, compare AdminGuard com authMiddleware.go e o filtro de usuário no repository. Para estudar uma mudança de schema, leia o up e o down ao lado, não somente o estado final da tabela.
