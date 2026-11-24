# Estrutura PostgreSQL — Box Enxovais

## 1. Origem, escopo e segurança

Documentação extraída diretamente de **bd_box**, PostgreSQL **17.4**, schema de aplicação **public**, codificação **UTF8**, timezone do servidor **America/Sao_Paulo**. Extração: **2026-11-23T20:49:21Z (UTC)**; timestamp UTC: `2026-11-23T20:49:21Z`. Estado confirmado: **migration 53, dirty=false**.

O arquivo [database_schema.sql](database_schema.sql) é o resultado original e integral do `pg_dump` de estrutura. Não foi reconstruído nem reformatado. Serve para documentação e estudo, **não é migration nem backup completo dos dados**. Não execute esse arquivo no banco existente.

Foram omitidos proprietários e privilégios por portabilidade (`--no-owner --no-privileges`). O dump não contém registros, credenciais, senhas de conexão, valores de tokens ou imagens. Contém nomes de campos de autenticação, indispensáveis à descrição estrutural. Configurações de conexão foram lidas internamente, sem registrar seus valores. A aplicação utiliza o schema public; schemas internos do PostgreSQL não são copiados como schemas de negócio.

Comando de extração, com conexão fornecida por variáveis de ambiente e snapshot exportado de transação somente leitura:
```text
pg_dump --schema-only --no-owner --no-privileges --encoding=UTF8 --format=plain --snapshot=<snapshot de leitura> --file=<arquivo SQL>
```

Ferramenta: `pg_dump (PostgreSQL) 17.4`. Tamanho: **75393 bytes**. SHA-256: `edda93069faac3af9c9574d5c5c568c53951bf574b2c53fe8f39bcd9b20e16be`. O catálogo e os dumps plain/custom foram obtidos no mesmo snapshot consistente. Não são exportados valores correntes das sequences (`setval`), apenas suas definições e dependências.

## 2. Inventário confirmado

| Objeto | Quantidade |
| --- | ---: |
| Schemas de aplicação | 1 |
| Tabelas | 63 |
| Tabelas de negócio | 19 |
| Tabelas auxiliares de migrations do catálogo | 43 |
| Tabela de controle schema_migrations | 1 |
| Colunas existentes | 282 |
| Colunas NOT NULL | 216 |
| Colunas nullable | 66 |
| Colunas IDENTITY | 9 |
| Colunas geradas | 0 |
| PRIMARY KEY | 63 |
| FOREIGN KEY | 64 |
| UNIQUE | 20 |
| CHECK | 40 |
| EXCLUDE | 1 |
| Total de constraints | 188 |
| Índices (incluem os de constraints) | 92 |
| Índices B-tree | 91 |
| Índices GiST | 1 |
| Índices parciais | 3 |
| Índices com expressão | 2 |
| Sequences | 18 |
| Funções | 2 |
| Procedures | 0 |
| Triggers de usuário | 2 |
| Triggers internos de integridade referencial | 256 |
| Views / materialized views | 0 |
| Tipos personalizados explícitos / enums / domains | 0 |
| Tipos de linha implícitos de tabelas | 63 |
| Extensões | 1 |
| Políticas RLS | 0 |
| Tabelas com RLS habilitado | 0 |
| Tabelas particionadas | 0 |

Os 92 índices não são 92 estruturas adicionais às PKs e UNIQUEs: os índices de suporte dessas restrições já estão incluídos. As 256 triggers internas são mantidas pelo PostgreSQL para as 64 FKs; não são rotinas adicionais da aplicação. Os 63 tipos de linha implícitos não são enums/domains criados manualmente. Não foram encontrados servidores externos, foreign data wrappers, regras personalizadas, event triggers ou estatísticas estendidas.

## 3. Como interpretar a modelagem

- **PK** identifica a linha e implica unicidade e NOT NULL. Uma PK composta identifica a combinação de campos.
- **FK** exige referência válida quando aplicável. `NO ACTION` não autoriza exclusão automática; `CASCADE` propaga a operação; `SET NULL` elimina o vínculo sem excluir a linha. As ações exatas constam em cada tabela.
- **UNIQUE** impede repetição segundo a semântica PostgreSQL; normalmente admite mais de um NULL. Índices únicos parciais restringem somente as linhas do predicado.
- **CHECK** aceita resultado verdadeiro ou NULL: obrigatoriedade depende também de NOT NULL. Estados textuais com CHECK não são tipos ENUM.
- **EXCLUDE** impede combinações conflitantes segundo operadores; em shipping_ranges impede interseção de faixas ativas.
- FKs compostas sem MATCH FULL usam **MATCH SIMPLE**: a presença de NULL em uma coluna pode dispensar a verificação daquela combinação.
- `numeric(10,2)` conserva duas casas decimais; preços do catálogo são decimais em reais. Campos terminados em `_cents` conservam valores inteiros em centavos. Não misture essas unidades.
- `timestamp with time zone` representa um instante, exibido segundo o timezone da sessão; não é armazenamento de um texto de fuso.
- JSONB armazena estrutura flexível; seu conteúdo não vira automaticamente uma FK nem possui validação completa de domínio.
- IDENTITY e defaults nextval geram IDs internos. A sequence de SKU possui outra finalidade; sequências não garantem numeração sem lacunas nem são revertidas como dados comuns de uma transação.

## 4. Mapa das tabelas

| Tabela public | Finalidade | Referências diretas declaradas |
| --- | --- | --- |
| `brands` | Marcas associadas aos produtos. | Nenhuma FK de saída |
| `cart_items` | Produtos e variantes escolhidos no carrinho, com quantidade. | `carts`, `product_variants`, `products` |
| `carts` | Carrinho vinculado à conta; a unicidade do usuário impede múltiplos carrinhos para a mesma conta. | `users` |
| `catalog_aurora_gallery_000025` | Controle auxiliar permanente da migration 000025_aurora_fitted_sheet_gallery.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_aurora_gallery_added_000025` | Controle auxiliar permanente da migration 000025_aurora_fitted_sheet_gallery.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_bedding_gallery_seed_000023` | Controle auxiliar permanente da migration 000023_catalog_bedding_galleries.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_brand_024` | Controle auxiliar permanente da migration 000024_catalog_brand_editorial.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | Nenhuma FK de saída |
| `catalog_colcha_percal_000036` | Controle auxiliar permanente da migration 000036_catalog_colcha_percal.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_comforter_images_000032` | Controle auxiliar permanente da migration 000032_catalog_comforter_image_drape.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_comforter_titles_000035` | Controle auxiliar permanente da migration 000035_catalog_comforter_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_contents_seed_000018` | Controle auxiliar permanente da migration 000018_catalog_single_piece_contents.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_coordinated_comforters_000031` | Controle auxiliar permanente da migration 000031_catalog_coordinated_comforters.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_cotton_titles_000034` | Controle auxiliar permanente da migration 000034_catalog_cotton_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_cover_seed_000019` | Controle auxiliar permanente da migration 000019_catalog_neutral_covers.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_coverlet_titles_000037` | Controle auxiliar permanente da migration 000037_catalog_coverlet_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_cushion_category_000039` | Controle auxiliar permanente da migration 000039_catalog_cushion_covers.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_types` |
| `catalog_cushion_seed_000039` | Controle auxiliar permanente da migration 000039_catalog_cushion_covers.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_decor_category_000042` | Controle auxiliar permanente da migration 000042_catalog_decoracao.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_types` |
| `catalog_decor_cover_000043` | Controle auxiliar permanente da migration 000043_decor_rug_covers.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images`, `products` |
| `catalog_decor_geometry_000046` | Controle auxiliar permanente da migration 000046_decor_rug_geometry.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images`, `products` |
| `catalog_decor_seed_000042` | Controle auxiliar permanente da migration 000042_catalog_decoracao.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_editorial_024` | Controle auxiliar permanente da migration 000024_catalog_brand_editorial.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | Nenhuma FK de saída |
| `catalog_essencia_cover_seed_000023` | Controle auxiliar permanente da migration 000023_catalog_bedding_galleries.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_essencia_product_seed_000022` | Controle auxiliar permanente da migration 000022_catalog_essencia_comforter.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_essencia_variant_seed_000022` | Controle auxiliar permanente da migration 000022_catalog_essencia_comforter.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_variants` |
| `catalog_image_seed_000017` | Controle auxiliar permanente da migration 000017_catalog_detail_images.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_mesa_category_000040` | Controle auxiliar permanente da migration 000040_catalog_mesa.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_types` |
| `catalog_mesa_gallery_000041` | Controle auxiliar permanente da migration 000041_mesa_gallery_roles.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_mesa_seed_000040` | Controle auxiliar permanente da migration 000040_catalog_mesa.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_neutral_gallery_seed_000020` | Controle auxiliar permanente da migration 000020_catalog_neutral_gallery.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | Nenhuma FK de saída |
| `catalog_pillow_category_seed_000021` | Controle auxiliar permanente da migration 000021_catalog_demo_pillows.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | Nenhuma FK de saída |
| `catalog_pillows_seed_000021` | Controle auxiliar permanente da migration 000021_catalog_demo_pillows.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_rug_titles_000047` | Controle auxiliar permanente da migration 000047_rug_single_piece_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_sheet_contents_000028` | Controle auxiliar permanente da migration 000028_complete_sheet_compositions.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_sheet_gallery_000027` | Controle auxiliar permanente da migration 000027_fitted_sheet_room_galleries.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_sheet_gallery_000029` | Controle auxiliar permanente da migration 000029_finish_fitted_sheet_galleries.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_sheet_gallery_added_000027` | Controle auxiliar permanente da migration 000027_fitted_sheet_room_galleries.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_sheet_gallery_added_000029` | Controle auxiliar permanente da migration 000029_finish_fitted_sheet_galleries.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `catalog_sheet_variant_seed_000028` | Controle auxiliar permanente da migration 000028_complete_sheet_compositions.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_technical_seed_000015` | Controle auxiliar permanente da migration 000015_catalog_demo_technical.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_towel_category_000038` | Controle auxiliar permanente da migration 000038_catalog_towels.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `product_types` |
| `catalog_towel_legacy_000038` | Controle auxiliar permanente da migration 000038_catalog_towels.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_towel_seed_000038` | Controle auxiliar permanente da migration 000038_catalog_towels.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `catalog_variant_seed_000014` | Controle auxiliar permanente da migration 000014_catalog_demo_variants.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `checkout_order_items` | Itens históricos do pedido, com nome, quantidade e preço unitário preservados no fechamento. | `checkout_orders`, `product_variants` |
| `checkout_orders` | Pedidos com fotografia do endereço, pagamento, total e, quando registrados, componentes históricos de frete e parcelamento. | `users` |
| `favorites` | Associação entre conta e produtos favoritos. | `products`, `users` |
| `order_cancellations` | Registro de cancelamento, autoria, motivo e histórico associado ao pedido. | `checkout_orders`, `users` |
| `password_resets` | Solicitações de recuperação de senha, token e validade; a documentação não contém seus valores. | `users` |
| `pillow_editorial_000033` | Controle auxiliar permanente da migration 000033_product_presentation_cleanup.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `products` |
| `product_cover_000033` | Controle auxiliar permanente da migration 000033_product_presentation_cleanup.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária. | `product_images` |
| `product_images` | Imagens do catálogo, posição na galeria, indicação de capa e vínculo opcional a uma variante do mesmo produto. | `product_variants`, `products` |
| `product_types` | Categorias/tipos dos produtos; nomes únicos, sem hierarquia por FK neste schema. | Nenhuma FK de saída |
| `product_variants` | Variações de um produto, com tamanho, dimensões/características próprias, preço e estoque. | `products` |
| `products` | Cadastro principal do catálogo, SKU da loja, características e valores gerais de preço e estoque. | `brands`, `product_types` |
| `promotion_products` | Associação dos produtos participantes às campanhas e respectivas configurações de desconto. | `products`, `promotions` |
| `promotions` | Campanhas promocionais, apresentação, vigência, configuração e datas de auditoria. | Nenhuma FK de saída |
| `purchase_experience_reviews` | Avaliações da experiência de compra vinculadas a pedido e cliente, com consentimento e moderação. | `checkout_orders`, `users` |
| `schema_migrations` | Controle de versão e indicador dirty mantidos pelo golang-migrate; não é cadastro comercial. | Nenhuma FK de saída |
| `shipping_ranges` | Faixas de CEP com preço, prazo e situação de atendimento; faixas ativas não podem se sobrepor. | Nenhuma FK de saída |
| `subscribers` | Inscrições de contato/newsletter. | Nenhuma FK de saída |
| `user_addresses` | Endereços salvos por conta, incluindo a indicação do endereço padrão. | `users` |
| `users` | Contas de clientes e administradores, identificação e autenticação. Não há tabela separada de clientes. | Nenhuma FK de saída |

## 5. Relacionamentos na experiência de compra

**Catálogo:** products referencia brands e product_types; product_types possui nome único, sem coluna pai nem FK hierárquica neste snapshot. product_variants pertence a products. product_images pode referenciar o produto e uma variante daquele produto por FK composta. SKU é identificação externa; IDs internos continuam sendo as PKs.

**Conta e carrinho:** users concentra clientes e administradores. user_addresses, carts e favorites vinculam-se à conta. cart_items referencia carrinho, produto e, quando preenchida, variante. O índice único por carrinho/produto/COALESCE(variant_id,0) impede repetir o mesmo item simples ou a mesma variante. Carrinho não equivale a reserva de estoque por uma trigger do banco.

**Pedidos:** checkout_orders pertence ao usuário e conserva address como fotografia JSONB. checkout_order_items pertence ao pedido, conserva informações históricas e possui vínculo composto com variantes. A unicidade de user_id/request_key apoia idempotência. order_cancellations registra cancelamento com unicidade por pedido. Débito/devolução de estoque e autorização são responsabilidades transacionais do backend, não de uma trigger identificada neste schema.

**Promoções:** promotion_products associa products e promotions. Não há constraint UNIQUE de par campanha/produto nesta tabela; não se deve inferir que o banco impede sozinho duplicações desse par.

**Entrega:** shipping_ranges não é ligado ao pedido por uma FK: o pedido conserva valor, prazo e modalidade históricos, quando disponíveis. Alterar uma configuração de faixa não deve reescrever o histórico. NULL em frete histórico significa informação ausente, não frete grátis.

**Avaliações:** purchase_experience_reviews referencia pedido, cliente e moderador. Uma avaliação por pedido é garantida por UNIQUE. A correspondência entre cliente e dono do pedido, elegibilidade e publicação consentida precisam das regras do serviço; FKs separadas não implementam essas regras completas.

## 6. Dicionário completo de tabelas e colunas


### public.brands

Marcas associadas aos produtos.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('brands_id_seq'::regclass)` | Identificador interno da linha. |
| `name` | `character varying(100)` | **Não** | `—` | Nome do registro. |
| `created_at` | `timestamp with time zone` | Sim | `now()` | Instante de criação. |

**Restrições declaradas**

- `brands_name_key` — `UNIQUE (name)`. Validada. Não diferível.
- `brands_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.

**Índices**

- `brands_name_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX brands_name_key ON public.brands USING btree (name);
```

- `brands_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX brands_pkey ON public.brands USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.cart_items

Produtos e variantes escolhidos no carrinho, com quantidade.

Origem: `000003_cart.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `—; IDENTITY BY DEFAULT` | Identificador interno da linha. |
| `cart_id` | `integer` | **Não** | `—` | Carrinho relacionado. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `quantity` | `integer` | **Não** | `—` | Quantidade de unidades. |
| `created_at` | `timestamp with time zone` | **Não** | `now()` | Instante de criação. |
| `updated_at` | `timestamp with time zone` | **Não** | `now()` | Instante da última atualização registrada. |
| `variant_id` | `integer` | Sim | `—` | Identificador opcional da variação; veja a FK composta. |

**Restrições declaradas**

- `cart_items_cart_id_fkey` — `FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `cart_id` → `public.carts(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `cart_items_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `cart_items_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `cart_items_quantity_check` — `CHECK (quantity >= 1 AND quantity <= 1000000)`. Validada. Não diferível.
- `cart_items_variant_product_fk` — `FOREIGN KEY (product_id, variant_id) REFERENCES product_variants(product_id, id)`. Validada. Não diferível.
  Relação: `product_id, variant_id` → `public.product_variants(product_id, id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.

**Índices**

- `cart_items_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX cart_items_pkey ON public.cart_items USING btree (id);
```

- `cart_items_sellable_key` (btree): Busca e garantia de unicidade das chaves indexadas. O predicado/ordenação consultado precisa corresponder à expressão indexada. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX cart_items_sellable_key ON public.cart_items USING btree (cart_id, product_id, COALESCE(variant_id, 0));
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.carts

Carrinho vinculado à conta; a unicidade do usuário impede múltiplos carrinhos para a mesma conta.

Origem: `000003_cart.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `—; IDENTITY BY DEFAULT` | Identificador interno da linha. |
| `user_id` | `integer` | **Não** | `—` | Referência à conta de usuário. |
| `created_at` | `timestamp with time zone` | **Não** | `now()` | Instante de criação. |
| `updated_at` | `timestamp with time zone` | **Não** | `now()` | Instante da última atualização registrada. |

**Restrições declaradas**

- `carts_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `carts_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `user_id` → `public.users(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `carts_user_id_key` — `UNIQUE (user_id)`. Validada. Não diferível.

**Índices**

- `carts_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX carts_pkey ON public.carts USING btree (id);
```

- `carts_user_id_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX carts_user_id_key ON public.carts USING btree (user_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_aurora_gallery_000025

Controle auxiliar permanente da migration 000025_aurora_fitted_sheet_gallery.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000025_aurora_fitted_sheet_gallery.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `previous_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `previous_alt` | `text` | Sim | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `seeded_path` | `text` | **Não** | `—` | Campo seeded path; o tipo e as restrições abaixo definem o contrato persistido. |
| `seeded_alt` | `text` | **Não** | `—` | Campo seeded alt; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_aurora_gallery_000025_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_aurora_gallery_000025_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_aurora_gallery_000025_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_aurora_gallery_000025_pkey ON public.catalog_aurora_gallery_000025 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_aurora_gallery_added_000025

Controle auxiliar permanente da migration 000025_aurora_fitted_sheet_gallery.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000025_aurora_fitted_sheet_gallery.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `image_path` | `text` | **Não** | `—` | Caminho da imagem da campanha. |

**Restrições declaradas**

- `catalog_aurora_gallery_added_000025_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_aurora_gallery_added_000025_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_aurora_gallery_added_000025_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_aurora_gallery_added_000025_pkey ON public.catalog_aurora_gallery_added_000025 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_bedding_gallery_seed_000023

Controle auxiliar permanente da migration 000023_catalog_bedding_galleries.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000023_catalog_bedding_galleries.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_bedding_gallery_seed_000023_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_bedding_gallery_seed_000023_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_bedding_gallery_seed_000023_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_bedding_gallery_seed_000023_pkey ON public.catalog_bedding_gallery_seed_000023 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_brand_024

Controle auxiliar permanente da migration 000024_catalog_brand_editorial.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000024_catalog_brand_editorial.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `brand_id` | `integer` | **Não** | `—` | Marca relacionada. |

**Restrições declaradas**

- `catalog_brand_024_pkey` — `PRIMARY KEY (brand_id)`. Validada. Não diferível.

**Índices**

- `catalog_brand_024_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_brand_024_pkey ON public.catalog_brand_024 USING btree (brand_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_colcha_percal_000036

Controle auxiliar permanente da migration 000036_catalog_colcha_percal.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000036_catalog_colcha_percal.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `previous_data` | `jsonb` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `revised_data` | `jsonb` | **Não** | `—` | Campo revised data; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_colcha_percal_000036_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_colcha_percal_000036_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_colcha_percal_000036_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_colcha_percal_000036_pkey ON public.catalog_colcha_percal_000036 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_comforter_images_000032

Controle auxiliar permanente da migration 000032_catalog_comforter_image_drape.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000032_catalog_comforter_image_drape.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `previous_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `replacement_path` | `text` | **Não** | `—` | Campo replacement path; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_comforter_images_000032_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_comforter_images_000032_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.
- `catalog_comforter_images_000032_replacement_path_key` — `UNIQUE (replacement_path)`. Validada. Não diferível.

**Índices**

- `catalog_comforter_images_000032_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_comforter_images_000032_pkey ON public.catalog_comforter_images_000032 USING btree (image_id);
```

- `catalog_comforter_images_000032_replacement_path_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_comforter_images_000032_replacement_path_key ON public.catalog_comforter_images_000032 USING btree (replacement_path);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_comforter_titles_000035

Controle auxiliar permanente da migration 000035_catalog_comforter_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000035_catalog_comforter_titles.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `previous_data` | `jsonb` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `revised_data` | `jsonb` | **Não** | `—` | Campo revised data; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_comforter_titles_000035_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_comforter_titles_000035_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_comforter_titles_000035_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_comforter_titles_000035_pkey ON public.catalog_comforter_titles_000035 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_contents_seed_000018

Controle auxiliar permanente da migration 000018_catalog_single_piece_contents.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000018_catalog_single_piece_contents.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `contents` | `text` | **Não** | `—` | Campo contents; o tipo e as restrições abaixo definem o contrato persistido. |
| `measurements_were_null` | `boolean` | **Não** | `—` | Registra se as características eram originalmente nulas. |

**Restrições declaradas**

- `catalog_contents_seed_000018_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_contents_seed_000018_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_contents_seed_000018_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_contents_seed_000018_pkey ON public.catalog_contents_seed_000018 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_coordinated_comforters_000031

Controle auxiliar permanente da migration 000031_catalog_coordinated_comforters.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000031_catalog_coordinated_comforters.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `family` | `text` | **Não** | `—` | Campo family; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_snapshot` | `jsonb` | Sim | `—` | Campo product snapshot; o tipo e as restrições abaixo definem o contrato persistido. |
| `variants_snapshot` | `jsonb` | Sim | `—` | Campo variants snapshot; o tipo e as restrições abaixo definem o contrato persistido. |
| `images_snapshot` | `jsonb` | Sim | `—` | Campo images snapshot; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_coordinated_comforters_000031_family_key` — `UNIQUE (family)`. Validada. Não diferível.
- `catalog_coordinated_comforters_000031_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_coordinated_comforters_000031_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_coordinated_comforters_000031_family_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_coordinated_comforters_000031_family_key ON public.catalog_coordinated_comforters_000031 USING btree (family);
```

- `catalog_coordinated_comforters_000031_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_coordinated_comforters_000031_pkey ON public.catalog_coordinated_comforters_000031 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_cotton_titles_000034

Controle auxiliar permanente da migration 000034_catalog_cotton_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000034_catalog_cotton_titles.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `previous_data` | `jsonb` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `revised_data` | `jsonb` | **Não** | `—` | Campo revised data; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_cotton_titles_000034_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_cotton_titles_000034_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_cotton_titles_000034_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_cotton_titles_000034_pkey ON public.catalog_cotton_titles_000034 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_cover_seed_000019

Controle auxiliar permanente da migration 000019_catalog_neutral_covers.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000019_catalog_neutral_covers.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `source_id` | `integer` | **Não** | `—` | Campo source id; o tipo e as restrições abaixo definem o contrato persistido. |
| `new_path` | `text` | **Não** | `—` | Valor/identificador introduzido ou controlado pela migration. |

**Restrições declaradas**

- `catalog_cover_seed_000019_new_path_key` — `UNIQUE (new_path)`. Validada. Não diferível.
- `catalog_cover_seed_000019_pkey` — `PRIMARY KEY (source_id)`. Validada. Não diferível.
- `catalog_cover_seed_000019_source_id_fkey` — `FOREIGN KEY (source_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `source_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_cover_seed_000019_new_path_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_cover_seed_000019_new_path_key ON public.catalog_cover_seed_000019 USING btree (new_path);
```

- `catalog_cover_seed_000019_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_cover_seed_000019_pkey ON public.catalog_cover_seed_000019 USING btree (source_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_coverlet_titles_000037

Controle auxiliar permanente da migration 000037_catalog_coverlet_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000037_catalog_coverlet_titles.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `previous_name` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `revised_name` | `text` | **Não** | `—` | Campo revised name; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_coverlet_titles_000037_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_coverlet_titles_000037_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_coverlet_titles_000037_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_coverlet_titles_000037_pkey ON public.catalog_coverlet_titles_000037 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_cushion_category_000039

Controle auxiliar permanente da migration 000039_catalog_cushion_covers.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000039_catalog_cushion_covers.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `category_id` | `integer` | **Não** | `—` | Campo category id; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_cushion_category_000039_category_id_fkey` — `FOREIGN KEY (category_id) REFERENCES product_types(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `category_id` → `public.product_types(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_cushion_category_000039_pkey` — `PRIMARY KEY (category_id)`. Validada. Não diferível.

**Índices**

- `catalog_cushion_category_000039_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_cushion_category_000039_pkey ON public.catalog_cushion_category_000039 USING btree (category_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_cushion_seed_000039

Controle auxiliar permanente da migration 000039_catalog_cushion_covers.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000039_catalog_cushion_covers.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `import_key` | `text` | **Não** | `—` | Campo import key; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_snapshot` | `jsonb` | Sim | `—` | Campo product snapshot; o tipo e as restrições abaixo definem o contrato persistido. |
| `images_snapshot` | `jsonb` | Sim | `—` | Campo images snapshot; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_cushion_seed_000039_import_key_key` — `UNIQUE (import_key)`. Validada. Não diferível.
- `catalog_cushion_seed_000039_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_cushion_seed_000039_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_cushion_seed_000039_import_key_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_cushion_seed_000039_import_key_key ON public.catalog_cushion_seed_000039 USING btree (import_key);
```

- `catalog_cushion_seed_000039_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_cushion_seed_000039_pkey ON public.catalog_cushion_seed_000039 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_decor_category_000042

Controle auxiliar permanente da migration 000042_catalog_decoracao.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000042_catalog_decoracao.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `category_id` | `integer` | **Não** | `—` | Campo category id; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_decor_category_000042_category_id_fkey` — `FOREIGN KEY (category_id) REFERENCES product_types(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `category_id` → `public.product_types(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_decor_category_000042_pkey` — `PRIMARY KEY (category_id)`. Validada. Não diferível.

**Índices**

- `catalog_decor_category_000042_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_decor_category_000042_pkey ON public.catalog_decor_category_000042 USING btree (category_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_decor_cover_000043

Controle auxiliar permanente da migration 000043_decor_rug_covers.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000043_decor_rug_covers.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `old_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `new_path` | `text` | **Não** | `—` | Valor/identificador introduzido ou controlado pela migration. |

**Restrições declaradas**

- `catalog_decor_cover_000043_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_decor_cover_000043_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.
- `catalog_decor_cover_000043_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_decor_cover_000043_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_decor_cover_000043_pkey ON public.catalog_decor_cover_000043 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_decor_geometry_000046

Controle auxiliar permanente da migration 000046_decor_rug_geometry.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000046_decor_rug_geometry.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `old_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `new_path` | `text` | **Não** | `—` | Valor/identificador introduzido ou controlado pela migration. |

**Restrições declaradas**

- `catalog_decor_geometry_000046_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_decor_geometry_000046_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.
- `catalog_decor_geometry_000046_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_decor_geometry_000046_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_decor_geometry_000046_pkey ON public.catalog_decor_geometry_000046 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_decor_seed_000042

Controle auxiliar permanente da migration 000042_catalog_decoracao.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000042_catalog_decoracao.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `import_key` | `text` | **Não** | `—` | Campo import key; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_snapshot` | `jsonb` | Sim | `—` | Campo product snapshot; o tipo e as restrições abaixo definem o contrato persistido. |
| `images_snapshot` | `jsonb` | Sim | `—` | Campo images snapshot; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_decor_seed_000042_import_key_key` — `UNIQUE (import_key)`. Validada. Não diferível.
- `catalog_decor_seed_000042_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_decor_seed_000042_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_decor_seed_000042_import_key_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_decor_seed_000042_import_key_key ON public.catalog_decor_seed_000042 USING btree (import_key);
```

- `catalog_decor_seed_000042_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_decor_seed_000042_pkey ON public.catalog_decor_seed_000042 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_editorial_024

Controle auxiliar permanente da migration 000024_catalog_brand_editorial.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000024_catalog_brand_editorial.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `bigint` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `brand_id` | `integer` | **Não** | `—` | Marca relacionada. |

**Restrições declaradas**

- `catalog_editorial_024_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.

**Índices**

- `catalog_editorial_024_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_editorial_024_pkey ON public.catalog_editorial_024 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_essencia_cover_seed_000023

Controle auxiliar permanente da migration 000023_catalog_bedding_galleries.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000023_catalog_bedding_galleries.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `previous_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `previous_alt` | `text` | Sim | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |

**Restrições declaradas**

- `catalog_essencia_cover_seed_000023_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_essencia_cover_seed_000023_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_essencia_cover_seed_000023_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_essencia_cover_seed_000023_pkey ON public.catalog_essencia_cover_seed_000023 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_essencia_product_seed_000022

Controle auxiliar permanente da migration 000022_catalog_essencia_comforter.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000022_catalog_essencia_comforter.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `previous_name` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `previous_type_id` | `integer` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `previous_measurements` | `jsonb` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `new_type_id` | `integer` | **Não** | `—` | Valor/identificador introduzido ou controlado pela migration. |

**Restrições declaradas**

- `catalog_essencia_product_seed_000022_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_essencia_product_seed_000022_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_essencia_product_seed_000022_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_essencia_product_seed_000022_pkey ON public.catalog_essencia_product_seed_000022 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_essencia_variant_seed_000022

Controle auxiliar permanente da migration 000022_catalog_essencia_comforter.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000022_catalog_essencia_comforter.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `variant_id` | `integer` | **Não** | `—` | Identificador opcional da variação; veja a FK composta. |
| `previous_contents` | `jsonb` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |

**Restrições declaradas**

- `catalog_essencia_variant_seed_000022_pkey` — `PRIMARY KEY (variant_id)`. Validada. Não diferível.
- `catalog_essencia_variant_seed_000022_variant_id_fkey` — `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `variant_id` → `public.product_variants(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_essencia_variant_seed_000022_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_essencia_variant_seed_000022_pkey ON public.catalog_essencia_variant_seed_000022 USING btree (variant_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_image_seed_000017

Controle auxiliar permanente da migration 000017_catalog_detail_images.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000017_catalog_detail_images.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_image_seed_000017_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_image_seed_000017_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_image_seed_000017_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_image_seed_000017_pkey ON public.catalog_image_seed_000017 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_mesa_category_000040

Controle auxiliar permanente da migration 000040_catalog_mesa.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000040_catalog_mesa.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `category_id` | `integer` | **Não** | `—` | Campo category id; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_mesa_category_000040_category_id_fkey` — `FOREIGN KEY (category_id) REFERENCES product_types(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `category_id` → `public.product_types(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_mesa_category_000040_pkey` — `PRIMARY KEY (category_id)`. Validada. Não diferível.

**Índices**

- `catalog_mesa_category_000040_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_mesa_category_000040_pkey ON public.catalog_mesa_category_000040 USING btree (category_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_mesa_gallery_000041

Controle auxiliar permanente da migration 000041_mesa_gallery_roles.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000041_mesa_gallery_roles.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `import_key` | `text` | **Não** | `—` | Campo import key; o tipo e as restrições abaixo definem o contrato persistido. |
| `new_path` | `text` | **Não** | `—` | Valor/identificador introduzido ou controlado pela migration. |
| `mode` | `text` | **Não** | `—` | Campo mode; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_name` | `text` | **Não** | `—` | Nome do produto preservado/referenciado no registro. |
| `before_images` | `jsonb` | **Não** | `—` | Campo before images; o tipo e as restrições abaixo definem o contrato persistido. |
| `after_images` | `jsonb` | Sim | `—` | Campo after images; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_mesa_gallery_000041_mode_check` — `CHECK (mode = ANY (ARRAY['ambientacao'::text, 'objetiva'::text]))`. Validada. Não diferível.
- `catalog_mesa_gallery_000041_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_mesa_gallery_000041_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_mesa_gallery_000041_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_mesa_gallery_000041_pkey ON public.catalog_mesa_gallery_000041 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_mesa_seed_000040

Controle auxiliar permanente da migration 000040_catalog_mesa.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000040_catalog_mesa.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `import_key` | `text` | **Não** | `—` | Campo import key; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_snapshot` | `jsonb` | Sim | `—` | Campo product snapshot; o tipo e as restrições abaixo definem o contrato persistido. |
| `images_snapshot` | `jsonb` | Sim | `—` | Campo images snapshot; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_mesa_seed_000040_import_key_key` — `UNIQUE (import_key)`. Validada. Não diferível.
- `catalog_mesa_seed_000040_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_mesa_seed_000040_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_mesa_seed_000040_import_key_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_mesa_seed_000040_import_key_key ON public.catalog_mesa_seed_000040 USING btree (import_key);
```

- `catalog_mesa_seed_000040_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_mesa_seed_000040_pkey ON public.catalog_mesa_seed_000040 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_neutral_gallery_seed_000020

Controle auxiliar permanente da migration 000020_catalog_neutral_gallery.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000020_catalog_neutral_gallery.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `previous_image` | `jsonb` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `was_removed` | `boolean` | **Não** | `—` | Campo was removed; o tipo e as restrições abaixo definem o contrato persistido. |
| `seeded_in_000017` | `boolean` | **Não** | `—` | Campo seeded in 000017; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_neutral_gallery_seed_000020_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_neutral_gallery_seed_000020_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_neutral_gallery_seed_000020_pkey ON public.catalog_neutral_gallery_seed_000020 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_pillow_category_seed_000021

Controle auxiliar permanente da migration 000021_catalog_demo_pillows.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000021_catalog_demo_pillows.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `category_id` | `integer` | **Não** | `—` | Campo category id; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_pillow_category_seed_000021_pkey` — `PRIMARY KEY (category_id)`. Validada. Não diferível.

**Índices**

- `catalog_pillow_category_seed_000021_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_pillow_category_seed_000021_pkey ON public.catalog_pillow_category_seed_000021 USING btree (category_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_pillows_seed_000021

Controle auxiliar permanente da migration 000021_catalog_demo_pillows.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000021_catalog_demo_pillows.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `image_path` | `text` | **Não** | `—` | Caminho da imagem da campanha. |

**Restrições declaradas**

- `catalog_pillows_seed_000021_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_pillows_seed_000021_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_pillows_seed_000021_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_pillows_seed_000021_pkey ON public.catalog_pillows_seed_000021 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_rug_titles_000047

Controle auxiliar permanente da migration 000047_rug_single_piece_titles.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000047_rug_single_piece_titles.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `old_name` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `new_name` | `text` | **Não** | `—` | Valor/identificador introduzido ou controlado pela migration. |

**Restrições declaradas**

- `catalog_rug_titles_000047_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_rug_titles_000047_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_rug_titles_000047_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_rug_titles_000047_pkey ON public.catalog_rug_titles_000047 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_sheet_contents_000028

Controle auxiliar permanente da migration 000028_complete_sheet_compositions.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000028_complete_sheet_compositions.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `measurements_were_null` | `boolean` | **Não** | `—` | Registra se as características eram originalmente nulas. |

**Restrições declaradas**

- `catalog_sheet_contents_000028_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_sheet_contents_000028_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_sheet_contents_000028_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_sheet_contents_000028_pkey ON public.catalog_sheet_contents_000028 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_sheet_gallery_000027

Controle auxiliar permanente da migration 000027_fitted_sheet_room_galleries.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000027_fitted_sheet_room_galleries.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `previous_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `previous_alt` | `text` | Sim | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `seeded_path` | `text` | **Não** | `—` | Campo seeded path; o tipo e as restrições abaixo definem o contrato persistido. |
| `seeded_alt` | `text` | **Não** | `—` | Campo seeded alt; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_sheet_gallery_000027_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_sheet_gallery_000027_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_sheet_gallery_000027_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_sheet_gallery_000027_pkey ON public.catalog_sheet_gallery_000027 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_sheet_gallery_000029

Controle auxiliar permanente da migration 000029_finish_fitted_sheet_galleries.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000029_finish_fitted_sheet_galleries.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `previous_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `previous_alt` | `text` | Sim | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `seeded_path` | `text` | **Não** | `—` | Campo seeded path; o tipo e as restrições abaixo definem o contrato persistido. |
| `seeded_alt` | `text` | **Não** | `—` | Campo seeded alt; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_sheet_gallery_000029_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_sheet_gallery_000029_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_sheet_gallery_000029_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_sheet_gallery_000029_pkey ON public.catalog_sheet_gallery_000029 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_sheet_gallery_added_000027

Controle auxiliar permanente da migration 000027_fitted_sheet_room_galleries.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000027_fitted_sheet_room_galleries.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `image_path` | `text` | **Não** | `—` | Caminho da imagem da campanha. |

**Restrições declaradas**

- `catalog_sheet_gallery_added_000027_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_sheet_gallery_added_000027_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_sheet_gallery_added_000027_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_sheet_gallery_added_000027_pkey ON public.catalog_sheet_gallery_added_000027 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_sheet_gallery_added_000029

Controle auxiliar permanente da migration 000029_finish_fitted_sheet_galleries.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000029_finish_fitted_sheet_galleries.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `image_path` | `text` | **Não** | `—` | Caminho da imagem da campanha. |

**Restrições declaradas**

- `catalog_sheet_gallery_added_000029_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_sheet_gallery_added_000029_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.

**Índices**

- `catalog_sheet_gallery_added_000029_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_sheet_gallery_added_000029_pkey ON public.catalog_sheet_gallery_added_000029 USING btree (image_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_sheet_variant_seed_000028

Controle auxiliar permanente da migration 000028_complete_sheet_compositions.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000028_complete_sheet_compositions.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `original_quantity` | `integer` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `variant_ids` | `integer[]` | **Não** | `'{}'::integer[]` | Campo variant ids; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_sheet_variant_seed_000028_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_sheet_variant_seed_000028_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_sheet_variant_seed_000028_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_sheet_variant_seed_000028_pkey ON public.catalog_sheet_variant_seed_000028 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_technical_seed_000015

Controle auxiliar permanente da migration 000015_catalog_demo_technical.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000015_catalog_demo_technical.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `measurements_were_null` | `boolean` | **Não** | `—` | Registra se as características eram originalmente nulas. |
| `added_measurements` | `jsonb` | **Não** | `—` | Características introduzidas pela migration. |
| `previous_care` | `text` | Sim | `—` | Instruções de cuidado anteriores, preservadas para reversão. |
| `added_care` | `text` | Sim | `—` | Instruções introduzidas pela migration. |

**Restrições declaradas**

- `catalog_technical_seed_000015_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_technical_seed_000015_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_technical_seed_000015_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_technical_seed_000015_pkey ON public.catalog_technical_seed_000015 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_towel_category_000038

Controle auxiliar permanente da migration 000038_catalog_towels.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000038_catalog_towels.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `category_id` | `integer` | **Não** | `—` | Campo category id; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_towel_category_000038_category_id_fkey` — `FOREIGN KEY (category_id) REFERENCES product_types(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `category_id` → `public.product_types(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `catalog_towel_category_000038_pkey` — `PRIMARY KEY (category_id)`. Validada. Não diferível.

**Índices**

- `catalog_towel_category_000038_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_towel_category_000038_pkey ON public.catalog_towel_category_000038 USING btree (category_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_towel_legacy_000038

Controle auxiliar permanente da migration 000038_catalog_towels.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000038_catalog_towels.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `previous_type` | `integer` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `revised_type` | `integer` | **Não** | `—` | Campo revised type; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_towel_legacy_000038_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_towel_legacy_000038_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_towel_legacy_000038_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_towel_legacy_000038_pkey ON public.catalog_towel_legacy_000038 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_towel_seed_000038

Controle auxiliar permanente da migration 000038_catalog_towels.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000038_catalog_towels.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `import_key` | `text` | **Não** | `—` | Campo import key; o tipo e as restrições abaixo definem o contrato persistido. |
| `product_snapshot` | `jsonb` | Sim | `—` | Campo product snapshot; o tipo e as restrições abaixo definem o contrato persistido. |
| `images_snapshot` | `jsonb` | Sim | `—` | Campo images snapshot; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_towel_seed_000038_import_key_key` — `UNIQUE (import_key)`. Validada. Não diferível.
- `catalog_towel_seed_000038_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_towel_seed_000038_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_towel_seed_000038_import_key_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_towel_seed_000038_import_key_key ON public.catalog_towel_seed_000038 USING btree (import_key);
```

- `catalog_towel_seed_000038_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_towel_seed_000038_pkey ON public.catalog_towel_seed_000038 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.catalog_variant_seed_000014

Controle auxiliar permanente da migration 000014_catalog_demo_variants.up.sql. Preserva identificadores e informações da intervenção no catálogo para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000014_catalog_demo_variants.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `original_quantity` | `integer` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `variant_ids` | `integer[]` | **Não** | `'{}'::integer[]` | Campo variant ids; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `catalog_variant_seed_000014_original_quantity_check` — `CHECK (original_quantity >= 0)`. Validada. Não diferível.
- `catalog_variant_seed_000014_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `catalog_variant_seed_000014_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `catalog_variant_seed_000014_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX catalog_variant_seed_000014_pkey ON public.catalog_variant_seed_000014 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.checkout_order_items

Itens históricos do pedido, com nome, quantidade e preço unitário preservados no fechamento.

Origem: `000006_checkout.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | **Não** | `—; IDENTITY ALWAYS` | Identificador interno da linha. |
| `order_id` | `bigint` | **Não** | `—` | Pedido relacionado. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `name` | `text` | **Não** | `—` | Nome do registro. |
| `quantity` | `integer` | **Não** | `—` | Quantidade de unidades. |
| `unit_price_cents` | `bigint` | **Não** | `—` | Preço unitário histórico em centavos. |
| `variant_id` | `integer` | Sim | `—` | Identificador opcional da variação; veja a FK composta. |

**Restrições declaradas**

- `checkout_order_items_order_id_fkey` — `FOREIGN KEY (order_id) REFERENCES checkout_orders(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `order_id` → `public.checkout_orders(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `checkout_order_items_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `checkout_order_items_quantity_check` — `CHECK (quantity > 0)`. Validada. Não diferível.
- `checkout_order_items_unit_price_cents_check` — `CHECK (unit_price_cents >= 0)`. Validada. Não diferível.
- `checkout_order_items_variant_product_fk` — `FOREIGN KEY (product_id, variant_id) REFERENCES product_variants(product_id, id)`. Validada. Não diferível.
  Relação: `product_id, variant_id` → `public.product_variants(product_id, id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.

**Índices**

- `checkout_order_items_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX checkout_order_items_pkey ON public.checkout_order_items USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.checkout_orders

Pedidos com fotografia do endereço, pagamento, total e, quando registrados, componentes históricos de frete e parcelamento.

Origem: `000006_checkout.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | **Não** | `—; IDENTITY ALWAYS` | Identificador interno da linha. |
| `user_id` | `integer` | **Não** | `—` | Referência à conta de usuário. |
| `request_key` | `character varying(80)` | **Não** | `—` | Chave de idempotência por cliente. |
| `address` | `jsonb` | **Não** | `—` | Fotografia do endereço do pedido em JSONB. |
| `payment_method` | `character varying(20)` | **Não** | `—` | Modalidade de pagamento. |
| `status` | `character varying(30)` | **Não** | `'simulated_approved'::character varying` | Situação do registro; valores permitidos constam nos CHECKs, quando existentes. |
| `total_cents` | `bigint` | **Não** | `—` | Total histórico do pedido em centavos. |
| `created_at` | `timestamp with time zone` | **Não** | `now()` | Instante de criação. |
| `stock_debited` | `boolean` | **Não** | `false` | Indica se o estoque foi debitado. |
| `contact_phone` | `character varying(20)` | Sim | `—` | Contato associado ao pedido. |
| `shipping_cents` | `bigint` | Sim | `—` | Frete histórico em centavos; NULL significa não registrado. |
| `shipping_min_days` | `integer` | Sim | `—` | Prazo mínimo de entrega registrado no pedido. |
| `shipping_max_days` | `integer` | Sim | `—` | Prazo máximo de entrega registrado no pedido. |
| `shipping_method` | `text` | Sim | `—` | Modalidade de entrega registrada. |
| `products_subtotal_cents` | `bigint` | Sim | `—` | Subtotal histórico dos produtos em centavos. |
| `discount_cents` | `bigint` | Sim | `—` | Desconto histórico em centavos. |
| `installments` | `smallint` | Sim | `—` | Quantidade de parcelas simuladas, sem juros. NULL indica pedido histórico sem informação de parcelamento. |

**Restrições declaradas**

- `checkout_order_installments_valid` — `CHECK (installments IS NULL OR payment_method::text = 'card'::text AND installments >= 1 AND installments <= 6 OR (payment_method::text = ANY (ARRAY['pix'::character varying, 'boleto'::character varying]::text[])) AND installments = 1)`. Validada. Não diferível.
- `checkout_order_shipping_snapshot` — `CHECK (shipping_cents IS NULL AND shipping_min_days IS NULL AND shipping_max_days IS NULL AND shipping_method IS NULL AND products_subtotal_cents IS NULL AND discount_cents IS NULL OR shipping_cents IS NOT NULL AND shipping_min_days IS NOT NULL AND shipping_max_days IS NOT NULL AND shipping_method IS NOT NULL AND products_subtotal_cents IS NOT NULL AND discount_cents IS NOT NULL AND discount_cents <= products_subtotal_cents AND total_cents::numeric = (products_subtotal_cents::numeric - discount_cents::numeric + shipping_cents::numeric))`. Validada. Não diferível.
- `checkout_orders_check` — `CHECK (shipping_max_days >= shipping_min_days)`. Validada. Não diferível.
- `checkout_orders_discount_cents_check` — `CHECK (discount_cents >= 0)`. Validada. Não diferível.
- `checkout_orders_payment_method_check` — `CHECK (payment_method::text = ANY (ARRAY['pix'::character varying, 'card'::character varying, 'boleto'::character varying]::text[]))`. Validada. Não diferível.
- `checkout_orders_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `checkout_orders_products_subtotal_cents_check` — `CHECK (products_subtotal_cents >= 0)`. Validada. Não diferível.
- `checkout_orders_shipping_cents_check` — `CHECK (shipping_cents >= 0)`. Validada. Não diferível.
- `checkout_orders_shipping_method_check` — `CHECK (shipping_method = 'delivery'::text)`. Validada. Não diferível.
- `checkout_orders_shipping_min_days_check` — `CHECK (shipping_min_days >= 0)`. Validada. Não diferível.
- `checkout_orders_status_check` — `CHECK (status::text = ANY (ARRAY['simulated_approved'::character varying, 'cancelled'::character varying]::text[]))`. Validada. Não diferível.
- `checkout_orders_total_cents_check` — `CHECK (total_cents >= 0)`. Validada. Não diferível.
- `checkout_orders_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES users(id)`. Validada. Não diferível.
  Relação: `user_id` → `public.users(id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.
- `checkout_orders_user_id_request_key_key` — `UNIQUE (user_id, request_key)`. Validada. Não diferível.

**Índices**

- `checkout_orders_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX checkout_orders_pkey ON public.checkout_orders USING btree (id);
```

- `checkout_orders_user_id_request_key_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX checkout_orders_user_id_request_key_key ON public.checkout_orders USING btree (user_id, request_key);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.favorites

Associação entre conta e produtos favoritos.

Origem: `000005_favorites.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `user_id` | `integer` | **Não** | `—` | Referência à conta de usuário. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `created_at` | `timestamp with time zone` | **Não** | `now()` | Instante de criação. |

**Restrições declaradas**

- `favorites_pkey` — `PRIMARY KEY (user_id, product_id)`. Validada. Não diferível.
- `favorites_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `favorites_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `user_id` → `public.users(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `favorites_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX favorites_pkey ON public.favorites USING btree (user_id, product_id);
```

- `favorites_product_id_idx` (btree): Consultas compatíveis com as colunas/expressões e sua ordem no índice. Validade: true, pronto: true.

```sql
CREATE INDEX favorites_product_id_idx ON public.favorites USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.order_cancellations

Registro de cancelamento, autoria, motivo e histórico associado ao pedido.

Origem: `000008_order_cancellation_reason.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | **Não** | `—; IDENTITY ALWAYS` | Identificador interno da linha. |
| `order_id` | `bigint` | **Não** | `—` | Pedido relacionado. |
| `reason_code` | `text` | **Não** | `—` | Código do motivo de cancelamento. |
| `reason_details` | `character varying(500)` | Sim | `—` | Detalhamento do motivo. |
| `cancelled_at` | `timestamp with time zone` | **Não** | `clock_timestamp()` | Instante do cancelamento. |
| `cancelled_by` | `integer` | **Não** | `—` | Conta responsável pelo cancelamento. |

**Restrições declaradas**

- `order_cancellations_cancelled_by_fkey` — `FOREIGN KEY (cancelled_by) REFERENCES users(id)`. Validada. Não diferível.
  Relação: `cancelled_by` → `public.users(id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.
- `order_cancellations_check` — `CHECK (reason_code = 'other'::text OR reason_details IS NULL)`. Validada. Não diferível.
- `order_cancellations_order_id_fkey` — `FOREIGN KEY (order_id) REFERENCES checkout_orders(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `order_id` → `public.checkout_orders(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `order_cancellations_order_id_key` — `UNIQUE (order_id)`. Validada. Não diferível.
- `order_cancellations_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `order_cancellations_reason_code_check` — `CHECK (reason_code = ANY (ARRAY['changed_mind'::text, 'wrong_product'::text, 'wrong_address'::text, 'duplicate_order'::text, 'other'::text]))`. Validada. Não diferível.

**Índices**

- `order_cancellations_order_id_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX order_cancellations_order_id_key ON public.order_cancellations USING btree (order_id);
```

- `order_cancellations_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX order_cancellations_pkey ON public.order_cancellations USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.password_resets

Solicitações de recuperação de senha, token e validade; a documentação não contém seus valores.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `user_id` | `integer` | **Não** | `—` | Referência à conta de usuário. |
| `token` | `character varying(64)` | **Não** | `—` | Token de recuperação; nenhum valor é exportado. |
| `expires_at` | `timestamp with time zone` | **Não** | `—` | Instante de expiração. |

**Restrições declaradas**

- `password_resets_pkey` — `PRIMARY KEY (user_id)`. Validada. Não diferível.
- `password_resets_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `user_id` → `public.users(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `password_resets_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX password_resets_pkey ON public.password_resets USING btree (user_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.pillow_editorial_000033

Controle auxiliar permanente da migration 000033_product_presentation_cleanup.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000033_product_presentation_cleanup.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `previous_copy` | `jsonb` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `revised_copy` | `jsonb` | **Não** | `—` | Campo revised copy; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `pillow_editorial_000033_pkey` — `PRIMARY KEY (product_id)`. Validada. Não diferível.
- `pillow_editorial_000033_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `pillow_editorial_000033_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX pillow_editorial_000033_pkey ON public.pillow_editorial_000033 USING btree (product_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.product_cover_000033

Controle auxiliar permanente da migration 000033_product_presentation_cleanup.up.sql. Preserva estados anteriores e/ou identificadores introduzidos para rastreamento e reversão segura; não é uma tabela temporária.

Origem: `000033_product_presentation_cleanup.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `image_id` | `integer` | **Não** | `—` | Campo image id; o tipo e as restrições abaixo definem o contrato persistido. |
| `previous_path` | `text` | **Não** | `—` | Valor anterior preservado pela migration para rastreamento/reversão. |
| `revised_path` | `text` | **Não** | `—` | Campo revised path; o tipo e as restrições abaixo definem o contrato persistido. |

**Restrições declaradas**

- `product_cover_000033_image_id_fkey` — `FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `image_id` → `public.product_images(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `product_cover_000033_pkey` — `PRIMARY KEY (image_id)`. Validada. Não diferível.
- `product_cover_000033_revised_path_key` — `UNIQUE (revised_path)`. Validada. Não diferível.

**Índices**

- `product_cover_000033_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_cover_000033_pkey ON public.product_cover_000033 USING btree (image_id);
```

- `product_cover_000033_revised_path_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_cover_000033_revised_path_key ON public.product_cover_000033 USING btree (revised_path);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.product_images

Imagens do catálogo, posição na galeria, indicação de capa e vínculo opcional a uma variante do mesmo produto.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('product_images_id_seq'::regclass)` | Identificador interno da linha. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `image_path` | `character varying(255)` | **Não** | `—` | Caminho da imagem da campanha. |
| `alt_text` | `character varying(100)` | Sim | `—` | Campo alt text; o tipo e as restrições abaixo definem o contrato persistido. |
| `is_primary` | `boolean` | Sim | `false` | Indicação de imagem principal. |
| `created_at` | `timestamp with time zone` | Sim | `now()` | Instante de criação. |
| `variant_id` | `integer` | Sim | `—` | Identificador opcional da variação; veja a FK composta. |
| `sort_order` | `integer` | **Não** | `0` | Posição da fotografia na galeria. |

**Restrições declaradas**

- `fk_product` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `product_images_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `product_images_sort_order_check` — `CHECK (sort_order >= 0)`. Validada. Não diferível.
- `product_images_variant_product_fk` — `FOREIGN KEY (product_id, variant_id) REFERENCES product_variants(product_id, id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id, variant_id` → `public.product_variants(product_id, id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `product_images_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_images_pkey ON public.product_images USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.product_types

Categorias/tipos dos produtos; nomes únicos, sem hierarquia por FK neste schema.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('product_types_id_seq'::regclass)` | Identificador interno da linha. |
| `name` | `character varying(100)` | **Não** | `—` | Nome do registro. |
| `created_at` | `timestamp with time zone` | Sim | `now()` | Instante de criação. |

**Restrições declaradas**

- `product_types_name_key` — `UNIQUE (name)`. Validada. Não diferível.
- `product_types_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.

**Índices**

- `product_types_name_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_types_name_key ON public.product_types USING btree (name);
```

- `product_types_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_types_pkey ON public.product_types USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.product_variants

Variações de um produto, com tamanho, dimensões/características próprias, preço e estoque.

Origem: `000013_product_variants.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `—; IDENTITY BY DEFAULT` | Identificador interno da linha. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `size` | `character varying(60)` | **Não** | `—` | Nome/tamanho da variação. |
| `price` | `numeric(10,2)` | **Não** | `—` | Preço monetário decimal em reais. |
| `quantity` | `integer` | **Não** | `—` | Quantidade de unidades. |
| `dimensions` | `text` | Sim | `—` | Dimensões da variação em texto. |
| `included_items` | `jsonb` | **Não** | `'[]'::jsonb` | Itens incluídos na composição, em JSONB. |
| `simulated` | `boolean` | **Não** | `false` | Indicador de variante demonstrativa. |

**Restrições declaradas**

- `product_variants_included_items_check` — `CHECK (jsonb_typeof(included_items) = 'array'::text)`. Validada. Não diferível.
- `product_variants_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `product_variants_price_check` — `CHECK (price >= 0::numeric)`. Validada. Não diferível.
- `product_variants_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `product_variants_product_id_id_key` — `UNIQUE (product_id, id)`. Validada. Não diferível.
- `product_variants_product_id_size_key` — `UNIQUE (product_id, size)`. Validada. Não diferível.
- `product_variants_quantity_check` — `CHECK (quantity >= 0)`. Validada. Não diferível.
- `product_variants_size_check` — `CHECK (btrim(size::text) <> ''::text)`. Validada. Não diferível.

**Índices**

- `product_variants_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_variants_pkey ON public.product_variants USING btree (id);
```

- `product_variants_product_id_id_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_variants_product_id_id_key ON public.product_variants USING btree (product_id, id);
```

- `product_variants_product_id_size_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX product_variants_product_id_size_key ON public.product_variants USING btree (product_id, size);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.products

Cadastro principal do catálogo, SKU da loja, características e valores gerais de preço e estoque.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('products_id_seq'::regclass)` | Identificador interno da linha. |
| `name` | `character varying(100)` | **Não** | `—` | Nome do registro. |
| `description` | `text` | Sim | `—` | Descrição textual. |
| `care_instructions` | `text` | Sim | `—` | Instruções de cuidado. |
| `measurements` | `jsonb` | Sim | `—` | Características e dimensões em JSONB. |
| `price` | `numeric(10,2)` | **Não** | `—` | Preço monetário decimal em reais. |
| `quantity` | `integer` | **Não** | `0` | Quantidade de unidades. |
| `brand_id` | `integer` | Sim | `—` | Marca relacionada. |
| `product_type_id` | `integer` | Sim | `—` | Categoria/tipo do produto. |
| `status` | `character varying(20)` | **Não** | `'active'::character varying` | Situação do registro; valores permitidos constam nos CHECKs, quando existentes. |
| `created_at` | `timestamp with time zone` | Sim | `now()` | Instante de criação. |
| `updated_at` | `timestamp with time zone` | Sim | `now()` | Instante da última atualização registrada. |
| `purchase_summary` | `character varying(160)` | Sim | `—` | Resumo de compra do produto. |
| `sku` | `character varying(32)` | **Não** | `—` | SKU externo da loja, distinto da chave primária. |

**Restrições declaradas**

- `products_brand_id_fkey` — `FOREIGN KEY (brand_id) REFERENCES brands(id)`. Validada. Não diferível.
  Relação: `brand_id` → `public.brands(id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.
- `products_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `products_product_type_id_fkey` — `FOREIGN KEY (product_type_id) REFERENCES product_types(id)`. Validada. Não diferível.
  Relação: `product_type_id` → `public.product_types(id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.
- `products_quantity_nonnegative` — `CHECK (quantity >= 0)`. Validada. Não diferível.
- `products_sku_format` — `CHECK (length(sku::text) >= 3 AND length(sku::text) <= 32 AND sku::text ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'::text)`. Validada. Não diferível.
- `products_sku_key` — `UNIQUE (sku)`. Validada. Não diferível.
- `products_status_check` — `CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying]::text[]))`. Validada. Não diferível.

**Índices**

- `products_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);
```

- `products_sku_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.promotion_products

Associação dos produtos participantes às campanhas e respectivas configurações de desconto.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('promotion_products_id_seq'::regclass)` | Identificador interno da linha. |
| `promotion_id` | `integer` | **Não** | `—` | Campanha relacionada. |
| `product_id` | `integer` | **Não** | `—` | Identificador do produto relacionado; veja as FKs efetivamente declaradas. |
| `promotional_price` | `numeric(10,2)` | **Não** | `—` | Preço promocional decimal em reais. |

**Restrições declaradas**

- `promotion_products_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `promotion_products_product_id_fkey` — `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `product_id` → `public.products(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.
- `promotion_products_promotion_id_fkey` — `FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `promotion_id` → `public.promotions(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `idx_promotion_products_product_id` (btree): Consultas compatíveis com as colunas/expressões e sua ordem no índice. Validade: true, pronto: true.

```sql
CREATE INDEX idx_promotion_products_product_id ON public.promotion_products USING btree (product_id);
```

- `idx_promotion_products_promotion_id` (btree): Consultas compatíveis com as colunas/expressões e sua ordem no índice. Validade: true, pronto: true.

```sql
CREATE INDEX idx_promotion_products_promotion_id ON public.promotion_products USING btree (promotion_id);
```

- `promotion_products_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX promotion_products_pkey ON public.promotion_products USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.promotions

Campanhas promocionais, apresentação, vigência, configuração e datas de auditoria.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('promotions_id_seq'::regclass)` | Identificador interno da linha. |
| `name` | `character varying(255)` | **Não** | `—` | Nome do registro. |
| `status` | `character varying(50)` | **Não** | `—` | Situação do registro; valores permitidos constam nos CHECKs, quando existentes. |
| `start_date` | `timestamp with time zone` | Sim | `—` | Início da vigência. |
| `end_date` | `timestamp with time zone` | Sim | `—` | Fim da vigência. |
| `description` | `text` | **Não** | `''::text` | Descrição textual. |
| `image_path` | `text` | **Não** | `''::text` | Caminho da imagem da campanha. |
| `home_featured` | `boolean` | **Não** | `false` | Indica destaque na Home. |
| `created_at` | `timestamp with time zone` | Sim | `now()` | Instante de criação. |
| `updated_at` | `timestamp with time zone` | Sim | `—` | Instante da última atualização registrada. |

**Restrições declaradas**

- `promotions_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.

**Índices**

- `idx_promotions_name` (btree): Consultas compatíveis com as colunas/expressões e sua ordem no índice. Validade: true, pronto: true.

```sql
CREATE INDEX idx_promotions_name ON public.promotions USING btree (name);
```

- `promotions_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX promotions_pkey ON public.promotions USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.purchase_experience_reviews

Avaliações da experiência de compra vinculadas a pedido e cliente, com consentimento e moderação.

Origem: `000045_home_experience_campaigns.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | **Não** | `—; IDENTITY ALWAYS` | Identificador interno da linha. |
| `order_id` | `bigint` | **Não** | `—` | Pedido relacionado. |
| `user_id` | `integer` | **Não** | `—` | Referência à conta de usuário. |
| `overall` | `smallint` | **Não** | `—` | Nota geral da experiência. |
| `navigation` | `smallint` | Sim | `—` | Nota opcional de navegação. |
| `service` | `smallint` | Sim | `—` | Nota opcional de atendimento. |
| `experience` | `smallint` | Sim | `—` | Nota opcional da experiência. |
| `comment` | `text` | **Não** | `''::text` | Comentário da avaliação. |
| `publication_consent` | `boolean` | **Não** | `false` | Consentimento para publicação. |
| `status` | `text` | **Não** | `'pending'::text` | Situação do registro; valores permitidos constam nos CHECKs, quando existentes. |
| `created_at` | `timestamp with time zone` | **Não** | `now()` | Instante de criação. |
| `moderated_at` | `timestamp with time zone` | Sim | `—` | Instante da moderação. |
| `moderated_by` | `integer` | Sim | `—` | Conta responsável pela moderação. |

**Restrições declaradas**

- `purchase_experience_reviews_comment_check` — `CHECK (char_length(comment) <= 1000)`. Validada. Não diferível.
- `purchase_experience_reviews_experience_check` — `CHECK (experience >= 1 AND experience <= 5)`. Validada. Não diferível.
- `purchase_experience_reviews_moderated_by_fkey` — `FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL`. Validada. Não diferível.
  Relação: `moderated_by` → `public.users(id)`; ON DELETE **SET NULL**; ON UPDATE **NO ACTION**.
- `purchase_experience_reviews_navigation_check` — `CHECK (navigation >= 1 AND navigation <= 5)`. Validada. Não diferível.
- `purchase_experience_reviews_order_id_fkey` — `FOREIGN KEY (order_id) REFERENCES checkout_orders(id)`. Validada. Não diferível.
  Relação: `order_id` → `public.checkout_orders(id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.
- `purchase_experience_reviews_order_id_key` — `UNIQUE (order_id)`. Validada. Não diferível.
- `purchase_experience_reviews_overall_check` — `CHECK (overall >= 1 AND overall <= 5)`. Validada. Não diferível.
- `purchase_experience_reviews_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `purchase_experience_reviews_service_check` — `CHECK (service >= 1 AND service <= 5)`. Validada. Não diferível.
- `purchase_experience_reviews_status_check` — `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))`. Validada. Não diferível.
- `purchase_experience_reviews_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES users(id)`. Validada. Não diferível.
  Relação: `user_id` → `public.users(id)`; ON DELETE **NO ACTION**; ON UPDATE **NO ACTION**.

**Índices**

- `purchase_experience_reviews_order_id_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX purchase_experience_reviews_order_id_key ON public.purchase_experience_reviews USING btree (order_id);
```

- `purchase_experience_reviews_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX purchase_experience_reviews_pkey ON public.purchase_experience_reviews USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.schema_migrations

Controle de versão e indicador dirty mantidos pelo golang-migrate; não é cadastro comercial.

Origem: controle criado pelo executor golang-migrate.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `version` | `bigint` | **Não** | `—` | Versão de migration aplicada. |
| `dirty` | `boolean` | **Não** | `—` | Marca execução de migration incompleta/falha. |

**Restrições declaradas**

- `schema_migrations_pkey` — `PRIMARY KEY (version)`. Validada. Não diferível.

**Índices**

- `schema_migrations_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX schema_migrations_pkey ON public.schema_migrations USING btree (version);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.shipping_ranges

Faixas de CEP com preço, prazo e situação de atendimento; faixas ativas não podem se sobrepor.

Origem: `000012_shipping_ranges.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | **Não** | `—; IDENTITY BY DEFAULT` | Identificador interno da linha. |
| `name` | `character varying(100)` | **Não** | `—` | Nome do registro. |
| `start_cep` | `integer` | **Não** | `—` | Limite inicial inclusivo do CEP, armazenado como número. |
| `end_cep` | `integer` | **Não** | `—` | Limite final inclusivo do CEP. |
| `price_cents` | `integer` | **Não** | `—` | Valor do frete em centavos. |
| `min_days` | `integer` | **Não** | `—` | Prazo mínimo em dias. |
| `max_days` | `integer` | **Não** | `—` | Prazo máximo em dias. |
| `active` | `boolean` | **Não** | `—` | Indica registro ativo. |

**Restrições declaradas**

- `shipping_ranges_check` — `CHECK (end_cep >= start_cep AND end_cep <= 99999999)`. Validada. Não diferível.
- `shipping_ranges_check1` — `CHECK (max_days >= min_days)`. Validada. Não diferível.
- `shipping_ranges_int4range_excl` — `EXCLUDE USING gist (int4range(start_cep, end_cep, '[]'::text) WITH &&) WHERE (active)`. Validada. Não diferível.
- `shipping_ranges_min_days_check` — `CHECK (min_days >= 0)`. Validada. Não diferível.
- `shipping_ranges_name_check` — `CHECK (btrim(name::text) <> ''::text)`. Validada. Não diferível.
- `shipping_ranges_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `shipping_ranges_price_cents_check` — `CHECK (price_cents >= 0)`. Validada. Não diferível.
- `shipping_ranges_start_cep_check` — `CHECK (start_cep >= 0 AND start_cep <= 99999999)`. Validada. Não diferível.

**Índices**

- `shipping_ranges_int4range_excl` (gist): Busca por interseção de intervalos e suporte à exclusão de faixas ativas sobrepostas. Índice parcial: beneficia somente consultas cujo filtro implica `active`. O predicado/ordenação consultado precisa corresponder à expressão indexada. Validade: true, pronto: true.

```sql
CREATE INDEX shipping_ranges_int4range_excl ON public.shipping_ranges USING gist (int4range(start_cep, end_cep, '[]'::text)) WHERE active;
```

- `shipping_ranges_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX shipping_ranges_pkey ON public.shipping_ranges USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.subscribers

Inscrições de contato/newsletter.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('subscribers_id_seq'::regclass)` | Identificador interno da linha. |
| `email` | `character varying(255)` | **Não** | `—` | Endereço de e-mail; somente a estrutura é documentada. |
| `created_at` | `timestamp with time zone` | Sim | `CURRENT_TIMESTAMP` | Instante de criação. |

**Restrições declaradas**

- `subscribers_email_key` — `UNIQUE (email)`. Validada. Não diferível.
- `subscribers_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.

**Índices**

- `subscribers_email_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX subscribers_email_key ON public.subscribers USING btree (email);
```

- `subscribers_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX subscribers_pkey ON public.subscribers USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.user_addresses

Endereços salvos por conta, incluindo a indicação do endereço padrão.

Origem: `000009_account_addresses.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | **Não** | `—; IDENTITY ALWAYS` | Identificador interno da linha. |
| `user_id` | `integer` | **Não** | `—` | Referência à conta de usuário. |
| `label` | `character varying(40)` | **Não** | `—` | Campo label; o tipo e as restrições abaixo definem o contrato persistido. |
| `recipient` | `character varying(200)` | **Não** | `—` | Campo recipient; o tipo e as restrições abaixo definem o contrato persistido. |
| `zip_code` | `character varying(9)` | **Não** | `—` | CEP em representação textual. |
| `street` | `character varying(200)` | **Não** | `—` | Logradouro. |
| `number` | `character varying(200)` | **Não** | `—` | Número do endereço. |
| `complement` | `character varying(200)` | **Não** | `''::character varying` | Campo complement; o tipo e as restrições abaixo definem o contrato persistido. |
| `neighborhood` | `character varying(200)` | **Não** | `—` | Bairro. |
| `city` | `character varying(200)` | **Não** | `—` | Município. |
| `state` | `character(2)` | **Não** | `—` | Sigla da unidade federativa. |
| `is_default` | `boolean` | **Não** | `false` | Indica endereço padrão. |
| `created_at` | `timestamp with time zone` | **Não** | `now()` | Instante de criação. |
| `updated_at` | `timestamp with time zone` | **Não** | `now()` | Instante da última atualização registrada. |

**Restrições declaradas**

- `user_addresses_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `user_addresses_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`. Validada. Não diferível.
  Relação: `user_id` → `public.users(id)`; ON DELETE **CASCADE**; ON UPDATE **NO ACTION**.

**Índices**

- `user_addresses_default_idx` (btree): Busca e garantia de unicidade das chaves indexadas. Índice parcial: beneficia somente consultas cujo filtro implica `is_default`. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX user_addresses_default_idx ON public.user_addresses USING btree (user_id) WHERE is_default;
```

- `user_addresses_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX user_addresses_pkey ON public.user_addresses USING btree (id);
```

- `user_addresses_user_idx` (btree): Consultas compatíveis com as colunas/expressões e sua ordem no índice. Validade: true, pronto: true.

```sql
CREATE INDEX user_addresses_user_idx ON public.user_addresses USING btree (user_id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

### public.users

Contas de clientes e administradores, identificação e autenticação. Não há tabela separada de clientes.

Origem: `000001_initial_schema.up.sql`.

| Coluna | Tipo PostgreSQL exato | NULL? | Default / geração | Significado |
| --- | --- | --- | --- | --- |
| `id` | `integer` | **Não** | `nextval('users_id_seq'::regclass)` | Identificador interno da linha. |
| `full_name` | `character varying(200)` | **Não** | `—` | Nome completo da conta. |
| `email` | `character varying(150)` | **Não** | `—` | Endereço de e-mail; somente a estrutura é documentada. |
| `birth_date` | `date` | Sim | `—` | Data de nascimento. |
| `national_id` | `character varying(14)` | Sim | `—` | Documento de identificação do cliente, com unicidade; nenhum valor é exportado. |
| `phone` | `character varying(20)` | Sim | `—` | Telefone de contato. |
| `street` | `character varying(150)` | Sim | `—` | Logradouro. |
| `neighborhood` | `character varying(100)` | Sim | `—` | Bairro. |
| `number` | `character varying(20)` | Sim | `—` | Número do endereço. |
| `zip_code` | `character varying(11)` | Sim | `—` | CEP em representação textual. |
| `state` | `character(2)` | Sim | `—` | Sigla da unidade federativa. |
| `city` | `character varying(100)` | Sim | `—` | Município. |
| `password` | `character varying(255)` | **Não** | `—` | Credencial persistida; nenhum valor é exportado. |
| `created_at` | `timestamp with time zone` | Sim | `CURRENT_TIMESTAMP` | Instante de criação. |
| `role` | `character varying(50)` | **Não** | `'customer'::character varying` | Perfil de acesso. |
| `business_phone` | `character varying(20)` | Sim | `—` | Telefone comercial. |
| `cnpj` | `character varying(14)` | Sim | `—` | Documento CNPJ; nenhum valor é exportado. |

**Restrições declaradas**

- `users_cnpj_check` — `CHECK (cnpj::text ~ '^[A-Z0-9]{12}[0-9]{2}$'::text)`. Validada. Não diferível.
- `users_cpf_key` — `UNIQUE (national_id)`. Validada. Não diferível.
- `users_email_key` — `UNIQUE (email)`. Validada. Não diferível.
- `users_pkey` — `PRIMARY KEY (id)`. Validada. Não diferível.
- `users_role_check` — `CHECK (role::text = ANY (ARRAY['customer'::character varying, 'admin'::character varying]::text[]))`. Validada. Não diferível.

**Índices**

- `users_cnpj_unique` (btree): Busca e garantia de unicidade das chaves indexadas. Índice parcial: beneficia somente consultas cujo filtro implica `(cnpj IS NOT NULL)`. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX users_cnpj_unique ON public.users USING btree (cnpj) WHERE (cnpj IS NOT NULL);
```

- `users_cpf_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX users_cpf_key ON public.users USING btree (national_id);
```

- `users_email_key` (btree): Busca e garantia de unicidade das chaves indexadas. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
```

- `users_pkey` (btree): Busca e unicidade da chave primária. Validade: true, pronto: true.

```sql
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
```


A existência do índice não garante que uma consulta o utilize: seletividade, estatísticas e plano do otimizador também influenciam.

## 7. Sequences e geração de identificadores

| Sequence public | Tipo | Início / incremento / cache | Mínimo / máximo | Ciclo | Dependência |
| --- | --- | --- | --- | --- | --- |
| `brands_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.brands.id; dependência a` |
| `cart_items_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.cart_items.id; dependência i` |
| `carts_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.carts.id; dependência i` |
| `checkout_order_items_id_seq` | `bigint` | 1 / 1 / 1 | 1 / 9223372036854776000 | False | `public.checkout_order_items.id; dependência i` |
| `checkout_orders_id_seq` | `bigint` | 1 / 1 / 1 | 1 / 9223372036854776000 | False | `public.checkout_orders.id; dependência i` |
| `order_cancellations_id_seq` | `bigint` | 1 / 1 / 1 | 1 / 9223372036854776000 | False | `public.order_cancellations.id; dependência i` |
| `product_images_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.product_images.id; dependência a` |
| `product_sku_sequence` | `bigint` | 1 / 1 / 1 | 1 / 9223372036854776000 | False | `Sem coluna proprietária: utilizada pela rotina de SKU.` |
| `product_types_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.product_types.id; dependência a` |
| `product_variants_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.product_variants.id; dependência i` |
| `products_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.products.id; dependência a` |
| `promotion_products_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.promotion_products.id; dependência a` |
| `promotions_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.promotions.id; dependência a` |
| `purchase_experience_reviews_id_seq` | `bigint` | 1 / 1 / 1 | 1 / 9223372036854776000 | False | `public.purchase_experience_reviews.id; dependência i` |
| `shipping_ranges_id_seq` | `bigint` | 1 / 1 / 1 | 1 / 9223372036854776000 | False | `public.shipping_ranges.id; dependência i` |
| `subscribers_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.subscribers.id; dependência a` |
| `user_addresses_id_seq` | `bigint` | 1 / 1 / 1 | 1 / 9223372036854776000 | False | `public.user_addresses.id; dependência i` |
| `users_id_seq` | `integer` | 1 / 1 / 1 | 1 / 2147483647 | False | `public.users.id; dependência a` |

As sequências associadas a colunas preservam seus vínculos no dump; defaults nextval e definições IDENTITY são mantidos exatamente. O valor corrente de cada sequência não faz parte desta documentação de estrutura.

## 8. Funções e triggers


### public.assign_product_sku

Retorno: `trigger`; linguagem: `plpgsql`; SECURITY DEFINER: false; strict: false; volatilidade: `v` (v = VOLATILE).

Normaliza SKU para maiúsculas e remove espaços nas extremidades. Ao inserir sem SKU, gera o prefixo BX, uma sigla derivada da categoria e um número obtido da sequence global; verifica colisão antes de aceitar. A UNIQUE do SKU permanece a defesa de integridade concorrente. Na atualização com SKU vazio, preserva o valor anterior quando existente. A trigger não é disparada por uma simples alteração de categoria: o SKU permanece estável nesse caso. Esta rotina não proíbe universalmente uma atualização direta para outro SKU não vazio; a restrição de edição da interface/API é uma camada distinta. A sequência global não é um contador independente por categoria.

```sql
CREATE OR REPLACE FUNCTION public.assign_product_sku()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE category_name TEXT; prefix TEXT; number TEXT;
BEGIN
  NEW.sku := upper(btrim(COALESCE(NEW.sku, '')));
  IF TG_OP = 'UPDATE' AND NEW.sku = '' AND OLD.sku IS NOT NULL THEN
    NEW.sku := OLD.sku;
    RETURN NEW;
  END IF;
  IF NEW.sku = '' THEN
    SELECT name INTO category_name FROM product_types WHERE id = NEW.product_type_id;
    prefix := CASE
      WHEN category_name = 'Cama / Edredons' THEN 'EDR'
      WHEN category_name = 'Cama / Colchas e cobre-leitos' THEN 'COL'
      WHEN category_name = 'Cama / Mantas e peseiras' THEN 'MAN'
      WHEN category_name = 'Cama / Protetores de colchão' THEN 'PRO'
      WHEN category_name IN ('Cama', 'Cama / Jogos de cama') THEN 'CAM'
      WHEN category_name = 'Travesseiros' THEN 'TRA'
      WHEN category_name = 'Toalhas' THEN 'TOA'
      WHEN category_name = 'Almofadas' THEN 'ALM'
      WHEN category_name = 'Mesa' THEN 'MES'
      WHEN category_name = 'Decoração' AND NEW.measurements->>'Tipo' = 'Cortinas' THEN 'COR'
      WHEN category_name = 'Decoração' AND NEW.measurements->>'Tipo' IN ('Tapetes para quarto e sala', 'Tapetes para banheiro / saída de box') THEN 'TAP'
      WHEN category_name = 'Decoração' THEN 'DEC'
      ELSE 'PRD' END;
    LOOP
      number := nextval('product_sku_sequence')::text;
      NEW.sku := 'BX-' || prefix || '-' || lpad(number, greatest(3, length(number)), '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM products WHERE sku = NEW.sku);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
```

Trigger em `public.products`, estado `O` (O = habilitada na operação normal):

```sql
CREATE TRIGGER products_assign_sku BEFORE INSERT OR UPDATE OF sku ON products FOR EACH ROW EXECUTE FUNCTION assign_product_sku();
```


### public.set_promotion_updated_at

Retorno: `trigger`; linguagem: `plpgsql`; SECURITY DEFINER: false; strict: false; volatilidade: `v` (v = VOLATILE).

Atribui clock_timestamp() a NEW.updated_at em atualizações de promotions, preservando o registro automático da última alteração no banco.

```sql
CREATE OR REPLACE FUNCTION public.set_promotion_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$function$
```

Trigger em `public.promotions`, estado `O` (O = habilitada na operação normal):

```sql
CREATE TRIGGER promotion_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION set_promotion_updated_at();
```


## 9. Extensões e objetos ausentes

- `plpgsql` 1.0 em `pg_catalog`; relocatable=false.

plpgsql é extensão padrão do template PostgreSQL; o pg_dump não precisa emitir uma criação explícita dessa extensão de sistema. A restauração em um banco novo de template0 confirmou sua disponibilidade. Tipos nativos, operadores de range e funções internas do PostgreSQL são dependências do servidor, não objetos personalizados a reconstruir no dump. Não existem views, materialized views, procedures, enums/domains explícitos ou políticas RLS de aplicação neste snapshot. Não há definição omitida desses tipos de objeto por simplificação.

## 10. Comparação com as migrations e regras importantes

Foram inventariados os 53 arquivos UP existentes, sem executar migrations. Todas as tabelas explicitamente criadas por esses scripts estão presentes no catálogo. schema_migrations é a exceção esperada: é criada e mantida pelo golang-migrate, não por CREATE TABLE de uma migration da aplicação. As tabelas auxiliares de catálogo permanecem no banco e fazem parte da documentação integral. Não devem ser removidas apenas por serem auxiliares.

As estruturas finais incluem SKU (48), auditoria de campanhas (49), ordenação de imagens (50), histórico de frete (51), critérios opcionais de avaliação (52) e parcelamento (53). Foram conferidos os objetos finais, as duas funções/triggers e a sequence de SKU. A comparação é estática contra os scripts e o catálogo atual: não houve replay de migrations nem comprovação criptográfica de todos os scripts historicamente executados; schema_migrations registra versão/dirty, não seus hashes. Não foi identificada divergência de inventário de tabelas. Diferenças normais de representação SQL na restauração são detalhadas na seção de validação.

Limites entre banco e aplicação:

- O CHECK de product_variants permite preço zero; regras de preço estritamente positivo no formulário/serviço podem ser mais restritivas. Não se deve atribuir ao banco validações que não constam nos CHECKs. products.price é obrigatório, mas não possui CHECK próprio de preço positivo neste snapshot.
- O cálculo do menor preço e da soma de estoque das variantes não é realizado por uma trigger catalogada. As únicas triggers de usuário são SKU e atualização de campanha.
- A FK de checkout_order_items para variantes é composta; não há uma FK simples de product_id diretamente para products nessa tabela. Quando variant_id é NULL, MATCH SIMPLE não oferece a mesma verificação de um vínculo simples de produto. A preservação de histórico e exclusão segura também dependem do backend.
- A FK composta de imagens garante que uma variante vinculada pertence ao produto informado. Não há índice único parcial garantindo sozinho uma única capa por produto; não confundir is_primary com essa garantia.
- shipping_ranges usa intervalo inclusivo int4range(start_cep,end_cep,'[]') e EXCLUDE GiST somente WHERE active. Faixas inativas podem se sobrepor; faixas ativas não. CEP deve ser apresentado com oito dígitos, mesmo quando armazenado como integer.
- Campos históricos de frete/parcelamento nullable preservam a ausência da informação em pedidos antigos. As constraints de frete verificam preenchimento coerente e composição do total quando esse histórico existe; installments respeita método e quantidade conforme CHECK integral listado acima.
- Uma restauração somente de estrutura deixa também vazias as tabelas auxiliares de migrations. Não substitui backup completo e não restaura os snapshots necessários a determinados DOWNs do catálogo. Nenhum DOWN foi executado nesta tarefa.

## 11. Validações executadas

1. Consultas de catálogo e leitura do estado de migration em transações somente leitura no principal.
2. pg_dump 17.4 plain e custom, schema-only, utilizando o mesmo snapshot exportado; SQL plain publicado byte a byte, sem reconstrução manual.
3. Comparação de contagens e definições de tabelas, colunas, constraints, índices, sequences, rotinas, triggers e demais metadados.
4. Restauração do arquivo custom schema-only em um banco novo e isolado, criado de template0, com pg_restore --schema-only --no-owner --no-privileges --exit-on-error --single-transaction. O SQL não foi executado no principal.
5. Comparação estrutural da restauração aprovada; todas as 63 tabelas restauradas confirmadas vazias.
6. Cinco CHECKs foram deparseados com cast text[] distribuído pelos elementos de ARRAY em vez do cast externo. Uma normalização estritamente limitada a essa representação permitiu comparar os catálogos; as expressões originais/restauradas também foram avaliadas com valores sintéticos, inclusive NULL, estados/métodos válidos e inválidos, e limites de parcelamento, sem diferenças. O dump original não foi alterado.
7. Contagens e fingerprints de conteúdo de todas as 63 tabelas do principal, lidos internamente antes/depois da extração e ao concluir a restauração, permaneceram iguais. O catálogo principal também permaneceu igual; migration 53, dirty=false. Nenhum registro foi exportado para estes documentos.
8. Banco temporário removido após a validação; nenhuma API ou frontend foi reiniciado. Artefatos intermediários da tarefa removidos ao finalizar.

CHECKs com representação normalizada exclusivamente na comparação:
- `checkout_orders.checkout_order_installments_valid`
- `checkout_orders.checkout_orders_payment_method_check`
- `checkout_orders.checkout_orders_status_check`
- `products.products_status_check`
- `users.users_role_check`

Limitação operacional: o executável local psql não iniciou por incompatibilidade de aplicação com o sistema operacional. As leituras foram realizadas pelo driver PostgreSQL já utilizado no Go; pg_dump e pg_restore 17.4 funcionaram normalmente. Isso não exigiu modificar a configuração permanente nem contornar controles de segurança. Não foram executadas suítes Angular/Go ou Playwright: a alteração é exclusivamente documental; a restauração estrutural é a validação pertinente. Não se afirma validação funcional de regras HTTP por este trabalho.

## 12. Consultar no DBeaver

1. Abra database_schema.sql como arquivo SQL para leitura. Abrir o arquivo não exige executá-lo. Não selecione executar script na conexão do banco existente.
2. Use a conexão já configurada no DBeaver, sem copiar senhas para o SQL ou para este guia. Confirme o nome bd_box antes de qualquer consulta.
3. No navegador de banco, expanda Schemas → public → Tables. Abra uma tabela e consulte as abas de colunas, constraints, foreign keys e índices; os nomes exatos estão no dicionário acima. Atualize os metadados se a árvore estiver desatualizada.
4. Utilize o diagrama ER do schema ou das tabelas selecionadas para visualizar as FKs. JSONB, associações implementadas apenas em código e snapshots históricos não aparecem automaticamente como relacionamentos de FK.
5. Para estudar DDL, use a visualização de DDL da tabela ou pesquise seu CREATE TABLE no arquivo. Consulte também os ALTER TABLE posteriores: muitas constraints são declaradas depois da criação da tabela.
6. Qualquer experiência de restauração exige um banco novo, isolado e vazio. O arquivo não contém dados ou permissões do ambiente; não é procedimento de restauração do principal.

Consultas de estudo somente leitura (metadados, sem dados de clientes):

```sql
SELECT current_database(), current_setting('server_version');
SELECT version, dirty FROM public.schema_migrations;
SELECT table_name, column_name, data_type, udt_name,
       character_maximum_length, numeric_precision, numeric_scale,
       is_nullable, column_default, is_identity
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
SELECT tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```


Para um tipo PostgreSQL exato, inclusive precisão, utilize pg_catalog.format_type; information_schema separa essas informações em várias colunas:

```sql
SELECT c.relname AS tabela, a.attname AS coluna,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS tipo_exato
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
```

