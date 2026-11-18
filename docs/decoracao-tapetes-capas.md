# Correção das capas de tapetes

18/11/2026 — Box-Enxovais-tcc. Banco bd_box versão 44, dirty=false.

Auditoria: 13 capas de tapetes da migration 42. As seis de quarto/sala foram mantidas; as sete de saída de box foram substituídas por fotografias quadradas em diagonal, com produto inteiro, mesma cor/estampa e margens discretas. Mantido object-fit: contain. Componentes, proporções dos cards e estilos Angular preservados.

| ID | Produto | Nova capa |
|---|---|---|
| 136 | Tapete Saída de Box Canelado Creme | decoracao-tapete-043-canelado-creme-capa.webp |
| 137 | Tapete Saída de Box Grafite e Preto | decoracao-tapete-043-grafite-preto-capa.webp |
| 138 | Tapete Saída de Box Losangos Preto | decoracao-tapete-043-losangos-preto-capa.webp |
| 139 | Tapete Saída de Box Moldura Oliva | decoracao-tapete-043-moldura-oliva-capa.webp |
| 140 | Tapete Saída de Box Ondas Areia | decoracao-tapete-043-ondas-areia-capa.webp |
| 141 | Tapete Saída de Box Ondas Terracota | decoracao-tapete-043-ondas-terracota-capa.webp |
| 142 | Tapete Saída de Box Treliça Azul | decoracao-tapete-043-trelica-azul-capa.webp |

## Persistência

Migration 43 atualiza somente image_path nas sete imagens principais. Preserva IDs, ordem, legendas e status principal. Migration 44 torna as referências do diário de rollback compatíveis com exclusões futuras de imagens/produtos na administração. Ambas possuem down. Arquivos antigos preservados.

A aplicação transacional confirmou preços, estoques, variantes, favoritos, sacolas e pedidos intactos. As 350 outras imagens do banco foram preservadas, incluindo as 59 demais de Decoração. As sete novas URLs responderam HTTP 200 com SHA256 correspondente ao manifesto.

## Testes

- Go/PostgreSQL isolado: TestCatalogDecoracaoPostgres passou, incluindo up/down/up, idempotência, preservação de dados e gerenciamento da galeria com o diário de rollback.
- Angular: ProductGalleryComponent e CatalogService, 10 testes passaram. Avisos 404 de imagens fictícias pertencem às fixtures.
- Build de produção: sucesso, com avisos existentes de orçamento de bundle/estilo do cadastro, NG8107, CommonJS SweetAlert2 e seletores Bootstrap.
- Chrome: catálogo filtrado e sete produtos em 1440, 1024, 768 e 390 px. Capas, três miniaturas, complementares e zoom conferidos. Sem rolagem horizontal. Matriz em capturas/decoracao-tapetes/validacao.json.
- git diff --check: sem erros.

## Arquivos

- backend/migrations/000043_decor_rug_covers.up.sql e .down.sql.
- backend/migrations/000044_decor_cover_journal_cascade.up.sql e .down.sql.
- backend/demo-assets/decoracao-tapetes-043/: sete WebP listados acima, imagens.json, install-images.ps1 e resultado-local.json.
- backend/src/routes/catalog_decoracao_test.go.
- docs/decoracao-tapetes-capas.md e docs/capturas/decoracao-tapetes/.

[Antes mobile](capturas/decoracao-tapetes/390-antes-tapete-140.png) · [Depois mobile](capturas/decoracao-tapetes/390-tapete-140.png) · [Catálogo desktop](capturas/decoracao-tapetes/1440-tapetes-catalogo.png) · [Sete capas](capturas/decoracao-tapetes/capas.jpg).
