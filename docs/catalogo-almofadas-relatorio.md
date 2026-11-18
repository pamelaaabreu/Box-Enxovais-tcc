# Almofadas: oito capas e galerias

Implementado no repositório `Box-Enxovais-tcc`, usando o pacote `box_enxovais_almofadas_8_capas_kits_prompt_codex.zip`.

## Banco e produtos

Auditoria inicial: `bd_box` local na versão 38, sem produtos de Almofadas e sem modelo de componentes de kit. Migration nova `000039_catalog_cushion_covers` aplicada; versão final **39**, **dirty=false**.

| ID | Produto | Medida | Preço | Estoque | Imagens |
|---|---|---|---:|---:|---:|
| [104](http://localhost:4200/produto/104) | Capa de Almofada Treliça Creme | 30 × 50 cm | R$ 59,90 | 8 | 5 |
| [105](http://localhost:4200/produto/105) | Capa de Almofada Treliça Nude | 30 × 50 cm | R$ 59,90 | 8 | 5 |
| [106](http://localhost:4200/produto/106) | Capa de Almofada Treliça Sálvia | 30 × 50 cm | R$ 59,90 | 8 | 5 |
| [107](http://localhost:4200/produto/107) | Capa de Almofada Tricô Canelado Azul Serenidade | 45 × 45 cm | R$ 64,90 | 8 | 5 |
| [108](http://localhost:4200/produto/108) | Capa de Almofada Tricô Canelado Mostarda | 45 × 45 cm | R$ 64,90 | 8 | 5 |
| [109](http://localhost:4200/produto/109) | Capa de Almofada Tricô Losangos Areia | 50 × 50 cm | R$ 69,90 | 8 | 5 |
| [110](http://localhost:4200/produto/110) | Capa de Almofada Tricô Losangos Oliva | 50 × 50 cm | R$ 69,90 | 8 | 5 |
| [111](http://localhost:4200/produto/111) | Capa de Almofada Tricô Losangos Terracota | 50 × 50 cm | R$ 69,90 | 8 | 5 |

Total: **oito produtos ativos e 64 unidades**. Marca Box Enxovais reaproveitada. Nenhuma variante de tamanho redundante.

Conteúdo de cada SKU: **1 capa de almofada; enchimento não incluso**. Descrições diferenciadas por textura, cor e formato. Composições demonstrativas por grupo: tricô 100% acrílico; tecido aveludado 100% poliéster. Fechamento por zíper discreto na costura inferior. Cuidados separados por instrução: lavagem manual em água fria, sem alvejante/secadora; tricô com secagem horizontal à sombra; cuidado para não esfregar ou passar o relevo das peças aveludadas. Origem demonstrativa registrada no banco e no manifesto, sem avisos repetitivos na interface.

A comparação completa dos snapshots confirmou que os **57 produtos anteriores** permanecem iguais, incluindo estoque, preços, variantes e imagens. A aplicação transacional verificou **49 tabelas anteriores** e preservou usuários, carrinhos, pedidos e favoritos. Não houve compra de teste no schema principal.

## Kits pendentes, sem publicação

Nenhum kit foi cadastrado:

- Kit 2 Capas Tricô Losangos Areia e Oliva: proposta de R$ 129,90.
- Kit 2 Capas Treliça Nude e Creme: proposta de R$ 109,90.

O modelo atual baixa `products.quantity` ou `product_variants.quantity` no checkout. Não há relação de componentes, estoque derivado ou snapshot dos componentes no pedido. Criar um produto com estoque independente permitiria vender o mesmo estoque duas vezes. Conforme a alternativa expressamente prevista no prompt, as propostas ficaram documentadas no manifesto, com `kits_status=pending_component_stock_model`.

Para publicá-los será necessário implementar relação kit/componentes, cálculo de disponibilidade, bloqueio transacional dos mesmos componentes comprados individualmente, baixa conjunta, snapshots para histórico e reposição idempotente no cancelamento, com testes de concorrência. Fotos dos kits não foram criadas nem publicadas.

## Imagens e URLs

As **oito capas PNG fornecidas foram preservadas byte a byte**. Não foram usadas imagens da pasta `referencias`. Foram geradas **32 vistas complementares**, quatro por SKU: lateral, detalhe da trama, fechamento e capa vazia.

Galeria, nesta ordem:

1. `01-capa.png`: PNG original.
2. `02-lateral.webp`.
3. `03-trama.webp`.
4. `04-fechamento.webp`.
5. `05-sem-enchimento.webp`.

As 40 imagens são distintas e cada produto tem uma única capa principal. Revisadas em folhas de contato e no zoom da loja. Todas as URLs retornaram **HTTP 200**, com SHA-256 igual ao manifesto.

Padrão: `http://localhost:8080/uploads/almofadas-2026-SLUG-VISTA.EXT`. Exemplo: [capa Oliva](http://localhost:8080/uploads/almofadas-2026-capa-tricot-losangos-oliva-01-capa.png).

Arquivos reproduzíveis em [backend/demo-assets/almofadas-2026](../backend/demo-assets/almofadas-2026):

- [Manifesto original](../backend/demo-assets/almofadas-2026/catalogo-origem.json).
- [Manifesto editorial e comercial](../backend/demo-assets/almofadas-2026/catalogo.json).
- [40 arquivos, URLs, dimensões, origens e hashes](../backend/demo-assets/almofadas-2026/imagens.json).
- [IDs e URLs efetivos](../backend/demo-assets/almofadas-2026/resultado-local.json).
- `install-images.ps1`: valida hashes e copia para `backend/uploads`, sem sobrescrever arquivos divergentes. Reexecutado sem duplicar dados; uploads de usuários continuam fora do Git.

## Interface

[Categoria Almofadas](http://localhost:4200/categoria/almofadas) integrada ao catálogo existente. Filtros de tipo, dimensão, cor, coleção, preço e disponibilidade; busca, ordenação e estado vazio preservados.

Dimensão fixa apresentada como informação; não há seletor de tamanho de uma única opção. Conteúdo aparece na descrição/ficha, sem restaurar faixa acima dos botões. Cabeçalho, cards, sidebar e componentes de feedback preservados.

Recomendações priorizam mantas/peseiras com cor coordenável e depois Cama com cor próxima, sem declarar par exato. Exemplo real da Oliva #110: Manta Tricot Verde Oliva #22 em primeiro lugar, seguida por itens de Cama em verde. Os grupos de cores estão no banco; o atributo interno não aparece na ficha.

## Testes e conferência

- **Angular: 47 testes passaram**, incluindo categoria, filtros, dimensões fixas, conteúdo sem enchimento, detalhe, serviço de catálogo e sacola nos arquivos direcionados.
- **Go/PostgreSQL isolado:** passaram `TestCatalogCushionCoversPostgres`, `TestCatalogTowelsPostgres`, `TestCartPostgres`, `TestCheckoutStockPostgres`, `TestVariantLastUnitPostgres`, `TestFavoritesAuthorization` e `TestFavoritesPostgres`.
- Migration: **up/down/up**, reexecução lógica sem duplicações, preservação dos dados anteriores e recusa de rollback após vínculo comercial.
- Comparação dos oito SKUs com manifesto: nomes, preços, estoque, cores, dimensões, atributos, descrições, composição e conservação.
- Compra unitária sem variante: sacola não consome estoque; checkout baixa; cancelamento repõe; nome “Capa de Almofada” preservado no snapshot do pedido. Gravações funcionais realizadas em schemas isolados.
- Concorrência de últimas unidades e autorização/isolamento de favoritos cobertas pelos testes existentes. Testes de kits não se aplicam porque eles não foram publicados.
- Build Angular de produção concluído. Avisos existentes: bundle inicial 948,15 kB para budget de 500 kB; SCSS de cadastro 15,94 kB para budget de 14 kB; SweetAlert2 CommonJS; NG8107; quatro seletores CSS ignorados. Budgets não foram alterados.
- **Chrome em 1440, 1024, 768 e 390 px:** catálogo, alturas dos cards, combinações de filtros, cinco ordenações, busca, limpeza de filtros, navegação de detalhe e retorno, abas, conteúdo, CEP inválido/foco, zoom e cinco miniaturas de cada uma das oito galerias. Sem overflow horizontal nas telas verificadas. Regressão de Cama, Toalhas e Travesseiros.
- Os testes visuais usaram navegação pública. A gravação autenticada de sacola/checkout/favoritos foi validada nos testes isolados, não por compras na conta principal.
- `git diff --check` sem erros.

[Capturas desktop/mobile e matriz de validação](capturas/almofadas). Foram salvas 16 capturas: catálogo, produto Oliva, descrição da Treliça Nude e zoom da capa vazia, nas quatro larguras.

## Arquivos criados/modificados nesta tarefa

- `backend/migrations/000039_catalog_cushion_covers.up.sql` e `.down.sql`.
- `backend/src/repositories/product_repository.go`.
- `backend/src/routes/catalog_cushion_covers_test.go`.
- `backend/demo-assets/almofadas-2026/`: manifestos, instalador, resultado e 40 imagens enumeradas em `imagens.json`.
- `frontend/src/app/features/catalog/data/catalog-swatches.ts`.
- `frontend/src/app/features/catalog/pages/category/category.component.ts` e `.spec.ts`.
- `frontend/src/app/features/catalog/pages/product-detail/product-detail.component.ts`, `.html` e `.spec.ts`.
- `docs/capturas/almofadas/` e este relatório.

Pendências: os dois kits aguardam modelagem de componentes e estoque; avisos de build acima. Nenhuma galeria unitária incompleta.

