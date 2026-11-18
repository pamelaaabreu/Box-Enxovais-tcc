# Edredons com 200 Fios

Banco local bd_box, schema public. Auditoria inicial na versão 34 sem dirty state. Nova migration 000035_catalog_comforter_titles.

Foram identificados 15 edredons ativos e nenhum edredom inativo. Todos os 15 foram atualizados. Os seis jogos de cama conservaram o sufixo 100% Algodão. As demais categorias mantiveram seus nomes e atributos.

## Títulos e tecido externo

| ID | Título anterior | Título novo | Tecido externo após atualização | Enchimento preservado |
|---|---|---|---|---|
| 2 | Edredom Essência Floral Verde Suave \| Tecido Externo 100% Algodão | Edredom Essência Floral Verde Suave 200 Fios | Percal de algodão — 100% algodão — 200 fios | Não informado no cadastro |
| 8 | Edredom Aconchego — Creme | Edredom Aconchego Creme 200 Fios | Microfibra de poliéster — 200 fios | Fibra de poliéster |
| 9 | Edredom Aconchego — Marrom Cacau | Edredom Aconchego Marrom Cacau 200 Fios | Microfibra de poliéster — 200 fios | Fibra de poliéster |
| 10 | Edredom Aconchego — Verde Oliva | Edredom Aconchego Verde Oliva 200 Fios | Microfibra de poliéster — 200 fios | Fibra de poliéster |
| 11 | Edredom Geométrico — Azul Petróleo | Edredom Geométrico Azul Petróleo 200 Fios | Tecido misto de algodão e poliéster — 200 fios | Manta de poliéster |
| 12 | Edredom Geométrico — Rosa Nude | Edredom Geométrico Rosa Nude 200 Fios | Tecido misto de algodão e poliéster — 200 fios | Manta de poliéster |
| 13 | Edredom Geométrico — Verde Sálvia | Edredom Geométrico Verde Sálvia 200 Fios | Tecido misto de algodão e poliéster — 200 fios | Manta de poliéster |
| 14 | Edredom Jardim Azul Lavanda \| Tecido Externo 100% Algodão | Edredom Jardim Azul Lavanda 200 Fios | Tecido de algodão — 100% algodão — 200 fios | Fibra de poliéster |
| 15 | Edredom Jardim Verde Musgo \| Tecido Externo 100% Algodão | Edredom Jardim Verde Musgo 200 Fios | Tecido de algodão — 100% algodão — 200 fios | Fibra de poliéster |
| 78 | Edredom Essência Floral Verde Oliva \| Tecido Externo 100% Algodão | Edredom Essência Floral Verde Oliva 200 Fios | Percal de algodão — 100% algodão — 200 fios | Fibra de poliéster |
| 79 | Edredom Essência Floral Botânico \| Tecido Externo 100% Algodão | Edredom Essência Floral Botânico 200 Fios | Percal de algodão — 100% algodão — 200 fios | Fibra de poliéster |
| 80 | Edredom Aurora Floral Vermelho \| Tecido Externo 100% Algodão | Edredom Aurora Floral Vermelho 200 Fios | Tecido de algodão — 100% algodão — 200 fios | Fibra de poliéster |
| 81 | Edredom Aurora Floral Vinho \| Tecido Externo 100% Algodão | Edredom Aurora Floral Vinho 200 Fios | Tecido de algodão — 100% algodão — 200 fios | Fibra de poliéster |
| 82 | Edredom Serenidade Azul \| Tecido Externo 100% Algodão | Edredom Serenidade Azul 200 Fios | Cetim de algodão — 100% algodão — 200 fios | Fibra de poliéster |
| 83 | Edredom Serenidade Azul Claro \| Tecido Externo 100% Algodão | Edredom Serenidade Azul Claro 200 Fios | Cetim de algodão — 100% algodão — 200 fios | Fibra de poliéster |

A contagem de 200 fios foi cadastrada como especificação demonstrativa do tecido externo de cada produto, conforme autorizado no prompt. Não implica mudança de composição. Aconchego continua com microfibra de poliéster e Geométrico continua com tecido misto de algodão e poliéster. Os tecidos externos já definidos como 100% algodão conservam essa composição na ficha. O edredom #2 não tinha enchimento informado e esse campo continua ausente.

Os resumos e descrições foram auditados e não continham outra contagem de fios nem alegação que exigisse revisão. Foram preservados.

## Dados técnicos

Exemplos do JSONB:

- #78 — Tecido externo = Percal de algodão — 100% algodão — 200 fios; Contagem de fios = 200 fios; Enchimento = Fibra de poliéster.
- #8 — Tecido externo = Microfibra de poliéster — 200 fios; Contagem de fios = 200 fios; Enchimento = Fibra de poliéster.
- #11 — Tecido externo = Tecido misto de algodão e poliéster — 200 fios; Contagem de fios = 200 fios; Enchimento = Manta de poliéster.

A origem da contagem está registrada em Origem dos dados de tecelagem, com valor Especificação demonstrativa aprovada para o TCC. Esse atributo segue a filtragem existente de metadados internos e não aparece como aviso na interface.

## Migration e preservação

Os caminhos são backend/migrations/000035_catalog_comforter_titles.up.sql e backend/migrations/000035_catalog_comforter_titles.down.sql. A tabela catalog_comforter_titles_000035 registra os valores anteriores e posteriores somente dos produtos alterados.

A migration reutiliza catalog_slug para preservar as URLs existentes. O sufixo comercial vem do products.name retornado pela API. O Angular não concatena a contagem e não recebe uma linha nova de material abaixo do título.

O up recusa colisões de títulos e sua reexecução lógica não duplica dados. O down restaura o título e somente os atributos introduzidos que ainda coincidem com os valores da migration, preservando alterações posteriores.

Preços, quantidades, marcas, variantes, dimensões, composição de peças, materiais de enchimento, cuidados, imagens, favoritos, sacolas, pedidos, timestamps e agrupamentos coordenados foram preservados.

A consulta de auditoria está em docs/edredons-200-fios-auditoria.sql.

## Arquivos desta alteração

- backend/migrations/000035_catalog_comforter_titles.up.sql
- backend/migrations/000035_catalog_comforter_titles.down.sql
- frontend/src/app/features/catalog/services/catalog.service.spec.ts
- docs/edredons-200-fios-auditoria.sql
- docs/edredons-200-fios-relatorio.md

- frontend/src/app/features/favorites/favorites.component.spec.ts

## Resultado final

Migration aplicada no bd_box local, versão 35 sem dirty state. Auditoria posterior confirmou 15 edredons com título terminado em 200 Fios, 15 fichas com Contagem de fios = 200 fios e os seis jogos de cama com o título 100% Algodão. Não houve exceção de título.

PostgreSQL isolado aprovado em up/down/up, reexecução lógica sem duplicatas, rollback seletivo e preservação de edições posteriores. Snapshots de preços, estoque, variantes, medidas, materiais, enchimento, composição de peças, cuidados, imagens, sacolas, favoritos, pedidos e nomes históricos conferidos. Busca, listagem, os 15 detalhes e recomendações recíprocas verificados nos endpoints Go. Sacola e favoritos também foram verificados com registros de teste no schema isolado.

Testes Go TestCartPostgres, TestFavoritesPostgres e TestVariantCheckoutPostgres aprovados. Angular aprovado em 33 testes direcionados de CatalogService, ProductCardComponent, ProductDetailComponent, CartComponent e FavoritesComponent. O fixture antigo de favoritos foi atualizado com variants vazio, estado da sacola e seletor do título do segundo card, coerentes com os componentes atuais. O funcionamento da página não foi alterado por essas correções de teste.

Build de produção aprovado. Permanecem avisos de bundle inicial (948,15 kB para orçamento de 500 kB), SCSS de autenticação (15,94 kB para orçamento de 14 kB), sweetalert2 CommonJS e quatro seletores CSS. Os budgets mantêm seus valores anteriores.

Chrome real local, com build de produção, aprovado em 1440, 1024, 768 e 390 px. Em cada largura foram verificados os títulos e fichas técnicas dos 15 edredons, breadcrumbs, links antigos e busca por 200 fios. Cards limitados a duas linhas, preços e ações alinhados por linha e ausência de rolagem horizontal da página. Nenhuma linha de material foi adicionada à área abaixo do título.

As 16 capturas reais de catálogo, detalhes e ficha técnica estão em C:/Users/vitor/.codex/visualizations/2026/09/13/01a09c5b-68bc-7c42-85a5-d4f3f7260a09/edredons-200-fios-capturas. Há também uma comparação das quatro larguras no mesmo diretório.
