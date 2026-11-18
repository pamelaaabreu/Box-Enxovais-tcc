# Home, favoritos, paginação e galerias

18/11/2026. Projeto Box-Enxovais-tcc. Banco local bd_box: versão 46, dirty=false.

## Implementação

- Mais vendidos: agregação SQL de checkout_order_items por product_id, somando variantes. Elegibilidade: checkout_orders.status=simulated_approved e stock_debited=true, conforme a confirmação comercial existente no projeto. Pedidos cancelados ou sem baixa e produtos inativos não entram. Não usa estoque ou sacolas como vendas e não faz requisições N+1. Sem vendas elegíveis, mostra seis produtos reais como Destaques para você.
- Navegue por categorias: seis fotografias locais vinculadas a produtos ativos, incluindo uma ambientação de tapete para Decoração; cards grandes, gradiente de leitura, hover e foco. Rotas reais preservadas. Seis URLs conferidas com HTTP 200.
- Experiência de compra: formulário Reactive Forms no detalhe de pedido concluído, com quatro notas de 1 a 5, comentário opcional e consentimento separado. Backend verifica titularidade, confirmação da compra e unicidade por pedido. Não exige entrega/rastreamento. Avaliações nascem pendentes; administração pode aprovar/rejeitar/recolocar em análise. A Home publica somente aprovadas com consentimento e compra ainda válida, sem nome, e-mail ou número do pedido.
- Campanhas: formulário existente ganhou descrição, imagem local e indicação de exibição na Home. Vigência, status e descontos cadastrados são conferidos no servidor. Cards compartilhados mostram preço anterior e preço promocional válido. Estados vazios ocultam a seção. Formulários de criar campanha/vincular produto usam toast compartilhado, mantêm dados em erros e bloqueiam requisições repetidas enquanto salvam.
- Favoritos: cabeçalho compacto, singular/plural, grid e ações do ProductCard compartilhado, sem botões duplicados. Produtos com variantes encaminham à escolha de tamanho; estoque e favoritos continuam nos serviços existentes. Estado vazio com CTA funcional.
- Paginação: componente tipado compartilhado com total de registros/páginas, números, reticências, limites, disabled e teclado. Aplicado ao catálogo, favoritos, pedidos, produtos administrativos e moderação. Pedidos recebem contagem real do backend, respeitando os mesmos filtros. Nenhuma paginação nativa de biblioteca foi substituída; não foi encontrada nas telas auditadas.
- Tapetes: sete capas foram recompostas com a proporção física cadastrada de 45 × 70 cm, sem aparência alongada de passadeira. Medidas, identidade, capas dos demais tapetes e as 14 fotografias complementares desses produtos foram preservadas. Não se utilizou cover para esconder geometria incorreta.
- Benefícios: retiradas promessas não configuradas de frete grátis, primeira troca, parcelamento e cupom. Removido da exibição o slide VIP que prometia cupons; arquivo original preservado. Newsletter agora confirma inscrição sem cupom fictício, usa CustomAlertService e reutiliza o HttpClient/interceptores globais.

## Banco e integridade

000045_home_experience_campaigns: avaliações de experiência e metadados das campanhas existentes.
000046_decor_rug_geometry: troca reversível somente dos sete caminhos das capas, preservando IDs, ordem e status principal. Arquivos anteriores mantidos para rollback.

Up/down/up testados em schema isolado. Os 97 produtos e suas 66 variantes foram comparados com a auditoria anterior e permanecem idênticos, excluindo deliberadamente os caminhos das imagens substituídas. São 357 imagens registradas; 350 não foram alteradas. A aplicação transacional preservou usuários, preços, estoques, sacolas, pedidos, favoritos e campanhas existentes. Não há imagens órfãs nem constraints novas inválidas.

## Testes e capturas

- Angular: 42 testes na rodada principal, mais um do vínculo de campanha e um da newsletter: 44 casos distintos aprovados. Incluem paginação, favoritos, pedidos, catálogo, galeria, cards, preços promocionais, avaliações e formulários.
- Go/PostgreSQL: TestHomePostgres, TestCatalogDecoracaoPostgres, TestOrderHistoryPostgres e TestFavoritesPostgres passaram. Exercitam endpoints HTTP, autenticação, moderação, titularidade, consentimento, duplicidade, ranking, filtros, preço zero, validade das campanhas e migrations. TestNewsletterDoesNotPromiseUnconfiguredBenefits também passou.
- Build de produção aprovado. Permanecem avisos existentes de orçamento do bundle/estilo de cadastro, NG8107, CommonJS SweetAlert2 e seletores Bootstrap.
- Chrome real em 1440, 1024, 768 e 390 px: Home local, categorias, benefícios, newsletter, tapetes, formulário de avaliação, moderação, campanha, favoritos, estados singular/vazio, pedidos e tabelas administrativas. Sem rolagem horizontal nas verificações. Paginação por Tab/Enter e foco visível arredondado conferidos.
- Cadastro e vínculo de campanha foram executados pela interface; o preço promocional foi confirmado na sacola. Remoção de favorito, singular, vazio e CTA também foram exercitados.
- Newsletter testada com HTTP simulado e template de confirmação, sem depender de envio real pelo SendGrid.
- git diff --check sem erros.

As capturas terminadas em local correspondem ao bd_box public. As terminadas em isolado usam o mesmo Angular e os handlers Go reais, com clientes/pedidos/campanhas de teste em schema isolado e backend temporário. Esse ambiente foi encerrado e removido: nenhum registro de teste foi publicado na Home principal. As matrizes JSON acompanham as capturas.

## Estado atual e limites

O banco principal tem zero pedidos, campanhas e avaliações. Por isso a Home exibe Destaques para você e oculta depoimentos/ofertas. Para publicar Natal, cadastre uma campanha, indique descrição/imagem, marque exibição na Home e vincule produtos com descontos válidos. Avaliações aparecerão após compra, consentimento e aprovação administrativa.

Imagens de campanha referenciam arquivos já existentes em uploads; não foi criado um uploader independente. Descontos específicos por variante não existem no checkout atual: eles não são anunciados nem cadastrados por este fluxo. Preços e estoques das variantes foram preservados.

[Categorias na Home real](capturas/home-refinamento/1440-categorias-local.png) · [Home mobile real](capturas/home-refinamento/390-home-local.png) · [Favoritos em teste isolado](capturas/home-refinamento/1440-favoritos-isolado.png) · [Galerias corrigidas](capturas/home-refinamento/tapetes-depois-046.jpg).

## Arquivos alterados/criados

- `backend/demo-assets/decoracao-tapetes-046/imagens.json`
- `backend/demo-assets/decoracao-tapetes-046/install-images.ps1`
- `backend/demo-assets/decoracao-tapetes-046/resultado-local.json`
- `backend/migrations/000045_home_experience_campaigns.down.sql`
- `backend/migrations/000045_home_experience_campaigns.up.sql`
- `backend/migrations/000046_decor_rug_geometry.down.sql`
- `backend/migrations/000046_decor_rug_geometry.up.sql`
- `backend/src/handlers/home.go`
- `backend/src/handlers/order_history.go`
- `backend/src/handlers/promotionHandler.go`
- `backend/src/main.go`
- `backend/src/models/home.go`
- `backend/src/models/product.go`
- `backend/src/repositories/home_repository.go`
- `backend/src/repositories/order_history.go`
- `backend/src/repositories/promotion_repository.go`
- `backend/src/routes/catalog_decoracao_test.go`
- `backend/src/routes/home.go`
- `backend/src/routes/home_test.go`
- `backend/src/services/newsletter_service.go`
- `backend/src/services/newsletter_service_test.go`
- `backend/src/services/promotion_service.go`
- `docs/home-integridade.json`
- `frontend/src/app/components/admin/admin-routing.module.ts`
- `frontend/src/app/components/admin/admin/admin.component.html`
- `frontend/src/app/components/admin/experience-reviews.component.ts`
- `frontend/src/app/components/admin/product/product.component.html`
- `frontend/src/app/components/admin/product/product.component.ts`
- `frontend/src/app/components/carousel/carousel.component.html`
- `frontend/src/app/components/trust-bar/trust-bar.component.html`
- `frontend/src/app/features/add-to-promotion/add-to-promotion.component.css`
- `frontend/src/app/features/add-to-promotion/add-to-promotion.component.html`
- `frontend/src/app/features/add-to-promotion/add-to-promotion.component.spec.ts`
- `frontend/src/app/features/add-to-promotion/add-to-promotion.component.ts`
- `frontend/src/app/features/catalog/components/product-card/product-card.component.html`
- `frontend/src/app/features/catalog/components/product-card/product-card.component.ts`
- `frontend/src/app/features/catalog/components/product-price/product-price.component.html`
- `frontend/src/app/features/catalog/components/product-price/product-price.component.scss`
- `frontend/src/app/features/catalog/components/product-price/product-price.component.ts`
- `frontend/src/app/features/catalog/pages/category/category.component.html`
- `frontend/src/app/features/catalog/pages/category/category.component.ts`
- `frontend/src/app/features/create-promotion/create-promotion.component.css`
- `frontend/src/app/features/create-promotion/create-promotion.component.html`
- `frontend/src/app/features/create-promotion/create-promotion.component.spec.ts`
- `frontend/src/app/features/create-promotion/create-promotion.component.ts`
- `frontend/src/app/features/favorites/favorites.component.css`
- `frontend/src/app/features/favorites/favorites.component.html`
- `frontend/src/app/features/favorites/favorites.component.spec.ts`
- `frontend/src/app/features/favorites/favorites.component.ts`
- `frontend/src/app/features/featured-products/featured-products.component.css`
- `frontend/src/app/features/featured-products/featured-products.component.html`
- `frontend/src/app/features/featured-products/featured-products.component.ts`
- `frontend/src/app/features/home/home.component.html`
- `frontend/src/app/features/newsletter/newsletter.component.html`
- `frontend/src/app/features/newsletter/newsletter.component.spec.ts`
- `frontend/src/app/features/newsletter/newsletter.component.ts`
- `frontend/src/app/features/order-history/order-history.component.html`
- `frontend/src/app/features/order-history/order-history.component.spec.ts`
- `frontend/src/app/features/order-history/order-history.component.ts`
- `frontend/src/app/features/promo-grid/promo-grid.component.css`
- `frontend/src/app/features/promo-grid/promo-grid.component.html`
- `frontend/src/app/features/promo-grid/promo-grid.component.spec.ts`
- `frontend/src/app/features/promo-grid/promo-grid.component.ts`
- `frontend/src/app/features/purchase-review/purchase-review.component.spec.ts`
- `frontend/src/app/features/purchase-review/purchase-review.component.ts`
- `frontend/src/app/features/shop-by-category/shop-by-category.component.css`
- `frontend/src/app/features/shop-by-category/shop-by-category.component.html`
- `frontend/src/app/features/shop-by-category/shop-by-category.component.ts`
- `frontend/src/app/features/testimonials/testimonials.component.css`
- `frontend/src/app/features/testimonials/testimonials.component.html`
- `frontend/src/app/features/testimonials/testimonials.component.ts`
- `frontend/src/app/shared/components/pagination/pagination.component.spec.ts`
- `frontend/src/app/shared/components/pagination/pagination.component.ts`
- `frontend/src/app/shared/models.ts`

Sete arquivos WebP em backend/demo-assets/decoracao-tapetes-046:

- `decoracao-tapete-046-grafite-preto-capa.webp`
- `decoracao-tapete-046-canelado-creme-capa.webp`
- `decoracao-tapete-046-moldura-oliva-capa.webp`
- `decoracao-tapete-046-ondas-areia-capa.webp`
- `decoracao-tapete-046-trelica-azul-capa.webp`
- `decoracao-tapete-046-ondas-terracota-capa.webp`
- `decoracao-tapete-046-losangos-preto-capa.webp`

Capturas e matrizes: docs/capturas/home-refinamento/. Integridade final: docs/home-integridade.json.
