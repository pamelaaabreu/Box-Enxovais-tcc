# 05 — Fluxos ponta a ponta

Os caminhos Angular abaixo são relativos a `frontend/src/app`; os caminhos Go a `backend/src`. Componentes delegam HTTP a services; o backend preserva fluxos com repository direto quando apropriado. Consulte o [mapa navegável](11_MAPA_DE_ARQUIVOS.md).

## Cadastro

- **Ação do usuário:** Preenche nome, e-mail e senha na rota /cadastro.
- **Componente Angular:** features/authentication/auth/auth.component.ts — AuthComponent
- **Serviço/cliente HTTP:** core/services/auth.service.ts — register
- **Endpoint:** POST /register
- **Processamento Go:** routes/auth.go → UserHandler → UserService → UserRepository
- **Tabelas:** users
- **Resposta e interface:** Confirma cadastro ou apresenta validações; não recebe permissão administrativa pelo formulário.
- **Validações e regras:** E-mail e senha são validados no servidor; senha é transformada com bcrypt e e-mail não pode duplicar conta.

## Login

- **Ação do usuário:** Entra em /login com credenciais existentes.
- **Componente Angular:** features/authentication/auth/auth.component.ts — AuthComponent
- **Serviço/cliente HTTP:** core/services/auth.service.ts — login
- **Endpoint:** POST /login
- **Processamento Go:** routes/auth.go → AuthHandler → AuthService.Login → UserRepository.FindByEmail
- **Tabelas:** users
- **Resposta e interface:** Retorna token, nome e perfil; AuthService mantém a sessão e agenda expiração.
- **Validações e regras:** Senha comparada ao hash; JWT assinado com HS256, emissor e expiração. Decodificar no Angular não equivale a verificar assinatura.

## Recuperação de senha

- **Ação do usuário:** Informa e-mail, valida código recebido e escolhe outra senha.
- **Componente Angular:** features/authentication/forgot-password e features/authentication/reset-password
- **Serviço/cliente HTTP:** core/services/auth.service.ts
- **Endpoint:** POST /send-reset-token; POST /validate-reset-code; POST /validate-reset-token; POST /reset-password
- **Processamento Go:** routes/auth.go → AuthHandler → AuthService → UserRepository
- **Tabelas:** users, password_resets
- **Resposta e interface:** O fluxo fornece autorização específica para redefinição; nova senha permite login.
- **Validações e regras:** Código/token precisa ser válido e não expirado; não basta enviar apenas um e-mail conhecido. E2E usa captura isolada do código, sem enviar SMTP real.

## Navegação pelo catálogo

- **Ação do usuário:** Abre categoria, pesquisa e altera filtros/ordenação/página.
- **Componente Angular:** features/catalog/pages/category/category.component.ts
- **Serviço/cliente HTTP:** features/catalog/services/catalog.service.ts → ProductService → PaginationService
- **Endpoint:** GET /products; GET /products/categories
- **Processamento Go:** routes/products.go → ProductHandler → ProductService → ProductRepository
- **Tabelas:** products, product_types, brands, product_variants, product_images e promoções aplicáveis
- **Resposta e interface:** Página de itens com metadados para toolbar/paginação.
- **Validações e regras:** Filtros e limites são processados no backend. Recomendações usam linha coordenada exata antes de fallback de coleção; coleção igual não prova par exato.

## Seleção de variante

- **Ação do usuário:** Escolhe Solteiro, Casal ou outro tamanho realmente cadastrado.
- **Componente Angular:** features/catalog/pages/product-detail/product-detail.component.ts
- **Serviço/cliente HTTP:** core/services/product.service.ts — getProduct
- **Endpoint:** GET /products/{id}
- **Processamento Go:** routes/products.go → ProductHandler → ProductService → ProductRepository
- **Tabelas:** products, product_variants, product_images
- **Resposta e interface:** Atualiza preço, saldo, limite de quantidade, dimensões e composição; imagens gerais são fallback.
- **Validações e regras:** variantId precisa pertencer ao productId. Um produto legado sem variantes pode continuar sem seletor; a interface não inventa tamanhos.

## Favoritos

- **Ação do usuário:** Aciona o coração de um produto autenticado.
- **Componente Angular:** features/favorites/favorites.component.ts e cards compartilhados
- **Serviço/cliente HTTP:** core/services/favorites.service.ts
- **Endpoint:** GET /favorites; PUT /favorites/{productId}; DELETE /favorites/{productId}
- **Processamento Go:** routes/favorites.go → FavoritesHandler → FavoritesService → FavoritesRepository
- **Tabelas:** favorites, products
- **Resposta e interface:** Atualiza estado do favorito e listagem do próprio usuário.
- **Validações e regras:** JWT identifica usuário; a API não confia em ID de cliente enviado pela interface. Navegador sem sessão não pode acessar favoritos privados.

## Carrinho

- **Ação do usuário:** Adiciona produto e variante, altera quantidade ou remove item.
- **Componente Angular:** features/cart/cart.component.ts e página de produto
- **Serviço/cliente HTTP:** core/services/cart.service.ts
- **Endpoint:** GET /cart; POST /cart/items; PATCH /cart/items/{id}; DELETE /cart/items/{id}
- **Processamento Go:** routes/cart.go → CartHandler → CartRepository
- **Tabelas:** carts, cart_items, products, product_variants
- **Resposta e interface:** Retorna carrinho atualizado e total atual para exibição.
- **Validações e regras:** Valida quantidade/saldo/vínculos. A presença no carrinho não equivale a reserva definitiva de estoque; a compra verifica novamente o saldo.

## Cálculo de frete

- **Ação do usuário:** Seleciona endereço salvo ou informa CEP na entrega.
- **Componente Angular:** features/checkout/checkout.component.ts
- **Serviço/cliente HTTP:** AccountService para endereços; ShippingService para cotação
- **Endpoint:** GET /me/addresses; GET /shipping/quote?cep=87502100
- **Processamento Go:** AccountHandler/repository de conta; routes/shipping.go → repositories.QuoteShipping
- **Tabelas:** user_addresses, shipping_ranges
- **Resposta e interface:** Retorna priceCents, minDays e maxDays; habilita pagamento quando há cobertura.
- **Validações e regras:** Formato inválido gera 400, ausência de faixa ativa 404 e falha de consulta 500. Mudança de CEP invalida cotação anterior. Valores demonstrativos não são cotação real.

## Checkout

- **Ação do usuário:** Confere entrega e pagamento, revisa e confirma o pedido.
- **Componente Angular:** features/checkout/checkout.component.ts
- **Serviço/cliente HTTP:** CheckoutService, CartService e AccountService
- **Endpoint:** POST /checkout
- **Processamento Go:** AuthMiddleware → CheckoutHandler → CheckoutRepository.Create
- **Tabelas:** carts, cart_items, products, product_variants, promotions, promotion_products, shipping_ranges, checkout_orders, checkout_order_items
- **Resposta e interface:** Retorna pedido confirmado; navega para /finalizar-compra/sucesso/:id.
- **Validações e regras:** Backend recalcula preços/descontos/frete, verifica total esperado e saldo em transação; requestKey impede duplicação. Fora de cobertura não conclui.

## Parcelamento

- **Ação do usuário:** Escolhe de uma a seis parcelas quando o método é cartão.
- **Componente Angular:** features/checkout/checkout.component.ts; shared/utils/installments.ts
- **Serviço/cliente HTTP:** CheckoutService; helpers apenas calculam prévia
- **Endpoint:** POST /checkout com paymentMethod e installments
- **Processamento Go:** CheckoutHandler → NormalizeInstallments → CheckoutRepository → PaymentPlan
- **Tabelas:** checkout_orders.installments e total_cents
- **Resposta e interface:** API retorna installments e installmentAmounts exatos; confirmação, históricos e e-mail usam plano registrado.
- **Validações e regras:** Pix/boleto somente 1. Distribuição em centavos preserva soma; reenvio idempotente mantém plano original. Não há gateway nem juros.

## Confirmação

- **Ação do usuário:** Abre o resultado do pedido que acabou de realizar.
- **Componente Angular:** features/checkout/checkout-success/checkout-success.component.ts
- **Serviço/cliente HTTP:** CheckoutService
- **Endpoint:** GET /checkout/success/{id}
- **Processamento Go:** CheckoutHandler → CheckoutRepository.Get
- **Tabelas:** checkout_orders
- **Resposta e interface:** Mostra ilustração, valor, plano e links para detalhes; oferece avaliação quando aplicável.
- **Validações e regras:** Consulta exige propriedade do pedido; ID de outro usuário não autoriza leitura. Não interpreta estado de navegação como prova de compra.

## Avaliação da experiência

- **Ação do usuário:** Seleciona nota, pode comentar e escolher autorização de publicação.
- **Componente Angular:** features/purchase-review/purchase-review.component.ts, reutilizado em sucesso e histórico
- **Serviço/cliente HTTP:** PurchaseReviewService
- **Endpoint:** GET/POST /orders/{id}/review; PATCH /admin/experience-reviews/{id}
- **Processamento Go:** routes/home.go → HomeHandler → HomeRepository
- **Tabelas:** checkout_orders, purchase_experience_reviews
- **Resposta e interface:** Formulário vira agradecimento; ao recarregar, informa avaliação já registrada.
- **Validações e regras:** Pedido confirmado pertence ao cliente; nota 1–5, comentário opcional, UNIQUE por pedido. Publicação exige consentimento e moderação, com exclusão de cancelados da vitrine.

## Histórico de pedidos

- **Ação do usuário:** Consulta a listagem e abre detalhes de uma compra.
- **Componente Angular:** features/order-history/order-history.component.ts
- **Serviço/cliente HTTP:** CustomerOrdersService
- **Endpoint:** GET /orders; GET /orders/{id}
- **Processamento Go:** OrderHistoryHandler → repositories/order_history_repository.go
- **Tabelas:** checkout_orders, checkout_order_items, order_cancellations
- **Resposta e interface:** Retorna itens, endereço, valores históricos e situação; não recalcula com o catálogo atual.
- **Validações e regras:** Filtro pelo usuário autenticado. Frete/parcelamento histórico ausentes não são apresentados como grátis ou como informação conhecida.

## Cancelamento

- **Ação do usuário:** Solicita cancelamento e informa motivo, quando permitido.
- **Componente Angular:** features/order-history/order-history.component.ts; admin/orders
- **Serviço/cliente HTTP:** CustomerOrdersService público; AdminOrdersService administrativo
- **Endpoint:** POST /orders/{id}/cancel; POST /admin/orders/{id}/cancel
- **Processamento Go:** OrderHistoryHandler ou AdminOrdersHandler → repositories/order_cancellation_repository.go
- **Tabelas:** checkout_orders, checkout_order_items, order_cancellations, products, product_variants
- **Resposta e interface:** Atualiza status e eventos e repõe o saldo da peça/variante correta.
- **Validações e regras:** Transação e estado impedem reposição dupla; pedidos legados sem baixa não devem criar estoque artificial. Histórico financeiro continua preservado.

## Administração

- **Ação do usuário:** Acessa listagem, cria/edita e conclui imagens; administra campanhas e consultas.
- **Componente Angular:** features/admin; features/admin/products/product-manage; features/admin/promotions/promotion-manager
- **Serviço/cliente HTTP:** ProductService, UploadService, PromotionService, AdminOrdersService e serviços de clientes
- **Endpoint:** GET /admin/products; POST /products; PATCH/DELETE /admin/products/{id}; PUT /admin/products/{id}/variants; GET/PUT /admin/products/{id}/images; POST /upload-image
- **Processamento Go:** routes/products.go → handlers/services/repositories de produtos; rotas específicas para outros módulos
- **Tabelas:** products, product_variants, product_images, brands, product_types; demais tabelas conforme módulo
- **Resposta e interface:** Formulário distinto da listagem, SKU somente leitura, galeria ordenada e confirmação de exclusão.
- **Validações e regras:** AuthMiddleware + AdminMiddleware no servidor. Referências comerciais impedem exclusão física insegura. Campanhas usam DTO de gravação sem timestamps de auditoria.

## Painel além dos produtos

Promoções usam `POST /api/promotions/create`, `PUT /admin/promotions/{id}` e upload em `POST /admin/promotions/image`. Sua publicação na Home depende de vigência, estado e produtos disponíveis, não apenas do toggle. `GET /admin/customers` e suas rotas de detalhe/pedidos fornecem consulta administrativa protegida. `GET /admin/dashboard` e `/admin/reports/{sales|products|customers|stock}` consultam dados reais e filtros; exportação existe para sales, products e stock. Relatório de clientes não deve ser anunciado com exportação inexistente.

## Avaliações de produto e newsletter

ProductReviewService usa GET /me/product-reviews e PATCH /me/product-reviews/{id} para listar/editar sem duplicar; POST /products/{id}/reviews exige compra elegível. GET /products/review-summaries agrega lotes, sem N+1 por card; GET /home/product-reviews respeita publicação/moderação e não inventa avaliações. Compra e produto possuem avaliações separadas.

NewsletterService Angular envia inscrição ao endpoint existente; NewsletterService Go usa SaveIfNew. Nova inscrição, repetição e confirmação pendente têm a mesma resposta neutra. Falhas SMTP após persistência são recuperadas em memória com limite de tentativas, lote e prazo. Reinício perde a fila. E-mails compartilham email_message.go: assunto RFC2047 UTF-8, partes textuais UTF-8/quoted-printable e testes de decodificação sem SMTP real.
