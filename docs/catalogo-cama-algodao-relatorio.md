# Títulos e composição de algodão em Cama

Migration 000034_catalog_cotton_titles, criada após auditoria do bd_box na versão 33, sem dirty state. Aplicada no banco local, versão final 34.

A consulta de auditoria está em catalogo-cama-algodao-auditoria.sql. Foram auditados 35 registros vinculados aos cinco agrupamentos de Cama, incluindo inativos. 15 foram atualizados e 20 foram mantidos como exceções, incluindo a toalha #29 cadastrada em uma subcategoria de Cama.

## Especificação demonstrativa aprovada

Os seis jogos de cama recebem composição têxtil de 100% algodão. Os nove edredons recebem a alegação limitada a tecido externo, acompanhada da composição do tecido externo. O enchimento existente permanece registrado como estava. O edredom #2 não tinha enchimento descrito e continua sem essa informação. Não foi inferido enchimento para completar a ficha.

Os produtos Aurora #4, #5, #80 e #81 eram descritos como tecido misto e tiveram Material, Tecido externo, composição e trechos editoriais conflitantes atualizados para o novo cadastro demonstrativo de algodão. A origem dessa especificação é registrada no JSONB.

## Comparação

| ID | Nome anterior | Nome novo | Material e enchimento | Justificativa |
|---|---|---|---|---|
| 1 | Jogo de Cama Essência Floral — Verde Oliva | Jogo de Cama Essência Floral Verde Oliva 100% Algodão | Percal de algodão; enchimento não informado | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 2 | Edredom Essência Floral — Verde Suave | Edredom Essência Floral Verde Suave | Tecido Externo 100% Algodão | Percal de algodão; enchimento não informado | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 3 | Jogo de Cama Essência Floral — Botânico | Jogo de Cama Essência Floral Botânico 100% Algodão | Percal de algodão; enchimento não informado | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 4 | Jogo de Cama Aurora Floral — Vermelho | Jogo de Cama Aurora Floral Vermelho 100% Algodão | Tecido de algodão; enchimento não informado | Ficha demonstrativa Aurora revisada para tecido de algodão |
| 5 | Jogo de Cama Aurora Floral — Vinho | Jogo de Cama Aurora Floral Vinho 100% Algodão | Tecido de algodão; enchimento não informado | Ficha demonstrativa Aurora revisada para tecido de algodão |
| 6 | Jogo de Cama Serenidade — Azul | Jogo de Cama Serenidade Azul 100% Algodão | Cetim de algodão; enchimento não informado | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 7 | Jogo de Cama Serenidade — Azul Claro | Jogo de Cama Serenidade Azul Claro 100% Algodão | Cetim de algodão; enchimento não informado | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 14 | Edredom Jardim — Azul Lavanda | Edredom Jardim Azul Lavanda | Tecido Externo 100% Algodão | Tecido de algodão; Fibra de poliéster | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 15 | Edredom Jardim — Verde Musgo | Edredom Jardim Verde Musgo | Tecido Externo 100% Algodão | Tecido de algodão; Fibra de poliéster | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 78 | Edredom Essência Floral — Verde Oliva | Edredom Essência Floral Verde Oliva | Tecido Externo 100% Algodão | Percal de algodão; Fibra de poliéster | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 79 | Edredom Essência Floral — Botânico | Edredom Essência Floral Botânico | Tecido Externo 100% Algodão | Percal de algodão; Fibra de poliéster | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 80 | Edredom Aurora Floral — Vermelho | Edredom Aurora Floral Vermelho | Tecido Externo 100% Algodão | Tecido de algodão; Fibra de poliéster | Ficha demonstrativa Aurora revisada para tecido de algodão |
| 81 | Edredom Aurora Floral — Vinho | Edredom Aurora Floral Vinho | Tecido Externo 100% Algodão | Tecido de algodão; Fibra de poliéster | Ficha demonstrativa Aurora revisada para tecido de algodão |
| 82 | Edredom Serenidade — Azul | Edredom Serenidade Azul | Tecido Externo 100% Algodão | Cetim de algodão; Fibra de poliéster | Composição do tecido de algodão especificada no cadastro demonstrativo |
| 83 | Edredom Serenidade — Azul Claro | Edredom Serenidade Azul Claro | Tecido Externo 100% Algodão | Cetim de algodão; Fibra de poliéster | Composição do tecido de algodão especificada no cadastro demonstrativo |

## Exceções

| ID | Produto | Categoria cadastrada | Motivo |
|---|---|---|---|
| 8 | Edredom Aconchego — Creme | Cama / Edredons | Microfibra de poliéster; Fibra de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 9 | Edredom Aconchego — Marrom Cacau | Cama / Edredons | Microfibra de poliéster; Fibra de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 10 | Edredom Aconchego — Verde Oliva | Cama / Edredons | Microfibra de poliéster; Fibra de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 11 | Edredom Geométrico — Azul Petróleo | Cama / Edredons | Tecido misto de algodão e poliéster; Manta de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 12 | Edredom Geométrico — Rosa Nude | Cama / Edredons | Tecido misto de algodão e poliéster; Manta de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 13 | Edredom Geométrico — Verde Sálvia | Cama / Edredons | Tecido misto de algodão e poliéster; Manta de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 16 | Cobre-Leito Natural — Verde Botânico | Cama / Colchas e cobre-leitos | Tecido misto de algodão e poliéster; Manta fina de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 17 | Cobre-Leito Natural — Folhagens Suaves | Cama / Colchas e cobre-leitos | Tecido misto de algodão e poliéster; Manta fina de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 18 | Cobre-Leito Natural — Botânico Neutro | Cama / Colchas e cobre-leitos | Tecido misto de algodão e poliéster; Manta fina de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 19 | Colcha Provence — Lilás | Cama / Colchas e cobre-leitos | Microfibra de poliéster; Manta leve de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 20 | Colcha Provence — Rosa | Cama / Colchas e cobre-leitos | Microfibra de poliéster; Manta leve de poliéster. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 21 | Manta Tricot Conforto — Areia | Cama / Mantas e peseiras | Tricô de acrílico; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 22 | Manta Tricot Conforto — Verde Oliva | Cama / Mantas e peseiras | Tricô de acrílico; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 23 | Manta Tricot Conforto — Terracota | Cama / Mantas e peseiras | Tricô de acrílico; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 24 | Peseira Textura — Off-White | Cama / Mantas e peseiras | Tecido misto de algodão e poliéster; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 25 | Peseira Textura — Azul Acinzentado | Cama / Mantas e peseiras | Tecido misto de algodão e poliéster; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 26 | Peseira Textura — Marrom Taupe | Cama / Mantas e peseiras | Tecido misto de algodão e poliéster; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 27 | Protetor SoftCare | Cama / Protetores de colchão | Malha de poliéster; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 28 | Protetor Protege | Cama / Protetores de colchão | Tecido misto de algodão e poliéster; sem enchimento informado. Alegação de 100% algodão pendente de outra decisão de cadastro. |
| 29 | Toalha de Banho Premium 100% Algodão | Cama / Colchas e cobre-leitos | Toalha cadastrada em subcategoria de Cama. Excluída por tipo de produto, já possui 100% Algodão. |

## Preservação

O JSONB recebe catalog_slug com o slug anterior calculado pelo frontend. O serviço Angular usa esse valor para manter os links existentes. O atributo interno é omitido da ficha técnica. Os títulos exibidos vêm do nome persistido recebido pela API.

A migration não altera preços, estoque, variantes, conteúdo dos conjuntos, enchimento, imagens, marca, favoritos, carrinhos, pedidos, timestamps ou os nomes históricos gravados nos itens de pedidos. O down restaura somente os campos ainda correspondentes aos valores introduzidos e preserva edições posteriores.

## Validação

PostgreSQL isolado e endpoints Go aprovados para up/down/up, inativos, reexecução sem duplicação, rollback seletivo, busca literal por 100% algodão, 15 detalhes e recomendação coordenada. Snapshots de dados comerciais, variantes, imagens, carrinhos, pedidos históricos e favoritos conferidos antes e depois.

Angular aprovado em 29 testes direcionados de CatalogService, ProductCardComponent e ProductDetailComponent. Go aprovado em TestCartPostgres e TestProductCreatePostgres, além das verificações de endpoints realizadas no schema isolado.

Build de produção aprovado. Avisos existentes de bundle inicial (948,15 kB, orçamento de 500 kB), SCSS de autenticação (15,94 kB, orçamento de 14 kB), sweetalert2 CommonJS e quatro seletores CSS. Nenhum budget foi alterado.

Chrome local no build de produção aprovado em 1440, 1024, 768 e 390 px. Busca literal por 100% algodão, títulos de até duas linhas, preços e ações alinhados por linha, ausência de overflow horizontal, detalhes com nome persistido e links anteriores, recomendações recíprocas verificadas.

Capturas salvas em C:/Users/vitor/.codex/visualizations/2026/09/13/01a09c5b-68bc-7c42-85a5-d4f3f7260a09/titulos-algodao-capturas. Os nomes completos continuam presentes no texto acessível dos links e nos detalhes. Cards aplicam truncamento visual em até duas linhas.

## Arquivos desta alteração

- backend/migrations/000034_catalog_cotton_titles.up.sql
- backend/migrations/000034_catalog_cotton_titles.down.sql
- frontend/src/app/features/catalog/services/catalog.service.ts
- frontend/src/app/features/catalog/services/catalog.service.spec.ts
- frontend/src/app/features/catalog/pages/product-detail/product-detail.component.ts
- docs/catalogo-cama-algodao-auditoria.sql
- docs/catalogo-cama-algodao-relatorio.md
