# Mesa: variedade visual das galerias

Aplicado no projeto `Box-Enxovais-tcc`, banco local `bd_box`. Migration **000041_mesa_gallery_roles**, versão final **41**, **dirty=false**.

## Resultado

As dez galerias seguem a ordem **ambientação → apresentação objetiva → detalhe**, com três fotos distintas por produto. Foram mantidas **20 fotografias existentes**, substituídas **três segundas vistas redundantes** e acrescentadas **sete ambientações**. Nenhum arquivo antigo foi apagado.

| Produto | Ajuste | Mantido |
|---|---|---|
| #112 Caminho de Mesa Essência Oliva | Segunda vista substituída pelo caminho dobrado, isolado, com acabamento vazado visível | Capa ambientada e close |
| #113 Caminho de Mesa Natural Areia | Nova ambientação superior; antiga capa passa à segunda posição | Apresentação na mesa sem louças e close |
| #114 Caminho de Mesa Terracota | Nova ambientação superior; antiga capa passa à segunda posição | Apresentação na mesa sem louças e close |
| #115 Jogo Americano Essência Oliva 4 Peças | Nova ambientação de mesa posta com quatro lugares | Foto objetiva das quatro peças e close |
| #116 Jogo Americano Natural Areia 6 Peças | Nova ambientação de mesa posta com seis lugares | Foto objetiva das seis peças e close |
| #117 Jogo Americano Terracota 4 Peças | Segunda vista substituída por quatro peças inteiras, separadas em disposição 2 × 2, sem louças | Capa ambientada e close |
| #118 Jogo Americano Terracota 6 Peças | Nova ambientação de mesa posta com seis lugares | Foto objetiva das seis peças e close |
| #119 Toalha de Mesa Essência Oliva | Nova ambientação superior; antiga capa passa à segunda posição | Toalha sem louças, mostrando caimento, e close |
| #120 Toalha de Mesa Natural Areia | Segunda vista substituída pela toalha sobre mesa sem louças, com área e caimento legíveis | Capa ambientada e close |
| #121 Toalha de Mesa Terracota | Nova ambientação superior; antiga capa passa à segunda posição | Toalha sem louças, mostrando caimento, e close |

Nos produtos #113, #114, #119 e #121, a primeira tentativa de ambientação ainda repetia o ângulo da foto isolada. Foram selecionadas versões finais com enquadramento superior para obter variedade efetiva, sem depender apenas da troca de acessórios.

As imagens antigas retiradas dos vínculos foram:

- `uploads/mesa-2026-caminho-de-mesa-essencia-oliva-02.png`.
- `uploads/mesa-2026-jogo-americano-terracota-4-pecas-02.png`.
- `uploads/mesa-2026-toalha-de-mesa-natural-areia-02.png`.

Esses arquivos continuam disponíveis em disco e nos assets anteriores. Os dez closes `-03-trama.png` foram preservados integralmente. Nos sete produtos que receberam ambientação, a capa mudou para a nova foto; o arquivo da capa anterior continua na galeria como apresentação objetiva.

## Preservação e rollback

Não foram alterados registros de produtos, preços, estoques, variantes, nomes, slugs, categorias, carrinhos, pedidos ou favoritos. Comparação completa dos **75 produtos anteriores**, desconsiderando apenas as galerias dos dez produtos auditados, confirmou igualdade dos dados comerciais e das demais galerias.

A aplicação executou a mudança em transação e verificou a integridade de **54 tabelas comerciais anteriores** e das imagens de outras categorias. Os IDs dos vínculos substituídos foram mantidos. A ordenação reutiliza o contrato existente: capa principal primeiro e demais imagens por ID. Não foram criados campos de ordenação ou alterados endpoints.

A migration registra as imagens anteriores e posteriores. O `down` restaura os vínculos e as capas originais, mas recusa execução se a galeria tiver sido editada depois da aplicação. Não remove arquivos físicos. A migration 40 e as alterações que já existiam no workspace não foram editadas nesta tarefa.

## Assets e reprodução

[Manifesto das dez novas imagens](../backend/demo-assets/mesa-galerias-041/imagens.json), com papéis, produto, origem, destino, URLs e SHA-256. [Resultado local e mapa das 30 URLs finais](../backend/demo-assets/mesa-galerias-041/resultado-local.json).

Arquivos WebP com até 1600 px, aproveitando a resolução gerada disponível. Instalador reproduzível:

`powershell -File backend/demo-assets/mesa-galerias-041/install-images.ps1`

O instalador valida hashes e recusa sobrescrever arquivos divergentes; o destino servido pelo backend permanece `backend/uploads`. Os dez arquivos novos tiveram HTTP 200 e hash igual ao manifesto. As 30 URLs das galerias finais também responderam HTTP 200.

## Testes executados

- **Go/PostgreSQL isolado:** `TestCatalogMesaPostgres` e `TestMesaGalleryRolesPostgres` passaram.
- Migration: **up/down/up**, reexecução lógica sem duplicação, igualdade dos dados comerciais, ordem das imagens pela API e proteção de edições posteriores.
- **Angular: nove testes passaram**, nos arquivos de `ProductGalleryComponent` e `CatalogService`: seleção, ordem, reset para outro produto, imagem original no zoom e adaptação do catálogo.
- **Chrome local em 1440, 1024, 768 e 390 px:** catálogo Mesa e os dez detalhes; três miniaturas por produto, seleção de cada imagem e zoom correspondente. Nenhum overflow horizontal nas telas verificadas.
- Fotografias inspecionadas lado a lado e nas páginas reais, incluindo quantidade de peças dos jogos americanos e diferença entre ambientação, apresentação objetiva e acabamento.
- `git diff --check` sem erros.
- Build de produção não repetido: a correção não altera código Angular/Go da aplicação, contratos ou dependências; envolve assets, migration e teste de integração.

## Arquivos criados nesta tarefa

- `backend/migrations/000041_mesa_gallery_roles.up.sql`.
- `backend/migrations/000041_mesa_gallery_roles.down.sql`.
- `backend/src/routes/mesa_gallery_roles_test.go`.
- `backend/demo-assets/mesa-galerias-041/`: dez WebP enumerados no manifesto, `imagens.json`, `install-images.ps1` e `resultado-local.json`.
- `docs/capturas/mesa-galerias/`: antes/depois da segunda foto dos produtos #117 e #120 nas quatro larguras, catálogo nas quatro larguras, folhas comparativas e matriz de validação.
- Este relatório.

[Capturas e comparação das dez galerias](capturas/mesa-galerias). [Matriz dos 40 cenários produto/largura](capturas/mesa-galerias/validacao.json).

Sem pendências identificadas no escopo desta correção.

