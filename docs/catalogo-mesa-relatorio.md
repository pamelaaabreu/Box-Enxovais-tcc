# Mesa — implantação local e validação

Categoria Mesa cadastrada pela migration `000040_catalog_mesa`, após auditoria do PostgreSQL local na versão 39, sem duplicatas equivalentes e com marca Box Enxovais existente. Versão final 40, `dirty=false`. As três subcategorias são o atributo Tipo: Toalhas de mesa, Caminhos de mesa e Jogos americanos, conforme o modelo de filtros já usado em Toalhas.

| ID | Produto | Preço | Estoque | Fotos |
|---|---|---:|---:|---:|
| 112 | Caminho de Mesa Essência Oliva | R$ 79,90 | 12 | 3 |
| 113 | Caminho de Mesa Natural Areia | R$ 79,90 | 12 | 2 |
| 114 | Caminho de Mesa Terracota | R$ 84,90 | 10 | 2 |
| 115 | Jogo Americano Essência Oliva 4 Peças | R$ 99,90 | 12 | 2 |
| 116 | Jogo Americano Natural Areia 6 Peças | R$ 139,90 | 10 | 2 |
| 117 | Jogo Americano Terracota 4 Peças | R$ 99,90 | 12 | 3 |
| 118 | Jogo Americano Terracota 6 Peças | R$ 139,90 | 10 | 2 |
| 119 | Toalha de Mesa Essência Oliva | R$ 159,90 | 8 | 2 |
| 120 | Toalha de Mesa Natural Areia | R$ 149,90 | 10 | 3 |
| 121 | Toalha de Mesa Terracota | R$ 159,90 | 8 | 2 |

Toalhas: 140 × 220 cm; caminhos: 40 × 180 cm; jogos americanos: 35 × 45 cm por peça. Dez produtos ativos, 104 unidades, sem variantes redundantes. Estoques de kits de quatro/seis peças são independentes, conforme o manifesto recebido. A ficha distingue quantidade vendida dos objetos de ambientação.

Dados demonstrativos do TCC. Composição plausível definida para todos: 55% algodão e 45% linho; bainha costurada, com detalhe vazado no caminho Oliva compatível com sua fotografia. Lavagem delicada até 30 °C, sem alvejante, molho ou secadora; secagem à sombra e ferro pelo avesso até 150 °C. Resumos, descrições, conteúdo, materiais e cuidados constam no manifesto editorial, sem avisos ostensivos na UI.

## Segurança da migration

O cadastro não altera produtos existentes. A implantação comparou os dados das 54 tabelas anteriores dentro da mesma transação e confirmou sua preservação; somente novos produtos, imagens, categoria e tabelas de controle foram acrescentados, além da versão da migration. Carrinhos e pedidos existentes foram preservados. Os testes de compra escrevem exclusivamente em schemas isolados.

O `down` confere snapshots de produto e imagens e recusa exclusão se houver alterações posteriores, variantes, carrinhos, pedidos, favoritos ou promoções. Só remove a categoria criada se ela continuar sem produtos. O manifesto evita duplicatas por nome normalizado, chave de importação e slug existente. As rotas de produto usam a convenção de nome com ID do frontend.

## Imagens para implantação

As seis imagens fornecidas foram preservadas. Foram geradas sete capas próprias e dez closes a partir da imagem do respectivo produto, usando a ferramenta integrada `image_gen`. Não houve empréstimo de fotos entre produtos. Total: 23 arquivos PNG, todos inspecionados. Nenhuma foto pendente.

Galeria: capa principal, segunda vista fornecida quando existente, close de trama/acabamento. A ordem é a ordem existente de `is_primary` e ID de imagem. Todas as 23 URLs retornaram HTTP 200, com SHA-256 igual ao manifesto e ao arquivo em `backend/uploads`.

Pacote versionável em [backend/demo-assets/mesa-2026](../backend/demo-assets/mesa-2026): `catalogo-origem.json`, `catalogo.json`, `imagens.json`, `resultado-local.json`, `install-images.ps1` e `imagens/`. Execute o instalador antes da migration no destino; ele confere hashes e recusa sobrescrever arquivos divergentes. Os uploads também estão copiados localmente, embora essa pasta seja ignorada pelo Git.

Prompts específicos estão nos campos `prompt` do manifesto. Diretriz comum das capas: fotografia realista premium, tecido misto de algodão e linho com bainha, ambiente neutro e luz natural, produto completo com quantidade exata, sem acessórios, texto ou marca-d'água. Diretriz dos closes: referência do próprio produto, preservar cor e construção, mostrar trama e canto costurado sem novos elementos decorativos.

## Testes e limites

- PostgreSQL isolado: `TestCatalogMesaPostgres` passou, cobrindo `up/down/up`, reimportação sem duplicatas, preservação de produto anterior, comparação com manifesto, ordem e existência de fotos, ausência de variantes, filtros, ordenação, detalhe, recomendações complementares da coleção e exclusão de indisponíveis.
- Mesmo teste: sacola sem reserva de estoque, bloqueio de rollback comercial, checkout com baixa, repetição idempotente e cancelamento com reposição.
- Regressões Go: `TestCartPostgres`, `TestCheckoutStockPostgres`, `TestCatalogTowelsPostgres` e `TestCatalogCushionCoversPostgres` passaram.
- Angular: 50 testes passaram nos arquivos de categoria, detalhe, serviço de catálogo, serviço de sacola, sacola e checkout. CEP e feedback de estoque também são cobertos pelos testes existentes. Aviso de fixture: `/queen.webp` retorna 404 em um teste preexistente; não é imagem do catálogo Mesa.
- Build de produção passou. Avisos: NG8107 no template de detalhe; bundle inicial 948,15 kB para budget de 500 kB; SCSS de cadastro 15,94 kB para budget de 14 kB; SweetAlert2 CommonJS; quatro seletores CSS ignorados. Budgets e dependências foram preservados.
- API local: dez itens e seus detalhes conferidos contra nomes, preços, estoques e galerias do manifesto; 23 imagens HTTP 200 com hashes conferidos.
- `git diff --check` sem erros.

**Pendente:** validação visual real em 1440, 1024, 768 e 390 px e capturas de catálogo, filtros, detalhe, galeria, compra e mensagens. O controle do navegador não encontrou host de acesso às abas; a alternativa pela janela do Chrome foi encerrada pela ferramenta porque não conseguiu identificar a URL com segurança. Não foram produzidas capturas nem confirmado o resultado visual ou a ausência de rolagem horizontal. Os testes Angular em ChromeHeadless não substituem essa conferência.

## Arquivos da tarefa

- `backend/migrations/000040_catalog_mesa.up.sql` e `.down.sql`.
- `backend/src/repositories/product_repository.go`: Mesa reutiliza a prioridade de complementares de coleção/cor; estoque indisponível continua excluído.
- `backend/src/routes/catalog_mesa_test.go`.
- `frontend/src/app/features/catalog/pages/category/category.component.ts` e `.spec.ts`: filtros de Mesa e regressão.
- `backend/demo-assets/mesa-2026/`: pacote acima, 23 imagens e manifesto de implantação.
- `backend/uploads/mesa-2026-*.png`: cópias para servir as galerias.
- Este relatório. Alterações anteriores de outras categorias foram preservadas.
