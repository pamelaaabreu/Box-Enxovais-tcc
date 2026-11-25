> Evidência histórica: datas, PIDs, contagens e estado de implantação abaixo descrevem a execução registrada. Para arquitetura e resultados atuais, consulte README.md deste guia e AUDITORIA_FINAL.md. Não reaplique migrations com base neste histórico.

# Auditoria de usabilidade, responsividade e acessibilidade

## 1. Objetivo, escopo e parecer

Auditoria técnica de 22/11/2026 baseada no artigo acadêmico v.4 e no sistema implementado. Foram inventariadas **51 entradas de roteamento, correspondentes a 47 padrões distintos**, incluindo layouts/redirects e rotas lazy. A navegação cobriu **75 estados de interface** nas oito larguras solicitadas, totalizando **600 medições de viewport**, mais fluxos funcionais e inspeção de capturas. Estados diferentes podem compartilhar componente/rota; 75 não significa 75 páginas independentes.

**Parecer: pronta para demonstração técnica, com as limitações descritas neste documento.** Não permaneceram P0/P1 conhecidos nos cenários executados. Isso não constitui certificação WCAG AA, prova de satisfação dos usuários ou aplicação da SUS.

## 2. Referência acadêmica e rastreabilidade

Fonte principal: artigo PDF fornecido pela autora, localizado em Downloads, com 24 páginas. Foram extraídos textos e inspecionadas páginas renderizadas, especialmente os quadros. O arquivo não foi editado; SHA-256 antes/depois: `f21b9e4f67c3191441e9ef69e7271e0e517ea52e6a9f39aaffc59cdcba754c15`.

| Referência do artigo | Critério técnico derivado | Verificação e resultado |
|---|---|---|
| RNF01, Quadro 3, p.14 | Adaptar interfaces a diferentes dimensões | Oito larguras, menus, cards, formulários, checkout e painel; tabelas móveis corrigidas |
| RNF02, Quadro 3, p.14 | Informações e fluxos claros/compreensíveis | Busca/filtros, preço, variante, estoque, sacola, entrega, parcelas e confirmação exercitados; contrastes e alvos corrigidos |
| 2.3.3, p.12 | Categorias e detalhe apoiam decisão sem contato físico | Seis categorias, subcategorias, galerias, informações adicionais, cuidados, variantes e indisponibilidade; catálogo real conferido somente por leitura |
| 2.3.5, p.13 | Reorganizar componentes, não só reduzir dimensões | Grids responsivas, menus, sidebar, modais, campos e linhas empilhadas em tabelas |
| 2.3.8, p.17–18 | Hierarquia de imagens, preços e ações; navegação direta/exploratória | Busca, ordenação/URL, detalhes, galeria, carrinho e abas; não se exigiu reproduzir pixel a pixel protótipos históricos |
| Quadro 4, p.20: requisitos e dados | Validações de estoque/quantidade e coerência entre camadas | Backend real isolado, alteração de quantidade, variantes, compra e cancelamento; sem redefinir regras comerciais |
| Quadro 4: interface e responsividade | Organização e legibilidade | Matriz e inspeção visual; cores auxiliares e tabelas corrigidas |
| Quadro 4: integração e experiência | Fluxos utilizáveis entre Angular, Go e PostgreSQL | Perfis, loading, erro/retry, pedido, avaliação e moderação reais no schema isolado |

O artigo apresenta a SUS como avaliação posterior (resumo, p.1; método, p.10). Não houve participantes, questionário, escore SUS ou estimativa de satisfação/eficiência humana. Também não foram criados recursos novos apenas por constarem como previstos no texto. A auditoria avalia decisões já materializadas no produto.

## 3. Método e ferramentas

Chrome 158 em Windows, controlado por Playwright 1.65.1 com sandbox habilitado; axe-core 4.14.1; build Angular existente inicialmente e builds direcionadas após correções; API Go real em 8086 com PostgreSQL em schema browser_audit próprio, criado pelo harness existente. Preview da build em 4206. Perfis anônimo, cliente e administrador, com dados fictícios exclusivos desse schema.

Os fluxos principais não usaram API mockada. Somente o teste de indisponibilidade injetou HTTP 503, identificado como falha controlada; o loading foi exercitado segurando uma resposta obtida do backend real. Nenhuma credencial real foi registrada. Playwright/axe foram instalados apenas em diretório temporário, sem alterar package.json/lock da aplicação.

Referência complementar: [WCAG 2.2 do W3C](https://www.w3.org/TR/WCAG22/), principalmente 1.1.1, 1.3.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 2.1.1/2, 2.4.3/7/11, 2.5.8, 3.3.1/2 e 4.1.2/3. [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) foi avaliado a 320 CSS px; a possibilidade de rolagem local não foi tomada isoladamente como aprovação de tabelas.

## 4. Inventário completo de roteamento

Inventário produzido uma única vez pela AST TypeScript de app.routes.ts e admin-routing.module.ts, incluindo matcher de login/cadastro. Layouts e destinos compartilhados foram mantidos para mostrar a estrutura real.

| Padrão | Tipo | Destino de redirect, quando existente |
|---|---|---|
| `/account` | screen | — |
| `/meus-pedidos` | screen | — |
| `/meus-pedidos/:id` | screen | — |
| `/checkout/success/:id` | screen | — |
| `/checkout` | screen | — |
| `/favorites` | screen | — |
| `/cart` | screen | — |
| `/` | redirect | 'home' |
| `/home` | screen | — |
| `/campanha/:id` | screen | — |
| `/categoria/:slug` | screen | — |
| `/produto/:slug` | screen | — |
| `/login` | matcher | — |
| `/register` | matcher | — |
| `/forgot-password` | screen | — |
| `/verify-code` | screen | — |
| `/reset-password` | screen | — |
| `/image-upload/:id` | screen | — |
| `/product-register` | screen | — |
| `/promotion-register` | redirect | 'admin/promotions/new' |
| `/add-to-promotion` | redirect | 'admin/promotions' |
| `/admin` | lazy-module | — |
| `/404` | screen | — |
| `/**` | screen | — |
| `/admin` | layout | — |
| `/admin/customers` | screen | — |
| `/admin/customers/:id` | screen | — |
| `/admin/orders` | screen | — |
| `/admin/orders/:id` | screen | — |
| `/admin/experience-reviews` | screen | — |
| `/admin` | redirect | 'dashboard' |
| `/admin/dashboard` | screen | — |
| `/admin/metrics` | screen | — |
| `/admin/products` | layout | — |
| `/admin/products/:id/edit` | screen | — |
| `/admin/products/:id/images` | screen | — |
| `/admin/products/:id/variants` | screen | — |
| `/admin/products` | screen | — |
| `/admin/products/manage` | screen | — |
| `/admin/promotions` | layout | — |
| `/admin/promotions` | screen | — |
| `/admin/promotions/create` | redirect | 'new' |
| `/admin/promotions/add-product` | redirect | '' |
| `/admin/promotions/new` | screen | — |
| `/admin/promotions/:id/edit` | screen | — |
| `/admin/promotions/:id` | screen | — |
| `/admin/catalog` | layout | — |
| `/admin/catalog/categories` | screen | — |
| `/admin/catalog/brands` | screen | — |
| `/admin/catalog/shipping-ranges` | screen | — |
| `/admin/reports` | screen | — |

## 5. Matriz efetivamente executada

Legenda: cada largura listada foi realmente carregada/medida no navegador. A última execução pertinente substitui a anterior na consolidação. Axe foi executado em 320 e 1440 px para cada estado, não nas oito larguras. Capturas foram preservadas de maneira representativa; não se afirma inspeção humana exaustiva de 600 imagens.

| Estado | Perfil | Rota instanciada | Larguras aprovadas (px) |
|---|---|---|---|
| home | anon | `/home` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| categoria-cama | anon | `/categoria/cama` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| categoria-travesseiros | anon | `/categoria/travesseiros` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| categoria-toalhas | anon | `/categoria/toalhas` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| categoria-almofadas | anon | `/categoria/almofadas` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| categoria-mesa | anon | `/categoria/mesa` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| categoria-decoracao | anon | `/categoria/decoracao` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| produto-simples | anon | `/produto/1` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| produto-variantes | anon | `/produto/2` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| produto-indisponivel | anon | `/produto/7` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| produto-inexistente | anon | `/produto/999999` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| campanha | anon | `/campanha/1` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| campanha-inexistente | anon | `/campanha/999999` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| login | anon | `/login` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| cadastro | anon | `/register` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| recuperacao | anon | `/forgot-password` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| otp | anon | `/verify-code` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| nova-senha | anon | `/reset-password` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| nova-senha-token-ausente | anon | `/reset-password` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| 404 | anon | `/404` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| rota-desconhecida | anon | `/nao-existe-ux` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| favoritos | client | `/favorites` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| sacola | client | `/cart` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| conta-enderecos | client | `/account` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| pedidos | client | `/meus-pedidos` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| pedido-detalhe | client | `/meus-pedidos/1` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| pedido-inexistente | client | `/meus-pedidos/999999` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| confirmacao-avaliacao | client | `/checkout/success/1` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| confirmacao-inexistente | client | `/checkout/success/999999` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| checkout-entrega | client | `/checkout` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| checkout-pagamento | client | `/checkout` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| checkout-revisao | client | `/checkout` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| dashboard | admin | `/admin/dashboard` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| metricas | admin | `/admin/metrics` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| produtos-admin | admin | `/admin/products` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| cadastro-admin | admin | `/admin/products/manage` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| edicao-admin | admin | `/admin/products/2/edit` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| imagens-admin | admin | `/admin/products/2/images` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| variantes-admin | admin | `/admin/products/2/variants` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| categorias-admin | admin | `/admin/catalog/categories` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| marcas-admin | admin | `/admin/catalog/brands` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| cep-admin | admin | `/admin/catalog/shipping-ranges` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| promocoes-admin | admin | `/admin/promotions` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| promocao-nova | admin | `/admin/promotions/new` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| promocao-edicao | admin | `/admin/promotions/1/edit` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| promocao-leitura | admin | `/admin/promotions/1` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| pedidos-admin | admin | `/admin/orders` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| pedido-admin | admin | `/admin/orders/1` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| clientes-admin | admin | `/admin/customers` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| cliente-admin | admin | `/admin/customers/2` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| avaliacoes-admin | admin | `/admin/experience-reviews` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| relatorio-sales | admin | `/admin/reports?type=sales` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| relatorio-products | admin | `/admin/reports?type=products` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| relatorio-customers | admin | `/admin/reports?type=customers` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| relatorio-stock | admin | `/admin/reports?type=stock` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| alias-cadastro | admin | `/product-register` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| alias-imagens | admin | `/image-upload/2` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| alias-promocao | admin | `/promotion-register` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| alias-adicionar-promocao | admin | `/add-to-promotion` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| alias-promocao-create | admin | `/admin/promotions/create` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| alias-promocao-add-product | admin | `/admin/promotions/add-product` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| admin-raiz | admin | `/admin` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| raiz | anon | `/` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| promocao-aba-produtos | admin | `/admin/promotions/1/edit` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| promocao-aba-imagens | admin | `/admin/promotions/1/edit` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| promocao-aba-descontos | admin | `/admin/promotions/1/edit` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| enderecos | client | `/account` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| seguranca-conta | client | `/account` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| endereco-formulario | client | `/account` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| produto-aba-caracteristicas | anon | `/produto/2` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| produto-aba-cuidados | anon | `/produto/2` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| catalogo-vazio | anon | `/categoria/cama?q=NAO-EXISTE-UX` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| subcategoria-jogos-cama | anon | `/categoria/cama-jogos-de-cama--1` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| subcategoria-edredons | anon | `/categoria/cama-edredons--2` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |
| cadastro-multivariantes | admin | `/admin/products/manage` | 320, 360, 390, 430, 768, 1024, 1440, 1920 |

## 6. Critérios de responsividade e acessibilidade

A geometria verificou largura do documento, imagens visíveis, tabelas, modais e menus. A inspeção das capturas revelou tabelas com colunas/ações fora da área visível apesar de não haver overflow na página; por isso houve correção, e não aprovação baseada só na largura do body. A nova verificação percorreu cada célula da primeira linha das cinco tabelas afetadas em 320 px.

Teclado: menus de categorias e sidebar em oito larguras; Tab/Shift+Tab e Enter na busca; dropdowns e confirmações em 320/768/1440; Tab contido no diálogo, Escape e retorno do foco; abas de conta/produto; radios da avaliação; seletor de participantes com oito larguras; moderação acessível. A ativação manual das abas da conta por Enter é válida e foi preservada.

Axe verificou semântica, nomes, rótulos, relações, contraste e alvos nos estados alcançados. Mensagens inválidas foram conferidas com aria-invalid/aria-describedby; loading, erro e agradecimento foram exercitados. A análise não equivale a leitura humana completa com NVDA/VoiceOver.

Ampliação: quatro superfícies representativas (Home, checkout, formulário e relatório) passaram por font-size raiz 200% e reflow a 320. Houve também emulação CDP com viewport 640 e deviceScaleFactor 2, equivalente visual à ampliação de uma janela de 1280; não foi alegado teste manual do menu de zoom do navegador ou de todos os tamanhos de fonte do sistema operacional. Fontes em px não são integralmente ampliadas pelo teste de font-size raiz, motivo da verificação CDP complementar.

## 7. Problemas encontrados e corrigidos

| ID / gravidade | Tela e resolução | Evidência/critério | Correção | Reverificação |
|---|---|---|---|---|
| UX01 P1 | Produtos admin, 320–768 e containers estreitos | Ações e dados dependiam de rolagem lateral; captura antes | Reutilizado admin-adaptive-table, rótulos data-label e linhas empilhadas | Oito larguras, axe e acesso a todas as células aprovados |
| UX02 P1 | Quatro relatórios, 320 e containers estreitos | Valores/status fora da área visível; RNF01/RNF02 | Mesmo padrão compartilhado; rótulos e valores agrupados | Quatro tipos × oito larguras; sem rolagem lateral necessária em 320 |
| UX03 P1 | Galeria admin, 320/1440 | Texto do CTA com contraste 1,23:1 | Token Material de texto claro sobre oliva | Axe sem violação, captura final e teste de galeria |
| UX04 P2 | Cabeçalho público, 320/1440 | Busca 22×22 px e espaçamento insuficiente, 2.5.8 | Alvo 44×44, ícone preservado, padding do input compatível | Consumidores públicos e teclado aprovados |
| UX05 P2 | Home/catálogo, 320/1440 | Preço riscado 4,31:1, 1.4.3 | Cor auxiliar escurecida para #6b6f61 | Axe sem violação nos consumidores |
| UX06 P2 | Cadastro/recuperação, 320/1440 | Regras da senha 4,08:1 | Token muted #625f59 | Autenticação completa nas oito larguras |
| UX07 P2 | Sacola, 320/1440 | Rótulos entre 3:1 e 4,15:1 | Token local de texto auxiliar #626e5a | Matriz, quantidade e estados vazios aprovados |
| UX08 P2 | Checkout, 320/1440 | Etapas e textos auxiliares entre 3,67:1 e 4,48:1 | Cores auxiliares oliva/cinza mais escuras | Entrega, pagamento, revisão e compra aprovados |
| UX09 P2 | Produtos admin, 320/1440 | SKU 3,14:1 e ações pequenas | Cor #646d78 e alvo mínimo 32 px | Axe e tabela adaptativa aprovados |
| UX10 P2 | Nova senha, 320 | Input de confirmação com 18 px de altura e espaçamento insuficiente | min-height 24 px no estilo compartilhado de autenticação | Seis estados de autenticação × oito larguras; axe zero |

P0: nenhum identificado nos cenários executados. P1 acima foram corrigidos. Não foram alterados nomes, preços, estoque, regras comerciais, migrations ou contratos. Os refinamentos são correções objetivas, não redesenho geral.

## 8. Resultados e falhas da automação

- **600/600 medições consolidadas**, 75 estados nas oito larguras, sem overflow horizontal da página.
- **150 análises axe consolidadas**, zero violações finais nas tags wcag2a/wcag2aa/wcag21aa/wcag22aa nos estados examinados. Resultados incompletos do axe continuam registrados para revisão humana, sobretudo imagens e cores de fundo variáveis.
- **39/39 verificações funcionais consolidadas**, incluindo fluxos completos e falhas controladas.
- **56/56 verificações do catálogo real somente leitura**, seis categorias e um produto nas oito larguras, com imagens visíveis carregadas.
- **59 testes Angular direcionados aprovados**, em duas rodadas (40 + 19), sem executar novamente a suíte geral.
- Build final de produção aprovado: inicial 454,88 kB. Aviso preexistente do SCSS de Promoções (15,55 kB) permanece; orçamento não foi aumentado.

Falhas de preparação/seletores foram diferenciadas de problemas do produto: payload de fixture com campo não aceito; intervalo legítimo de reenvio de OTP; teste esperando ativação automática de aba manual; seletor procurando “sacola vazia” onde a interface diz “carrinho vazio”; seletor antigo de miniatura. Foram corrigidos os testes e repetidos os cenários afetados, sem enfraquecer validações da aplicação. As versões iniciais ficam nos JSONs como histórico, e a consolidação usa o resultado posterior por nome.

## 9. Integridade e atividade simultânea no principal

O schema isolado foi removido. O harness registrou FAIL apenas no digest de integridade do principal, porque houve atividade simultânea real. O usuário confirmou expressamente ter usado a loja durante a auditoria. Não se apresentou esse FAIL como PASS e nenhum dado foi desfeito.

Comparação somente leitura, em memória, contra o backup validado anterior: os **três pedidos originais permanecem idênticos**; estado atual **53, dirty=false, cinco pedidos e uma avaliação**. Os registros novos não usam os e-mails/destinatários das fixtures. A diferença compreende carrinhos/itens, dois pedidos e seus itens, uma avaliação e quantidades de variantes, compatível com as compras reais confirmadas. Cinquenta e seis tabelas conservaram o conteúdo do backup; seis tiveram diferenças. Essa comparação não prova banco sem alterações durante a janela, e o relatório não faz essa alegação.

As escritas da automação utilizaram API 8086 com search_path exclusivo verificado pelo harness. A leitura do catálogo principal bloqueou métodos de escrita na interceptação. Nenhuma migration, restauração, exclusão de dados principais ou reversão das compras reais foi realizada.

## 10. Arquivos corrigidos e reprodução

- [frontend/src/app/shared/components/top-navbar/top-navbar.component.scss](../../frontend/src/app/shared/components/top-navbar/top-navbar.component.scss): correção descrita na tabela de achados.
- [frontend/src/app/features/catalog/components/product-price/product-price.component.scss](../../frontend/src/app/features/catalog/components/product-price/product-price.component.scss): correção descrita na tabela de achados.
- [frontend/src/app/features/authentication/auth/auth.component.scss](../../frontend/src/app/features/authentication/auth/auth.component.scss): correção descrita na tabela de achados.
- [frontend/src/app/features/cart/cart.component.scss](../../frontend/src/app/features/cart/cart.component.scss): correção descrita na tabela de achados.
- [frontend/src/app/features/checkout/checkout.component.scss](../../frontend/src/app/features/checkout/checkout.component.scss): correção descrita na tabela de achados.
- [frontend/src/app/features/admin/products/product-manage/images/product-image-upload/product-image-upload.component.scss](../../frontend/src/app/features/admin/products/product-manage/images/product-image-upload/product-image-upload.component.scss): correção descrita na tabela de achados.
- [frontend/src/app/shared/css/auth-material.scss](../../frontend/src/app/shared/css/auth-material.scss): correção descrita na tabela de achados.
- [frontend/src/app/features/admin/products/product-list/product.component.html](../../frontend/src/app/features/admin/products/product-list/product.component.html): correção descrita na tabela de achados.
- [frontend/src/app/features/admin/products/product-list/product.component.scss](../../frontend/src/app/features/admin/products/product-list/product.component.scss): correção descrita na tabela de achados.
- [frontend/src/app/features/admin/reports/report.component.html](../../frontend/src/app/features/admin/reports/report.component.html): correção descrita na tabela de achados.
- [frontend/src/app/features/admin/reports/report.component.scss](../../frontend/src/app/features/admin/reports/report.component.scss): correção descrita na tabela de achados.

Scripts novos: frontend/e2e/ux-audit.cjs (inventário/matriz/axe), ux-interactions.cjs (tarefas e teclado), ux-public-readonly.cjs (catálogo principal protegido contra escrita). Reutilizado TestBrowserAuditServer existente; backend de produção não foi alterado/reiniciado nesta auditoria.

Para reprodução, disponibilizar Playwright/axe-core em ferramentas temporárias, build em 4206 e harness isolado em 8086 (AUDIT_BROWSER=1, CART_TEST_LOCAL=1, SHIPPING_PR_BROWSER=1). NODE_PATH aponta às ferramentas; UX_ONLY limita estados e UX_PHASE nomeia uma reverificação; UX_INTERACTION_ONLY limita tarefas. O catálogo principal é usado apenas pelo script explicitamente readonly. Não execute tarefas de escrita contra a porta 8080.

## 11. Evidências

- [Resultado consolidado e inventário](../validacao-visual/ux-20261122/resultado-consolidado.json).
- Produtos 320: [antes](../validacao-visual/ux-20261122/before-produtos-admin-320.png) e [depois](../validacao-visual/ux-20261122/tables-final-produtos-admin-320.png).
- Relatórios 320: [antes](../validacao-visual/ux-20261122/table-before-relatorio-sales-320.png) e [depois](../validacao-visual/ux-20261122/tables-final-relatorio-sales-320.png).
- Galeria 320: [antes](../validacao-visual/ux-20261122/supplement-before-imagens-admin-320.png) e [depois](../validacao-visual/ux-20261122/after-imagens-admin-320.png).
- [Checkout revisão 320](../validacao-visual/ux-20261122/after-checkout-revisao-320.png), [foco da busca](../validacao-visual/ux-20261122/focus-search-1440.png) e [ampliação emulada](../validacao-visual/ux-20261122/zoom200-relatorio.png).
- [Catálogo real Decoração 320](../validacao-visual/ux-20261122/catalogo-real-decoracao-320.png) e [produto real 1440](../validacao-visual/ux-20261122/catalogo-real-produto-1440.png).

## 12. Limitações e melhorias futuras

Não houve SUS, recrutamento de participantes, leitor de tela, verificação manual de todos os pixels/elementos de todos os estados, dispositivo físico móvel ou teste cross-browser Safari/Firefox. Axe zero não elimina problemas não detectáveis por automação. Vídeos decorativos, imagens com texto e fundos fotográficos podem exigir revisão humana adicional. Ampliação foi emulada, não uma certificação de todos os mecanismos de zoom/ajustes do sistema.

A fixture técnica não reproduz todo o acervo fotográfico real; por isso houve a leitura complementar do catálogo principal. A atividade real simultânea impediu uma igualdade global antes/depois do principal, com origem confirmada pelo usuário e sem intervenção corretiva nos seus registros.

P3: manter plano de avaliação com usuários/SUS, ampliar auditoria assistiva, revisar contraste editorial sobre fotografias em condições variadas e reduzir o SCSS legado de Promoções em tarefa própria. Atualização de dependências e integrações reais de pagamento não fizeram parte desta auditoria.

## 13. Encerramento

As correções P1/P2 foram revalidadas sem alteração das funcionalidades comerciais. A evidência técnica sustenta RNF01/RNF02 nos cenários executados e fornece apoio à apresentação; percepção dos usuários continua pendente de avaliação acadêmica. Os servidores temporários foram encerrados; API principal 8080 e frontend 4200 foram preservados. O artigo, uploads, backups e migrations permanecem intactos.

Limpeza final: 56 capturas intermediárias removidas (9.822.562 bytes), com 21 evidências representativas preservadas; 254 arquivos de ferramentas/logs temporários removidos (23.179.850 bytes). Verificação final somente leitura: API /products e frontend HTTP 200; portas 8086/4206 encerradas. O cadastro inválido e não utilizado da preparação de fixture foi retirado do script para não repetir esse ruído em novas execuções; não alterava registros nem era cenário aprovado.
