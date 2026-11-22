# Catálogo integrado à API

O catálogo atual usa Angular e dados PostgreSQL recebidos por HTTP. O antigo `CATALOG_MOCK` não era importado por produção, testes, rotas ou ferramentas e foi removido na auditoria de 22/11/2026.

Fluxo: navbar → `/categoria/:slug` → `CategoryComponent` → `ProductGridComponent` → `ProductCardComponent` → `/produto/:slug`. O identificador usado atualmente no detalhe corresponde ao ID do produto (exemplo: `/produto/1`).

- [CatalogService](services/catalog.service.ts) adapta o DTO de produto para o modelo do catálogo, resolve categorias e consulta [ProductService](../../core/services/product.service.ts).
- [CategoryComponent](pages/category/category.component.ts) preserva filtros, ordenação e paginação da API.
- [ProductDetailComponent](pages/product-detail/product-detail.component.ts) carrega produto, variantes, imagens, frete e recomendações.
- [Categorias](data/categories.ts) define a navegação das seis categorias. Não contém o estoque comercial.
- [ProductCardComponent](components/product-card/product-card.component.ts) é compartilhado pelas vitrines e mantém ações de compra e favoritos.

Os componentes legados de filtro e ordenação não pertencem ao grafo atual de produção; foram preservados e classificados em [Código não utilizado](../../../../../docs/auditoria/CODIGO_NAO_UTILIZADO.md). A explicação completa do sistema está no [guia do TCC](../../../../../docs/GUIA_COMPLETO_TCC/README.md).
