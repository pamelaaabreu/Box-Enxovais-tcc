# Toalhas e tipografia de produto

Execução no projeto `Box-Enxovais-tcc`, banco local `bd_box`. Migration `000038_catalog_towels` aplicada: versão 38, `dirty=false`.

## Cadastro efetivo

| ID | Produto | Preço | Estoque | Galeria |
|---|---|---:|---:|---:|
| 94 | Toalha de Banho Essência Areia 100% Algodão | R$ 79,90 | 12 | 5 |
| 95 | Jogo de Toalhas Spa Terracota 5 Peças | R$ 189,90 | 8 | 5 |
| 96 | Jogo de Toalhas Lavanda 4 Peças | R$ 159,90 | 8 | 5 |
| 97 | Jogo de Toalhas Sálvia e Creme 5 Peças | R$ 199,90 | 8 | 5 |
| 98 | Toalha de Banho Verde Sálvia 100% Algodão | R$ 79,90 | 12 | 5 |
| 99 | Jogo de Toalhas Azul Pó 5 Peças | R$ 189,90 | 8 | 5 |
| 100 | Jogo de Toalhas Blush 5 Peças | R$ 189,90 | 8 | 5 |
| 101 | Jogo de Toalhas Aconchego Neutro 5 Peças | R$ 199,90 | 8 | 5 |
| 102 | Toalha de Banho Branca Premium 100% Algodão | R$ 89,90 | 12 | 5 |
| 103 | Trio de Toalhas Spa Neutras 3 Peças | R$ 119,90 | 8 | 5 |

10 SKUs ativos, 92 unidades, 50 imagens distintas e exatamente uma capa por produto. Nenhuma variante artificial criada. Marca Box Enxovais reaproveitada. Categoria Toalhas: ID 8.

Dados comerciais, composição, gramatura, cor, material, resumo, descrição e conservação seguem o manifesto fornecido. Gramaturas entre 430 e 500 g/m²; não foi aplicado “200 Fios” às toalhas.

A toalha histórica #29 foi movida de Cama para Toalhas, mantendo-se inativa. Comparação dos snapshots confirmou preservação dos outros dados dos 47 produtos anteriores, incluindo variantes e galerias. A transação também verificou 46 tabelas anteriores, permitindo apenas as novas linhas de imagens. Não foram criados carrinhos ou pedidos de teste no schema principal.

## Mídia reproduzível

Arquivos em [backend/demo-assets/toalhas-2026](../backend/demo-assets/toalhas-2026). [Catálogo original](../backend/demo-assets/toalhas-2026/catalogo.json) e [mapa dos 50 arquivos, URLs e SHA-256](../backend/demo-assets/toalhas-2026/imagens.json).

Cada SKU usa `http://localhost:8080/uploads/toalhas-2026-SS-VISTA.webp`, com SS de 01 a 10 e vistas, nesta ordem:

1. `01-capa`
2. `02-pendurada`
3. `03-dobrada`
4. `04-felpa`
5. `05-composicao`

Todas as 50 URLs responderam HTTP 200 e seus bytes coincidem com os hashes do manifesto. WebP com até 1600 px, preservando a resolução disponível. O instalador valida hashes, não sobrescreve arquivos diferentes e permite reexecução:

`powershell -File backend/demo-assets/toalhas-2026/install-images.ps1`

O destino é `backend/uploads`, que continua ignorado pelo Git. Não foram versionados uploads de usuários.

As capas 01 (Essência Areia) e 09 (Branca Premium) foram corrigidas para mostrar uma única toalha de banho; as outras oito capas fornecidas foram preservadas. Foram geradas 40 vistas complementares. Cada kit possui foto de composição integral: cinco peças nos kits de cinco, quatro no Lavanda e três no trio. As vistas de uma única peça dos kits são detalhes parciais, não uma alteração da composição vendida.

## Interface

- Categoria Toalhas integrada à navegação existente, com filtros reais de cor, tipo, coleção, preço, disponibilidade e pesquisa.
- Coleções organizadas pelos nomes comerciais: Essência, Spa, Lavanda, Sálvia, Azul Pó, Blush, Aconchego Neutro e Premium. Slugs internos com prefixo `toalhas-` evitam colisões com Cama.
- Recomendações priorizam toalhas da mesma coleção/cor e tipo complementar quando disponível; sem inventar pares ou recomendar o próprio SKU.
- Medida sob o seletor: 14–15 px, peso 500; variante continua atualizando o valor. Rótulos específicos quando o dado permite; referência de colchão preservada.
- Descrição e valores: peso 400; rótulos técnicos: 500. Títulos de seção aprovados preservados em 16 px/600.
- Respiro de 22 px após o texto descritivo. Removido o parágrafo redundante da marca.
- Composição permanece na seção “Medidas e o que acompanha”; a faixa acima dos botões não foi restaurada.
- Toalhas de composição fixa não exibem seletor de tamanho.

## Validação executada

- Angular: **38 testes passaram** em categoria, serviço de catálogo, detalhe, cards e galeria abrangidos pelos arquivos direcionados.
- Go/PostgreSQL isolado: **TestCatalogTowelsPostgres**, **TestCartPostgres**, **TestCheckoutStockPostgres**, **TestVariantCheckoutPostgres**, **TestVariantLastUnitPostgres** e **TestShippingRangesPostgres** passaram.
- Teste de Toalhas compara os 10 SKUs com o manifesto oficial, executa up/down/up, verifica prevenção de duplicações, filtros, preço/estoque, composição fixa, recomendações e bloqueio de down com vínculos posteriores.
- Carrinho não reduz estoque; checkout reduz e cancelamento repõe. Esses fluxos de gravação foram executados somente em schemas isolados.
- Build Angular de produção concluído. Warnings: bundle inicial de 948,15 kB para budget de 500 kB; SCSS de cadastro de 15,94 kB para budget de 14 kB; SweetAlert2 CommonJS; quatro seletores de CSS ignorados; NG8107. Budgets não foram ampliados.
- Chrome local em **1440, 1024, 768 e 390 px**: catálogo Toalhas, filtros combinados, cinco ordenações, busca sem resultados/limpeza, páginas unitária e kit, abas, miniaturas, zoom, CEP inválido e foco. Regressão visual de Cama, edredom #78 e travesseiro #33. Sem overflow horizontal nas telas verificadas.
- As dez galerias foram navegadas, com cinco miniaturas cada; fotografias e composição foram inspecionadas.
- `git diff --check` sem erros.

[Capturas e medições](capturas/toalhas). Para cada largura há catálogo, compra do kit e comparação antes/depois da descrição do edredom. [Medições de tipografia](capturas/toalhas/validacao.json).

## Arquivos envolvidos

- `backend/migrations/000038_catalog_towels.up.sql`
- `backend/migrations/000038_catalog_towels.down.sql`
- `backend/src/services/product_service.go`
- `backend/src/repositories/product_repository.go`
- `backend/src/routes/catalog_towels_test.go`
- `backend/demo-assets/toalhas-2026/catalogo.json`, `imagens.json`, `install-images.ps1` e os 50 WebP enumerados no manifesto
- `frontend/src/app/features/catalog/data/catalog-swatches.ts`
- `frontend/src/app/features/catalog/pages/category/category.component.ts`
- `frontend/src/app/features/catalog/pages/category/category.component.spec.ts`
- `frontend/src/app/features/catalog/pages/product-detail/product-detail.component.ts`
- `frontend/src/app/features/catalog/pages/product-detail/product-detail.component.html`
- `frontend/src/app/features/catalog/pages/product-detail/product-detail.component.scss`
- `frontend/src/app/features/catalog/pages/product-detail/product-detail.component.spec.ts`
- Este relatório e `docs/capturas/toalhas`.

Não há galerias incompletas. Permanecem os warnings de build informados. As fotos geradas são assets do catálogo demonstrativo; não constituem certificação de fabricante.

