# Decoração — cadastro e validação

Data: 18/11/2026. Projeto: Box-Enxovais-tcc. Banco local: bd_box.

## Resultado

Migration 000042_catalog_decoracao aplicada, versão 42, dirty=false. Foram criados 22 produtos ativos, com marca Box Enxovais, 236 unidades e 66 imagens. Os 75 produtos anteriores foram comparados antes/depois e permaneceram inalterados; a aplicação transacional verificou 54 tabelas anteriores. Não foram alterados preços, estoques, variantes, carrinhos ou pedidos anteriores.

A categoria física Decoração reutiliza product_types. Os agrupamentos são estruturados no JSONB Tipo, compatíveis com o catálogo existente: Tapetes para quarto e sala (6), Tapetes para banheiro / saída de box (7) e Cortinas (9). Não foram criadas variantes fictícias. As medidas são características fixas, exibidas sem seletor de tamanhos redundante.

## Produtos cadastrados

| ID | Produto | Preço | Estoque | Imagens |
|---|---|---|---|---|
| 132 | Tapete Bouclé Areia | R$ 189,90 | 8 | 3 |
| 133 | Tapete Geométrico Nude | R$ 239,90 | 8 | 3 |
| 143 | Tapete Trama Verde Sálvia | R$ 209,90 | 8 | 3 |
| 131 | Tapete Botânico Azul Sereno | R$ 229,90 | 8 | 3 |
| 135 | Tapete Orgânico Terracota | R$ 239,90 | 8 | 3 |
| 134 | Tapete Geométrico Preto e Cinza | R$ 249,90 | 8 | 3 |
| 140 | Tapete Saída de Box Ondas Areia | R$ 49,90 | 14 | 3 |
| 136 | Tapete Saída de Box Canelado Creme | R$ 49,90 | 14 | 3 |
| 139 | Tapete Saída de Box Moldura Oliva | R$ 54,90 | 14 | 3 |
| 142 | Tapete Saída de Box Treliça Azul | R$ 59,90 | 14 | 3 |
| 141 | Tapete Saída de Box Ondas Terracota | R$ 54,90 | 14 | 3 |
| 137 | Tapete Saída de Box Grafite e Preto | R$ 59,90 | 14 | 3 |
| 138 | Tapete Saída de Box Losangos Preto | R$ 59,90 | 14 | 3 |
| 125 | Cortina Linho Natural Areia | R$ 179,90 | 10 | 3 |
| 130 | Cortina Voil Floral Pérola | R$ 159,90 | 10 | 3 |
| 123 | Cortina Blackout Taupe | R$ 229,90 | 10 | 3 |
| 126 | Cortina Texturizada Ondas Bege | R$ 189,90 | 10 | 3 |
| 124 | Cortina Geométrica Cinza | R$ 199,90 | 10 | 3 |
| 129 | Cortina Voil Branco Leve | R$ 149,90 | 10 | 3 |
| 127 | Cortina Trama Natural Bege | R$ 189,90 | 10 | 3 |
| 128 | Cortina Verde Sálvia | R$ 199,90 | 10 | 3 |
| 122 | Cortina Blackout Grafite | R$ 239,90 | 10 | 3 |

## Dados técnicos e imagens

Nomes, preços, estoques, cores, materiais e conteúdo seguem o manifesto de origem. Cada tapete de quarto/sala possui 8 unidades, cada tapete de banheiro 14, cada cortina 10. Materiais, textura, acabamento, dimensão, composição e cuidados são carregados pela API, sem hardcode no componente.

Cortinas: dois painéis, ilhós, varão não incluso. A dimensão 300 × 250 cm representa largura total de tecido por altura; cada painel tem 150 cm de largura. Não é uma promessa de cobertura de janela de 300 cm, pois franzimento e instalação interferem. Blackout, transparência e filtragem parcial foram preservados sem percentuais inventados.

As 22 capas originais foram preservadas byte a byte. Foram acrescentadas 44 imagens específicas: apresentação objetiva/ambientação complementar e detalhe de tecido, acabamento ou bainha. Cada produto possui uma única capa e três imagens em ordem estável. Todas as imagens possuem hashes distintos; 66 URLs responderam HTTP 200 com hash correspondente ao arquivo inventariado. As imagens ficam em backend/uploads, instaláveis por install-images.ps1; não há referência pública a caminhos do Windows.

Limitação de qualidade: algumas capas originais de cortinas têm somente 374 × 331/332 px. Elas foram mantidas conforme a referência recebida, sem aumento artificial de resolução. As imagens adicionais têm resolução maior. A galeria de Decoração utiliza contain para preservar a peça inteira e não cortar tapetes ou cortinas. A revisão visual das 66 imagens está nas quatro pranchas galerias-1.jpg a galerias-4.jpg.

## Filtros e recomendações

Filtros por tipo, coleção, cor, tamanho, material e opacidade integrados ao catálogo existente. Busca, preço, estoque, ordenação e paginação permanecem funcionais. A codificação de ponto e vírgula nos valores dos filtros foi corrigida na paginação: o material passou a chegar corretamente ao parser Go, sem mudar o texto cadastrado.

Recomendações priorizam tapetes de banheiro com Toalhas; tapetes de quarto/sala e cortinas se complementam, com prioridade de cor quando existe correspondência. Não são anunciados como pares exatos. Na API local, o Tapete Bouclé Areia (#132) recomendou primeiro Cortina Linho Natural Areia (#125); Tapete Saída de Box Ondas Areia (#140), Toalha de Banho Essência Areia (#94). Sem tapete da mesma cor, cortinas utilizam o fallback complementar.

## Migração e segurança

Arquivos up/down novos; migrations anteriores não foram editadas nesta tarefa. A migração registra snapshots dos produtos/imagens criados e evita duplicação na reexecução. O down recusa exclusão se houver alterações posteriores ou vínculos com sacola, pedidos, favoritos, promoções ou variantes. Up/down/up e reexecução foram testados em schema isolado. Nenhuma compra de teste foi persistida no banco principal.

## Testes executados

- Go/PostgreSQL isolado: TestCatalogDecoracaoPostgres, TestCartPostgres, TestCheckoutStockPostgres e TestFavoritesPostgres passaram. Incluem dados reais do manifesto, up/down/up, idempotência, filtros, recomendações, autorização, sacola, checkout, cancelamento e reposição de estoque. Após o ajuste final das recomendações, TestCatalogDecoracaoPostgres foi reexecutado e passou.
- Angular: rodada inicial de categoria, detalhe, catálogo e galeria: 38 casos passaram. Após novos casos, categoria/catálogo/galeria: 17 passaram. As rodadas têm sobreposição, portanto não representam 55 testes distintos.
- Paginação: 10 casos passaram, incluindo regressão para material com ponto e vírgula.
- Build final de produção: sucesso. Permanecem avisos de orçamento do bundle inicial (948,16 kB para orçamento de 500 kB), estilo do cadastro (15,94 kB para 14 kB), CommonJS do SweetAlert2, NG8107 e seletores Bootstrap ignorados. Uma tentativa anterior falhou ao acessar Google Fonts por timeout; o build normal posterior e o final passaram sem modificar configuração ou dependências.
- Chrome local em 1440, 1024, 768 e 390 px: catálogo, três tipos, filtros, blackout, estado vazio/limpeza, cinco ordenações, paginação, quatro detalhes representativos, miniaturas, zoom, abas e validação de CEP passaram. Nenhuma rolagem horizontal nas verificações. Regressão visual de Cama, Mesa, Toalhas e Almofadas também conferida. As 22 galerias tiveram as três imagens carregadas.
- git diff --check: sem erros de whitespace.

## Arquivos desta tarefa

- backend/migrations/000042_catalog_decoracao.up.sql e .down.sql.
- backend/demo-assets/decoracao-2026/: catálogo, origem, inventários, 66 WebP, instalador e resultado-local.json (IDs, preços, estoque e verificações HTTP).
- backend/src/repositories/product_repository.go; backend/src/services/product_service.go; backend/src/routes/catalog_decoracao_test.go.
- frontend/src/app/core/services/pagination.service.ts e .spec.ts.
- frontend/src/app/features/catalog/pages/category/category.component.ts e .spec.ts.
- frontend/src/app/features/catalog/pages/product-detail/product-detail.component.html.
- frontend/src/app/features/catalog/services/catalog.service.ts e .spec.ts.
- frontend/src/app/features/catalog/data/catalog-swatches.ts.
- frontend/src/app/features/catalog/interfaces/product-image.interface.ts.
- frontend/src/app/features/catalog/components/product-media/product-media.component.html e .scss.
- docs/catalogo-decoracao-relatorio.md e docs/capturas/decoracao/.

Alterações de Mesa já existentes no workspace foram preservadas e não fazem parte desta entrega.

## Capturas

Em docs/capturas/decoracao estão 20 capturas principais: catálogo e quatro produtos representativos (#132 tapete de sala, #140 tapete de banheiro, #123 blackout e #129 voil) nas quatro larguras. validacao.json registra a matriz de verificações; galerias-1.jpg a galerias-4.jpg apresentam todas as imagens.

- [Catálogo desktop](capturas/decoracao/1440-decoracao-catalogo.png)
- [Catálogo mobile](capturas/decoracao/390-decoracao-catalogo.png)
- [Blackout desktop](capturas/decoracao/1440-decoracao-produto-123.png)
- [Tapete de banheiro mobile](capturas/decoracao/390-decoracao-produto-140.png)

Sem etapas funcionais pendentes. A ressalva de resolução das capas originais permanece documentada acima.
