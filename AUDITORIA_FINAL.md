# AUDITORIA FINAL — Box Enxovais

Data: 20/11/2026. Projeto auditado: `C:/Users/vitor/Documents/Box-Enxovais-tcc`. Atualização: 21/11/2026 — migration 000051 de frete aplicada, onze faixas PR cadastradas e backend principal atualizado após autorização, testes isolados e backup. Resultados das rodadas anteriores permanecem como histórico nas seções abaixo.

**Estado operacional mais recente — 22/11/2026:** migrations 52 e 53 aplicadas no bd_box, versão 53, dirty=false; backup completo validado, três pedidos e dados comerciais preservados, API atualizada e frontend mantido. Detalhes na seção final deste documento. Os estados anteriores abaixo são históricos.

## Resultado e limites

As correções foram implementadas e os fluxos existentes foram executados por navegação real. A edição de campanhas voltou a salvar sem HTTP 400. Foram aprovadas 108 verificações Playwright: 76 no ambiente isolado e 32 somente de leitura no catálogo principal. Isso não equivale a afirmar que funcionalidades ainda ausentes no projeto estão implementadas; elas constam nas pendências abaixo.

| Verificação final | Resultado |
| --- | --- |
| Angular / Chrome Headless | 276 testes aprovados, zero falhas |
| Go + integração PostgreSQL, `CART_TEST_LOCAL=1 go test ./... -count=1` | 144 resultados de testes/subtestes aprovados, correspondendo a 58 testes de nível superior; zero falhas |
| Harness E2E opt-in | Aprovado separadamente; 84,62 s; schema removido e integridade principal confirmada |
| Único skip na suíte Go comum | `TestBrowserAuditServer`, deliberadamente opt-in; executado com sucesso na rodada E2E |
| Playwright / build de produção | 76/76 verificações aprovadas |
| Playwright / catálogo principal em leitura | 32/32 verificações aprovadas |
| TypeScript `tsc --noEmit -p tsconfig.app.json` | Exit 0 |
| `go vet ./...` | Exit 0 |
| Build Angular de produção | Exit 0; 24,192 s; avisos discriminados abaixo |
| Frontend e backend principais após os testes | HTTP 200 em `http://localhost:4200` e `http://localhost:8080/products?limit=1` |
| Banco principal | Migration 50, `dirty=false`, após ativação autorizada; nenhum dado comercial alterado |

## Bloqueio original do Chrome e alternativa utilizada

A ferramenta de controle da janela do Chrome interrompeu a operação com a mensagem técnica: “Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.” O bloqueio foi a impossibilidade de confirmar a URL pela ferramenta no Windows; não foi indisponibilidade comprovada da aplicação. Uma sondagem de rede dentro do sandbox também retornou WinError 10013. A sondagem local autorizada fora dessa restrição retornou HTTP 200 nos serviços.

Foi utilizado Playwright com Chromium local 159.0.8154.6, em contextos novos e `chromiumSandbox: true`. Não foram usados perfil pessoal, `--no-sandbox`, desativação de CORS, alteração de configurações de segurança do Chrome ou contorno da ferramenta bloqueada.

O build atual foi servido em `127.0.0.1:4206`; a API real de teste em `127.0.0.1:8086`. As requisições Angular destinadas a `localhost:8080` foram redirecionadas, pela automação, para a API real isolada. Não se tratou de uma API mockada. Somente o cenário negativo de erro/retry utilizou uma resposta HTTP 503 deliberadamente controlada.

Uma execução longa do harness atingiu seu limite de 35 minutos após os fluxos. O erro foi `browser audit timeout`; a limpeza e a comparação de integridade ainda foram executadas. A rodada final repetiu os cenários com marcador de encerramento automático em `finally`, terminou com exit 0 e confirmou a remoção do schema. Esse timeout de orquestração não foi omitido nem classificado como bug comercial.

## Isolamento e integridade PostgreSQL

- O isolamento foi feito por schemas exclusivos no PostgreSQL existente, não por uma segunda base física. Cada pool E2E recebeu `search_path` restrito ao schema gerado, sem fallback para `public`; `current_schema()` foi conferido antes das operações.
- Usuários, produtos, variantes, imagens de teste, faixas de CEP, campanhas, favoritos, carrinhos e pedidos foram criados apenas nesses schemas. Os arquivos enviados foram gravados em diretórios temporários do teste Go.
- Antes e depois, foi comparado um digest das linhas de `public.products`, `product_variants`, `product_images`, `promotions`, `promotion_products`, `cart_items`, `checkout_orders` e `checkout_order_items`. Resultado: `PRIMARY_COMMERCIAL_STATE_UNCHANGED`.
- A remoção foi confirmada: `ISOLATED_SCHEMA_REMOVED`; consulta final: `BROWSER_AUDIT_SCHEMAS 0`.
- Na auditoria inicial, o banco permaneceu em `PRINCIPAL_MIGRATION 49 DIRTY false`, sem migrations novas. Posteriormente, o CRUD exigiu a migration 50, aplicada após autorização explícita e backup, conforme seção de ativação ao final. Nenhuma migration histórica foi editada.
- A navegação do catálogo principal foi anônima e bloqueou métodos de escrita à API; apenas GET, HEAD e OPTIONS eram permitidos.
- A recuperação de senha usou o mecanismo real de OTP e redefinição, com entrega substituída somente no harness por um coletor local. O envio SMTP padrão da aplicação foi preservado. Não foram disparados e-mails reais nem cobranças.

## Fluxos funcionais executados

Os casos abaixo foram executados no Chromium contra a API e o PostgreSQL isolados. As validações por API explicitamente incorporadas aos casos complementam, e não substituem, os passos de interface.

| Cenário | Resultado |
| --- | --- |
| Login administrativo real | Aprovado |
| Sidebar direta e pesquisa por SKU | Aprovado |
| Cadastro de produto simples com SKU automÃ¡tico | Aprovado |
| Upload real e conclusÃ£o da galeria | Aprovado |
| CriaÃ§Ã£o de produto com variantes e resumo automÃ¡tico | Aprovado |
| EdiÃ§Ã£o de variante preserva SKU e atualiza preÃ§o e estoque | Aprovado |
| CRUD real de categoria | Aprovado |
| CRUD real de marca | Aprovado |
| Faixa de CEP cadastrada pela interface e cotaÃ§Ã£o real | Aprovado |
| Campanha com produtos, imagem, desconto e publicaÃ§Ã£o na Home | Aprovado |
| EdiÃ§Ã£o real da campanha e prÃ©via persistida | Aprovado |
| Login de cliente e bloqueio da Ã¡rea administrativa | Aprovado |
| Variantes pÃºblicas, preÃ§o, favorito e carrinho | Aprovado |
| RemoÃ§Ã£o de item do carrinho e inclusÃ£o de produto simples | Aprovado |
| Checkout real: entrega, Pix, revisÃ£o e pedido | Aprovado |
| Cadastro pÃºblico real de nova conta | Aprovado |
| RecuperaÃ§Ã£o real por OTP e login com nova senha sem SMTP externo | Aprovado |
| Envio de avaliaÃ§Ã£o e moderaÃ§Ã£o administrativa real | Aprovado |
| Cancelamento real e reposiÃ§Ã£o de estoque | Aprovado |
| Estoque indisponÃ­vel e limite do backend | Aprovado |
| Galeria real: miniaturas, zoom e Escape | Aprovado |
| CatÃ¡logo: ordenaÃ§Ãµes reais e URL apÃ³s atualizaÃ§Ã£o | Aprovado |
| Estado vazio real do catÃ¡logo e limpeza dos filtros | Aprovado |
| Falha HTTP administrativa e recarregamento pela interface | Aprovado |

A suíte PostgreSQL também exercitou concorrência de SKUs, compra concorrente da última unidade, variantes, limites de estoque, cancelamento/reposição, idempotência, preços promocionais, autorização e ciclos de migrations cobertos pelos testes existentes. Não foi executado rollback sobre o schema principal.

As páginas de conta e pedidos foram inspecionadas visualmente; alterações de conta/endereço também têm cobertura de integração Go existente. Não se atribui cobertura E2E de edição de perfil a uma simples captura da página.

## Bugs encontrados e correções

1. **Edição de campanhas retornava HTTP 400.** O formulário espalhava o registro lido no request e enviava `created_at`/`updated_at`, rejeitados pelo decoder estrito Go. O request passou a declarar apenas nome, status, descrição, imagem, publicação na Home, participantes e datas de vigência. Os timestamps permanecem no contrato de leitura e no resumo. Os testes de criação e edição verificam que não são reenviados; a criação, edição e persistência foram repetidas pela interface.
2. **Concorrência nas avaliações.** Leituras anteriores podiam permanecer ativas e sobrescrever o estado atual. As consultas de avaliação do pedido e moderação cancelam a leitura anterior e são vinculadas à destruição do componente. O formulário é reiniciado quando muda o pedido, preservado em retry do mesmo pedido e bloqueado durante carregamento/envio. Foram adicionadas verificações de cancelamento e destruição.
3. **Upload de produto retornava caminho físico.** Com diretório absoluto, o vínculo gravado/retornado podia conter o caminho do filesystem e a imagem não carregava. Agora é persistida e retornada a referência pública `uploads/<arquivo>`, mantendo o caminho físico apenas para armazenamento/limpeza. O teste HTTP rejeita caminho Windows no retorno; o E2E confirmou imagem decodificada e conclusão da galeria.
4. **Teste de campanhas não aplicava a migration 49.** O setup PostgreSQL de Home consultava timestamps sem criar as colunas. O setup foi atualizado; migrations comerciais e banco principal não foram alterados.
5. **Teste de foco esperava outline duplicado.** A expectativa do wrapper foi corrigida para preservar ausência do contorno extra e a indicação acessível do controle Material. A navegação real por Tab também foi conferida nas quatro larguras.
6. **Metadados de estilos após a extração.** O build detectou `styleUrl` e `styleUrls` simultâneos no editor de variantes. As duas folhas foram consolidadas no mesmo `styleUrls`, preservando o CSS compartilhado e o SCSS extraído. Build e testes foram repetidos após a correção.
7. **Limpeza pequena de código.** Removidos import Angular não utilizado no dashboard e optional chaining redundante em `measurements`, sem modificar o comportamento comercial.

Foram conferidos os payloads de produtos, variantes, categorias, marcas, faixas de CEP e moderação. Produtos/variantes, gravação de CEP, cadastros auxiliares e moderação já montam seus campos de gravação; não foi encontrado o mesmo vazamento de timestamps nesses contratos atuais. A alternância de CEP usa o registro sem ID, cujo contrato atual não contém os timestamps da campanha.

## Falhas da automação diferenciadas de bugs

- Navegar com `page.goto` antes de concluir o POST do carrinho podia abortar a requisição (`context canceled`). Foram adicionadas esperas pela resposta real, sem alterar o carrinho para acomodar o teste.
- O switch da Home usa input nativo oculto com label interativo; a automação passou a acionar o controle visível.
- Filtros de mobile precisam ser abertos antes de preencher o campo; títulos ocultos da sidebar não podem servir como espera de página pronta.
- O botão de edição é “Salvar alterações”, e a confirmação final de checkout também pode ser “Seu pedido foi realizado!”. Os seletores foram corrigidos para esses estados.
- Uma fixture repetia o mesmo caminho duas vezes, corretamente deduplicado pela galeria. Foram usados dois arquivos distintos no teste; não se alterou a deduplicação da aplicação.
- Foi respeitado o fechamento do diálogo antes de abrir outra confirmação, evitando selecionar dois botões durante a transição.
- As capturas finais do catálogo real percorrem a página para carregar imagens lazy antes da captura completa. Não se classificaram imagens ainda não carregadas fora da viewport como arquivos quebrados.

## Refatoração de componentes inline

Foram separados os templates de 11 componentes de produção. Estilos inline foram movidos para SCSS; CSS externos existentes foram preservados. Bindings, Signals, eventos e estilos aprovados não foram redesenhados. A busca final não encontrou metadados `template:`/`styles:` de componentes de produção; o único match textual remanescente é o parâmetro `template: TemplateRef` de um método. Fixtures inline dos testes foram mantidas.

| Componente | Arquivos da extração |
| --- | --- |
| [catalog-registration.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\catalog-registration.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\catalog-registration.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\catalog-registration.component.html) |
| [experience-reviews.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\experience-reviews.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\experience-reviews.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\experience-reviews.component.html), [.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\experience-reviews.component.scss) |
| [catalog-toolbar.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\components\catalog-toolbar\catalog-toolbar.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\components\catalog-toolbar\catalog-toolbar.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\components\catalog-toolbar\catalog-toolbar.component.html), [.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\components\catalog-toolbar\catalog-toolbar.component.scss) |
| [shipping-quote.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\pages\product-detail\shipping-quote.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\pages\product-detail\shipping-quote.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\pages\product-detail\shipping-quote.component.html), [.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\pages\product-detail\shipping-quote.component.scss) |
| [product-variants-page.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\product-variants-page.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\product-variants-page.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\product-variants-page.component.html), [.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\product-variants-page.component.scss) |
| [purchase-review.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\purchase-review\purchase-review.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\purchase-review\purchase-review.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\purchase-review\purchase-review.component.html), [.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\purchase-review\purchase-review.component.scss) |
| [admin-page-header.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\admin-page-header\admin-page-header.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\admin-page-header\admin-page-header.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\admin-page-header\admin-page-header.component.html) |
| [admin-state.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\admin-state\admin-state.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\admin-state\admin-state.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\admin-state\admin-state.component.html) |
| [pagination.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\pagination\pagination.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\pagination\pagination.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\pagination\pagination.component.html), [.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\pagination\pagination.component.scss) |
| [product-commerce-summary.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-commerce-summary\product-commerce-summary.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-commerce-summary\product-commerce-summary.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-commerce-summary\product-commerce-summary.component.html), [.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-commerce-summary\product-commerce-summary.component.scss) |
| [product-sku.component](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-sku\product-sku.component.ts) | [.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-sku\product-sku.component.ts), [.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-sku\product-sku.component.html) |

## Demais arquivos alterados ou adicionados

- [frontend/src/app/features/create-promotion/create-promotion.component.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\create-promotion\create-promotion.component.ts)
- [frontend/src/app/features/create-promotion/create-promotion.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\create-promotion\create-promotion.component.spec.ts)
- [frontend/src/app/features/catalog/pages/product-detail/product-detail.component.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\pages\product-detail\product-detail.component.html)
- [frontend/src/app/components/admin/dashboard/dashboard.component.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\dashboard\dashboard.component.ts)
- [frontend/src/app/shared/accessibility/focus-styles.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\accessibility\focus-styles.spec.ts)
- [frontend/src/app/features/purchase-review/purchase-review.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\purchase-review\purchase-review.component.spec.ts)
- [frontend/src/app/components/admin/experience-reviews.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\experience-reviews.component.spec.ts)
- [frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\catalog\pages\product-detail\shipping-quote.component.spec.ts)
- [frontend/src/app/shared/components/product-commerce-summary/product-commerce-summary.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\components\product-commerce-summary\product-commerce-summary.component.spec.ts)
- [backend/src/services/auth_service.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\services\auth_service.go)
- [backend/src/services/product_image_service.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\services\product_image_service.go)
- [backend/src/routes/home_test.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\routes\home_test.go)
- [backend/src/routes/product_create_test.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\routes\product_create_test.go)
- [backend/src/routes/audit_browser_test.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\routes\audit_browser_test.go)
- [frontend/e2e/audit.cjs](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\e2e\audit.cjs)
- [frontend/e2e/public-readonly.cjs](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\e2e\public-readonly.cjs)
- [frontend/e2e/serve.cjs](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\e2e\serve.cjs)

O campo opcional de entrega no `AuthService` permite usar o coletor de OTP somente no harness; o caminho padrão continua chamando o serviço SMTP existente. Os scripts E2E foram preservados para reprodução, sem adicionar dependências ao package.json ou lockfile da aplicação.

## Validação visual e acessibilidade

Foram registradas 90 capturas reais, com largura de viewport 1440, 1024, 768 e 390 px. O conjunto isolado cobre Home, catálogo, produto, cadastro, dashboard, categorias, marcas, CEP, conta, pedidos, campanhas, avaliações, dropdown e modal de descarte. Foram capturados também erro/retry e estado vazio. Os screenshots isolados usam fixtures de imagem deliberadamente neutras; a qualidade das fotografias reais foi conferida separadamente nas seis categorias e na galeria do produto #1, sem escrita no catálogo.

Não houve overflow horizontal do documento nas verificações. Tabelas administrativas podem manter rolagem horizontal interna para preservar colunas no mobile. Foram revisadas capturas reais de desktop, tablet e mobile, incluindo produto, categorias, formulário, campanhas, avaliação, dropdown, modal e foco. Nomes, CTAs, campos e controles não apresentaram sobreposição nos exemplos inspecionados.

Os testes reais verificaram Tab com `:focus-visible`, elemento dentro da viewport e indicação visual presente, além de Escape no zoom e preservação/descarto do formulário. Os testes Angular complementaram foco, guards e diálogos. Isso não é uma certificação integral WCAG nem substitui teste com leitor de tela.

As matrizes completas foram executadas nas quatro larguras. Após a limpeza, as capturas representativas estão no [índice de evidências](docs/validacao-visual/README.md).

As demais capturas estão em [pasta de evidências](C:\Users\vitor\Documents\Box-Enxovais-tcc\docs\validacao-visual\auditoria-2026-11-20). Não foram geradas ou substituídas fotografias comerciais nesta auditoria.

## Limpeza e preservação

Foram removidos, após conferência de referências e ausência de uso no grafo da aplicação, testes e documentação:

- `frontend/src/app/shared/ui/tooltip/tooltip.component.ts`
- `frontend/src/app/shared/ui/tooltip/tooltip.component.html`
- `frontend/src/app/shared/ui/tooltip/tooltip.component.css`

Foram preservados componentes com referências acadêmicas, fixtures e testes válidos, documentação oficial, migrations históricas, assets de produtos, banners, galerias, backups de origem não comprovadamente descartável e evidências anteriores do TCC. Um arquivo fora do bundle não foi tratado automaticamente como descartável.

Os logs transitórios desta execução, fixture de upload, arquivo local de OTP, marcador de parada, verificador temporário e instalação temporária do Playwright em `tmp/audit-tools` foram removidos após consolidar os resultados neste arquivo. Os scripts E2E e as 90 evidências finais foram preservados. Nenhum arquivo em diretórios externos, inclusive `.codex/visualizations` e o cache externo do Chromium, foi excluído. Dependências e caches preexistentes da aplicação não foram apagados indiscriminadamente.

## Pendências e limites identificados

1. **Módulos administrativos ainda ausentes:** Relatórios contém apenas `report works!`; Dashboard e Métricas foram completados posteriormente, conforme a seção específica ao final deste relatório. Clientes foi implementado posteriormente, conforme a seção específica ao final deste relatório. Pedidos administrativos foi implementado posteriormente, conforme a seção específica ao final deste relatório. Não foram apresentados como módulos funcionais aprovados nem implementados silenciosamente como parte da auditoria.
2. **CRUD geral de produtos:** implementado, validado no ambiente isolado e ativado no backend principal após backup e aplicação autorizada da migration 50. Ver os complementos de CRUD e ativação ao final.
3. **Integrações externas:** não houve envio real pelo Gmail, inscrição real de newsletter ou cobrança em gateway. OTP/redefinição e checkout do fluxo demonstrativo foram executados; testes Go de e-mail verificaram o conteúdo/MIME sem envio externo.
4. **Avisos do build:** bundle inicial 960,37 kB acima do aviso de 500 kB; CSS de Promoções 15,75 kB e cadastro/login 15,94 kB acima do aviso de 14 kB; dependência CommonJS SweetAlert2; quatro seletores Bootstrap ignorados pelo otimizador. Não houve erro de orçamento, e limites não foram aumentados para mascarar avisos. Otimização adicional deve preservar o design aprovado.
5. **Lint:** não há tarefa/configuração de lint disponível no projeto. Foram executados TypeScript, compilador Angular e go vet, sem instalar um linter ou alterar dependências.
6. **Diff Git:** o comando de status/diff retornou “this operation must be run in a work tree” neste ambiente, mesmo com indicação explícita do diretório. A configuração Git não foi modificada. A relação acima discrimina os arquivos manipulados nesta auditoria, sem atribuir alterações anteriores do usuário ao trabalho atual.
7. **Processo principal:** preservado durante a auditoria inicial e reiniciado posteriormente, com autorização explícita, para ativar o CRUD na porta 8080. Os processos do frontend foram preservados; detalhes e verificações constam na seção final de ativação.

Assim, os testes executáveis descritos estão aprovados e possuem evidências reais; a aplicação inteira não é declarada sem pendências ou com funcionalidades ausentes magicamente concluídas.

## Reprodução dos testes

Angular: `npx ng test --watch=false --browsers=ChromeHeadless`; tipos: `npx tsc --noEmit -p tsconfig.app.json`; produção: `npm run build -- --configuration production`, dentro de `frontend`.

Go/PostgreSQL: definir `CART_TEST_LOCAL=1`, executar `go test ./... -count=1` e `go vet ./...`, dentro de `backend`.

Para E2E, disponibilizar Playwright sem alterar os manifests da aplicação, conforme o roteiro atualizado em `docs/validacao-visual/README.md`. Dependências temporárias devem ficar em uma pasta própria sob `.artifacts/`, com NODE_PATH adequado e remoção ao finalizar. Instale o Chromium pelo CLI correspondente quando ele não estiver disponível. Iniciar o harness com `CART_TEST_LOCAL=1`, `AUDIT_BROWSER=1` e `go test ./src/routes -run ^TestBrowserAuditServer$ -count=1 -v -timeout=40m`. Servir o build com `node frontend/e2e/serve.cjs`, definir `AUDIT_FRONTEND_URL=http://127.0.0.1:4206` e executar `node frontend/e2e/audit.cjs`. Ao terminar, criar `backend/audit-browser.stop` para encerrar o harness e conferir `ISOLATED_SCHEMA_REMOVED`/`PRIMARY_COMMERCIAL_STATE_UNCHANGED`.

O script `frontend/e2e/public-readonly.cjs` utiliza o localhost principal em contexto anônimo com métodos de escrita bloqueados; ele não deve receber credenciais ou ser convertido em teste mutável contra o banco principal.

## Complemento — CRUD administrativo de produtos (20/11/2026)

Implementação concluída, validada no ambiente isolado e posteriormente ativada no backend principal. O bloqueio anterior da migration foi resolvido pela autorização explícita do usuário, condicionada a backup, revisão, aplicação somente da versão 50 e validação sem mutações comerciais. Essas condições foram cumpridas, conforme seção de ativação ao final.

### Comportamento implementado

- Listagem preservada em `/admin/products`, com ações Editar, Imagens, Variações, Excluir e acesso à loja para itens publicados. Busca por nome/SKU, filtros, paginação e estrutura visual existentes foram mantidos.
- Edição em `/admin/products/:id/edit`, reutilizando o formulário de criação: nome, descrição, categoria, marca, status, características, material, cor, cuidados, preço/estoque simples e variantes. Títulos, botões, carregamento, mensagens e confirmação de descarte distinguem o modo de edição. A foto existente é carregada na prévia.
- SKU somente leitura, com cópia; não integra o DTO de edição e não é alterado pela atualização SQL. Campos desconhecidos, inclusive tentativa de enviar SKU manualmente na edição, são rejeitados.
- Dados e variantes são gravados na mesma transação, reutilizando o editor e o helper de variantes existente. Verificações de timestamp e valores esperados evitam sobrescrever edição ou estoque concorrente. Características históricas longas e metadados de coordenação são preservados.
- Galeria em `/admin/products/:id/images`, reutilizando o upload existente e adicionando remoção, reordenação, escolha de principal e seleção entre imagens gerais e imagens de uma variante. IDs e pertencimento ao produto/variante são conferidos no backend.

### Endpoints

| Situação | Endpoint |
| --- | --- |
| Novo, protegido por autenticação administrativa | `GET /admin/products/{id}` |
| Novo, protegido; DTO de campos editáveis | `PATCH /admin/products/{id}` |
| Novo, exclusão ou arquivamento transacional | `DELETE /admin/products/{id}` |
| Novo, consulta da galeria com IDs e vínculo de variante | `GET /admin/products/{id}/images` |
| Novo, ordenação e principal com conferência da ordem esperada | `PUT /admin/products/{id}/images` |
| Novo, remoção do vínculo e promoção de outra principal | `DELETE /admin/products/{id}/images/{imageId}` |
| Reutilizado | `POST /products` |
| Reutilizado, agora aceita `variantId` opcional | `POST /upload-image` |
| Reutilizado | `PUT /admin/products/{id}/variants` |

### Exclusão e integridade

A confirmação compartilhada informa nome e consequências antes de executar. O backend bloqueia a linha do produto e consulta pedidos, inclusive os históricos cujo `product_id` não tem FK. Também verifica as referências declaradas ao produto e às variantes no PostgreSQL, abrangendo carrinhos, favoritos, promoções, tabelas de histórico das migrations e outras FKs. Com referência, muda somente o status para `archived`, preservando IDs, SKU, estoque, variantes, imagens e históricos. Sem referência, remove apenas os registros próprios de imagens/variantes e o produto, dentro da transação. Não executa cascatas para apagar históricos comerciais.

Os arquivos físicos de imagem são mantidos: a remoção na galeria exclui o vínculo no PostgreSQL, sem apagar um arquivo potencialmente compartilhado. Erros de integridade ou concorrência retornam mensagens HTTP tratadas pela interface, sem apagar campos digitados ou fechar a confirmação prematuramente.

### Migration

A migration `000050_product_image_order` adiciona apenas `product_images.sort_order` com valor padrão zero e validação não negativa. Empates preservam a ordenação anterior por ID e a imagem principal existente. O rollback remove somente essa coluna. `up/down/up` foi executado em schema isolado e a comparação confirmou que não alterou os registros comerciais. Aplicada também no banco principal após autorização explícita e backup verificado: versão 50, `dirty=false`, sem alteração dos dados comerciais e sequências.

### Testes e capturas

- Angular direcionado aos componentes afetados: **37/37 aprovados**.
- Go/PostgreSQL completo: **156 resultados de testes/subtestes aprovados**, zero falhas; um skip intencional do harness opt-in, executado separadamente com sucesso.
- `go vet ./...`: concluído sem apontamentos.
- Playwright com Chromium local e sandbox ativo: **34/34 verificações aprovadas**. Incluiu criação simples/com três variantes, edição completa, preço/estoque, editor independente de variantes, upload/ordem/capa/remoção, galeria da variante, cancelamento, retry após HTTP 409, exclusão física, arquivamento por pedido, catálogo sem arquivado, preservação do pedido e respostas 401/403/400.
- Resoluções **1440, 1024, 768 e 390 px**, com **20 capturas finais** de listagem, edição, variantes, galeria e confirmação. Não houve overflow horizontal do documento; a tabela conserva sua rolagem interna em telas menores.
- O teste de foco passou depois de aguardar o autofocus ao fim da abertura do diálogo. A falha inicial era a automação pressionando Tab durante a animação; o componente compartilhado não foi alterado para ocultar o problema.
- Build de produção aprovado com a configuração existente. Houve uma falha transitória de download da fonte Google (`ECONNRESET`), seguida de build aprovado sem alterar otimização, segurança ou budgets. Permanecem os avisos de otimização já registrados na auditoria anterior.
- Todos os dados mutáveis dos testes ficaram em schemas isolados e arquivos temporários; o digest de produtos, variantes, imagens, campanhas, carrinhos e pedidos principais permaneceu igual. O schema E2E foi removido e o servidor temporário encerrado.

As matrizes completas foram executadas nas quatro larguras. Após a limpeza, as capturas representativas estão no [índice de evidências](docs/validacao-visual/README.md).

### Arquivos criados

- [backend/migrations/000050_product_image_order.up.sql](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\migrations\000050_product_image_order.up.sql)
- [backend/migrations/000050_product_image_order.down.sql](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\migrations\000050_product_image_order.down.sql)
- [backend/src/models/product_admin.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\models\product_admin.go)
- [backend/src/repositories/product_admin.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\repositories\product_admin.go)
- [backend/src/repositories/product_images_admin.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\repositories\product_images_admin.go)
- [backend/src/services/product_admin.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\services\product_admin.go)
- [backend/src/handlers/product_admin.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\handlers\product_admin.go)
- [backend/src/handlers/product_images_admin.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\handlers\product_images_admin.go)
- [backend/src/routes/product_admin_crud_test.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\routes\product_admin_crud_test.go)
- [frontend/e2e/product-crud.cjs](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\e2e\product-crud.cjs)

### Arquivos alterados

- [backend/src/repositories/product_variants.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\repositories\product_variants.go)
- [backend/src/repositories/product_image_repository.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\repositories\product_image_repository.go)
- [backend/src/repositories/product_repository.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\repositories\product_repository.go)
- [backend/src/services/product_image_service.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\services\product_image_service.go)
- [backend/src/handlers/uploadPic.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\handlers\uploadPic.go)
- [backend/src/routes/products.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\routes\products.go)
- [backend/src/routes/audit_browser_test.go](C:\Users\vitor\Documents\Box-Enxovais-tcc\backend\src\routes\audit_browser_test.go)
- [frontend/src/app/core/services/product.service.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\core\services\product.service.ts)
- [frontend/src/app/shared/models.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\shared\models.ts)
- [frontend/src/app/components/admin/admin-routing.module.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\admin-routing.module.ts)
- [frontend/src/app/components/admin/admin/admin.component.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\admin\admin.component.ts)
- [frontend/src/app/features/product-manage/product-manage.component.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\product-manage.component.ts)
- [frontend/src/app/features/product-manage/product-manage.component.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\product-manage.component.html)
- [frontend/src/app/features/product-manage/register/product-create/product-create.component.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\register\product-create\product-create.component.ts)
- [frontend/src/app/features/product-manage/register/product-create/product-create.component.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\register\product-create\product-create.component.html)
- [frontend/src/app/features/product-manage/register/product-create/product-create.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\register\product-create\product-create.component.spec.ts)
- [frontend/src/app/components/admin/product/product.component.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\product\product.component.ts)
- [frontend/src/app/components/admin/product/product.component.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\product\product.component.html)
- [frontend/src/app/components/admin/product/product.component.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\product\product.component.css)
- [frontend/src/app/components/admin/product/product.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\components\admin\product\product.component.spec.ts)
- [frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\images\product-image-upload\product-image-upload.component.ts)
- [frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.html](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\images\product-image-upload\product-image-upload.component.html)
- [frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.scss](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\images\product-image-upload\product-image-upload.component.css)
- [frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.spec.ts](C:\Users\vitor\Documents\Box-Enxovais-tcc\frontend\src\app\features\product-manage\images\product-image-upload\product-image-upload.component.spec.ts)
- Este `AUDITORIA_FINAL.md`, com o complemento e a atualização da pendência anterior.

As dependências temporárias do Playwright, fixtures locais, logs e verificadores auxiliares desta implementação foram removidos depois da consolidação. Scripts de teste, migrations e evidências finais foram preservados. Nenhum arquivo externo ao repositório foi excluído.

## Ativação autorizada — migration 000050 (21/11/2026)

Operação autorizada explicitamente pelo usuário: backup do `bd_box`, revisão, aplicação somente da migration 50, reinício apenas do backend 8080 e validação sem exclusões nem alterações comerciais reais. Todas as etapas foram concluídas. Não houve recriação, limpeza, restauração sobre o banco principal, `force`, rollback ou aplicação de outras migrations.

### Backup confirmado antes da aplicação

- Arquivo: [bd_box.dump](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/backups/bd_box_pre_000050_20261120_235452_4212330887/bd_box.dump).
- Formato PostgreSQL custom (`pg_dump`), tamanho **177.957 bytes**.
- SHA-256: `d4de4308e5e82950e983cc3b17130a388ecc4d84e3c4d156a1824b176b99ad76`.
- O catálogo foi validado com `pg_restore --list`; a leitura integral do arquivo foi validada com `pg_restore --file NUL`, sem restaurar nem escrever no PostgreSQL.
- Verificação inicial: versão **49**, `dirty=false`, coluna `sort_order` ainda inexistente; arquivo da migration revisado e seu hash conferido antes da aplicação.
- Backup e comprovantes estão em `db/backups`, coberto pelo `/db/` já existente no `.gitignore` e fora da pasta pública de uploads. Arquivo, manifesto e logs foram preservados.

### Migration e integridade

A única DDL aplicada foi:

```sql
ALTER TABLE product_images ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0);
```

O CLI executou `up 1` a partir da versão 49. Resultado: **migration 50, `dirty=false`**. A coluna foi conferida como integer, NOT NULL, default 0, e todas as linhas existentes receberam somente o valor padrão de ordenação. Caminhos de imagens, principal, produtos, variantes, SKUs, preços, estoques, pedidos, promoções e vínculos permaneceram iguais.

Foram comparados os hashes e contagens de **todas as 62 tabelas de dados públicas** e os valores de **18 sequências**, antes do backup, antes/depois da migration e após a validação HTTP. A comparação excluiu somente `schema_migrations` e o novo campo `product_images.sort_order`, cujas alterações eram esperadas e foram verificadas separadamente. Resultado: **dados e sequências inalterados**. Não foi encontrada divergência inesperada.

### Reinício e preservação do frontend

- O novo backend foi compilado antes de interromper o anterior.
- Apenas o processo Go da porta 8080 foi encerrado: PID **34368**; novo PID **40944**.
- Backend iniciado em segundo plano, com diretório de trabalho `backend`, na porta 8080. Log de inicialização sem erros: `Servidor HTTP iniciando em :8080`.
- Frontend preservado: PIDs **16468, 34132**, mesmos endereços/processos antes e depois; resposta HTTP 200 na porta 4200.
- Acesso frontend → API conferido: HTTP 200 e `Access-Control-Allow-Origin: http://localhost:4200`.
- Binário e logs ativos mantidos em [db/runtime](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/runtime/000050_7b61d709c5334816aa9d94fc8b6f4329); [log do backend](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/runtime/000050_7b61d709c5334816aa9d94fc8b6f4329/backend.stderr.log).

### Validação no banco principal, sem mutações comerciais

Foram aprovadas **16 verificações HTTP**. A listagem administrativa carregou **97 produtos existentes**, comparados com os registros e valores atuais do PostgreSQL; a listagem pública retornou **96 publicados**. O detalhe público, o administrativo, a galeria e uma imagem existente também carregaram corretamente.

Os GETs administrativos utilizaram um token de validação de três minutos, assinado localmente para um administrador já existente, apenas em memória. O token não foi persistido, registrado em logs nem usado para uma mutação. As rotas de gravação foram sondadas somente sem autenticação, sem corpo de gravação e, quando aplicável, com ID textual inválido; retornaram 401 antes de executar o handler comercial. **Nenhum POST/PATCH/PUT/DELETE autenticado foi enviado, nenhum registro de teste foi criado e nenhum produto foi excluído ou editado no principal.** A execução funcional de gravações continua documentada nos testes isolados anteriores.

| Requisição | HTTP |
| --- | --- |
| `DELETE /admin/products/activation-invalid-id` | 401 |
| `DELETE /admin/products/activation-invalid-id/images/activation-invalid-id` | 401 |
| `GET /admin/products` | 401 |
| `GET /admin/products/1` | 200 |
| `GET /admin/products/1/images` | 200 |
| `GET /admin/products/activation-invalid-id` | 401 |
| `GET /admin/products/activation-invalid-id/images` | 401 |
| `GET /admin/products?limit=100` | 200 |
| `GET /products/1` | 200 |
| `GET /products?limit=100` | 200 |
| `GET /uploads/jogo-cama-oliva-completo-01-capa.png` | 200 |
| `PATCH /admin/products/activation-invalid-id` | 401 |
| `POST /products` | 401 |
| `POST /upload-image` | 401 |
| `PUT /admin/products/activation-invalid-id/images` | 401 |
| `PUT /admin/products/activation-invalid-id/variants` | 401 |

Comprovantes: [manifesto do backup e validação](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/backups/bd_box_pre_000050_20261120_235452_4212330887/manifest.json), [processos antes/depois](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/backups/bd_box_pre_000050_20261120_235452_4212330887/backend-runtime.json), [backup](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/backups/bd_box_pre_000050_20261120_235452_4212330887/backup-verification.log), [migration](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/backups/bd_box_pre_000050_20261120_235452_4212330887/migration-application.log) e [endpoints](C:/Users/vitor/Documents/Box-Enxovais-tcc/db/backups/bd_box_pre_000050_20261120_235452_4212330887/endpoint-verification.log).

O helper e os logs temporários da raiz do backend foram removidos após esta consolidação; cópias dos logs foram preservadas junto ao backup. O backup, os comprovantes e os arquivos necessários ao processo do backend em execução foram preservados. Nenhum código de negócio, configuração do frontend, `.env`, credencial ou dependência foi alterado nesta ativação. Não há pendência de aplicação da migration 50 ou reinício do backend.


## Gerenciamento administrativo de pedidos — 21/11/2026

Implementado e ativado em `/admin/orders`, com detalhamento em `/admin/orders/:id`. O backend existente usa Go/net/http; essa arquitetura foi preservada. Nenhuma migration ou dependência permanente foi criada. Banco principal: **50, dirty=false**.

### Funcionalidades e contratos

- Entrada direta Pedidos na sidebar, sem alterar os demais menus. Cabeçalho compartilhado único com o título e a descrição solicitados.
- Paginação de dez pedidos no servidor, ordenação por data/ID decrescente, busca por número/cliente, status e período. Filtros/página persistidos na URL; mudança de filtros retorna à primeira página. Consultas anteriores são canceladas para impedir respostas atrasadas.
- Indicadores adaptados aos estados realmente existentes: total, aprovados (`simulated_approved`) e cancelados (`cancelled`). São calculados sobre os resultados filtrados. Não foram inventados processamento, envio ou entrega.
- Detalhe com cliente, pagamento, endereço registrado, itens, nome e preço históricos, subtotal e total persistido, SKU quando disponível, referência de variante, galeria com preferência por imagem específica da variante e fallback geral.
- O nome histórico do item já inclui o tamanho selecionado. Ele não é substituído pelo nome/tamanho atual do catálogo. SKU e imagem são referências atuais do cadastro, não novos snapshots históricos.
- Histórico limitado à criação e ao cancelamento efetivamente registrado. Informações pessoais além das necessárias para identificar cliente/entrega não foram adicionadas à resposta.
- O Dashboard foi inspecionado e preservado: contabiliza pedidos reais e exclui cancelados da receita. A coerência foi conferida contra a mesma base isolada.

| Endpoint novo | Uso | Segurança |
| --- | --- | --- |
| `GET /admin/orders` | Lista, contagem e indicadores; `page`, `search`, `status`, `dateFrom`, `dateTo` | AuthMiddleware + AdminMiddleware |
| `GET /admin/orders/{id}` | Detalhe histórico em transação de leitura consistente | AuthMiddleware + AdminMiddleware |
| `POST /admin/orders/{id}/cancel` | Cancelamento administrativo com contrato de motivo já existente | AuthMiddleware + AdminMiddleware |

Os endpoints do cliente `/orders` foram preservados com escopo de proprietário. O cancelamento administrativo reutiliza o handler de validação de motivos e a mesma transação de reposição: lock do pedido, registro do ator administrador, reposição de produto simples/variante e atualização de status. Erros desfazem todas as etapas. Duplicações e solicitações simultâneas não repõem novamente. A notificação usa o proprietário do pedido, não o administrador.

A interface utiliza AdminPageHeaderComponent, AdminStateComponent, PaginationComponent, CustomAlertService e ConfirmDialogService. A ação crítica usa `variant: danger`, `disableClose: true` e `execute`; erros permanecem no modal, e a desistência não envia cancelamento.

### Limitações reais dos dados existentes

Os pedidos atuais não persistem frete/modalidade/prazo nem detalhamento separado de descontos. Essas informações aparecem explicitamente como não registradas; não foram reconstruídas com preços ou cotações atuais. O preço unitário histórico efetivamente cobrado permanece preservado. Acompanhamento de envio/entrega continua explicitamente indisponível, pois não existe essa transição no sistema.

### Validação executada

- **Angular: 19/19 testes aprovados**, incluindo os novos serviços/páginas e o componente administrativo compartilhado. Cobertura de URL, paginação, cancelamento de consultas obsoletas, estados vazios/erro, valores históricos, confirmação, desistência, sucesso e transição não permitida.
- **Go:** `CART_TEST_LOCAL=1 go test ./... -count=1` aprovado em todos os pacotes com testes. Incluiu os testes PostgreSQL isolados já existentes e **10 novos cenários de integração** em TestAdminOrdersPostgres: autorização, propriedade, busca/período/status, paginação/ordem, valores históricos/variante/endereço, IDs e filtros inválidos, transição negada, concorrência/idempotência, reposição simples e por variante, notificação ao proprietário, rollback em falha de reposição e indisponibilidade do banco.
- **Playwright/Chromium com sandbox ativo: 37/37 verificações aprovadas** (28 funcionais/responsivas e nove adicionais de estados). Navegação e login reais, API real em 8086 e PostgreSQL em schema exclusivo. Foram realizadas compras históricas de fixture, leitura, filtragem e cancelamentos apenas nessa base isolada.
- **26 capturas** em 1440, 1024, 768 e 390 px: lista, detalhe, confirmação, vazio, carregamento, falha de comunicação e erro de ação. Conferência visual das capturas, sem rolagem horizontal, com tabela no desktop e cards no mobile, foco no modal e navegação por Tab. As imagens de produto são fixtures neutras de teste, não alterações no catálogo.
- Os HTTP 503/409 dos testes adicionais de recuperação foram **injetados no navegador** e estão identificados no arquivo de resultados. O carregamento, o retry, os filtros e os cancelamentos aprovados usam respostas reais. Negativa de cancelamento/rollback foi testada também com PostgreSQL real. Não se apresenta erro injetado como falha real da API.
- Na primeira rodada, a automação usou um nome acessível incorreto para o select e verificou o foco antes do fim da animação. O filtro recebeu nome acessível explícito e a espera foi corrigida. Outra tentativa adicional expirou aguardando URL; a repetição com URL completa passou. Não foi confirmado defeito de negócio nesses casos. A conferência visual identificou a formatação monetária americana e ela foi corrigida localmente para pt-BR.
- **Build de produção aprovado** após os ajustes finais. Permanecem os avisos de orçamento do bundle inicial, CSS de promoções/cadastro e CommonJS do SweetAlert2; não houve aumento de orçamento nem mudança de dependências para encobri-los.

Evidências: [diretório das capturas e logs](docs/validacao-visual/pedidos-admin-2026-11-21), [resultados funcionais](docs/validacao-visual/pedidos-admin-2026-11-21/resultados.json), [estados](docs/validacao-visual/pedidos-admin-2026-11-21/estados-resultados.json), Go (resultado consolidado neste relatório; arquivo intermediário removido), Angular (resultado consolidado neste relatório; arquivo intermediário removido), build (resultado consolidado neste relatório; arquivo intermediário removido), isolamento (resultado consolidado neste relatório; arquivo intermediário removido).

### Ativação e integridade do principal

Backend compilado antes do reinício. Apenas o processo da porta 8080 foi substituído: **40944 → 28068**; frontend preservado nos PIDs **34132 e 16468**. Inicialização sem erros em `db/runtime/admin_orders_20261121_011246/backend.stderr.log`.

Validação autenticada no principal utilizou exclusivamente GET, com token de dois minutos apenas em memória: listagem administrativa HTTP 200, total **zero pedidos**, coerente com o PostgreSQL; requisições anônimas HTTP 401. Não havia pedido no principal para validar detalhe real e nenhum foi criado para isso; os detalhes foram validados integralmente no ambiente isolado. Comprovantes em endpoints (resultado consolidado neste relatório; arquivo intermediário removido) e processos (resultado consolidado neste relatório; arquivo intermediário removido).

O schema isolado foi removido ao terminar. A comparação de hashes antes/depois, incluindo produtos, variantes, imagens, promoções, participantes, carrinho, pedidos, itens, cancelamentos e schema_migrations, confirmou **PRIMARY_COMMERCIAL_STATE_UNCHANGED**. Nenhum pedido real, preço, estoque ou vínculo comercial foi alterado; nenhuma migration foi aplicada.

### Arquivos desta implementação

Backend criados:
- `backend/src/models/admin_orders.go`
- `backend/src/repositories/admin_orders.go`
- `backend/src/handlers/admin_orders.go`
- `backend/src/routes/admin_orders.go`
- `backend/src/routes/admin_orders_test.go`

Backend ajustados:
- `backend/src/models/order_history.go` — proprietário interno para notificação, sem exposição JSON.
- `backend/src/repositories/order_cancellation.go` — núcleo transacional compartilhado entre cliente e administrador.
- `backend/src/main.go` — registro das rotas administrativas.
- `backend/src/routes/audit_browser_test.go` — fixtures opcionais, rotas e verificação de integridade.

Angular criados em `frontend/src/app/components/admin/orders/`:
- `admin-orders.service.ts` e `admin-orders.service.spec.ts`.
- `admin-orders.component.ts`, `.html` e `.spec.ts`.
- `admin-order-detail.component.ts`, `.html` e `.spec.ts`.
- `admin-orders.css`, compartilhado pelas duas páginas.

Angular ajustados:
- `frontend/src/app/components/admin/admin-routing.module.ts`.
- `frontend/src/app/components/admin/admin/admin.component.ts` e `.html`.

Automação: `frontend/e2e/admin-orders.cjs` e `frontend/e2e/admin-orders-states.cjs`. Relatório: este AUDITORIA_FINAL.md. Capturas, resultados e logs finais preservados no diretório de evidências; dependências, helper de leitura e artefatos temporários desta execução removidos. Binário ativo, backup anterior e documentos/imagens do TCC preservados.


## Módulo administrativo de Clientes — 21/11/2026

Implementado e ativo em `/admin/customers` e `/admin/customers/:id`, exclusivamente para consulta. Não há ações nem endpoints de edição, exclusão, bloqueio, redefinição de senha ou exportação. Nenhuma migration foi necessária: **bd_box na versão 50, dirty=false**.

### Funcionalidades, consultas e segurança

- Sidebar Clientes habilitada, cabeçalho compartilhado único e estilos Montserrat/oliva/creme existentes. Listagem com nome, e-mail, telefone opcional, cadastro, quantidade de pedidos e total gasto em reais.
- Busca parametrizada por nome/e-mail, dez clientes por página no servidor, cadastro decrescente com ID como desempate e datas ausentes por último. Busca/página preservadas na URL; novas pesquisas retornam à primeira página. Consultas obsoletas são canceladas.
- Indicadores calculados no backend sobre os clientes da pesquisa: total, com pedidos e sem pedidos. Somente `users.role='customer'`; administradores não entram nos indicadores nem podem ser consultados como clientes.
- Agregação SQL de `checkout_orders` por proprietário, sem N+1. Quantidade total inclui cancelados; pedidos válidos, total gasto e última compra válida consideram somente `simulated_approved`. O total vem de `total_cents` histórico, nunca de preços atuais do catálogo. Nenhuma métrica foi persistida em nova coluna.
- Detalhe com cadastro, endereços reais de `user_addresses`, resumo de compras e histórico paginado. O leitor de endereços foi reutilizado; cadastro/endereços são lidos em transação somente leitura consistente. Datas ausentes e telefone não cadastrado têm tratamento explícito. Não existe situação da conta persistida adequada a este módulo; nenhum estado fictício foi criado.
- Histórico reutiliza a consulta administrativa de pedidos com filtro obrigatório pelo ID do cliente e role customer. Os links seguem para `/admin/orders/:id`, sem duplicar o detalhamento existente.
- Respostas usam DTOs explícitos: sem senha/hash, CPF/CNPJ, nascimento, OTP ou tokens. `Cache-Control: no-store`; erros genéricos sem SQL nem informações pessoais. Novas rotas protegidas por AuthMiddleware e AdminMiddleware. IDs, página e busca validados no backend. Não há logs de dados pessoais.
- AdminPageHeaderComponent, AdminStateComponent e PaginationComponent reutilizados. Estilos de tabela/cards administrativos existentes reutilizados, com `admin-adaptive-table.css` optativo para converter tabelas em cards quando o container tiver até 760 px. A primeira captura de 1024 px mostrou quebra ruim de datas; corrigida e novamente conferida. O estilo não é globalmente aplicado a outras telas.

| Endpoint | Resultado |
| --- | --- |
| `GET /admin/customers?page=1&search=...` | Clientes, paginação e indicadores reais |
| `GET /admin/customers/{id}` | Cadastro, endereços e resumo histórico |
| `GET /admin/customers/{id}/orders?page=1` | Pedidos exclusivamente desse cliente, paginados |

### Testes e evidências

- **33 testes Angular aprovados**: 14 novos de Clientes e 19 de regressão de Pedidos/sidebar. Incluem envio real do formulário, URL, respostas atrasadas, estados vazios, recuperação, privacidade visual, paginação do histórico e links para o detalhe de pedidos.
- **PostgreSQL real isolado aprovado**: TestAdminCustomersPostgres, com oito grupos cobrindo listagem, métricas, busca por nome/e-mail e tentativa de injeção, paginação/ordem, valores históricos sem cancelados, endereços por proprietário, ausências reais, IDs/roles inválidos, 401/403/405, indisponibilidade e recuperação. Regressões TestAdminOrdersPostgres, TestAccountAddressesAndCheckoutPostgres e TestAccountProfilePatchPostgres também passaram. A fixture antiga de Pedidos foi adequada para conter a coluna role que existe no schema real.
- **28/28 verificações Playwright aprovadas**, Chromium local com sandbox habilitado: login/navegação reais, filtros e paginação, histórico por proprietário, pedidos cancelados, encaminhamento ao componente existente, carregamento, vazios, erros, retry, teclado e ausência de erros Angular.
- **19 capturas finais**, em 1440, 1024, 768 e 390 px, com listagem, detalhes, cliente sem compras, pesquisa vazia e estados. Revisão visual realizada, sem overflow horizontal. Os HTTP 503 de recuperação foram explicitamente injetados no navegador; consultas, login, paginação e navegação restantes usaram a API real em schema isolado. Falhas de banco também foram verificadas no teste PostgreSQL, sem simulação.
- Build de produção aprovado após os ajustes finais. Permanecem os avisos anteriores de orçamento do bundle inicial/CSS de Promoções e cadastro, CommonJS do SweetAlert2 e seletores do CSS de dependências. Nenhum orçamento ou dependência permanente foi alterado.

Evidências: [diretório de capturas e resultados](docs/validacao-visual/clientes-admin-2026-11-21), [resultados do navegador](docs/validacao-visual/clientes-admin-2026-11-21/resultados.json), integração e isolamento (resultado consolidado neste relatório; arquivo intermediário removido), Angular (resultado consolidado neste relatório; arquivo intermediário removido), Go (resultado consolidado neste relatório; arquivo intermediário removido), build (resultado consolidado neste relatório; arquivo intermediário removido).

### Ativação e principal

Somente o backend 8080 foi reiniciado: **28068 → 17504**, em `db/runtime/admin_customers_20261121_114835`. Frontend preservado nos PIDs **34132 e 16468**. API administrativa HTTP 200; acessos anônimo e customer retornaram 401/403, e o ID de administrador retornou 404 no detalhe de cliente. Verificação no principal usou apenas GET e JWT de dois minutos mantido somente em memória; nenhum token ou dado pessoal foi persistido nos logs.

O principal atualmente possui **zero usuários com role customer**. Nenhum cadastro fictício foi inserido nele para preencher a tela. Detalhes/endereço/histórico preenchidos foram validados em fixtures PostgreSQL isoladas. A comparação antes/depois confirmou usuários, endereços e dados comerciais inalterados. Schemas isolados removidos, versão 50 e dirty=false mantidos. Comprovantes: validação somente leitura (resultado consolidado neste relatório; arquivo intermediário removido), processos preservados (resultado consolidado neste relatório; arquivo intermediário removido).

### Arquivos desta implementação

Criados no backend:
- `backend/src/models/admin_customers.go`
- `backend/src/repositories/admin_customers.go`
- `backend/src/services/admin_customers.go`
- `backend/src/handlers/admin_customers.go`
- `backend/src/routes/admin_customers.go`
- `backend/src/routes/admin_customers_test.go`

Ajustados no backend:
- `backend/src/main.go` — registro de rotas.
- `backend/src/repositories/account.go` — leitor de endereços compartilhado.
- `backend/src/models/order_history.go` e `backend/src/repositories/admin_orders.go` — filtro interno de proprietário, com role customer.
- `backend/src/routes/admin_orders_test.go` — fixture compatível com schema real.
- `backend/src/routes/audit_browser_test.go` — fixtures opcionais e verificação de integridade de usuários/endereços.

Criados em `frontend/src/app/components/admin/customers/`:
- `admin-customers.service.ts` e `.spec.ts`.
- `admin-customers.component.ts`, `.html` e `.spec.ts`.
- `admin-customer-detail.component.ts`, `.html` e `.spec.ts`.
- `admin-customers.css`.

Também criados `frontend/src/app/shared/css/admin-adaptive-table.scss` e `frontend/e2e/admin-customers.cjs`. Ajustados `frontend/src/app/components/admin/admin-routing.module.ts`, `frontend/src/app/components/admin/admin/admin.component.ts` e `.html`. Este é o único relatório Markdown atualizado para a entrega. Não foram modificados registros pessoais ou comerciais existentes.


## Consolidação dos relatórios históricos de catálogo

Os relatórios individuais de etapas concluídas foram substituídos por esta síntese. As migrations, testes, manifestos, instaladores e imagens comerciais continuam sendo a fonte reproduzível dos registros; a limpeza não reaplica nem altera dados.

- Cama: o manifesto `docs/catalogo-cama.json` continua sendo a entrada padrão de `backend/cmd/import-catalog`. A proposta editorial inicial, dry-run e SELECTs manuais foram superados pelas migrations. Composições e cuidados de demonstração permanecem identificados nos manifestos/JSONB; títulos comerciais e enchimento são assuntos separados. A alegação de algodão não deve ser generalizada para tecidos mistos ou microfibra. A especificação 200 fios dos edredons é demonstrativa do tecido externo e não cria enchimento ou peças adicionais. Os snapshots e rollbacks das migrations 34–37 foram preservados.
- Travesseiros: somente o travesseiro, sem capa removível inclusa; modelos e variantes de altura constam no manifesto preservado e nas migrations. O produto #2 foi reclassificado como edredom de peça única sem trocar IDs/preços/estoque das variantes. A antiga limitação da ferramenta Chrome foi superada pelas auditorias Playwright documentadas neste relatório.
- Toalhas: dez produtos cadastrados na migration 38, gramaturas demonstrativas próprias, sem aplicar a eles a contagem de fios de roupa de cama. Cinco vistas por produto. Fonte e instalador em `backend/demo-assets/toalhas-2026`; materiais, conteúdos e conservação continuam nesses dados e migrations, não nos prints removidos.
- Almofadas: migration 39 cadastra oito capas individuais; enchimento não incluso. Galerias e especificações estão em `backend/demo-assets/almofadas-2026`. As propostas de kits de duas capas continuam pendentes de modelo de componentes/estoque compartilhado, baixa transacional e reposição idempotente; não devem ser publicadas com estoque fictício duplicado.
- Mesa: migrations 40–41 e manifestos em `backend/demo-assets/mesa-2026` e `mesa-galerias-041` preservados. Galerias com ambientação, apresentação objetiva e detalhe; conjuntos de quatro/seis jogos americanos representam quantidades efetivamente vendidas, não louças decorativas. Mantido o antes/depois representativo do produto #117. A ressalva de navegação visual pendente no relatório inicial foi superada pela revisão posterior das dez galerias e auditoria geral.
- Decoração: migration 42 cadastra 22 produtos entre tapetes de quarto/sala, saída de box e cortinas. Cortinas têm dois painéis e varão não incluso; 300 × 250 cm representa tecido total, não cobertura garantida de janela. Algumas capas originais têm apenas cerca de 374 × 331 px; não houve certificação de resolução maior. Blackout/transparência não recebem percentuais inventados. Manifestos/instaladores ficam em `backend/demo-assets/decoracao-2026`. Migrations 43/44/46 e respectivas imagens foram preservadas para geometria e rollback dos sete tapetes de banheiro; mantido um antes/depois mobile.
- Marcas, variantes e composição de Travesseiros: os três manifestos demonstrativos em `docs/` foram mantidos como registros estruturados, mesmo quando não são carregados pelo runtime. Eles contêm origem/regras comerciais úteis ao TCC e não são logs descartáveis.
- Home/foco: regras permanentes de teclado e contraste foram mantidas no design system. O relatório da fase com fumaça/gradiente e SendGrid era obsoleto. Atualmente newsletter utiliza SMTP existente, não promete cupom sem configuração; imagens de Home ficam nos assets comerciais preservados. Avaliações exigem compra/titularidade/consentimento e moderação; rankings usam pedidos válidos com baixa, não carrinhos. Evidências representativas de Home, catálogo, conta, modal e foco foram mantidas.

As contagens de capturas nas seções históricas indicam o que foi executado naquela entrega, não o acervo retido após a limpeza. O índice atual informa o subconjunto preservado; resultados funcionais continuam consolidados nas respectivas seções e nos JSON finais de Pedidos/Clientes.


## Limpeza profunda após a conclusão de Clientes — 21/11/2026

Executada somente depois de concluir a implementação, testes, capturas, ativação e documentação do módulo Clientes. Nenhuma operação SQL, migration ou alteração de banco foi realizada nesta limpeza.

### Remoções e espaço recuperado

- **555 arquivos obsoletos revisados removidos**, com **140.384.690 bytes de tamanho lógico: 133,88 MiB**. O valor soma o tamanho dos arquivos removidos; não é uma medição de blocos livres do volume.
- `docs/`: de **423 para 61 arquivos**. As imagens de documentação passaram de 368 para **47 capturas representativas**, sem duplicatas exatas entre as mantidas. Não são fotografias comerciais.
- Removidos 12 relatórios individuais superados: `catalogo-almofadas-relatorio.md`, `catalogo-cama-algodao-relatorio.md`, `catalogo-cama-revisao-editorial.md`, `catalogo-decoracao-relatorio.md`, `catalogo-mesa-relatorio.md`, `catalogo-toalhas-relatorio.md`, `catalogo-travesseiros-validacao.md`, `decoracao-tapetes-capas.md`, `edredons-200-fios-relatorio.md`, `home-refinamento-relatorio.md`, `mesa-galerias-relatorio.md` e `validacao-foco-banners.md`.
- Removidos os dois SELECTs manuais de auditoria, o dry-run inicial de Cama, o snapshot de integridade da versão 46 e matrizes intermediárias superadas. Regras e ressalvas relevantes foram consolidadas na seção anterior; valores estruturados continuam nos manifestos e migrations.
- Removidos logs encerrados da raiz/backend/docs, marcador `audit-browser.stop`, helper Go de consulta que já havia terminado, SDK temporário de Playwright e suas dependências sob `tmp/customers-tools`. O `package-lock.json` vazio da raiz foi removido: não existia package.json correspondente, e os manifests válidos de frontend foram preservados.
- A contagem acima corresponde ao inventário de arquivos anteriores à limpeza. Diretórios/arquivos efêmeros criados para validar a própria política de limpeza também foram descartados, sem acrescentar novos relatórios intermediários ao acervo.

Cada alvo foi revisado por caminho absoluto interno ao repositório e hash antes da exclusão. Não houve remoção genérica por extensão em todo o projeto. Links de relatórios mantidos foram atualizados antes de remover seus antigos arquivos. Nenhum diretório externo ao repositório foi limpo.

### Arquivos preservados por necessidade

- Código da aplicação, testes válidos, scripts de reprodução, configurações e `.env`. **1.271 arquivos protegidos** foram comparados por SHA-256 antes/depois, com zero divergências: backend/src, frontend/src, frontend/public, frontend/e2e, migrations, uploads, demo-assets, backups e manifests/configurações selecionados.
- `backend/migrations/`, `backend/uploads/`, `backend/demo-assets/`, `db/backups/` e `backend/uploads.zip` permanecem intactos. O ZIP é um arquivo de restauração do catálogo, não um log temporário. Nenhuma imagem comercial foi apagada ou editada.
- Arquivos do runtime e logs de inicialização/backup necessários à operação e recuperação foram preservados. Não foram removidos executáveis em uso nem backups de segurança.
- Documentação permanente de carrinho, favoritos, paginação, estoque e design system; README de arquitetura atualizado e instruções locais preservadas. Os quatro manifestos JSON de catálogo/dados demonstrativos em docs permanecem válidos; `catalogo-cama.json` é utilizado diretamente pelo importador.
- Capturas de Home/catálogo/produto/conta/foco/modal, CRUD, Pedidos e Clientes, além de dois pares antes/depois de Mesa e tapetes. O [índice atual](docs/validacao-visual/README.md) descreve o subconjunto retido.
- Mantidos somente os JSON finais de resultados de Pedidos/Clientes necessários para relacionar cenários executados à evidência. Logs de execução encerrados foram consolidados no texto, em vez de preservados indefinidamente.
- Dependências de execução do frontend e build de produção foram preservados. O cache usado pelo frontend ativo não foi tratado como lixo a ser apagado indiscriminadamente.

### Prevenção de novo acúmulo

- `frontend/e2e/artifacts.cjs` cria um diretório único sob `.artifacts/e2e/`, valida os limites do caminho e o remove ao encerrar o processo. Quatro testes cobrem limpeza isolada, bloqueio de traversal, término de processo e retenção seletiva.
- `audit.cjs`, `product-crud.cjs`, `public-readonly.cjs`, `admin-orders.cjs`, `admin-orders-states.cjs` e `admin-customers.cjs` passaram a usar esse gerenciador. Uploads de fixture e resultados intermediários também ficam no diretório da execução, não em pastas avulsas da raiz.
- A retenção final só ocorre com `BOX_E2E_KEEP_EVIDENCE=1`, execução aprovada e nomes previamente previstos por cada script. Assim, uma execução comum não repovoa docs com dezenas de capturas.
- O roteiro alternativo `docs/validacao-visual/catalogo.cjs` também usa saída temporária por padrão. Diretórios de saída explicitamente fornecidos pelo operador continuam sendo deliberados e não são removidos automaticamente.
- O harness isolado remove seu marcador de parada e OTP temporário ao encerrar. A limpeza automática normal não substitui a revisão de resíduos de um processo interrompido à força pelo sistema operacional.
- `.gitignore` passou a ignorar apenas áreas temporárias específicas (`.artifacts`, tmp, backend/tmp, marcador e OTP), sem ignorar docs, resultados finais, migrations ou fontes. README e roteiro de testes foram atualizados; não há um relatório Markdown novo por execução.

### Validação após as mudanças de limpeza

- **4/4 testes Node da política de artefatos aprovados**; sintaxe de todos os scripts E2E validada.
- **32/32 verificações Playwright somente leitura aprovadas** no localhost principal: seis categorias, produto/zoom e foco por teclado em 1440, 1024, 768 e 390 px. POST/PATCH/PUT/DELETE foram bloqueados nesse contexto. Os artefatos dessa verificação foram efetivamente removidos pelo novo gerenciador; nenhuma evidência intermediária foi gravada em docs.
- Harness Go compilado com `go test ./src/routes -run '^$' -count=1`, sem executar testes nem usar banco durante a limpeza.
- **Zero links locais quebrados** na documentação revisada e zero referências da documentação mantida para os alvos removidos. Manifestos JSON preservados foram analisados com sucesso.
- Frontend 4200 e API de produtos 8080 responderam **HTTP 200**. Backend PID **17504** e frontend PIDs **34132/16468** preservados. Apenas o servidor estático temporário 4206 iniciado para a auditoria foi encerrado.
- O build de produção e os 33 testes Angular do módulo Clientes já estavam aprovados antes desta limpeza. Não foram apresentados como reexecutados nesta etapa: a limpeza não alterou fontes Angular/Go da aplicação; os ajustes adicionais ficaram nos scripts de teste e na documentação.

A implementação de Clientes e a limpeza solicitada estão concluídas, com o banco principal preservado na versão 50. As limitações funcionais reais descritas nas seções anteriores continuam válidas; não foram ocultadas pela remoção dos relatórios antigos.


## Dashboard e Métricas — 21/11/2026

Dashboard existente revisado e ampliado, preservando cabeçalho compartilhado, Montserrat, paleta, cards, gráficos de pedidos/categorias e estados. O menu Métricas agora abre `/admin/metrics`, reutilizando o mesmo DashboardComponent de `/admin/dashboard`, sem segunda implementação de métricas. Não houve migration nem dependência permanente nova.

### Auditoria e fórmulas

Os quatro indicadores antigos já eram SQL, não números fictícios. Faltavam período, ticket, clientes e ranking por produto. Estoque baixo incluía quantidade zero e usava o estoque geral mesmo quando havia variantes; esses dois problemas foram corrigidos. O total de produtos cadastrados foi preservado como informação adicional ao indicador de ativos.

| Indicador | Cálculo e referência temporal |
| --- | --- |
| Faturamento simulado | SUM(checkout_orders.total_cents) dos aprovados no período; exclui cancelled |
| Pedidos realizados | COUNT de todos os pedidos registrados no período, com quantidades de aprovados/cancelados |
| Ticket médio | Faturamento / quantidade aprovada; PostgreSQL ROUND(AVG(total_cents)), em centavos, half-up; zero quando não há aprovados |
| Clientes cadastrados | Total atual de users.role=customer; novos cadastros são mostrados separadamente para o período |
| Produtos ativos | Total atual de products.status=active; total cadastrado continua visível |
| Estoque baixo | Produtos ativos cujo estoque efetivo atual está entre 1 e 5; zero separado em indisponíveis |

Estoque efetivo: soma das quantidades das variantes quando existem; quantidade do produto simples nos demais casos. O resumo de alertas também mostra opções individuais com até cinco unidades, inclusive zero, e informa o total do produto. Isso não apresenta estoque atual como se fosse histórico. Limites do resumo: oito alertas e cinco pedidos recentes; não há duplicação das listagens completas.

Clientes com/sem pedidos são indicadores atuais e excluem administradores. O faturamento representa pedidos aprovados em simulação; a interface não afirma liquidação por gateway ou faturamento bancário efetivo.

### Períodos, agrupamento e consistência

Endpoint existente reutilizado: `GET /admin/dashboard`. Continua protegido por AuthMiddleware + AdminMiddleware e Cache-Control no-store. Mantém os campos anteriores e acrescenta indicadores/séries; não foi criado endpoint paralelo nem tabela de métricas.

Parâmetros: `period=today|7d|30d|month|last_month|custom`, `group=auto|day|month`, `dateFrom` e `dateTo` para customizado. Padrão: últimos 30 dias. Fuso: **America/Sao_Paulo**; início inclusivo e término exclusivo:

- Hoje: início do dia local até início do próximo.
- 7/30 dias: inclui hoje e os seis/29 dias anteriores.
- Este mês: primeiro dia do mês até o fim do dia atual.
- Mês anterior: primeiro dia anterior até primeiro dia atual.
- Personalizado: dateFrom inclusivo e dateTo inclusivo, implementado com limite exclusivo no início do dia seguinte.

A interface informa os limites e o fuso. Datas históricas com início do dia afetado pelo horário de verão são normalizadas ao primeiro instante civil válido; isso foi testado para 04/11/2018. Intervalo customizado máximo de cinco anos; agrupamento diário limitado a um ano. Automático usa dias em intervalos curtos e meses nos maiores. Datas, enumerações e limites inválidos retornam 400 sem consultar métricas indevidas.

Uma única instrução SQL com CTEs reúne os agregados e séries no mesmo snapshot PostgreSQL. Não há N+1. Calendário preenche lacunas com zero, sem inventar vendas. Dinheiro é agregado em centavos; só a formatação visual converte para reais. O período/grupo ficam na URL, reaplicação atualiza, mudanças cancelam a requisição anterior e erros preservam os filtros.

### Gráficos e integração

- Faturamento por dia/mês, evolução dos pedidos e novos clientes: SVG responsivo com alternativa textual em tabela expansível e pontos com descrição.
- Status: somente simulated_approved e cancelled, com nomes amigáveis e quantidades textuais, sem depender apenas da cor.
- Produtos mais vendidos: soma das quantidades históricas dos itens aprovados, agregando variantes por product_id. Nome da última linha histórica e ID preservam a identificação mesmo com arquivamento/exclusão do cadastro. Cancelados não entram.
- Categorias mais vendidas preservadas. A classificação usa a categoria atual do cadastro quando disponível; não existe snapshot histórico de categoria, e o agrupamento não pretende reconstruí-lo. Preços atuais não são usados nas vendas.
- Pedidos recentes levam a `/admin/orders/:id`; acessos rápidos para Produtos, Pedidos e Clientes usam as rotas já existentes. Não foram criadas transições de pedido nem rotinas de atualização de estoque.

Não há biblioteca de gráficos instalada no package.json. Foi mantido o padrão de barras HTML/CSS existente e acrescentado SVG nativo reutilizável, sem dependência adicional. PeriodFilterComponent é compartilhado pelos indicadores e gráficos.

### Testes executados

- **14 testes Angular aprovados**: Dashboard, tendência acessível e cabeçalho/sidebar compartilhados. Cobrem skeletons/erro/retry, dados reais e vazios, URL, períodos personalizados, cancelamento de requisições antigas, validação, links e alternativa tabular.
- **Go/PostgreSQL isolado aprovado**: TestDashboardPostgres, TestDashboardMetricsPostgres, TestDashboardPeriod e TestDashboardHistoricalTimezone. Incluem receita histórica, cancelados excluídos, ticket em centavos e arredondamento de meio centavo, limites inclusivo/exclusivo no fuso local, calendário sem dados, agrupamento mensal, clientes sem administradores, total atual separado do período, variantes com estoque geral divergente, opções zeradas, produto arquivado com nome histórico e falha real de consulta/recuperação com erro genérico.
- **15/15 verificações Playwright aprovadas**, algumas com múltiplos períodos: login real, autorização 401/403, filtros inválidos 400, cálculos e séries da API, seis presets, URL/reload, alterações rápidas de período, navegação para pedido, Métricas sem cabeçalho duplicado, foco/teclado, tabela acessível e estados vazios/carregamento/retry.
- Chromium local com sandbox habilitado em **1440, 1024, 768 e 390 px**. Navegação e revisão visual reais; sem overflow horizontal ou erros Angular. O 503 para recuperação visual foi explicitamente injetado; a falha de banco foi validada separadamente com PostgreSQL real isolado.
- **Build de produção aprovado**. Avisos existentes: bundle inicial 960,51 kB, estilos Promoções/cadastro acima do aviso de 14 kB, CommonJS SweetAlert2 e quatro seletores de dependências ignorados. Nenhum orçamento foi aumentado.

Foram preservadas apenas **oito capturas finais e um JSON de resultados**, pelo gerenciador de artefatos já existente: [resultados](docs/validacao-visual/dashboard-2026-11-21/resultados.json), [desktop](docs/validacao-visual/dashboard-2026-11-21/dashboard-1440.png), [1024](docs/validacao-visual/dashboard-2026-11-21/dashboard-1024.png), [768](docs/validacao-visual/dashboard-2026-11-21/dashboard-768.png), [mobile](docs/validacao-visual/dashboard-2026-11-21/dashboard-390.png). Capturas com vendas/clientes preenchidos usam exclusivamente as fixtures isoladas. Logs, SDK, helper de validação e capturas intermediárias foram descartados após esta consolidação.

### Ativação e integridade

Backend compilado e reiniciado somente na porta 8080: **17504 → 17752**. Runtime ativo em `C:\Users\vitor\Documents\Box-Enxovais-tcc\db\runtime\dashboard_20261121_123854`. Frontend 4200 preservado nos mesmos processos. Nenhuma migration foi aplicada.

No principal, apenas GETs autenticados com JWT efêmero em memória: Hoje, 7 dias, 30 dias, mês atual e mês anterior retornaram 200. Cards e somas das séries conferiram com consultas SQL usando os mesmos limites. Foram confirmados 401 anônimo, 403 customer e 400 período inválido. Nenhum dado pessoal/token foi registrado em log.

A verificação de integridade do schema isolado confirmou PRIMARY_COMMERCIAL_STATE_UNCHANGED, incluindo usuários, endereços, produtos, variantes, imagens, pedidos, itens, cancelamentos, promoções e versão. O schema foi removido. A verificação somente leitura do principal também confirmou dados inalterados e **versão 50, dirty=false**. Não foram criados pedidos/clientes reais para ilustrar os gráficos.

### Arquivos criados e alterados

Backend:
- `backend/src/models/dashboard.go` — contrato de período (novo).
- `backend/src/handlers/dashboard_handler.go` — validação de períodos/fuso e endpoint reutilizado.
- `backend/src/handlers/dashboard_handler_test.go` — testes novos de limites/fuso.
- `backend/src/repositories/dashboard_repository.go` — agregações consistentes e indicadores atuais/históricos.
- `backend/src/routes/dashboard_test.go` — regressão e erro HTTP de consulta.
- `backend/src/routes/dashboard_metrics_test.go` — testes PostgreSQL novos.
- `backend/src/routes/audit_browser_test.go` — fixture opcional DASHBOARD_BROWSER.

Angular:
- `frontend/src/app/components/admin/dashboard/dashboard.component.ts`, `.html`, `.css` e `.spec.ts`.
- `frontend/src/app/components/admin/dashboard/dashboard.models.ts` (novo).
- `frontend/src/app/components/admin/dashboard/dashboard-trend.component.ts`, `.html`, `.css` e `.spec.ts` (novos).
- `frontend/src/app/shared/components/period-filter/period-filter.component.ts`, `.html` e `.css` (novos).
- `frontend/src/app/components/admin/admin-routing.module.ts`.
- `frontend/src/app/components/admin/admin/admin.component.ts` e `.html`.

Automação: `frontend/e2e/dashboard.cjs` (novo). Documentação: este relatório, README principal e índice de validação visual. Não houve alteração de preço, estoque, SKU, variante, pedido ou cliente existente.

### Limites mantidos

Não há liquidação de pagamento real, estoque histórico ou snapshot da categoria na compra. São mostrados explicitamente indicadores atuais e históricos de acordo com os dados existentes. Ranking pode usar nome histórico com identificação de variante da última venda; a quantidade é agregada por produto. O módulo de Relatórios não foi redesenhado nem declarado concluído por esta entrega. As métricas são atualizadas ao abrir, aplicar filtros/reaplicar ou recarregar, sem prometer atualização em tempo real.

## Relatórios Administrativos — 21/11/2026

### Entrega e integração

Módulo funcional em `/admin/reports`, reutilizando o ReportComponent anteriormente vazio e sua rota/sidebar já existentes. Quatro tipos no mesmo contexto: Vendas, Produtos, Clientes e Estoque. Um único AdminPageHeaderComponent, com descrição “Consulte e analise os resultados da loja por período.”. Sem recriar Produtos, Pedidos, Clientes ou Dashboard.

PeriodFilterComponent compartilhado com Dashboard, com agrupamento ocultável sem alterar seu comportamento padrão; AdminStateComponent e PaginationComponent reutilizados. Filtros, tipo, ordenação e página ficam na URL. Mudanças de filtro retornam à página 1; unsubscribe cancela consultas e downloads obsoletos. Totais consideram todo o conjunto filtrado, não apenas a página. Estados de carregamento, vazio, erro e retry preservam os filtros.

### Cálculos e dados históricos

- **Vendas:** pedidos do período, aprovados, cancelados, SUM(total_cents) e ROUND(AVG(total_cents)) apenas para `simulated_approved`. Centavos inteiros/NUMERIC, sem recálculo por preços atuais. Total histórico do pedido pode incluir frete. Tabela com data, cliente, unidades dos itens, pagamento demonstrativo e status; link para `/admin/orders/:id`.
- **Produtos:** itens de pedidos aprovados agrupados por product_id, somando todas as variantes. Unidades = SUM(quantity); receita = SUM(quantity * unit_price_cents). A receita de mercadorias não inclui frete. Identificação usa o nome histórico da venda mais recente dentro do período; nomes atuais não substituem nomes vendidos. Produtos arquivados ou ausentes do catálogo continuam no histórico. SKU, categoria e marca são metadados atuais, explicitamente identificados; esses campos não possuem snapshot histórico. Produtos cadastrados sem vendas também aparecem com zero. Participação usa a receita do conjunto filtrado. Ordenação por unidades, receita ou nome.
- **Clientes:** somente role=customer, incluindo clientes sem compras com zero. Compradores possuem pelo menos um pedido aprovado no período; recorrentes, pelo menos dois. Novos cadastros respeitam o período. Média por comprador = média da soma gasta por cada cliente comprador, arredondada em centavos. Total gasto/última compra são do período selecionado. Links para `/admin/customers/:id`; nenhuma exportação de clientes.
- **Estoque:** exclusivamente situação atual de produtos ativos. Usa o mesmo CTE de inventário do Dashboard: produto com variantes utiliza SUM(quantity) das variantes; produto simples usa sua quantity. Tabela individual por variante, sem repetir a quantidade agregada do pai. Zero = esgotado, 1–5 = baixo, acima de 5 = disponível. Indicadores de esgotados/baixo usam o saldo total de cada produto representado pelos filtros; total de unidades soma somente as entradas filtradas. Estoque histórico não é inferido.
- **Datas:** mesmo parser do Dashboard: America/Sao_Paulo, início inclusivo/fim exclusivo e presets Hoje, 7 dias, 30 dias, mês atual, mês anterior e personalizado. Intervalo máximo de cinco anos. UI usa Intl com timeZone America/Sao_Paulo, inclusive horário de verão histórico; CSV usa a localização Go equivalente.

As consultas retornam tabela, contagem e indicadores em uma única instrução SQL/snapshot. Quantidades dos itens de vendas são pré-agregadas, sem N+1. Busca parametrizada com `%`, `_` e barra tratados literalmente. Ordenações são mapeadas no servidor. Paginação padrão 20, máximo 100 por página; consulta/exportação com timeout de 15 segundos.

### Endpoints e exportações

Todos os endpoints usam o middleware administrativo existente e `Cache-Control: no-store`:

- GET `/admin/reports/sales`
- GET `/admin/reports/products`
- GET `/admin/reports/customers`
- GET `/admin/reports/stock`
- GET `/admin/reports/sales/export`
- GET `/admin/reports/products/export`
- GET `/admin/reports/stock/export`

Parâmetros: period, dateFrom, dateTo, search, status (vendas/estoque), sort, page e pageSize. Estoque ignora período. Exportação ignora paginação e usa os mesmos filtros aplicados à tabela. Não há endpoint de exportação de clientes.

CSV em memória, UTF-8 com BOM, delimitador ponto e vírgula, cabeçalhos em português, valores com vírgula decimal e datas locais. Vendas exportam apenas pedido, data, itens, total, pagamento e status: nenhum nome/e-mail de cliente. Produtos/estoque contêm somente dados comerciais. Células textuais com prefixos de fórmula, inclusive após espaços/controles/BOM, recebem apóstrofo. Limite de 10.000 registros; excedê-lo retorna 422, sem gerar arquivo parcial. Nenhum CSV permanente é criado no repositório.

### Correções encontradas na execução real

- Restauração visual do status/ordenação após reload: opções condicionais com value literal não sincronizavam sua seleção, embora o modelo enviasse o filtro correto. Corrigido com bindings Angular nas opções e teste específico.
- Nomes acessíveis explícitos nos selects de status e ordenação.
- Contraste do badge aprovado: a cor branca herdada de Bootstrap foi substituída por oliva no escopo do relatório.
- Grid mobile dos filtros evita quebra desnecessária no botão Aplicar filtros.
- Ordem explícita dos indicadores e da agregação JSON mantém a apresentação estável.
- Datas históricas usam o fuso civil real, evitando deslocamento fixo incorreto durante o antigo horário de verão.

### Testes e evidências

- **26 testes Angular aprovados:** 11 do relatório, 9 de Dashboard/tendência e 6 de cabeçalho/sidebar. Cobrem dados/links, loading/vazio/erro/retry, parâmetros, paginação, cancelamento, ausência de CSV de clientes, exportação aplicada, restauração dos selects condicionais e data de 05/11/2018 durante horário de verão.
- **Go/PostgreSQL aprovados:** TestReportsPostgres com 11 subcenários; TestReportFilters e TestReportCSVProtection; regressões TestDashboardPostgres, TestDashboardMetricsPostgres, TestDashboardPeriod e TestDashboardHistoricalTimezone. Incluem limites locais, cancelados, arredondamento, variantes vendidas, diferença frete/mercadorias, arquivados, clientes sem compras, recorrência, administradores excluídos, estoque atual, busca literal, ranking, paginação, CSV completo/filtrado/BOM/acentos/fórmulas/limite, 401/403/400/404/422 e falha real de banco/recuperação genérica.
- **27/27 verificações Playwright aprovadas**, com PostgreSQL isolado e Chromium local com sandbox habilitado. Navegação real pelos quatro relatórios em **1440, 1024, 768 e 390 px**, sem overflow horizontal do documento. Tabelas possuem rolagem interna acessível em telas estreitas, testada de fato. Login, filtros, todos os presets, datas personalizadas/reload, página 2 com cinco registros, busca SKU, CSV baixado, estados vazios dos quatro tipos, retry, cancelamento de consulta e links reais para pedidos/clientes. Nenhum pageerror Angular. HTTP 503/atraso foram injetados somente para os cenários de recuperação/cancelamento; demais dados e navegação usam API real. A falha de SQL foi testada separadamente no schema isolado.
- **Build de produção aprovado após as últimas alterações.** Avisos preexistentes mantidos: bundle inicial 960,51 kB, CSS Promoções 15,75 kB/cadastro 15,94 kB acima do aviso de 14 kB, CommonJS SweetAlert2 e quatro seletores de dependências ignorados. Nenhum orçamento aumentado/dependência de runtime adicionada.

Evidências finais: [resultados](docs/validacao-visual/reports-2026-11-21/resultados.json), [vendas desktop](docs/validacao-visual/reports-2026-11-21/sales-1440.png), [produtos desktop](docs/validacao-visual/reports-2026-11-21/products-1440.png), [clientes desktop](docs/validacao-visual/reports-2026-11-21/customers-1440.png), [estoque desktop](docs/validacao-visual/reports-2026-11-21/stock-1440.png), [vendas mobile](docs/validacao-visual/reports-2026-11-21/sales-390.png), [produtos mobile](docs/validacao-visual/reports-2026-11-21/products-390.png), [clientes mobile](docs/validacao-visual/reports-2026-11-21/customers-390.png), [estoque mobile](docs/validacao-visual/reports-2026-11-21/stock-390.png), [vazio](docs/validacao-visual/reports-2026-11-21/empty-390.png), [erro](docs/validacao-visual/reports-2026-11-21/error-390.png), [carregamento](docs/validacao-visual/reports-2026-11-21/loading-390.png). Apenas 11 capturas finais e um JSON retidos pelo gerenciador existente. Capturas preenchidas usam exclusivamente fixtures isoladas.

### Arquivos criados e alterados

Novos:

- `backend/src/handlers/reports.go`
- `backend/src/handlers/reports_test.go`
- `backend/src/repositories/reports.go`
- `backend/src/repositories/report_inventory.go`
- `backend/src/routes/reports_test.go`
- `frontend/src/app/components/admin/report/report.models.ts`
- `frontend/e2e/reports.cjs`

Alterados:

- `backend/src/repositories/dashboard_repository.go` — extrai somente o inventário compartilhado, preservando os cálculos existentes.
- `backend/src/routes/products.go` — registra as rotas administrativas protegidas.
- `backend/src/routes/audit_browser_test.go` — fixture REPORTS_BROWSER isolada.
- `frontend/src/app/components/admin/report/report.component.ts`
- `frontend/src/app/components/admin/report/report.component.html`
- `frontend/src/app/components/admin/report/report.component.scss`
- `frontend/src/app/components/admin/report/report.component.spec.ts`
- `frontend/src/app/components/admin/admin/admin.component.ts`
- `frontend/src/app/components/admin/admin/admin.component.spec.ts`
- `frontend/src/app/shared/components/period-filter/period-filter.component.ts`
- `frontend/src/app/shared/components/period-filter/period-filter.component.html`
- `AUDITORIA_FINAL.md`, além das evidências finais listadas acima.

### Ativação, integridade e limpeza

Sem alteração de schema e sem nova migration. Backend recompilado e reiniciado somente na porta 8080, **17752 → 20672**, runtime `db/runtime/reports_20261121_130954`. Frontend 4200 preservado nos processos 34132/16468.

Principal validado apenas por GETs autenticados com credencial efêmera em memória, sem registrar token ou dados pessoais. Os cinco presets de vendas retornaram 200 e coincidiram com pedidos, faturamento e ticket do Dashboard. Produtos, clientes e estoque retornaram 200. As três exportações retornaram 200/BOM, 401 anônimo e 403 customer; consulta inválida retornou 400 e exportação de clientes 404.

Hash dos registros comerciais antes/depois confirmou **PRIMARY_50_DIRTY_FALSE_UNCHANGED_ONLY_GET**. Todas as escritas dos testes ocorreram nos schemas isolados. O harness confirmou **ISOLATED_SCHEMA_REMOVED** e **PRIMARY_COMMERCIAL_STATE_UNCHANGED** após a última navegação. Banco principal permanece na **migration 50, dirty=false**, sem alterar preços, estoque, SKUs, produtos, pedidos, clientes ou campanhas.

Servidor/API temporários encerrados, diretório temporário Playwright, helper de leitura e script diagnóstico removidos. Código dos testes e gerenciador de artefatos preservados; runtime ativo e imagens comerciais intactos. Somente este relatório foi atualizado como documentação textual desta entrega.

### Limites explícitos

Sem pendência funcional identificada no escopo solicitado. Não há estoque histórico, confirmação de gateway nem snapshots antigos de SKU/categoria/marca; a interface distingue esses dados. Recorrência e média de cliente são calculadas dentro do período, não como classificação vitalícia. Exportação de clientes foi deliberadamente omitida conforme solicitado. A conferência de acessibilidade abrange teclado, nomes acessíveis, foco existente e responsividade; não equivale a certificação WCAG integral. Suítes alheias aos componentes/rotas afetados não foram executadas novamente.

## Auditoria final de performance e qualidade — 21/11/2026

### Diagnóstico antes das alterações

Build de produção executado com stats-json antes de editar código. Baseline: **960,51 kB iniciais**, aproximadamente 209,16 kB de transferência estimada, CSS global 283.050 bytes e JavaScript inicial 677.460 bytes (incluindo scripts/polyfills). Maior chunk sob demanda: admin-module com 228.415 bytes. Autenticação com 15,94 kB de CSS e Promoções com 15,75 kB.

Avisos iniciais: orçamento inicial acima de 500 kB; CSS autenticação e Promoções acima do aviso de 14 kB; SweetAlert2 CommonJS; quatro seletores Bootstrap ignorados na otimização crítica. **Nenhum orçamento foi aumentado.** Baseline de testes: **326 Angular aprovados** e `CART_TEST_LOCAL=1 go test ./... -count=1` aprovado. TypeScript strict/strictTemplates já habilitados e preservados.

### Causas medidas e otimizações

- SweetAlert2 estava fixado no bootstrap via token `Swal`, sem consumidor desse token no código. O módulo CommonJS incluía **78.204 bytes** no main e a versão `all` injetava estilos já carregados globalmente. Removido o provider sem uso. SweetAlertService foi preservado, utilizando a distribuição ESM sem CSS embutido; nenhuma confirmação/modal existente foi substituída. O serviço legado não é carregado na entrada sem um consumidor.
- Bootstrap bundle completo de JS, **80.417 bytes**, era carregado globalmente, embora somente o carrossel usasse sua API. Agora o carrossel importa dinamicamente apenas seu módulo ESM, mantendo 8 segundos, teclado, indicadores, pausa por foco/hover, dispose e reduced-motion. Há proteção para o componente destruído durante o import. As outras interações continuam sob controle do Angular. CarouselModule ngx-bootstrap sem uso e import duplicado Footer foram retirados da Home.
- `provideNgxMask` no bootstrap puxava cerca de **50 kB** de código de máscara e contribuía para antecipar Forms. Providers agora ficam nos componentes que usam máscara; Conta e Checkout já os possuíam. Frete/CEP e Faixas de CEP receberam provider local equivalente. Máscaras de preço e demais regras preservadas.
- O toast global puxava MatIcon/CDK para a entrada, cerca de **46,8 kB**. Passou a renderizar os mesmos glifos Material Icons pela fonte já existente, com iguais dimensões, rotação, nomes acessíveis dos botões e anúncios status/alert. Nenhum novo conjunto de ícones foi introduzido. `*ngIf` do toast foi substituído por controle de fluxo nativo. Toast continua compartilhado e mensagens são texto.
- Provider Lucide global sem consumidores foi retirado. SVGs estáticos que possuem classes lucide não dependem dele e foram preservados.
- O CSS Bootstrap global completo continha a maior parte dos 283 kB iniciais. Um plugin local PostCSS processa **exclusivamente** `bootstrap/dist/css/bootstrap.min.css`, removendo seletores de classes que não existem nos fontes. Preserva classes dinâmicas carousel/dropdown/active/show/fade/collapse e seletores complexos que não possam ser classificados com segurança. Não processa/remodela CSS da aplicação, Material ou SweetAlert. Fontes são dependências explícitas do plugin para invalidar o cache em novas classes. Dois testes comprovam que CSS da aplicação permanece byte a byte igual e que os estados dinâmicos Bootstrap/visually-hidden são preservados. Não foi deixada dependência PurgeCSS: seu glob vulnerável e o problema de descoberta de arquivos foram identificados durante a preparação; o plugin usa leitura nativa e parser de seletores.
- O mesmo SCSS de autenticação era importado por login/cadastro, recuperação e redefinição, repetindo overrides Material nos três chunks. Extraídas essas regras para `auth-material.css`, compartilhadas e **restritas ao host `.box-auth-surface`**, mantendo a especificidade dos seletores. Eliminado `::ng-deep` dessa área; demais páginas não recebem as regras. O CSS de autenticação caiu de cerca de **15,94 kB para 11,21 kB**, enquanto recuperação/reset também perderam as cópias repetidas. Isso é reutilização real, não mudança de orçamento.
- Capas dos slides 2 e 3 usam loading lazy; a primeira conserva eager/fetchpriority high. Fotos, URLs, proporções, ordem das galerias, arquivos comerciais e vínculos PostgreSQL permanecem intactos. ProductMedia e categorias já possuem lazy loading; a imagem principal do detalhe continua prioritária. O vídeo de login já respeita as regras existentes de habilitação/reduced-motion e foi preservado.

### Comparação do build final

| Medida | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| Inicial total | 960,51 kB | **454,60 kB** | **−52,67%** |
| JavaScript inicial, incluindo scripts/polyfills | 677.460 bytes | **367.184 bytes** | **−45,80%** |
| CSS global | 283.050 bytes | **87.416 bytes** | **−69,12%** |
| Transferência inicial estimada pelo build | 209,16 kB | **119,72 kB** | aproximadamente −42,76% |
| Main | 88.084 bytes | aproximadamente **8,47 kB** | aproximadamente −90% |
| Maior chunk lazy administrativo | 228.415 bytes | **228.535 bytes** | +120 bytes |
| CSS autenticação | aproximadamente 15,94 kB | **11,21 kB** | aproximadamente −30% |

Build final aprovado com o orçamento original de 500 kB. Avisos removidos: bundle inicial, CommonJS, seletores Bootstrap e CSS autenticação. **Resta um aviso: Promoções 15,77 kB, acima do aviso de 14 kB e abaixo do erro de 16 kB.** Inspeção demonstrou que os seletores repetidos de Promoções complementam propriedades ou representam breakpoints diferentes; não foram apagados como se fossem duplicações. Não foi alterado o design, deslocado CSS sem reutilização real nem aumentado o limite para silenciar o aviso. A pequena variação decorre de rótulos acessíveis preservando o estilo.

### Lint, tipos e qualidade

Configurado `npm run lint` com ESLint 9, typescript-eslint 8 e Angular ESLint 19 compatível com Angular 19/TypeScript 5.7. Regras recommended TypeScript/Angular e acessibilidade de templates; imports/variáveis sem uso e `any` são erros. Components Material customizados são declarados como controles reais na regra de labels, sem desativar a regra. `--max-warnings=0`.

Primeira execução encontrou 45 problemas (43 erros e dois avisos). Corrigidos pontualmente: imports mortos, callbacks sem parâmetro usado, tipos de respostas opacas `unknown`, fixtures tipadas nos testes, interfaces OnInit, nomes de classes de fixtures e rótulos associados. O escape do menu agora é tratado por HostListener sem handler num container não focável. Removido autofocus estático dos diálogos nativos, que já focam automaticamente o primeiro controle e conservam Escape/retorno. Rótulos de grupos Material mantêm aria-labelledby; passam a span visualmente equivalente quando não são labels de controles HTML nativos.

O teste novo do alerta inicialmente não compilou devido à sobrecarga de `Swal.fire` interpretada pelo spy. Corrigida a tipagem de teste, sem enfraquecer o tipo da aplicação. A validação final executou **328/328** testes com sucesso. O runner E2E também foi corrigido para não deixar marcador stop se o próprio script já havia encerrado o servidor.

Componentes de produção auditados continuam com HTML/CSS externos. Inline templates encontrados são fixtures de testes. Loops/Signals, guards, Reactive Forms e cancelamentos existentes preservados; nenhuma refatoração artificial de páginas. No serviço de alertas legado, dados interpolados em html (e-mail, CPF e nomes de campos) agora são escapados; dois testes de regressão verificam que markup não é executável e o link de login permanece.

### Segurança, backend e PostgreSQL

Proteções existentes revisadas: middleware admin no servidor, requests limitados/decodificação estrita, autorização de uploads, MIME real JPEG/PNG/WebP e limite de 10 MB, nomes de arquivo gerados, remoção de arquivo se o registro falhar, parametrização SQL, allowlists de ordenação, arquivamento para produtos históricos, SKU único/estável e imagens por produto/variante. Relatórios usam uma instrução SQL para linhas/total/indicadores; exportações preservam limite, filtros, BOM e proteção contra fórmulas e não expõem lista de clientes.

Compras travam carrinho/produto e variantes; cancelamento trava pedido e só repõe estoque uma vez. Testes completos cobrem última unidade, operações simultâneas, idempotência de checkout/cancelamento, preço histórico, descontos expirados e preservação de vínculos. Nenhuma mudança comercial/contratual no backend foi necessária nesta auditoria.

`EXPLAIN (ANALYZE, FORMAT JSON)` somente leitura nas agregações representativas do principal: inventário **0,740 ms de execução / 11,581 ms de planejamento**; pedidos de 30 dias **0,087 ms / 6,223 ms**. Valores de uma execução no catálogo demonstrativo, não benchmark de carga ou garantia de escala. Não houve evidência para novo índice no tamanho atual; nenhum índice/migration foi criado. Listagens existentes usam paginação no servidor; não foi introduzido N+1. Manter observação de planos quando o volume crescer.

Atualizações transitivas compatíveis de segurança em `proxy-addr`, `shell-quote` e `websocket-driver`, sem upgrade major nem `audit fix --force`. Também verificadas atualizações compatíveis disponíveis para tar/piscina. **O inventário npm ainda possui 67 alertas: 2 baixos, 27 moderados, 36 altos e 2 críticos**, estes últimos em ferramentas transitivas de build (`piscina` e versões de `tar`). O npm propõe trocar Angular CLI/build para major 22 para resolver a árvore completa; isso não foi aplicado numa auditoria de preservação do Angular 19. **Com omit=dev: 20 alertas (1 baixo, 10 moderados, 9 altos), sem críticos.** A lista inclui dependências declaradas que não são necessariamente entregues no browser, mas não foi tratada como falsa positiva sem análise adicional. A ausência de críticos em produção não significa ausência de vulnerabilidades. Atualizar a plataforma/dependências é uma pendência real a planejar e validar separadamente.

### Validação automatizada e funcional

- **Angular completo: 328/328 aprovados** após as correções; baseline 326, dois testes de escape adicionados.
- **Go completo:** `CART_TEST_LOCAL=1 go test ./... -count=1` aprovado antes/depois. Pacotes importador, handlers, middleware, pagination, routes e services; schemas isolados para escritas. **go vet ./... aprovado** separadamente.
- **Lint aprovado**, zero erros/avisos. **TypeScript app/spec com --noEmit aprovados**.
- **Build de produção aprovado**, 454,60 kB, apenas aviso CSS Promoções descrito.
- **Seis testes Node aprovados**: quatro de segurança/limpeza dos artefatos e dois do plugin Bootstrap.
- **Sete suítes Playwright reais aprovadas**, cada uma em schema próprio: audit.cjs, product-crud.cjs, admin-orders.cjs, admin-orders-states.cjs, admin-customers.cjs, dashboard.cjs e reports.cjs. Login, cadastro, OTP/recovery sem SMTP real, Conta/endereços, catálogo/filtros/ordenação, variantes, SKUs, estoque, carrinho, frete/CEP, checkout, avaliações/moderação, cancelamento/reposição, CRUD produtos/categorias/marcas/CEP, imagens/galerias, campanhas/publicação, Dashboard/Métricas, Clientes, Relatórios/CSV, autorização e recuperação HTTP.
- A suíte geral navegou por 12 telas em **1440, 1024, 768 e 390 px**, incluindo dropdown e modal. As suítes de CRUD/Pedidos/Clientes/Dashboard/Relatórios repetiram os fluxos específicos nas quatro larguras. Falhas HTTP e respostas antigas são explicitamente injetadas apenas para exercitar recuperação/cancelamento; dados e gravações usam API Go real isolada.
- **32 verificações públicas somente leitura aprovadas** contra o catálogo principal: seis categorias + galeria/zoom + foco, nas quatro larguras. Escritas de rede bloqueadas nesse script; fotografias reais foram conferidas sem alteração.
- **17 verificações adicionais de qualidade visual aprovadas**: carrossel ESM real com mudança de indicador e seta de teclado, imagens lazy, Home/login/Promoções/Relatórios nas quatro larguras, sem overflow do documento ou pageerror. Capturas revisadas visualmente, com login e cards/menus mantendo a composição aprovada. Os fundos neutros das fotos de produtos nas capturas isoladas pertencem à fixture, não substituem o catálogo real.
- **axe WCAG2A/AA/2.1AA: zero violações detectadas** em Home, login, Promoções e Relatórios no desktop. Não constitui certificação WCAG completa nem teste de leitor de tela humano. As demais telas tiveram inspeção estática, teclado e regressão funcional, não uma varredura axe integral.

### Evidências finais

Retidas somente oito PNGs e dois JSONs, usando o gerenciador de artefatos existente:

- [Suítes funcionais e integridade por schema](docs/validacao-visual/security-2026-11-21/regressao.json).
- [Qualidade visual e axe](docs/validacao-visual/security-2026-11-21/qualidade.json).
- [Home desktop](docs/validacao-visual/quality-2026-11-21/home-1440.png) e [mobile](docs/validacao-visual/quality-2026-11-21/home-390.png).
- [Login desktop](docs/validacao-visual/quality-2026-11-21/login-1440.png) e [mobile](docs/validacao-visual/quality-2026-11-21/login-390.png).
- [Promoções desktop](docs/validacao-visual/security-2026-11-21/promotion-1440.png) e [mobile](docs/validacao-visual/security-2026-11-21/promotion-390.png).
- [Relatórios desktop](docs/validacao-visual/security-2026-11-21/report-1440.png) e [mobile](docs/validacao-visual/security-2026-11-21/report-390.png).

### Arquivos criados/alterados nesta etapa

- `frontend/.postcssrc.json`.
- `frontend/angular.json`.
- `frontend/e2e/quality.cjs`.
- `frontend/e2e/regression.cjs`.
- `frontend/eslint.config.cjs`.
- `frontend/package-lock.json`.
- `frontend/package.json`.
- `frontend/src/app/app.config.ts`.
- `frontend/src/app/components/admin/admin-routing.module.ts`.
- `frontend/src/app/components/admin/admin/admin.component.html`.
- `frontend/src/app/components/admin/admin/admin.component.ts`.
- `frontend/src/app/components/admin/customers/admin-customer-detail.component.spec.ts`.
- `frontend/src/app/components/admin/customers/admin-customers.component.spec.ts`.
- `frontend/src/app/components/admin/dashboard/dashboard.component.spec.ts`.
- `frontend/src/app/components/admin/experience-reviews.component.html`.
- `frontend/src/app/components/admin/experience-reviews.component.scss`.
- `frontend/src/app/components/admin/orders/admin-order-detail.component.spec.ts`.
- `frontend/src/app/components/admin/orders/admin-orders.component.spec.ts`.
- `frontend/src/app/components/admin/shipping-ranges.component.ts`.
- `frontend/src/app/components/carousel/carousel.component.html`.
- `frontend/src/app/components/carousel/carousel.component.ts`.
- `frontend/src/app/core/services/auth.service.ts`.
- `frontend/src/app/core/services/promo.service.ts`.
- `frontend/src/app/core/services/sweet-alert.service.spec.ts`.
- `frontend/src/app/core/services/sweet-alert.service.ts`.
- `frontend/src/app/features/add-to-promotion/add-to-promotion.component.spec.ts`.
- `frontend/src/app/features/authorization/register/register.component.scss`.
- `frontend/src/app/features/authorization/register/register.component.spec.ts`.
- `frontend/src/app/features/authorization/register/register.component.ts`.
- `frontend/src/app/features/catalog/components/product-card/product-card.component.html`.
- `frontend/src/app/features/catalog/components/product-gallery/product-gallery.component.html`.
- `frontend/src/app/features/catalog/components/product-price/product-price.component.spec.ts`.
- `frontend/src/app/features/catalog/pages/product-detail/product-detail.component.spec.ts`.
- `frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.ts`.
- `frontend/src/app/features/create-promotion/create-promotion.component.scss`.
- `frontend/src/app/features/create-promotion/create-promotion.component.html`.
- `frontend/src/app/features/create-promotion/create-promotion.component.spec.ts`.
- `frontend/src/app/features/favorites/favorites.component.spec.ts`.
- `frontend/src/app/features/home/home.component.ts`.
- `frontend/src/app/features/newsletter/newsletter.component.ts`.
- `frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.ts`.
- `frontend/src/app/features/product-manage/register/product-create/product-create.component.ts`.
- `frontend/src/app/features/promo-grid/promo-grid.component.spec.ts`.
- `frontend/src/app/shared/accessibility/focus-styles.spec.ts`.
- `frontend/src/app/shared/css/auth-material.scss`.
- `frontend/src/app/shared/custom-alert/custom-alert.component.html`.
- `frontend/src/app/shared/custom-alert/custom-alert.component.scss`.
- `frontend/src/app/shared/custom-alert/custom-alert.component.ts`.
- `frontend/src/app/shared/forgot-password/forgot-password.component.spec.ts`.
- `frontend/src/app/shared/forgot-password/forgot-password.component.ts`.
- `frontend/src/app/shared/reset-password/reset-password.component.spec.ts`.
- `frontend/src/app/shared/reset-password/reset-password.component.ts`.
- `frontend/src/styles.scss`.
- `frontend/src/types/bootstrap.d.ts`.
- `frontend/src/types/sweetalert2.d.ts`.
- `frontend/tools/bootstrap-css/index.cjs`.
- `frontend/tools/bootstrap-css/index.test.cjs`.
- `frontend/tools/bootstrap-css/package.json`.

Além dos fontes/configurações listados: `AUDITORIA_FINAL.md` e as dez evidências finais acima. Arquivos CSS existentes não foram renomeados. Não houve edição de código Go de produção, migrations, uploads, imagens comerciais ou documentos acadêmicos.

### Integridade, limpeza e pendências

Todos os sete harnesses de regressão e a última validação visual confirmaram **ISOLATED_SCHEMA_REMOVED** e **PRIMARY_COMMERCIAL_STATE_UNCHANGED**, cobrindo usuários/endereços, catálogo/variantes/imagens, promoções/participantes, carrinhos, pedidos/itens/cancelamentos e versão. Conferência final somente leitura confirmou **migration 50, dirty=false**. Nenhuma migration aplicada, nenhum registro comercial real criado/editado/excluído. Backend principal mantido; não precisava reinício por alterações exclusivamente Angular/configuração de build.

Ferramentas Playwright/axe instaladas apenas no diretório temporário da auditoria; logs, stats brutos, helper Go de leitura e capturas intermediárias removidos ao final. Servidor 4206/API 8086 de testes encerrados. Fontes dos testes/configuração de lint/plugin CSS e evidências finais preservados. Frontend principal 4200 e backend 8080 continuam acessíveis. Não houve exclusão externa ao repositório.

**Pendências reais:** aviso CSS Promoções 15,77 kB e atualização de dependências vulneráveis, incluindo plataforma Angular 19. Auditoria e regressão foram executadas; não se declara “zero vulnerabilidades”, conformidade WCAG integral nem performance validada sob carga de produção. Não existe pendência funcional reproduzida nos testes realizados, mas esses limites permanecem explícitos.

## Correção de vulnerabilidades — validação final em 21/11/2026

### Alterações aplicadas e limites

Correções compatíveis aplicadas, instalação limpa reproduzida e validações concluídas, com pendências de segurança explicitadas abaixo. Não se declara zero vulnerabilidades nem certificação integral de acessibilidade.

Angular runtime/compiler/animations/localize alinhados em 19.2.25; CLI/build 19.2.27; Material/CDK 19.2.19, TypeScript 5.7.3, RxJS 7.8.2, zone.js 0.15.1, Bootstrap 5.3.8, SweetAlert2 11.22.5 e jwt-decode 4.0.0 preservados. Express atualizado para 4.22.3. Versões diretas não relacionadas fixadas nas versões já instaladas para evitar atualização colateral ao regenerar o lock. Animações/localize, antes resolvidos transitivamente com peers exatos, foram explicitados para manter alinhamento. Lock gerado exclusivamente por npm; sem force, legacy-peer-deps ou edição manual do lock.

Overrides compatíveis: Piscina 4.9.4, PostCSS 8.5.33, http-proxy-middleware 3.0.11, webpack-dev-middleware 7.4.6, webpack-dev-server 5.2.7, Vite 6.4.6, Babel core 7.29.13 e esbuild 0.28.1 somente para a cópia anteriormente 0.28.0. Cópias esbuild 0.25.12 utilizadas pelo Vite preservadas. Overrides corrigem versões fixadas pelas ferramentas e foram verificados por instalação limpa, compilação, testes e navegador; não declaram compatibilidade com uma major diferente.

Backend: toolchain recomendada e binário ativo Go 1.24.13; jwt/v5 5.3.1; x/crypto 0.48.0. Não houve alteração de endpoints, contratos, migrations ou código comercial Go nesta etapa.

Promoções: removidas declarações CSS sobrescritas de preview, padding de upload e tabs; consolidado o padding efetivo das tabs. CSS compilado 15,77 → 15,54 kB; aviso de 14 kB mantido, limite de erro 16 kB preservado. Não foi reduzido agressivamente para evitar risco visual. Bundle inicial 454,60 → 454,84 kB. Capturas desktop/mobile anteriores e novas conferidas; responsividade também exercitada em 1024 e 768 px.

### Testes e evidências desta rodada

- `npm ci` aprovado novamente depois do último grupo de patches; npm audit total 67 → 42; produção 20 → 13. Dependências npm não estão livres de advisories.
- 42 testes direcionados de autenticação aprovados após o primeiro alinhamento. Suíte completa Angular: 328 aprovados, inclusive reexecução após os patches finais.
- ESLint sem warnings aprovado; TypeScript sem emissão aprovado; seis testes Node de helpers de evidências e CSS aprovados.
- `CART_TEST_LOCAL=1 go test ./... -count=1` e `go vet ./...` aprovados. Integrações PostgreSQL executadas em schemas isolados.
- Build de produção aprovado após o último `npm ci`; apenas aviso CSS Promoções citado acima.
- Playwright/Chromium local, sandbox habilitado: sete suítes (geral, CRUD produtos, pedidos, estados de pedidos, clientes, dashboard e relatórios), com cadastros/edições/exclusões seguras, imagens, variantes, preços/estoques, SKU, campanhas/descontos, favoritos, carrinho, checkout, cancelamento/reposição, recuperação por OTP e avaliações, autorização, estados de erro e vazio, modais e teclado. Layouts em 1440/1024/768/390 px.
- Na segunda rodada, um cenário de edição de variantes recebeu PATCH 2xx e excedeu a espera de navegação de 15 s. Reexecução isolada aprovada, incluindo validação explícita do preço/estoque retornados e persistidos, SKU e ID. Espera SPA usa DOMContentLoaded com teto de 30 s. Sem alteração de código funcional para mascarar o timeout; ambas as tentativas estão registradas.
- 17 checks visuais do build final aprovados (Home, login, Promoções, Relatórios e carrossel/teclado), sem overflow ou erros de página. Axe: zero violações nas quatro telas desktop verificadas; isso não substitui auditoria WCAG integral.
- 32 checks públicos somente leitura em seis categorias, detalhe/galeria e foco, nas quatro larguras; escritas HTTP bloqueadas pelo teste.

Evidências finais: `docs/validacao-visual/security-2026-11-21/`: `regressao.json` (inclui timeout e reteste), `qualidade.json`, `public-resultados.json`, `dependencias.json` e capturas finais desktop/mobile. Evidências anteriores preservadas; nenhum documento acadêmico ou imagem comercial removido.

### Integridade e arquivos alterados

Todos os harnesses confirmaram PRIMARY_COMMERCIAL_STATE_UNCHANGED e ISOLATED_SCHEMA_REMOVED, também no reteste. Consulta final somente leitura: migration 50, dirty=false. Nenhuma escrita comercial no banco principal e nenhuma migration nesta etapa. Backend 8080 compilado com Go 1.24.13 e frontend 4200 restaurados: ambos HTTP 200; endpoint administrativo sem sessão retorna 401.

Arquivos alterados nesta etapa:

- `frontend/package.json` e `frontend/package-lock.json`: alinhamento/patches e resolução reprodutível.
- `backend/go.mod` e `backend/go.sum`: toolchain patch, JWT e crypto compatíveis.
- `frontend/src/app/features/create-promotion/create-promotion.component.scss`: consolidação de regras redundantes.
- `frontend/e2e/regression.cjs`, `quality.cjs`, `public-readonly.cjs`: destino opcional de evidências validado pelo helper existente; seleção opcional de suíte no runner.
- `frontend/e2e/product-crud.cjs`: resposta e persistência verificadas explicitamente, espera SPA adequada.
- Este `AUDITORIA_FINAL.md` e evidências finais acima. Binário/logs dos serviços ativos ficam em `db/runtime/security_20261121`, preservados por estarem em uso.

Govulncheck 1.1.4, base oficial de 11/11/2026: advisories de stdlib potencialmente alcançáveis reduziram de 47 para 31; x/crypto apresenta 17 advisories sem função vulnerável chamada pelo projeto, que usa bcrypt. Código estático alcançável não prova exploração; as pendências e os fixes de novas linhas constam abaixo.

### Inventário npm após npm ci final

42 alertas totais: 1 crítico, 8 altos e 33 moderados. Produção: 13 (4 altos, 9 moderados), nenhum crítico. Dependentes afetados também entram nos totais npm; as linhas abaixo identificam advisories diretos.

| Pacote | Versões instaladas afetadas | Relação | Severidade | Advisories | Contexto e decisão |
|---|---|---|---|---|---|
| @angular/common | 19.2.25 | direta | high | [GHSA-48r7-hpm6-gfxm](https://github.com/advisories/GHSA-48r7-hpm6-gfxm); [GHSA-39pv-4j6c-2g6v](https://github.com/advisories/GHSA-39pv-4j6c-2g6v); [GHSA-jhpw-976m-542j](https://github.com/advisories/GHSA-jhpw-976m-542j); [GHSA-p297-fm68-3q8c](https://github.com/advisories/GHSA-p297-fm68-3q8c); [GHSA-jfgx-762w-99vr](https://github.com/advisories/GHSA-jfgx-762w-99vr) | runtime/compilação Angular; CSR sem SSR ativo e sem templates fornecidos por usuários; sem patch nessa linha; nova major exige migração coordenada |
| @angular/compiler | 19.2.25 | direta | high | [GHSA-58w9-8g37-x9v5](https://github.com/advisories/GHSA-58w9-8g37-x9v5); [GHSA-jj27-h5hq-8x99](https://github.com/advisories/GHSA-jj27-h5hq-8x99); [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg) | runtime/compilação Angular; CSR sem SSR ativo e sem templates fornecidos por usuários; sem patch nessa linha; nova major exige migração coordenada |
| @angular/core | 19.2.25 | direta | high | [GHSA-rgjc-h3x7-9mwg](https://github.com/advisories/GHSA-rgjc-h3x7-9mwg); [GHSA-jj27-h5hq-8x99](https://github.com/advisories/GHSA-jj27-h5hq-8x99); [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg) | runtime/compilação Angular; CSR sem SSR ativo e sem templates fornecidos por usuários; sem patch nessa linha; nova major exige migração coordenada |
| @angular/router | 19.2.25 | direta | high | [GHSA-ff3f-86qr-9cv3](https://github.com/advisories/GHSA-ff3f-86qr-9cv3); [GHSA-62vg-58rm-qff7](https://github.com/advisories/GHSA-62vg-58rm-qff7) | runtime/compilação Angular; CSR sem SSR ativo e sem templates fornecidos por usuários; sem patch nessa linha; nova major exige migração coordenada |
| @sigstore/core | 2.0.0 | transitiva | moderate | [GHSA-jfc7-64v2-mr8c](https://github.com/advisories/GHSA-jfc7-64v2-mr8c) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |
| glob | 10.5.0 | transitiva | moderate | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |
| minimatch | 9.0.9 | transitiva | moderate | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |
| pacote | 20.0.0 | transitiva | high | [GHSA-w4pp-8pjf-rmxw](https://github.com/advisories/GHSA-w4pp-8pjf-rmxw) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |
| serialize-javascript | 6.0.2 | transitiva | high | [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq); [GHSA-qj8w-gfj5-8c6v](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v); [GHSA-m5mm-p8h7-m29v](https://github.com/advisories/GHSA-m5mm-p8h7-m29v) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |
| sigstore | 3.1.0 | transitiva | high | [GHSA-52v5-jr5w-gjxr](https://github.com/advisories/GHSA-52v5-jr5w-gjxr) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |
| tar | 6.2.1 | transitiva | critical | [GHSA-34x7-hfp2-rc4v](https://github.com/advisories/GHSA-34x7-hfp2-rc4v); [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97); [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx); [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96); [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256); [GHSA-r6q2-hw4h-h46w](https://github.com/advisories/GHSA-r6q2-hw4h-h46w); [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh); [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp); [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw); [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w); [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j); [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |
| uuid | 8.3.2 | transitiva | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | build/desenvolvimento; não é endpoint comercial; fix exige major na cadeia ou atualização do pacote pai; não forçada |

### Govulncheck — funções potencialmente alcançáveis remanescentes

Toolchain analisada: Go 1.24.13. São caminhos estáticos de chamada; condições específicas de TLS, HTTP/2, templates ou entradas hostis não foram exploradas contra o banco principal. A linha 1.24 não contém os fixes abaixo. Avaliar migração para uma linha suportada, recompilar, testar contratos HTTP/TLS/SMTP, PostgreSQL, tokens e E2E antes de ativar. Não foi aplicada troca de linha automaticamente.

| Advisory | Descrição | Versões corrigidas informadas |
|---|---|---|
| [GO-2026-4601](https://pkg.go.dev/vuln/GO-2026-4601) | Incorrect parsing of IPv6 host literals in net/url | 1.25.8, 1.26.1 |
| [GO-2026-4602](https://pkg.go.dev/vuln/GO-2026-4602) | FileInfo can escape from a Root in os | 1.25.8, 1.26.1 |
| [GO-2026-4603](https://pkg.go.dev/vuln/GO-2026-4603) | URLs in meta content attribute actions are not escaped in html/template | 1.25.8, 1.26.1 |
| [GO-2026-4865](https://pkg.go.dev/vuln/GO-2026-4865) | JsBraceDepth Context Tracking Bugs (XSS) in html/template | 1.25.9, 1.26.2 |
| [GO-2026-4870](https://pkg.go.dev/vuln/GO-2026-4870) | Unauthenticated TLS 1.3 KeyUpdate record can cause persistent connection retention and DoS in crypto/tls | 1.25.9, 1.26.2 |
| [GO-2026-4946](https://pkg.go.dev/vuln/GO-2026-4946) | Inefficient policy validation in crypto/x509 | 1.25.9, 1.26.2 |
| [GO-2026-4947](https://pkg.go.dev/vuln/GO-2026-4947) | Unexpected work during chain building in crypto/x509 | 1.25.9, 1.26.2 |
| [GO-2026-4971](https://pkg.go.dev/vuln/GO-2026-4971) | Panic in Dial and LookupPort when handling NUL byte on Windows in net | 1.25.10, 1.26.3 |
| [GO-2026-4977](https://pkg.go.dev/vuln/GO-2026-4977) | Quadratic string concatenation in consumePhrase in net/mail | 1.25.10, 1.26.3 |
| [GO-2026-4980](https://pkg.go.dev/vuln/GO-2026-4980) | Escaper bypass leads to XSS in html/template | 1.25.10, 1.26.3 |
| [GO-2026-4982](https://pkg.go.dev/vuln/GO-2026-4982) | Bypass of meta content URL escaping causes XSS in html/template | 1.25.10, 1.26.3 |
| [GO-2026-4986](https://pkg.go.dev/vuln/GO-2026-4986) | Quadratic string concatentation in consumeComment in net/mail | 1.25.10, 1.26.3 |
| [GO-2026-5037](https://pkg.go.dev/vuln/GO-2026-5037) | Inefficient candidate hostname parsing in crypto/x509 | 1.25.11, 1.26.4 |
| [GO-2026-5039](https://pkg.go.dev/vuln/GO-2026-5039) | Arbitrary inputs are included in errors without any escaping in net/textproto | 1.25.11, 1.26.4 |
| [GO-2026-5856](https://pkg.go.dev/vuln/GO-2026-5856) | Invoking Encrypted Client Hello privacy leak in crypto/tls | 1.25.12, 1.26.5, 1.27.0-rc.2 |
| [GO-2026-5972](https://pkg.go.dev/vuln/GO-2026-5972) | Enforce maximum recursion depth in encoding/asn1 | 1.25.13, 1.26.6, 1.27.0-rc.3 |
| [GO-2026-6089](https://pkg.go.dev/vuln/GO-2026-6089) | Apply ReadHeaderTimeout when doing unencrypted HTTP/2 check in net/http | 1.25.13, 1.26.6, 1.27.0-rc.3 |
| [GO-2026-6090](https://pkg.go.dev/vuln/GO-2026-6090) | Limit handshake messages we are willing to accept post-handshake in crypto/tls | 1.25.13, 1.26.6, 1.27.0-rc.3 |
| [GO-2026-6091](https://pkg.go.dev/vuln/GO-2026-6091) | Fix Javascript regexp context tracking in html/template | 1.25.13, 1.26.6, 1.27.0-rc.3 |
| [GO-2026-6599](https://pkg.go.dev/vuln/GO-2026-6599) | Reset context tracking on consecutive template expressions in html/template | 1.26.9, 1.27.2 |
| [GO-2026-6600](https://pkg.go.dev/vuln/GO-2026-6600) | Recognize yield as regexp preceder keyword in html/template | 1.26.9, 1.27.2 |
| [GO-2026-6603](https://pkg.go.dev/vuln/GO-2026-6603) | HTTP/2 server memory exhaustion due to Trailer headers in net/http | 0.60.0, 1.26.9, 1.27.2 |
| [GO-2026-6607](https://pkg.go.dev/vuln/GO-2026-6607) | Reject malformed ECH outer extension references in crypto/tls | 1.26.9, 1.27.2 |
| [GO-2026-6608](https://pkg.go.dev/vuln/GO-2026-6608) | Memory limit bypass when parsing MIME headers in net/textproto, mime/multipart | 1.26.9, 1.27.2 |
| [GO-2026-6609](https://pkg.go.dev/vuln/GO-2026-6609) | Lack of limit on size of parsed Range headers in net/http | 1.26.9, 1.27.2 |
| [GO-2026-6611](https://pkg.go.dev/vuln/GO-2026-6611) | Excessive CPU consumption from repeated initial window changes in net/http | 0.60.0, 1.26.9, 1.27.2 |
| [GO-2026-6612](https://pkg.go.dev/vuln/GO-2026-6612) | Double flow control refund on HTTP/2 server streams in net/http | 0.60.0, 1.26.9, 1.27.2 |
| [GO-2026-6613](https://pkg.go.dev/vuln/GO-2026-6613) | HTTP/1 server connection desynchronization after 2xx CONNECT response in net/http | 1.26.9, 1.27.2 |
| [GO-2026-6617](https://pkg.go.dev/vuln/GO-2026-6617) | HTTP/2 server crash due to HPACK encoder race in net/http | 0.60.0, 1.26.9, 1.27.2 |
| [GO-2026-6809](https://pkg.go.dev/vuln/GO-2026-6809) | Distrust compromised intermediate certificates in crypto/x509 | 1.26.10, 1.27.3 |
| [GO-2026-6859](https://pkg.go.dev/vuln/GO-2026-6859) | HTTP/1 server crash due to MaxBytesReader header race in net/http | 1.26.11, 1.27.4 |

### Atualizações major não executadas

Não foi utilizada correção forçada. As propostas abaixo são do npm audit para a cadeia dependente, e não uma garantia de compatibilidade ou a menor versão corrigida de cada folha. Os advisories vinculados no inventário contêm os intervalos exatos. Overrides patch/minor já aplicados foram exercitados por compilação, testes e navegador.

| Pacote com advisory | Proposta automática npm, não aplicada |
|---|---|
| @angular/common | @angular/common 22.3.0 (major) |
| @angular/compiler | @angular/compiler 22.3.0 (major) |
| @angular/core | @angular/core 22.3.0 (major) |
| @angular/router | @angular/router 22.3.0 (major) |
| @sigstore/core | @angular/cli 22.3.0 (major) |
| glob | @angular/cli 22.3.0 (major) |
| minimatch | @angular/cli 22.3.0 (major) |
| pacote | @angular/cli 22.3.0 (major) |
| serialize-javascript | @angular-devkit/build-angular 22.3.0 (major) |
| sigstore | @angular/cli 22.3.0 (major) |
| tar | @angular/cli 22.3.0 (major) |
| uuid | @angular-devkit/build-angular 22.3.0 (major) |

Impacto Angular: uma nova major requer alinhar runtime, compiler/localize/animations, CLI/build, Material/CDK e bibliotecas de UI, verificar TypeScript/Node suportados, migrações oficiais e regressão completa de autenticação, formulários, overlays, carrinho, catálogo e administração. Benefício: correções indisponíveis no Angular 19 e retorno a uma linha suportada. Não atualizar componentes isolados para major diferente nem usar overrides para declarar essa compatibilidade.

Impacto Go: sair de 1.24 exige recompilar binário e ferramentas, verificar comportamento HTTP/TLS, SMTP, PostgreSQL e JWT e repetir integração/E2E; não exige migration por si só. Os advisories remanescentes listam correções até Go 1.26.11/1.27.4. Benefício: corrigir funções da biblioteca padrão potencialmente alcançáveis e utilizar linha suportada. Não foi alterada automaticamente a linha Go.

Exposição: o crítico tar e alertas de pacote/assinatura/serialização/glob pertencem ao processo de instalação/build/desenvolvimento, não a rotas públicas Go. Continuam relevantes se arquivos, pacotes, padrões ou configuração não confiáveis chegarem às ferramentas. Isso não equivale a risco zero. O runtime browser mantém os alertas Angular indicados; CSR sem SSR/transfer cache ativo elimina precondições específicas de SSR, sem eliminar todos os riscos do framework.

### Limpeza final desta etapa

Removidos 277 arquivos temporários (40.51 MiB): ferramentas Playwright/axe/govulncheck temporárias, logs encerrados, caches auxiliares, backups intermediários de lock/CSS e JSON duplicado do reteste já consolidado. Servidores temporários 4206/8086 encerrados; serviços principais 4200/8080 preservados. Não foram limpos diretórios externos, uploads, migrations, backups permanentes, documentos acadêmicos ou imagens do catálogo.


## Auditoria individual dos 42 alertas e Go 1.26.11 — 21/11/2026

Esta seção é a atualização vigente; resultados acima registram rodadas anteriores. Validação final concluída, com riscos npm residuais explicitamente mantidos.

### Contagens e correções compatíveis

Os 42 registros npm representam pacotes afetados, incluindo propagação entre dependentes; correspondem a 32 advisories únicos. Antes/depois: 42 → 42 (1 crítico, 8 altos, 33 moderados, zero baixos). `--omit=dev`: 13 → 13 (4 altos, 9 moderados). Diferença de grafo de desenvolvimento: 29 (1 crítico, 4 altos, 24 moderados). Não confundir presença no grafo de produção com função executada no navegador.

Não há patch/minor adicional para os intervalos afetados atualmente instalados. Angular runtime 19.2.25 e CLI/build 19.2.27 já são os últimos patches dessa major consultados no registro. As folhas corrigidas exigem majors diferentes das aceitas pelos respectivos pais. Nenhum novo override, alteração manual de lock, audit fix forçado ou remoção de dependência necessária foi aplicado. SHA-256 do lock antes/depois de npm ci idêntico: F418FD1E436C2691CBF0EA47C61FB1E1608C0B9B84F2FC2D2F440D20864D2CA7.

Correção de ambiente: criado `frontend/.nvmrc` com Node 22.23.5, dentro da matriz do Angular 19. Node 24.15.0 anterior não é suportado oficialmente pelo Angular 19. Validação e frontend local usam Node 22 sem substituir a instalação global. Isso não reduz artificialmente a contagem npm. [Matriz oficial Angular](https://angular.dev/reference/versions).

### Matriz individual dos 42 registros npm

Classificações são cumulativas. “Atualização major necessária” não significa correção autorizada. A lista de dependências de origem vem de npm explain, filtrada para os nós realmente afetados. Advisory herdado identifica a aresta responsável; as precondições de cada folha estão na tabela seguinte.

| # | Pacote e versão afetada | Severidade npm | Introduzido por | Ambiente | Classificação / justificativa | Origem do alerta |
|---|---|---|---|---|---|---|
| 1 | `@angular-devkit/build-angular` 19.2.27 | moderate | frontend  | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@angular-devkit/build-webpack` (herdado); `@angular/build` (herdado); `@angular/compiler-cli` (herdado); `@angular/localize` (herdado); `@ngtools/webpack` (herdado); `copy-webpack-plugin` (herdado); `webpack-dev-server` (herdado) |
| 2 | `@angular-devkit/build-webpack` 0.1902.27 | moderate | @angular-devkit/build-angular 19.2.27 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `webpack-dev-server` (herdado) |
| 3 | `@angular/animations` 19.2.25 | moderate | @angular/platform-browser 19.2.25; frontend ; ngx-bootstrap 19.0.2 | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/common` (herdado); `@angular/core` (herdado) |
| 4 | `@angular/build` 19.2.27 | moderate | @angular-devkit/build-angular 19.2.27 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@angular/compiler` (herdado); `@angular/compiler-cli` (herdado); `@angular/localize` (herdado) |
| 5 | `@angular/cli` 19.2.27 | high | frontend  | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `pacote` (herdado) |
| 6 | `@angular/common` 19.2.25 | high | @angular/animations 19.2.25; @angular/cdk 19.2.19; @angular/forms 19.2.25; @angular/material 19.2.19; @angular/platform-browser 19.2.25; @angular/platform-browser-dynamic 19.2.25; @angular/router 19.2.25; @ng-bootstrap/ng-bootstrap 18.0.0; @ng-icons/core 31.4.0; frontend ; lucide-angular 0.542.0; ngx-bootstrap 19.0.2; ngx-mask 19.0.7; ngx-owl-carousel-o 19.0.2 | Produção (grafo npm) | Risco de produção; atualização major necessária; exploração local não demonstrada | `@angular/core` (herdado); [GHSA-48r7-hpm6-gfxm](https://github.com/advisories/GHSA-48r7-hpm6-gfxm); [GHSA-39pv-4j6c-2g6v](https://github.com/advisories/GHSA-39pv-4j6c-2g6v); [GHSA-jhpw-976m-542j](https://github.com/advisories/GHSA-jhpw-976m-542j); [GHSA-p297-fm68-3q8c](https://github.com/advisories/GHSA-p297-fm68-3q8c); [GHSA-jfgx-762w-99vr](https://github.com/advisories/GHSA-jfgx-762w-99vr) |
| 7 | `@angular/compiler` 19.2.25 | high | @angular/build 19.2.27; @angular/compiler-cli 19.2.25; @angular/localize 19.2.25; @angular/platform-browser-dynamic 19.2.25; frontend  | Produção (grafo npm); execução observada na compilação | Risco de desenvolvimento; atualização major necessária; exploração local não demonstrada | [GHSA-58w9-8g37-x9v5](https://github.com/advisories/GHSA-58w9-8g37-x9v5); [GHSA-jj27-h5hq-8x99](https://github.com/advisories/GHSA-jj27-h5hq-8x99); [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg) |
| 8 | `@angular/compiler-cli` 19.2.25 | moderate | @angular-devkit/build-angular 19.2.27; @angular/build 19.2.27; @angular/localize 19.2.25; @ngtools/webpack 19.2.27; frontend  | Produção (grafo npm); execução observada na compilação | Risco de desenvolvimento; atualização major necessária | `@angular/compiler` (herdado) |
| 9 | `@angular/core` 19.2.25 | high | @angular/animations 19.2.25; @angular/cdk 19.2.19; @angular/common 19.2.25; @angular/forms 19.2.25; @angular/material 19.2.19; @angular/platform-browser 19.2.25; @angular/platform-browser-dynamic 19.2.25; @angular/router 19.2.25; @ng-bootstrap/ng-bootstrap 18.0.0; @ng-icons/core 31.4.0; frontend ; lucide-angular 0.542.0; ngx-bootstrap 19.0.2; ngx-mask 19.0.7; ngx-owl-carousel-o 19.0.2 | Produção (grafo npm) | Risco de produção; atualização major necessária; exploração local não demonstrada | [GHSA-rgjc-h3x7-9mwg](https://github.com/advisories/GHSA-rgjc-h3x7-9mwg); [GHSA-jj27-h5hq-8x99](https://github.com/advisories/GHSA-jj27-h5hq-8x99); [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg) |
| 10 | `@angular/forms` 19.2.25 | moderate | @angular/material 19.2.19; @ng-bootstrap/ng-bootstrap 18.0.0; frontend ; ngx-bootstrap 19.0.2; ngx-mask 19.0.7 | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/common` (herdado); `@angular/core` (herdado); `@angular/platform-browser` (herdado) |
| 11 | `@angular/localize` 19.2.25 | moderate | @angular-devkit/build-angular 19.2.27; @angular/build 19.2.27; @ng-bootstrap/ng-bootstrap 18.0.0; frontend  | Produção (grafo npm); execução observada na compilação | Risco de desenvolvimento; atualização major necessária | `@angular/compiler` (herdado); `@angular/compiler-cli` (herdado) |
| 12 | `@angular/platform-browser` 19.2.25 | moderate | @angular/forms 19.2.25; @angular/material 19.2.19; @angular/platform-browser-dynamic 19.2.25; @angular/router 19.2.25; frontend  | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/animations` (herdado); `@angular/common` (herdado); `@angular/core` (herdado) |
| 13 | `@angular/platform-browser-dynamic` 19.2.25 | moderate | frontend  | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/common` (herdado); `@angular/compiler` (herdado); `@angular/core` (herdado); `@angular/platform-browser` (herdado) |
| 14 | `@angular/router` 19.2.25 | high | frontend  | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/common` (herdado); `@angular/core` (herdado); `@angular/platform-browser` (herdado); [GHSA-ff3f-86qr-9cv3](https://github.com/advisories/GHSA-ff3f-86qr-9cv3); [GHSA-62vg-58rm-qff7](https://github.com/advisories/GHSA-62vg-58rm-qff7) |
| 15 | `@ng-bootstrap/ng-bootstrap` 18.0.0 | moderate | frontend  | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/common` (herdado); `@angular/core` (herdado); `@angular/forms` (herdado); `@angular/localize` (herdado) |
| 16 | `@ngtools/webpack` 19.2.27 | moderate | @angular-devkit/build-angular 19.2.27 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@angular/compiler-cli` (herdado) |
| 17 | `@npmcli/package-json` 6.2.0 | moderate | @npmcli/run-script 9.1.0; pacote 20.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `glob` (herdado) |
| 18 | `@npmcli/run-script` 9.1.0 | moderate | pacote 20.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@npmcli/package-json` (herdado); `node-gyp` (herdado) |
| 19 | `@sigstore/core` 2.0.0 | moderate | @sigstore/sign 3.1.0; @sigstore/verify 2.1.1; sigstore 3.1.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | [GHSA-jfc7-64v2-mr8c](https://github.com/advisories/GHSA-jfc7-64v2-mr8c) |
| 20 | `@sigstore/sign` 3.1.0 | moderate | sigstore 3.1.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@sigstore/core` (herdado); `make-fetch-happen` (herdado) |
| 21 | `@sigstore/tuf` 3.1.1 | moderate | sigstore 3.1.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `tuf-js` (herdado) |
| 22 | `@sigstore/verify` 2.1.1 | moderate | sigstore 3.1.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@sigstore/core` (herdado) |
| 23 | `@tufjs/models` 3.0.1 | moderate | tuf-js 3.1.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `minimatch` (herdado) |
| 24 | `cacache` 19.0.1 | moderate | make-fetch-happen 14.0.3; pacote 20.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `glob` (herdado) |
| 25 | `copy-webpack-plugin` 12.0.2 | moderate | @angular-devkit/build-angular 19.2.27 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `serialize-javascript` (herdado) |
| 26 | `glob` 10.5.0 | moderate | @npmcli/package-json 6.2.0; cacache 19.0.1 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4); `minimatch` (herdado) |
| 27 | `ignore-walk` 7.0.0 | moderate | npm-packlist 9.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `minimatch` (herdado) |
| 28 | `make-fetch-happen` 14.0.3 | moderate | @sigstore/sign 3.1.0; node-gyp 11.5.0; npm-registry-fetch 18.0.2; tuf-js 3.1.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `cacache` (herdado) |
| 29 | `minimatch` 9.0.9 | moderate | @tufjs/models 3.0.1; glob 10.5.0; ignore-walk 7.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| 30 | `ngx-bootstrap` 19.0.2 | moderate | frontend  | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/common` (herdado); `@angular/core` (herdado); `@angular/forms` (herdado) |
| 31 | `ngx-owl-carousel-o` 19.0.2 | moderate | frontend  | Produção (grafo npm) | Risco de produção; atualização major necessária | `@angular/common` (herdado); `@angular/core` (herdado) |
| 32 | `node-gyp` 11.5.0 | moderate | @npmcli/run-script 9.1.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `make-fetch-happen` (herdado) |
| 33 | `npm-packlist` 9.0.0 | moderate | pacote 20.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `ignore-walk` (herdado) |
| 34 | `npm-registry-fetch` 18.0.2 | moderate | pacote 20.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `make-fetch-happen` (herdado) |
| 35 | `pacote` 20.0.0 | high | @angular/cli 19.2.27 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@npmcli/package-json` (herdado); `@npmcli/run-script` (herdado); [GHSA-w4pp-8pjf-rmxw](https://github.com/advisories/GHSA-w4pp-8pjf-rmxw); `cacache` (herdado); `npm-packlist` (herdado); `npm-registry-fetch` (herdado); `sigstore` (herdado); `tar` (herdado) |
| 36 | `serialize-javascript` 6.0.2 | high | copy-webpack-plugin 12.0.2 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq); [GHSA-qj8w-gfj5-8c6v](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v); [GHSA-m5mm-p8h7-m29v](https://github.com/advisories/GHSA-m5mm-p8h7-m29v) |
| 37 | `sigstore` 3.1.0 | high | pacote 20.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@sigstore/core` (herdado); `@sigstore/sign` (herdado); `@sigstore/tuf` (herdado); `@sigstore/verify` (herdado); [GHSA-52v5-jr5w-gjxr](https://github.com/advisories/GHSA-52v5-jr5w-gjxr) |
| 38 | `sockjs` 0.3.24 | moderate | webpack-dev-server 5.2.7 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `uuid` (herdado) |
| 39 | `tar` 6.2.1 | critical | pacote 20.0.0 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | [GHSA-34x7-hfp2-rc4v](https://github.com/advisories/GHSA-34x7-hfp2-rc4v); [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97); [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx); [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96); [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256); [GHSA-r6q2-hw4h-h46w](https://github.com/advisories/GHSA-r6q2-hw4h-h46w); [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh); [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp); [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw); [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w); [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j); [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) |
| 40 | `tuf-js` 3.1.0 | moderate | @sigstore/tuf 3.1.1 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `@tufjs/models` (herdado); `make-fetch-happen` (herdado) |
| 41 | `uuid` 8.3.2 | moderate | sockjs 0.3.24 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária; requer investigação: SockJS usa v4, não API afetada | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| 42 | `webpack-dev-server` 5.2.7 | moderate | @angular-devkit/build-angular 19.2.27; @angular-devkit/build-webpack 0.1902.27 | Desenvolvimento/build | Risco de desenvolvimento; atualização major necessária | `sockjs` (herdado) |

### Condições, CVEs e versões corrigidas dos 32 advisories

As severidades da tabela anterior são agregadas pelo npm. Abaixo, cada falha usa a severidade do advisory GitHub original; divergências não foram ocultadas. “Sem correção disponível” não foi usado para estas falhas: existem versões corrigidas, mas fora das linhas atualmente admitidas. Ausência de precondição observada não significa garantia de segurança.

| Advisory / CVE | Severidade original | Condição e efeito no projeto | Primeiras versões corrigidas informadas |
|---|---|---|---|
| [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) / CVE-2026-59873 | critical | Arquivo comprimido hostil sem limites de entrada/expansão; DoS na extração pelo CLI. Não é upload de imagem nem rota Go. | 7.5.19 |
| [GHSA-34x7-hfp2-rc4v](https://github.com/advisories/GHSA-34x7-hfp2-rc4v) / CVE-2026-24842 | high | TAR com hardlinks maliciosos e caminhos que escapam do destino; exige extração pelo CLI local. | 7.5.7 |
| [GHSA-39pv-4j6c-2g6v](https://github.com/advisories/GHSA-39pv-4j6c-2g6v) / CVE-2026-54266 | high | SSR com HttpTransferCache e colisão da chave entre respostas; o build ativo é CSR, sem transfer cache configurado. | 20.3.25, 21.2.17, 22.0.1 |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) / CVE-2026-118773 | medium | Travessia glob assíncrona hostil que continua após AbortSignal; afeta custo de I/O/CPU das ferramentas. | 14.0.2 |
| [GHSA-48r7-hpm6-gfxm](https://github.com/advisories/GHSA-48r7-hpm6-gfxm) / CVE-2026-54268 | high | Formato de data hostil fornecido a formatDate; os formatos encontrados no código próprio são literais. Não foi demonstrada entrada controlada nessa posição. | 20.3.25, 21.2.17, 22.0.1 |
| [GHSA-52v5-jr5w-gjxr](https://github.com/advisories/GHSA-52v5-jr5w-gjxr) / CVE-2026-48815 | high | Verificação de assinatura que depende de certificateOIDs; política é ignorada. Risco da cadeia de pacotes, não autenticação JWT Go. | 4.1.1 |
| [GHSA-58w9-8g37-x9v5](https://github.com/advisories/GHSA-58w9-8g37-x9v5) / CVE-2026-54265 | medium | Binding bidirecional em propriedade DOM sensível com valor hostil. Esse padrão não foi encontrado nos templates próprios; terceiros exigem atenção. | 20.3.25, 21.2.17, 22.0.1 |
| [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq) / CVE não atribuído na fonte | high | Objeto RegExp/Date controlado é serializado e seu resultado executado. Origem: cache/configuração de copy-webpack-plugin; não é serialização de resposta Go. | 7.0.3 |
| [GHSA-62vg-58rm-qff7](https://github.com/advisories/GHSA-62vg-58rm-qff7) / CVE-2026-111752 | high | SSR com outlets de caminho vazio sem correspondência provoca custo excessivo de roteamento. SSR não integra o build publicado atual. | 20.3.33, 21.2.25, 22.2.1 |
| [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx) / CVE-2026-26960 | high | Extração de hardlink que atravessa cadeia de symlinks; requer TAR hostil processado pelo CLI. | 7.5.8 |
| [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) / CVE-2026-23745 | high | Entradas TAR com caminhos/symlinks hostis sobrescrevem arquivos; requer extração e acesso de escrita do processo de ferramentas. | 7.5.3 |
| [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) / CVE-2026-59874 | high | Tamanho negativo em entrada TAR aciona loop na operação replace. Uso dessa operação no projeto não demonstrado; risco residual de ferramenta. | 7.5.18 |
| [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256) / CVE-2026-31802 | high | Symlink com caminho relativo a unidade no Windows escapa do destino. Sistema atual é Windows; exige arquivo TAR hostil. | 7.5.11 |
| [GHSA-ff3f-86qr-9cv3](https://github.com/advisories/GHSA-ff3f-86qr-9cv3) / CVE-2026-101896 | high | SSR com parâmetros de matriz numéricos hostis causa DoS; não há servidor Angular ativo nesta aplicação CSR/Go. | 20.3.32, 21.2.24, 22.2.0 |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) / CVE-2026-118764 | medium | Padrão glob controlado com otimização de expansão causa amplificação de CPU/memória. Não é filtro SQL nem busca pública. | 11.0.1 |
| [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) / CVE-2026-59875 | medium | NUL em caminho/linkpath de registro PAX provoca exceção não tratada; exige TAR hostil. | 7.5.17 |
| [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg) / CVE-2026-88057 | medium | Valor hostil em host binding sensível aplicado a elemento/contexto diferente. Não encontrado em código próprio; não se prova ausência em bibliotecas. | 20.3.28, 21.2.20, 22.1.0 |
| [GHSA-jfc7-64v2-mr8c](https://github.com/advisories/GHSA-jfc7-64v2-mr8c) / CVE-2026-48758 | medium | payloadType Unicode manipulado mantém bytes PAE equivalentes e enfraquece assinatura DSSE. Risco de verificação de artefatos. | 3.2.1 |
| [GHSA-jfgx-762w-99vr](https://github.com/advisories/GHSA-jfgx-762w-99vr) / CVE-2026-111753 | medium | URL de mutação hostil explorando diferenças WHATWG/regex pode levar token XSRF a outra origem. APIs próprias usam bases fixas; exploração não demonstrada. | 20.3.34, 21.0.3 |
| [GHSA-jhpw-976m-542j](https://github.com/advisories/GHSA-jhpw-976m-542j) / CVE-2026-68945 | high | SSR com cache de transferência ambíguo reutiliza resposta entre requisições. Cache/SSR ausentes no build atual. | 20.3.27, 21.2.19, 22.0.2 |
| [GHSA-jj27-h5hq-8x99](https://github.com/advisories/GHSA-jj27-h5hq-8x99) / CVE-2026-69151 | high | Arquivo de tradução de menor confiança altera atributo i18n-on* e executa script. Não foram encontrados i18n-on* nos templates próprios. | 20.3.27, 21.2.19, 22.0.1 |
| [GHSA-m5mm-p8h7-m29v](https://github.com/advisories/GHSA-m5mm-p8h7-m29v) / CVE-2026-115897 | low | Corpo de função serializado contém fechamento de script e é inserido em HTML; exige dados/configuração hostis no serializador. | 7.1.3 |
| [GHSA-p297-fm68-3q8c](https://github.com/advisories/GHSA-p297-fm68-3q8c) / CVE-2026-88059 | medium | HttpTransferCache com withRequestsMadeViaParent permite reutilização indevida. Nenhum dos dois recursos está configurado no build ativo. | 20.3.28, 21.2.20, 22.1.1 |
| [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96) / CVE-2026-29786 | high | Hardlink TAR com caminho relativo a unidade no Windows escapa da validação; exige extração hostil pelo CLI. | 7.5.10 |
| [GHSA-qj8w-gfj5-8c6v](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v) / CVE-2026-34043 | medium | Objeto array-like hostil com tamanho elevado é entregue ao serializador, consumindo CPU. Risco de build/configuração. | 7.0.5 |
| [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) / CVE-2026-73566 | high | TAR com caminhos muito longos e seleção de membros provoca recursão excessiva. Não demonstrado uso hostil na aplicação. | 7.5.21 |
| [GHSA-r6q2-hw4h-h46w](https://github.com/advisories/GHSA-r6q2-hw4h-h46w) / CVE-2026-23950 | high | Colisões Unicode de reserva de caminhos durante extração concorrente em macOS APFS. Ambiente validado é Windows; CI macOS continuaria exposto. | 7.5.4 |
| [GHSA-rgjc-h3x7-9mwg](https://github.com/advisories/GHSA-rgjc-h3x7-9mwg) / CVE-2026-54267 | high | Hydration com DOM/cache influenciados por atacante permite clobbering/poisoning. Hydration não está configurada no build ativo. | 20.3.25, 21.2.17, 22.0.1 |
| [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh) / CVE-2026-53655 | medium | Tamanhos PAX/GNU divergentes fazem ferramentas interpretar o mesmo TAR de modos diferentes; exige arquivo hostil. | 7.5.16 |
| [GHSA-w4pp-8pjf-rmxw](https://github.com/advisories/GHSA-w4pp-8pjf-rmxw) / CVE-2026-9496 | high | Especificação Git rawSpec hostil provoca trabalho excessivo em addGitSha. Caminho: CLI/pacote, não API de produtos. | 21.5.1 |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) / CVE-2026-41907 | medium | UUID v3/v5/v6 com buffer/offset externo inválido produz escrita parcial. SockJS instalado chama v4 sem buffer; precondição não encontrada nesse caminho. | 11.1.1, 12.0.1, 13.0.1 |
| [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp) / CVE-2026-59871 | medium | Caminho numérico PAX causa confusão de tipos e crash no parser; exige TAR hostil. | 7.5.18 |

O tar 6.2.1 vulnerável vem de `@angular/cli → pacote 20.0.0 → tar ^6.1.11`. As cópias tar 7.5.23 de cacache/node-gyp são distintas e não foram classificadas como 6.2.1. O tar local pode ser usado por tarefas de aquisição/extração do CLI, como add/update; não se demonstrou que o npm global utilize essa cópia durante npm ci. Não existe rota Go que execute node-tar. Mesmo assim, arquivos de terceiros podem comprometer ferramentas e CI; o crítico permanece aberto.

CSS de Promoções: 15,54 kB compilados, orçamento de aviso 14 kB e erro 16 kB. O aviso anterior NÃO foi eliminado. Revisão AST encontrou cinco seletores repetidos em blocos complementares, sem declarações de mesma propriedade sobrescritas em regras raiz idênticas e sem blocos adjacentes integralmente duplicados. Mover regras complementares poderia alterar precedência/container queries. Não houve poda de estilos dinâmicos/Material nem aumento do orçamento. Bundle atual: 454,84 kB, igual ao início desta rodada; referência histórica anterior às atualizações: 454,60 kB.


### Plano incremental Angular — não executado

Fontes: [compatibilidade oficial](https://angular.dev/reference/versions), [suporte oficial](https://angular.dev/reference/releases) e peerDependencies reais consultados no registro npm. Angular 19 não tem suporte; Angular 20 encerra LTS em 28/11/2026, Angular 21 em junho/2027 e Angular 22 em junho/2028. Datas de fim são as publicadas pelo fornecedor e podem ser ajustadas.

| Etapa candidata | Node / TypeScript / RxJS | Bibliotecas e risco |
|---|---|---|
| Atual: 19.2.25, CLI/build 19.2.27 | Node 22.23.5 validado; TS 5.7.3; RxJS 7.8.2 | Material/CDK 19.2.19; angular-eslint 19.8.1. Sem mudança major nesta tarefa. |
| 19 → 20.3.35, somente intermediária | Node 22.23.5; TS >=5.8 <6; RxJS 7.8.2 pode permanecer | Migrar core/CLI e Material/CDK para 20, angular-eslint 20, ng-bootstrap 19 com peers Angular 20; ngx-bootstrap/mask/carrossel das linhas Angular 20. Lucide 0.542.0 declara Angular até 20. Risco médio/alto em Material, formulários e templates. |
| 20 → 21.2.26, candidata de estabilização | Node 22.23.5; TS >=5.9 <6; RxJS 7.8.2 pode permanecer | Material/CDK 21, angular-eslint 21, ng-bootstrap 20 com peers Angular 21; demais bibliotecas em linhas 21. Lucide instalado não suporta 21: requer migração própria; latest consultado 1.0.0 declara até Angular 21. Risco médio/alto e revisão das APIs de ícones. |
| 21 → 22.3.0, opcional posterior | Node 22.23.5; TS >=6 <6.1; RxJS 7.8.2 pode permanecer | Material/CDK 22.3.0, angular-eslint 22.8.0, ng-bootstrap 21, ngx-bootstrap 22, ngx-mask 22.2.5, carrossel 22. Lucide latest declara apenas até 21: bloqueio de peer a resolver com release compatível ou substituição autorizada. Não usar force/override para ocultá-lo. Risco alto, inclusive TypeScript 6. |

Executar ng update uma major por vez, em checkout separado, sem alterar banco, com checkpoint/rollback a cada etapa. Revalidar Reactive Forms, Signal APIs, guards/interceptors, foco/overlays, máscaras, ícones, carrossel, autenticação, favoritos, variantes, carrinho/checkout, administração e relatórios; npm ci, lint, tipos, suíte Angular e E2E nas quatro larguras a cada etapa. Não basta o comando compilar.

O Angular 20.3.35 e o 21.2.26 estão fora dos intervalos afetados dos 11 advisories únicos do framework listados acima. Isso não permite prometer audit zero para a árvore de ferramentas futura. O CLI 21.2.30 consultado depende de pacote 21.5.1 (corrigido para o advisory de addGitSha); tar e demais folhas deverão ser reavaliados na resolução efetiva, sem suposição de eliminação de todos os 29 alertas de desenvolvimento. Escolher o alvo e autorizar a major antes de aplicar. Sem instalação experimental no aplicativo nesta auditoria.

Não há medição de bundle/desempenho de uma major não instalada. O ponto de comparação é 454,84 kB inicial; exigir ausência de aumento relevante sem justificativa e repetir os fluxos reais. Atualizações de compilador e TypeScript podem alterar divisão de chunks e invalidar comparação apenas por nomes de arquivos.

### Go 1.26.11 autorizado — resultado definitivo

Versão anterior do binário/toolchain: Go 1.24.13 (mínimo anterior do módulo 1.24.2). Nova versão mínima e binário ativo: Go 1.26.11, confirmada oficial e estável em [downloads oficiais](https://go.dev/dl/?mode=json) e [histórico de releases](https://go.dev/doc/devel/release), publicação em 10/11/2026. Não foi substituído o Go global; a seleção por go.mod baixa/usa a toolchain oficial. A linha 1.26 é suportada na data da validação.

Antes da alteração: módulos verificados com go mod verify; cópias de go.mod/go.sum preservadas. Go 1.26 solicitou normalização: go mod tidy -diff foi revisado antes de aplicar tidy. Não houve upgrade/downgrade de nenhuma dependência utilizada. Foram corrigidas marcações diretas de godotenv/JWT, removida a diretiva toolchain redundante (o mínimo go 1.26.11 já exige a versão), retirado gorilla/mux sem imports e checksums de versões antigas sem uso. A retirada de mux não foi usada para reduzir a contagem de segurança; o backend já utiliza net/http. Sem alteração de fontes de produção, contratos HTTP, regras comerciais ou migrations.

Govulncheck final 1.10.0, compatível com Go 1.26, reexecutado após a normalização; base oficial de 11/11/2026, análise source/symbol concluída com exit 0 e SBOM carregado. Antes: 31 advisories com funções potencialmente alcançáveis. Depois: ZERO; nenhum finding stdlib. Uma tentativa intermediária não carregou os pacotes por go.mod ainda não normalizado e foi descartada, sem interpretar saída parcial como resultado limpo.

Advisories antes alcançáveis, agora ausentes após a atualização:

- [GO-2026-4601](https://pkg.go.dev/vuln/GO-2026-4601) — corrigido na toolchain validada.
- [GO-2026-4602](https://pkg.go.dev/vuln/GO-2026-4602) — corrigido na toolchain validada.
- [GO-2026-4603](https://pkg.go.dev/vuln/GO-2026-4603) — corrigido na toolchain validada.
- [GO-2026-4865](https://pkg.go.dev/vuln/GO-2026-4865) — corrigido na toolchain validada.
- [GO-2026-4870](https://pkg.go.dev/vuln/GO-2026-4870) — corrigido na toolchain validada.
- [GO-2026-4946](https://pkg.go.dev/vuln/GO-2026-4946) — corrigido na toolchain validada.
- [GO-2026-4947](https://pkg.go.dev/vuln/GO-2026-4947) — corrigido na toolchain validada.
- [GO-2026-4971](https://pkg.go.dev/vuln/GO-2026-4971) — corrigido na toolchain validada.
- [GO-2026-4977](https://pkg.go.dev/vuln/GO-2026-4977) — corrigido na toolchain validada.
- [GO-2026-4980](https://pkg.go.dev/vuln/GO-2026-4980) — corrigido na toolchain validada.
- [GO-2026-4982](https://pkg.go.dev/vuln/GO-2026-4982) — corrigido na toolchain validada.
- [GO-2026-4986](https://pkg.go.dev/vuln/GO-2026-4986) — corrigido na toolchain validada.
- [GO-2026-5037](https://pkg.go.dev/vuln/GO-2026-5037) — corrigido na toolchain validada.
- [GO-2026-5039](https://pkg.go.dev/vuln/GO-2026-5039) — corrigido na toolchain validada.
- [GO-2026-5856](https://pkg.go.dev/vuln/GO-2026-5856) — corrigido na toolchain validada.
- [GO-2026-5972](https://pkg.go.dev/vuln/GO-2026-5972) — corrigido na toolchain validada.
- [GO-2026-6089](https://pkg.go.dev/vuln/GO-2026-6089) — corrigido na toolchain validada.
- [GO-2026-6090](https://pkg.go.dev/vuln/GO-2026-6090) — corrigido na toolchain validada.
- [GO-2026-6091](https://pkg.go.dev/vuln/GO-2026-6091) — corrigido na toolchain validada.
- [GO-2026-6599](https://pkg.go.dev/vuln/GO-2026-6599) — corrigido na toolchain validada.
- [GO-2026-6600](https://pkg.go.dev/vuln/GO-2026-6600) — corrigido na toolchain validada.
- [GO-2026-6603](https://pkg.go.dev/vuln/GO-2026-6603) — corrigido na toolchain validada.
- [GO-2026-6607](https://pkg.go.dev/vuln/GO-2026-6607) — corrigido na toolchain validada.
- [GO-2026-6608](https://pkg.go.dev/vuln/GO-2026-6608) — corrigido na toolchain validada.
- [GO-2026-6609](https://pkg.go.dev/vuln/GO-2026-6609) — corrigido na toolchain validada.
- [GO-2026-6611](https://pkg.go.dev/vuln/GO-2026-6611) — corrigido na toolchain validada.
- [GO-2026-6612](https://pkg.go.dev/vuln/GO-2026-6612) — corrigido na toolchain validada.
- [GO-2026-6613](https://pkg.go.dev/vuln/GO-2026-6613) — corrigido na toolchain validada.
- [GO-2026-6617](https://pkg.go.dev/vuln/GO-2026-6617) — corrigido na toolchain validada.
- [GO-2026-6809](https://pkg.go.dev/vuln/GO-2026-6809) — corrigido na toolchain validada.
- [GO-2026-6859](https://pkg.go.dev/vuln/GO-2026-6859) — corrigido na toolchain validada.

Permanecem 17 advisories somente no grafo de golang.org/x/crypto v0.48.0, sem função vulnerável chamada pelo código analisado. O projeto usa bcrypt; isso não prova ausência universal de risco se o uso do módulo mudar. Não foi ampliado o escopo para trocar versões de módulos sem necessidade para corrigir os 31 caminhos alcançáveis. IDs: GO-2026-5005, GO-2026-5006, GO-2026-5013, GO-2026-5014, GO-2026-5015, GO-2026-5016, GO-2026-5017, GO-2026-5018, GO-2026-5019, GO-2026-5020, GO-2026-5021, GO-2026-5023, GO-2026-5033, GO-2026-5932, GO-2026-6303, GO-2026-6354, GO-2026-6355.

### Resultados finais executados nesta rodada

- npm ci com Node 22.23.5: aprovado, lock idêntico antes/depois. Audit atualizado: 42 total / 13 no grafo de produção, sem redução artificial.
- Angular completo: 328 testes aprovados com Node 22.23.5; lint sem warnings e TypeScript sem emissão aprovados. Build de produção aprovado: inicial 454,84 kB, aviso CSS Promoções 15,54 kB mantido.
- Go 1.26.11: CART_TEST_LOCAL=1 go test ./... -count=1 aprovado, PostgreSQL em schemas isolados; go vet ./... aprovado; go mod verify aprovado; govulncheck ./... concluído sem vulnerabilidade chamada pelo código; go build ./src aprovado, versão do executável confirmada por go version.
- Sete suítes Playwright com Chromium sandbox habilitado, Node 22 e Go 1.26.11: geral, CRUD de produtos, pedidos, estados de pedidos, clientes, dashboard e relatórios. Todas aprovadas; sem timeout na rodada atual. Incluem autenticação, cadastro, OTP sem SMTP externo, variantes/preços/estoque, imagens, SKU, promoções/descontos, favoritos, carrinho, checkout, cancelamento/reposição, avaliações, erros/retry, estados vazios, teclado, modais e URLs.
- Layouts exercitados em 1440, 1024, 768 e 390 px, sem overflow nos checks. Nenhum layout foi modificado nesta rodada; CSS apenas investigado. Capturas intermediárias descartadas pelo helper E2E já existente, evidências antigas acadêmicas/comerciais preservadas.
- Os sete harnesses registraram PRIMARY_COMMERCIAL_STATE_UNCHANGED e ISOLATED_SCHEMA_REMOVED. Depois dos testes, troca somente do backend 8080 pelo binário validado; /products HTTP 200, /admin/products sem sessão HTTP 401, frontend 4200 HTTP 200.
- SELECT de integridade antes/depois da ativação retornou o mesmo digest comercial 77745c603de87987c0c77e0000af9808, migration 50 e dirty=false. Nenhuma migration aplicada nem dado comercial principal alterado. Não foram enviados emails externos nem executados testes de carga ou exploração destrutiva.

### Arquivos e rollback

Arquivos alterados nesta rodada: frontend/.nvmrc, backend/go.mod, backend/go.sum e este AUDITORIA_FINAL.md. package.json, package-lock.json, angular.json, código Angular/Go, CSS, contratos e migrations preservados.

Rollback do Go: arquivos anteriores em db/backups/go-toolchain-20261121-final/go.mod e go.sum. Binário anterior Go 1.24.13 permanece em db/runtime/security_20261121/backend.exe, sem sobrescrita. Para retornar, encerrar somente o backend novo, restaurar os dois arquivos de módulo do backup e iniciar o binário anterior com diretório de trabalho backend; não executar down migration nem restaurar banco. O retorno recupera a vulnerabilidade anterior e deve ser excepcional, não recomendação de segurança.

Backend novo e runtime Node 22 ativo: db/runtime/security-final-20261121/. Arquivos de binário/logs ativos são preservados. A instalação global Node/Go não foi substituída. Sem incompatibilidade funcional reproduzida nos testes; nenhuma mudança de Angular major executada. A atualização Angular continua sujeita a autorização e ao plano incremental acima.

### Encerramento e limpeza desta rodada

Saída textual final de govulncheck ./...: zero vulnerabilidades chamadas, zero em pacotes importados; 17 em módulos requeridos sem chamada vulnerável aparente. Preview 4206 e API isolada 8086 encerrados. Removidos 303 arquivos temporários (205.63 MiB), incluindo ferramentas locais Playwright/axe/govulncheck, runtime Node temporário, logs encerrados, consultas auxiliares e metadados intermediários. Runtime Node 22 e backend 1.26.11 ativos em db/runtime/security-final-20261121 preservados, assim como binário anterior e backup de rollback. Nenhuma limpeza externa ao repositório. A .nvmrc documenta a versão para um gerenciador compatível; não altera nem seleciona automaticamente o Node global em todo terminal.


## Limpeza definitiva de auxiliares — 21/11/2026

Revisados 240 arquivos em backend/demo-assets e 110 em docs, além de .artifacts (sem arquivos no início). As pastas capturas e validacao-visual relevantes ficam dentro de docs; não existem equivalentes na raiz deste repositório. Referências em código, testes, importadores, migrations, documentação e destinos de saída dos E2E foram conferidas. Não foram gerados relatórios intermediários.

### Contratos consolidados

Consolidado o conteúdo permanente dos quatro documentos históricos abaixo; resultados de testes antigos e estados de banco 3/4/5 não descrevem a versão atual. A especificação executável continua nos handlers, services, repositories e testes preservados.

- Carrinho: rotas GET /cart, POST /cart/items, PATCH /cart/items/{id}, DELETE /cart/items/{id} e DELETE /cart exigem JWT. O usuário vem do middleware; proprietário e preço não são aceitos do cliente. O par productId/variantId identifica o item comercial; variantes e produtos simples preservam seus respectivos estoques. Validações e preços/promoções são calculados no backend. Adicionar ao carrinho não reserva estoque; o checkout é um fluxo separado já implementado. Mudança/logout de sessão reinicia o estado Angular e não deve reutilizar dados de outro usuário.
- Favoritos: GET /favorites, PUT /favorites/{productId} e DELETE /favorites/{productId}, autenticados e isolados por usuário. Adição/remoção idempotentes, unicidade por usuário/produto, sem reserva de estoque ou inclusão automática no carrinho. Estado compartilhado de favoritos, feedback, acessibilidade e sincronização entre cards/detalhe/página continuam no código e nos testes.
- Paginação: contrato items + pagination {offset, limit, total, hasMore}; offset não negativo, limit de 1 a 100 e padrão 20, filtros validados e parametrizados no servidor, totais após filtros. Ordenações atuais pertencem às queries/whitelists e podem incluir os agrupamentos coordenados; não perpetuar a antiga afirmação de ordenação exclusivamente por ID. Preservar URL, filtros, sessão e controles compartilhados.
- Estoque: valor inteiro não negativo, limite INTEGER 2147483647; defesa obrigatória no backend, não apenas no formulário. Produto simples usa preço/quantidade próprios; com variantes, preço inicial e estoque agregado derivam das variantes, conforme implementação atual. Migration 000004 preservada e não reaplicada. O documento removido tratava apenas do cadastro inicial e não deve ser usado para afirmar que edição, variantes ou checkout não existem.
- Registro histórico relevante preservado: o documento de estoque relatou em 06/10/2026 um aviso de collation 1540.3 versus 1541.2 e backup bd_box_before_000004_20261006_202207.dump em diretório temporário externo. Esta limpeza não verifica nem resolve a collation, não presume que esse arquivo externo ainda exista e não exclui/restaura backups. As migrations e backups duráveis do repositório permanecem protegidos.

### Exclusões revisadas

Exclusões aplicadas definitivamente após verificar caminho autorizado, ausência de links/reparse points e SHA-256 de cada arquivo. Nenhum arquivo foi apenas movido para outra pasta.

| Arquivo | Justificativa |
|---|---|
| backend/demo-assets/almofadas-2026/resultado-local.json | resultado histórico sem leitor |
| backend/demo-assets/decoracao-2026/inventario.json | inventário duplicado integralmente em imagens.json |
| backend/demo-assets/decoracao-2026/resultado-local.json | resultado histórico sem leitor |
| backend/demo-assets/decoracao-tapetes-043/resultado-local.json | resultado histórico sem leitor |
| backend/demo-assets/decoracao-tapetes-046/resultado-local.json | resultado histórico sem leitor |
| backend/demo-assets/mesa-2026/resultado-local.json | resultado histórico sem leitor |
| backend/demo-assets/mesa-galerias-041/resultado-local.json | resultado histórico sem leitor |
| docs/cart-implementation.md | documentação histórica consolidada no relatório |
| docs/favorites-README.md | documentação histórica consolidada no relatório |
| docs/pagination.md | documentação histórica consolidada no relatório |
| docs/product-stock-validation.md | documentação histórica consolidada no relatório |
| docs/validacao-visual/quality-2026-11-21/promotion-1440.png | substituído pela rodada mais recente |
| docs/validacao-visual/quality-2026-11-21/promotion-390.png | substituído pela rodada mais recente |
| docs/validacao-visual/quality-2026-11-21/qualidade.json | substituído pela rodada mais recente |
| docs/validacao-visual/quality-2026-11-21/regressao.json | substituído pela rodada mais recente |
| docs/validacao-visual/quality-2026-11-21/report-1440.png | substituído pela rodada mais recente |
| docs/validacao-visual/quality-2026-11-21/report-390.png | substituído pela rodada mais recente |
| docs/validacao-visual/security-2026-11-21/catalogo-real-cama-1440.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/catalogo-real-cama-390.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/dependencias.json | snapshot anterior ao Go 1.26.11 consolidado no relatório |
| docs/validacao-visual/security-2026-11-21/foco-teclado-1440.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/foco-teclado-390.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/home-1440.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/home-390.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/login-1440.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/login-390.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/produto-real-1440.png | duplicata SHA-256 |
| docs/validacao-visual/security-2026-11-21/produto-real-390.png | duplicata SHA-256 |

### Preservações e referências

Preservadas todas as 210 imagens de demonstração: cada uma é citada por manifesto da própria coleção; são fontes de reprodução/instalação e de migrations antigas, não simples screenshots descartáveis. Preservados os oito instaladores, imagens.json de cada coleção, catalogo.json e catalogo-origem.json utilizados pelos testes/manifestos. O inventário redundante de Decoração foi comparado campo a campo com imagens.json (arquivo, SHA-256, largura e altura).

Preservados os quatro manifestos docs/catalogo-*.json, inclusive catalogo-cama.json, padrão do importador Go; design-system/mensagens-e-estados-ui.md; roteiro docs/validacao-visual/README.md referenciado pelo README principal e script catalogo.cjs. Preservadas evidências de módulos administrativos nas quatro larguras, estados de erro/vazio e pares antes/depois de Mesa e tapetes. Capturas duplicadas têm um exemplar canônico preservado; links deste relatório foram atualizados. Destinos declarados por scripts E2E são saídas regeneráveis, não arquivos de entrada; os scripts e testes não foram alterados.

Não foram alterados código-fonte, configurações de agentes, arquivos .env, migrations, uploads, frontend/public, backups ou regras comerciais. Antes da limpeza, catálogo público lido por GET: 97 produtos. Há 1.386 arquivos protegidos selecionados para comparação SHA-256, excluídos apenas os candidatos da tabela e o próprio relatório.

### Resultado final da limpeza

Removidos definitivamente **28 arquivos**, recuperando **8,20 MiB** (8.600.709 bytes de tamanho lógico): seis resultados locais antigos, um inventário redundante, dez PNGs idênticos por SHA-256 com exemplar canônico preservado, quatro capturas de Promoções/Relatórios substituídas pela rodada mais recente, dois JSONs de evidências substituídos, um snapshot bruto de dependências anterior ao Go 1.26.11 e quatro documentos históricos consolidados acima. A tabela registra individualmente os arquivos e justificativas. Nenhum manifesto operacional ou imagem comercial foi excluído.

Contagem final: backend/demo-assets 240 → 233 arquivos; docs 110 → 89 arquivos. .artifacts começou com zero arquivos; os testes de limpeza geraram e removeram seus próprios temporários. Após confirmar ausência de processos usando essa área, os diretórios vazios também foram removidos. O helper existente recria a estrutura quando necessário. Nenhum diretório externo ao repositório foi limpo, nenhuma configuração de agente foi removida e nenhum arquivo em uso foi apagado.

Validações executadas depois das exclusões:

- 1.386 arquivos protegidos comparados por SHA-256 antes/depois, sem divergência: fontes, testes, migrations, uploads, frontend/public, demo-assets remanescentes, backups, configurações de agentes e documentos preservados.
- Oito manifestos de imagem e oito instaladores preservados; 210 arquivos-fonte conferidos contra seus SHA-256 e 210 cópias em backend/uploads conferidas contra os mesmos hashes. Caminhos reais respeitados, incluindo mesa-2026/imagens. Os instaladores NÃO foram executados para evitar cópias/gravações desnecessárias; sua sintaxe foi analisada pelo parser PowerShell sem erros.
- Os quatro manifestos docs/catalogo-*.json continuam presentes e com JSON válido; o padrão do importador Go permanece docs/catalogo-cama.json. Imports/testes ainda encontram todos os arquivos de entrada preservados.
- Testes Node do helper de artefatos: quatro aprovados. Go: TestDecodeAndPrepare, TestParsePage e TestParseIntegerList aprovados, com count=1. TestImportIsolatedPostgres foi explicitamente pulado com CART_TEST_LOCAL=0 para não escrever em PostgreSQL nesta limpeza. Nenhuma integração SQL foi apresentada como executada.
- Build Angular de produção aprovado usando Node 22.23.5. Bundle inicial 454,84 kB, sem mudança; permanece o aviso preexistente de CSS Promoções 15,54 kB versus orçamento de aviso 14 kB, abaixo do erro de 16 kB. Não houve alteração de CSS, orçamento, dependências ou comportamento do site.
- Catálogo público lido por GET antes/depois: 97 produtos, JSON normalizado com o mesmo SHA-256 a7c4b86c94381ef498f2ea68b99b8ce09f80b9fe9a633c551ec52a53873caac7. Os 357 arquivos distintos referenciados nas galerias públicas continuam presentes; seus diretórios comerciais permaneceram idênticos por hash.
- Links locais em AUDITORIA_FINAL.md e Markdown remanescente de docs: zero quebrados. Referências a nomes excluídos restam apenas como registro histórico na tabela deste relatório; nenhum consumidor de código/importação depende deles. Destinos E2E declarados como saídas podem ser regenerados deliberadamente e não foram confundidos com entradas.
- Frontend http://localhost:4200 e backend GET http://localhost:8080/products responderam HTTP 200. Nenhum serviço principal foi reiniciado. Não foram executadas migrations, comandos SQL de alteração, importação com -apply, cadastro ou edição comercial.

Arquivos de código/testes/instaladores não foram alterados. Somente AUDITORIA_FINAL.md foi atualizado; as demais mudanças são as exclusões documentadas. Permanecem preservados roteiro de reprodução, design system, fontes do catálogo, manifestos, backups, imagens e evidências acadêmicas/visuais úteis.

## Checkout — endereços e cobertura de entrega — 21/11/2026

### Implementação

A etapa Entrega agora apresenta cards nativos selecionáveis com identificação, destinatário, endereço completo e CEP. Na primeira visita, escolhe o endereço padrão; sem padrão, usa o primeiro da ordem estável retornada pelo serviço (ID crescente). “Usar outro endereço” abre o formulário existente. Sem cadastros, o formulário aparece diretamente; carregamento, falha e resposta inválida não são tratados como lista vazia. Retry substitui a requisição anterior e preserva a escolha aplicável.

Reutilizados AccountService e /me/addresses. Somente o ID escolhido é guardado em sessionStorage por usuário, com validade de 30 minutos; na recarga ele é conferido contra a lista atual da conta. Não são persistidos endereço completo, telefone ou dados de pagamento no novo estado de seleção. O formulário manual e a seleção permanecem durante a navegação entre etapas; dados manuais não salvos não são transformados em cadastro nem guardados em armazenamento permanente. Logout/troca de sessão cancela requisições e limpa a escolha do usuário anterior.

O checkbox começa desmarcado e mede 18 × 18 px, com label flexível, área clicável e foco compartilhado. As regras de inputs de texto foram corrigidas na origem para excluir checkbox e radio; nenhum !important novo. Os rádios de pagamento e os demais controles foram preservados.

### Cobertura e segurança

Bloqueio fora da cobertura autorizado explicitamente pelo usuário nesta tarefa. A consulta existente de /shipping/quote foi extraída para repositories.QuoteShipping e é reutilizada pelo checkout. A etapa Entrega consulta o CEP selecionado ou informado, cancela consultas antigas ao trocar de CEP/endereço e evita repetir uma consulta idêntica ainda em andamento. Formato inválido, ausência de faixa ativa e falha temporária têm mensagens distintas; o botão de avanço permanece bloqueado sem cobertura confirmada. Uma mensagem antiga do backend é limpa ao trocar/reconsultar a entrega.

Ao finalizar, a transação consulta novamente uma faixa ativa da mesma tabela shipping_ranges, usando bloqueio compartilhado até o commit. Não confia no resultado do Angular. Fora da cobertura retorna 422 no envelope existente; CEP inválido retorna 400; endereço salvo não pertencente ao usuário retorna 404. Nenhuma nova faixa foi cadastrada no banco principal. Cotação e regras das faixas existentes foram preservadas; não foi criada nova cobrança, alterado o total de produtos ou modificado preço/estoque do catálogo por esta implementação.

O salvamento opt-in aproveita a rotina de conta insertAddress dentro da própria transação da compra, após as validações, sem POST separado capaz de deixar um cadastro órfão. Não sobrescreve endereço cadastrado nem altera um padrão já existente. Compara o endereço completo do usuário (CEP normalizado) para evitar duplicata; a chave idempotente da compra também impede repetir pedido/salvamento em retries. O endereço efetivo é copiado para o JSON histórico do pedido; alterações posteriores na conta não o modificam. O fluxo continua usando somente endereço de entrega, sem introduzir ou confundir campos de cobrança.

### Testes executados

- Angular direcionado ao componente checkout: **19 aprovados**, incluindo compra rápida já existente, ausência de endereço, padrão/fallback, troca, reload seguro, resposta inválida, falha/retry, cancelamento de respostas antigas, checkbox, salvar marcado/desmarcado, navegação e recuperação após rejeição de cobertura pelo backend.
- Go/PostgreSQL: `CART_TEST_LOCAL=1 go test ./... -count=1` aprovado em schemas isolados; novo grupo de dez cenários de cobertura/endereço também reexecutado e aprovado. Propriedade, default, snapshot, fora da faixa/inativa, CEP inválido, opt-in, duplicação e retries verificados. Fixtures antigas foram adaptadas para fornecer endereço e faixa válidos somente no schema de testes.
- `go vet ./...`, ESLint e TypeScript (aplicativo e specs): aprovados.
- Build de produção aprovado: inicial 454,87 kB (antes 454,84 kB); permanece apenas o aviso CSS preexistente de Promoções 15,54 kB/14 kB. Nenhum budget alterado.
- Playwright/Chromium local com sandbox habilitado: **15 checks aprovados** no build final, usando exclusivamente API 8086 e PostgreSQL em schema descartável. Pedidos reais de fixture, ausência de salvamento sem opt-in, default e múltiplos endereços, pedido com endereço selecionado, edição posterior sem alterar histórico, endereço de outro usuário, cobertura rejeitada diretamente na API e faixa desativada depois de chegar à Revisão (backend impede a compra) foram exercitados.
- Responsividade, foco e checkbox conferidos em **1440, 1024, 768 e 390 px**, sem overflow; checkbox 18 px nas quatro larguras e cards selecionáveis por teclado. Zero erros Angular de página no E2E. Duas capturas finais inspecionadas: [desktop](docs/validacao-visual/checkout-enderecos/delivery-1440.png) e [mobile](docs/validacao-visual/checkout-enderecos/delivery-390.png). Capturas usam somente dados fictícios do schema isolado.

### Banco, ativação e arquivos

Nenhuma migration criada ou aplicada. Catálogo, variantes, favoritos, carrinhos/pedidos reais, preços e faixas do bd_box não foram alterados pelos testes. A verificação do harness foi ampliada para incluir shipping_ranges no digest comercial; as duas execuções E2E registraram ISOLATED_SCHEMA_REMOVED e PRIMARY_COMMERCIAL_STATE_UNCHANGED. Antes/depois da ativação do backend, SELECT de integridade também retornou o mesmo digest 557c350bbf73d63bb20d5d4975222376, migration 50, dirty=false.

Backend validado compilado com Go 1.26.11 e ativado na porta 8080 em db/runtime/checkout-enderecos-20261121/. O binário anterior em db/runtime/security-final-20261121/backend.exe foi preservado. Frontend 4200 e GET /products: HTTP 200; consulta de CEP malformado: HTTP 400; /me/addresses sem sessão: HTTP 401. Nenhuma compra real ou modificação de conta principal foi usada como smoke test.

Arquivos de implementação:

- frontend/src/app/features/checkout/checkout.component.ts
- frontend/src/app/features/checkout/checkout.component.html
- frontend/src/app/features/checkout/checkout.component.scss
- backend/src/repositories/shipping.go (novo, cotação compartilhada)
- backend/src/repositories/checkout_repository.go
- backend/src/routes/shipping.go
- backend/src/handlers/checkoutHandler.go

Testes criados/ajustados:

- frontend/src/app/features/checkout/checkout.component.spec.ts
- frontend/e2e/checkout-addresses.cjs (novo)
- backend/src/routes/checkout_stock_test.go
- backend/src/routes/shipping_test.go
- backend/src/routes/catalog_mesa_test.go
- backend/src/routes/catalog_decoracao_test.go
- backend/src/routes/catalog_cushion_covers_test.go
- backend/src/routes/catalog_towels_test.go
- backend/src/routes/audit_browser_test.go

Além destes arquivos, somente este relatório e as duas evidências finais acima. Sem novas dependências da aplicação, alterações de autenticação, mudança de contrato de cadastro de endereços ou cobrança adicional de frete. Limpeza de artefatos temporários concluída conforme registro final abaixo.

Limpeza final do checkout: 196 arquivos temporários removidos (18.16 MiB), incluindo SDK Playwright, logs encerrados e helper SQL somente leitura. API isolada e preview encerrados; pastas vazias retiradas. Preservados apenas código de testes e duas capturas finais úteis. Backend 8080 e frontend 4200 continuam ativos; executáveis/logs ativos não foram excluídos.


Smoke test público adicional: GET /shipping/quote?cep=01001000 retornou 404, indicando ausência de faixa ativa para esse CEP no cadastro atual. Nenhuma cobertura foi criada para liberar artificialmente o endereço; CEPs fora das faixas permanecem bloqueados conforme autorizado.


## Padronização estrutural dos estilos Angular para SCSS — 21/11/2026

Foram convertidas 34 folhas próprias de CSS para SCSS, incluindo o estilo global. O código-fonte passou a ter 76 folhas SCSS e nenhuma folha CSS própria. Os 33 arquivos locais mantiveram seu conteúdo; em `frontend/src/styles.scss`, somente o carregamento dos três estilos compartilhados foi adaptado para `sass:meta.load-css`, na ordem original, preservando o import externo de fontes. Nenhum template, serviço, contrato HTTP, regra comercial, dependência do aplicativo ou migration foi alterado nesta tarefa. Nenhum novo `!important` ou `::ng-deep` foi introduzido.

As referências `styleUrl`/`styleUrls` foram atualizadas em 32 arquivos TypeScript, preservando a ordem das listas com várias folhas. `frontend/angular.json` mantém Bootstrap e SweetAlert2 antes dos estilos próprios, passa a carregar `src/styles.scss` e `src/app/shared/css/forms.scss` e define `@schematics/angular:component.style = scss`. A configuração dos testes também carrega o global SCSS. A documentação de foco em `docs/design-system/mensagens-e-estados-ui.md` e os caminhos técnicos deste relatório foram atualizados. Referências externas, CSS gerado e os testes/servidores que processam CSS compilado foram preservados.

### Arquivos convertidos

Cada caminho abaixo substitui o arquivo homônimo `.css`; os arquivos antigos não permanecem no código-fonte.

- `frontend/src/app/app.component.scss`
- `frontend/src/app/components/admin/catalog-registration.component.scss`
- `frontend/src/app/components/admin/customers/admin-customers.scss`
- `frontend/src/app/components/admin/dashboard/dashboard-trend.component.scss`
- `frontend/src/app/components/admin/dashboard/dashboard.component.scss`
- `frontend/src/app/components/admin/orders/admin-orders.scss`
- `frontend/src/app/components/admin/product/product.component.scss`
- `frontend/src/app/components/admin/promotion/promotion.component.scss`
- `frontend/src/app/components/admin/report/report.component.scss`
- `frontend/src/app/components/main-navbar/main-navbar.component.scss`
- `frontend/src/app/components/top-navbar/top-navbar.component.scss`
- `frontend/src/app/components/top-welcome-header/top-welcome-header.component.scss`
- `frontend/src/app/features/add-to-promotion/add-to-promotion.component.scss`
- `frontend/src/app/features/create-promotion/campaign-summary.component.scss`
- `frontend/src/app/features/create-promotion/create-promotion.component.scss`
- `frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.scss`
- `frontend/src/app/features/product-manage/product-manage.component.scss`
- `frontend/src/app/features/promo-grid/promo-grid.component.scss`
- `frontend/src/app/features/testimonials/testimonials.component.scss`
- `frontend/src/app/shared/components/admin-page-header/admin-page-header.component.scss`
- `frontend/src/app/shared/components/admin-state/admin-state.component.scss`
- `frontend/src/app/shared/components/period-filter/period-filter.component.scss`
- `frontend/src/app/shared/components/product-sku/product-sku.component.scss`
- `frontend/src/app/shared/components/product-variants/product-variants.component.scss`
- `frontend/src/app/shared/css/admin-adaptive-table.scss`
- `frontend/src/app/shared/css/animations.scss`
- `frontend/src/app/shared/css/auth-material.scss`
- `frontend/src/app/shared/css/focus.scss`
- `frontend/src/app/shared/css/forms.scss`
- `frontend/src/app/shared/favorite-button/favorite-button.component.scss`
- `frontend/src/app/shared/reset-password/reset-password.component.scss`
- `frontend/src/app/shared/ui/cards/cards.component.scss`
- `frontend/src/app/shared/ui/titulo-decorado/titulo-decorado.component.scss`
- `frontend/src/styles.scss`

### Referências de componentes atualizadas

- `frontend/src/app/app.component.ts`
- `frontend/src/app/components/admin/catalog-registration.component.ts`
- `frontend/src/app/components/admin/shipping-ranges.component.ts`
- `frontend/src/app/components/main-navbar/main-navbar.component.ts`
- `frontend/src/app/components/top-navbar/top-navbar.component.ts`
- `frontend/src/app/components/top-welcome-header/top-welcome-header.component.ts`
- `frontend/src/app/components/admin/customers/admin-customer-detail.component.ts`
- `frontend/src/app/components/admin/customers/admin-customers.component.ts`
- `frontend/src/app/components/admin/dashboard/dashboard-trend.component.ts`
- `frontend/src/app/components/admin/dashboard/dashboard.component.ts`
- `frontend/src/app/components/admin/orders/admin-order-detail.component.ts`
- `frontend/src/app/components/admin/orders/admin-orders.component.ts`
- `frontend/src/app/components/admin/product/product.component.ts`
- `frontend/src/app/components/admin/promotion/promotion.component.ts`
- `frontend/src/app/components/admin/report/report.component.ts`
- `frontend/src/app/features/add-to-promotion/add-to-promotion.component.ts`
- `frontend/src/app/features/create-promotion/campaign-summary.component.ts`
- `frontend/src/app/features/create-promotion/create-promotion.component.ts`
- `frontend/src/app/features/product-manage/product-manage.component.ts`
- `frontend/src/app/features/product-manage/product-variants-page.component.ts`
- `frontend/src/app/features/promo-grid/promo-grid.component.ts`
- `frontend/src/app/features/testimonials/testimonials.component.ts`
- `frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.ts`
- `frontend/src/app/shared/favorite-button/favorite-button.component.ts`
- `frontend/src/app/shared/reset-password/reset-password.component.ts`
- `frontend/src/app/shared/components/admin-page-header/admin-page-header.component.ts`
- `frontend/src/app/shared/components/admin-state/admin-state.component.ts`
- `frontend/src/app/shared/components/period-filter/period-filter.component.ts`
- `frontend/src/app/shared/components/product-sku/product-sku.component.ts`
- `frontend/src/app/shared/components/product-variants/product-variants.component.ts`
- `frontend/src/app/shared/ui/cards/cards.component.ts`
- `frontend/src/app/shared/ui/titulo-decorado/titulo-decorado.component.ts`

Demais arquivos alterados: `frontend/angular.json`, `docs/design-system/mensagens-e-estados-ui.md` e `AUDITORIA_FINAL.md`.

### Validação executada

- TypeScript: `tsc --noEmit -p frontend/tsconfig.app.json`, aprovado. Nenhuma referência local quebrada; nenhum componente aponta para CSS próprio.
- Lint Angular: aprovado, sem avisos.
- Angular/Karma no Chrome Headless 158: **340 testes aprovados**; a suíte atual é maior que os 328 citados no pedido.
- Processamento Bootstrap: **2 testes Node aprovados**, preservando estilos da aplicação e comportamento dinâmico do carrossel.
- Build de produção: aprovado, sem alterar budgets. Bundle inicial de **454,87 kB para 454,86 kB**; transferência estimada de **119,74 kB para 119,75 kB**. CSS global de **87.375 para 87.370 bytes**. Sass serializa alguns valores equivalentes de forma diferente, sem mudança visual detectada. Permanece apenas o aviso preexistente do componente de promoções: aproximadamente **15,54 para 15,55 kB**, acima do aviso de 14 kB e abaixo do limite de erro de 16 kB. Não restaram avisos de import Sass obsoleto no build final.
- Playwright com Chrome local, sandbox habilitado: **56 comparações reais antes/depois**, em **1440, 1024, 768 e 390 px**. Todas com dimensões iguais, **zero pixels diferentes** no comparador com threshold 0,1 e sem rolagem horizontal. Páginas: Home, catálogo, produto, login, checkout com endereços salvos, checkout com formulário/checkbox, Dashboard, Produtos, cadastro de produto, Pedidos, Clientes, listagem de Promoções, nova campanha e Relatórios. As capturas de página inteira incluíram os conteúdos inferiores; foram inspecionadas também a renderização de endereços e a proporção do checkbox. Nenhum erro Angular de execução foi detectado nesses cenários.
- A primeira tentativa da comparação foi invalidada pelo bloqueio Chrome de acesso loopback ao servir o HTML por interceptação. A comparação válida utilizou servidor HTTP real para ambos os builds na mesma origem autorizada, com a mesma API isolada, sem mudar CORS ou segurança do navegador.
- PostgreSQL: `TestBrowserAuditServer` aprovado; schema isolado removido, **PRIMARY_COMMERCIAL_STATE_UNCHANGED**, banco principal na migration **50, dirty=false**. Somente as fixtures isoladas receberam endereços, cobertura e carrinho de teste. Nenhum dado principal foi alterado. Backend e frontend principais responderam HTTP 200 nas portas 8080 e 4200.

Bootstrap, SweetAlert2, Google Fonts e CSS produzido em `dist`/dependências continuam em seu formato original. Não há pendência funcional identificada nesta migração; o aviso de orçamento já existente em Promoções permanece registrado.

Os servidores temporários foram encerrados. As 466 entradas de arquivo temporárias (53.33 MiB), incluindo cópia do build anterior, ferramentas de comparação, logs e capturas antes/depois, foram removidas de `.artifacts/scss-migration`. Não foram criados relatórios intermediários permanentes nem novas evidências redundantes.


## Entregas PR e snapshot de frete nos pedidos — 21/11/2026

Concluído no banco principal `bd_box`: migration **000051_order_shipping**, versão **51, dirty=false**, e **11 faixas ativas**. Não havia registros em `shipping_ranges` antes do cadastro. A operação não sobrescreveu cadastros nem alterou preços, estoques, produtos, variantes, clientes, carrinhos ou pedidos existentes.

### Cobertura efetivamente cadastrada

Valores e prazos abaixo são **demonstrativos do TCC**, definidos pelo projeto; não foram extraídos de cotações de transportadoras. O nome de cada registro contém `PR - Demonstrativo TCC`. Valores são armazenados em centavos; prazos são apresentados em dias úteis.

| ID | Município (PR) / fonte de conferência | CEP inicial | CEP final | Frete (R$) | Dias úteis |
| --- | --- | --- | --- | --- | --- |
| 7 | [Umuarama](https://www.ruacep.com.br/pr/umuarama/bairros/) | 87500-001 | 87524-999 | 12,90 | 1 a 2 |
| 11 | [Cruzeiro do Oeste](https://www.ruacep.com.br/pr/cruzeiro-do-oeste/logradouros/) | 87400-000 | 87429-999 | 16,90 | 2 a 3 |
| 5 | [Maria Helena](https://www.ruacep.com.br/pr/maria-helena/logradouros/) | 87480-000 | 87484-999 | 16,90 | 2 a 3 |
| 10 | [Douradina](https://www.ruacep.com.br/pr/douradina/logradouros/) | 87485-000 | 87489-999 | 16,90 | 2 a 3 |
| 4 | [Xambrê](https://www.ruacep.com.br/pr/xambre/logradouros/) | 87535-000 | 87537-999 | 16,90 | 2 a 3 |
| 3 | [Perobal](https://www.ruacep.com.br/pr/perobal/logradouros/) | 87538-000 | 87539-999 | 16,90 | 2 a 3 |
| 1 | [Altônia](https://www.ruacep.com.br/pr/altonia/logradouros/) | 87550-000 | 87554-999 | 19,90 | 3 a 4 |
| 6 | [Iporã](https://www.ruacep.com.br/pr/ipora/logradouros/) | 87560-000 | 87564-999 | 19,90 | 3 a 4 |
| 8 | [Cianorte](https://www.ruacep.com.br/pr/cianorte/logradouros/) | 87200-001 | 87214-999 | 24,90 | 3 a 5 |
| 2 | [Paranavaí](https://www.ruacep.com.br/pr/paranavai/logradouros/) | 87700-001 | 87729-999 | 24,90 | 3 a 5 |
| 9 | [Maringá](https://www.ruacep.com.br/pr/maringa/logradouros/) | 87000-001 | 87109-999 | 29,90 | 4 a 6 |

Pesquisa priorizou o [Busca CEP dos Correios](https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php), cujo formulário exige CAPTCHA; essa proteção não foi contornada. Os intervalos municipais foram cruzados entre o diretório Rua CEP indicado na tabela e a [tabela municipal de logística da Dental Cremer](https://cdn.dentalcremer.com.br/conteudos/Previsao-entrega-horarios-corte-para-entrega-rapida.pdf), páginas 69–77 (numeração do PDF), incluindo distritos dentro das faixas municipais. A [abrangência de logística reversa dos Correios](https://www2.correios.com.br/encomendas/servicosOnline/logisticaReversa/abrangencia/dsp/listaAreaAbrangenciaPDF.cfm) também foi consultada; áreas de CDD/serviço não foram tratadas como equivalentes automáticos a limites municipais. Não se afirma que houve uma consulta interativa autenticada ao DNE.

O CEP **87502-100** corresponde à Rua Marialva, Zona III, Umuarama, conforme [CEPs do Brasil](https://www.cepsdobrasil.com.br/cep/pr/umuarama/rua-marialva). Sua cotação real na API do projeto passou a retornar **1290 centavos, 1 a 2 dias**. Nenhuma faixa foi ampliada por aproximação ou unida à de outro município; por exemplo, Sarandi (87110-000) permanece fora da cobertura. Nenhum dos onze municípios ficou pendente de cadastro e não houve conflito com registros existentes. Os intervalos continuam sujeitos a futuras alterações postais, que exigirão nova conferência.

### Implementação e regras preservadas

- `db/seeds/shipping-pr-20261121.sql` reutiliza `shipping_ranges`. Usa transação, bloqueio da tabela, validação de conflitos inclusive com registros inativos e inserção somente dos intervalos ausentes. Foi executado duas vezes no principal: a segunda execução não criou registros ou IDs adicionais. Não cria tabela nem migration de catálogo.
- A migration 51 adiciona seis campos anuláveis a `checkout_orders`: frete em centavos, prazo mínimo/máximo, modalidade, subtotal original dos produtos e descontos. Uma constraint valida o snapshot completo e a equação `total = subtotal - descontos + frete`. Nenhum `UPDATE` de pedidos antigos foi executado. Ausência de frete permanece `null`, exibida como **Não registrado**, sem ser convertida em frete grátis. O principal tinha **zero pedidos** antes e depois; a preservação de pedidos legados com totais históricos também foi exercitada nas fixtures isoladas.
- O rollback `down` remove os campos somente quando não existem snapshots preenchidos; caso contrário, recusa a operação para não apagar informação financeira. `up/down/up` e essa recusa foram testados em schema isolado. Migrations 1–50 foram preservadas.
- O Angular conserva a cotação do CEP corrente, elimina a cotação anterior ao trocar de endereço/CEP e soma o frete ao valor dos produtos já descontados pelo carrinho. O resumo comum às etapas Entrega, Pagamento e Revisão apresenta frete e prazo separadamente. A mensagem de indisponibilidade desaparece após consulta bem-sucedida. Não houve alteração de SCSS ou redesenho.
- No Go, a tarifa é consultada novamente dentro da transação com bloqueio compartilhado da faixa. O servidor não aceita um frete escolhido pelo cliente: compara o total esperado com os produtos/descontos calculados no servidor mais a tarifa ativa. CEP sem cobertura impede a criação. Mudança de preço exige nova revisão; falta de cobertura devolve HTTP 422. Repetição da mesma compra retorna o snapshot original.
- Preços pagos por item, subtotal original, desconto agregado, frete, prazo, modalidade e total são preservados. A modalidade registrada é apenas `delivery` / **Entrega**, pois não há transportadora ou serviço contratado cadastrado. Não foram inventados dados de PAC/SEDEX.
- Detalhes de pedidos do cliente e da administração mostram os snapshots. Vendas/CSV incluem subtotal, descontos e frete; dados legados continuam sem esses valores. Dashboard e faturamento agregado usam o total efetivo aprovado, incluindo o frete registrado; desempenho de produtos usa os itens, sem distribuir frete artificialmente entre produtos. Cancelamento preserva a informação histórica e retira o total do faturamento aprovado, mantendo a reposição de estoque existente.

### Backup, aplicação e integridade

Backup imediatamente anterior à aplicação: `db/backups/shipping-coverage-20261121/bd_box.before-000051.dump`, formato custom PostgreSQL, **178,558 bytes**, SHA-256 `1017022b7ab61cf4ab698950559d0c546932cfc86de2a7745dcfc994fe5cf91c`. A lista de objetos e a leitura integral via `pg_restore --file NUL` foram aprovadas antes da aplicação. Também foram preservados o backup inicial `bd_box.before-shipping.dump` e o backup final validado `bd_box.after-000051.dump`, no mesmo diretório. Não houve restauração sobre o principal.

A primeira chamada do CLI de migrations falhou somente por sintaxe de URI Windows (`file:///C:/...`); foi confirmado que o banco permanecia em **50, dirty=false** e sem faixas. A URI `file://C:/...`, documentada no README do projeto, permitiu aplicar **somente `up 1`**. Após a migration e após o seed, hashes de conteúdo de **61 tabelas públicas comerciais** permaneceram iguais, excluídos apenas a tabela de faixas e o registro de versão; no JSON dos pedidos foram desconsideradas somente as seis colunas novas. Fingerprint agregado dos hashes preservados: `130becbcf35f218e284809b4c6fde1f05343cd3047df548e2b4d75fa9bc4a962`. A verificação foi repetida após a conferência HTTP.

O executável local `psql.exe` foi encontrado com 0 bytes; as consultas foram realizadas com o driver Go já utilizado pelo projeto, sem expor credenciais. `pg_dump` e `pg_restore` funcionaram. Permanece um aviso **preexistente**, já registrado nesta auditoria, de collation 1540.3 versus 1541.2. Nenhum refresh/reindex ou outra alteração estrutural fora da migration autorizada foi realizado.

### Testes e funcionamento

- `CART_TEST_LOCAL=1 go test ./...`: aprovado, com PostgreSQL isolado. Inclui testes de faixas por cidade, exclusão de municípios vizinhos, idempotência/conflito do seed, snapshot, desconto, tarifa omitida, repetição, cancelamento/reposição e rollback seguro.
- `go vet ./...`: aprovado.
- Angular/Chrome Headless: **54 testes afetados aprovados**, incluindo checkout, pedidos do cliente, detalhe administrativo, Dashboard e Relatórios. Dois cenários novos verificam mudança de CEP/tarifa e reatividade do subtotal. TypeScript dos projetos app e spec, e lint, aprovados.
- Build de produção aprovado: **454,86 kB inicial**. Permanece o aviso anterior de Promoções (15,55 kB, limite de aviso 14 kB e de erro 16 kB). Não foram alterados budgets nem dependências do aplicativo.
- `frontend/e2e/shipping-pr.cjs`, com `SHIPPING_PR_BROWSER=1` no harness existente: **13 cenários ponta a ponta aprovados**, mais verificação de ausência de erros Angular. Consultas das onze cidades, CEP inválido/fora da cobertura, endereço salvo e manual, troca de CEP, quantidade, frete e prazo em Pagamento/Revisão, mudança de cobertura e tarifa após revisão, compra, históricos de cliente/admin, Dashboard, Relatórios e cancelamento. Navegação e capturas temporárias reais em **1440, 1024, 768 e 390 px**, sem overflow horizontal; checkbox de 18 px preservado. Dados inteiramente isolados. As capturas foram descartadas automaticamente pelo helper de artefatos existente.
- Ambas as rodadas do harness finalizaram com **ISOLATED_SCHEMA_REMOVED** e **PRIMARY_COMMERCIAL_STATE_UNCHANGED**, antes de modificar o principal. A primeira execução do teste E2E encontrou somente uma asserção incorreta da automação (`data` em respostas diretas de Dashboard/Relatórios); foi corrigida e reexecutada sobre schema limpo.
- No principal foram feitas somente leituras de validação após os cadastros: GET de catálogo e das onze cotações aprovado; CEP 01001-000 e Sarandi retornam 404, CEP textual inválido retorna 400. Não foi criada compra real nem alterado estoque. O backend reiniciado pelo usuário na porta 8080 foi conferido com o código de snapshots atualizado, e o frontend da porta 4200 respondeu HTTP 200.

### Arquivos criados ou alterados nesta entrega

- `backend/migrations/000051_order_shipping.up.sql`
- `backend/migrations/000051_order_shipping.down.sql`
- `db/seeds/shipping-pr-20261121.sql`
- `backend/src/models/checkout.go`
- `backend/src/models/admin_orders.go`
- `backend/src/repositories/checkout_repository.go`
- `backend/src/repositories/order_history.go`
- `backend/src/repositories/admin_orders.go`
- `backend/src/repositories/dashboard_repository.go`
- `backend/src/repositories/reports.go`
- `backend/src/handlers/reports.go`
- `frontend/src/app/features/checkout/checkout.component.ts`
- `frontend/src/app/features/checkout/checkout.component.html`
- `frontend/src/app/features/checkout/checkout.component.spec.ts`
- `frontend/src/app/features/order-history/order-history.component.ts`
- `frontend/src/app/features/order-history/order-history.component.html`
- `frontend/src/app/components/admin/orders/admin-orders.service.ts`
- `frontend/src/app/components/admin/orders/admin-order-detail.component.html`
- `frontend/src/app/components/admin/dashboard/dashboard.models.ts`
- `frontend/src/app/components/admin/dashboard/dashboard.component.html`
- `frontend/src/app/components/admin/report/report.models.ts`
- `frontend/src/app/components/admin/report/report.component.html`
- `frontend/e2e/shipping-pr.cjs`
- `backend/src/routes/audit_browser_test.go`
- `backend/src/routes/catalog_cushion_covers_test.go`
- `backend/src/routes/cart_test.go`
- `backend/src/routes/catalog_decoracao_test.go`
- `backend/src/routes/catalog_mesa_test.go`
- `backend/src/routes/catalog_towels_test.go`
- `backend/src/routes/checkout_stock_test.go`
- `backend/src/routes/favorites_test.go`
- `backend/src/routes/home_test.go`
- `backend/src/routes/mesa_gallery_roles_test.go`
- `backend/src/routes/order_history_test.go`
- `backend/src/routes/product_admin_crud_test.go`
- `backend/src/routes/product_create_test.go`
- `backend/src/routes/product_variants_admin_test.go`
- `backend/src/routes/shipping_snapshot_test.go`
- `backend/src/routes/reports_test.go`
- `AUDITORIA_FINAL.md`

Os processos temporários foram encerrados e as portas **4206, 8084, 8086 e 9876** ficaram livres. Os processos do usuário em **4200 e 8080** foram preservados. Foram removidos **203 arquivos temporários (32.61 MiB)** de `.artifacts/shipping-coverage`, incluindo ferramentas transitórias, executável de conferência e logs. Backups, seed reproduzível, testes e imagens comerciais foram preservados. Não há pendência funcional identificada para esta entrega; o aviso preexistente de collation permanece documentado para manutenção separada.


## Finalização integrada e guia acadêmico — 22/11/2026

### Escopo e estado do principal

Continuação do trabalho interrompido, sem reiniciar as análises já concluídas. Foram finalizadas avaliações, parcelamento demonstrativo, limpeza comprovada de código, organização de tipos, regressão integrada e documentação acadêmica. Nenhum subagente ou dependência comercial adicional foi utilizado.

Comparação antes/depois das **63 tabelas públicas** por hash do conteúdo ordenado: **zero tabelas alteradas**. `schema_migrations` permaneceu **51, dirty=false**. Os sete servidores E2E também confirmaram `PRIMARY_COMMERCIAL_STATE_UNCHANGED` e `ISOLATED_SCHEMA_REMOVED`. As migrations 52/53 existem e foram exercitadas isoladamente; não houve autorização nem aplicação no banco principal. Não foi reiniciado o backend do usuário para ativar código incompatível com o schema atual.

### Funcionalidades concluídas

- Avaliação de experiência com nota geral 1–5 obrigatória, comentário e consentimento opcionais. Componente reutilizado na confirmação e nos pedidos, com cinco radios acessíveis, rascunho preservado em falha, retry, agradecimento inline sem toast duplicado e estado persistido após reload. Critérios legados permanecem legíveis e opcionais; moderação/consentimento continuam necessários à publicação. Propriedade e pedido confirmado validados no servidor; concorrência retorna sucesso/conflito sem duplicar.
- Migration 52 revisada: critérios auxiliares permitem NULL; down recusa reimpor NOT NULL quando há avaliações simplificadas. Não inventa notas antigas.
- Cartão demonstrativo de 1–6 parcelas sem juros. Pix/boleto somente 1. Nenhum campo ou armazenamento de número de cartão, validade ou CVV. O texto fictício de final de Mastercard foi substituído por informação demonstrativa.
- Plano validado no handler e repository e persistido com o pedido. Divisão em centavos distribui o resto e preserva soma exata. Repetição idempotente e cancelamento mantêm o plano original. Confirmação, histórico do cliente, detalhes administrativos e e-mails usam o plano histórico; NULL antigo não é convertido em informação presumida.
- Migration 53 manual existente integrada ao fluxo; down pendente consolidado com guarda para não apagar planos gravados. Up/down/up e recusa segura exercitados em schema isolado.
- DTOs reutilizáveis separados por domínio com compatibilidade de imports. ProductCommerceUpdate elimina duplicação da forma de atualização de preço/estoque. PaymentPlan permanece no pacote models de Go; estruturas privadas de SQL continuam próximas de seus consumidores.

### Limpeza comprovada

Removido `frontend/src/app/features/catalog/data/catalog.mock.ts`: export CATALOG_MOCK sem consumidores em código, rotas lazy, templates, testes, scripts ou SQL; README antigo foi atualizado. Retiradas injeção/import de ProductService não utilizadas em FeaturedProductsComponent e a entrada serve:ssr:frontend sem build servidor correspondente. Parâmetros não usados do AdminGuard foram apenas renomeados, preservando assinatura/comportamento.

O compilador identificou 118 fontes próprias de produção e 11 fora do grafo. Isso não foi usado como licença para apagar as 11: testes, compatibilidade, configurações e documentação justificaram preservação dos candidatos incertos. Não houve remoção automática de bibliotecas, endpoints públicos/administrativos ou assets por falta de import. A classificação completa está em [CODIGO_NAO_UTILIZADO.md](docs/auditoria/CODIGO_NAO_UTILIZADO.md).

Após todos os testes, removidos **202 arquivos temporários**, recuperando **34.198.340 bytes (32,61 MiB)**: ferramentas locais de Playwright, logs encerrados, helpers de inspeção/captura, snapshots de comparação e executável de validação. O mock de produção removido é adicional a essa contagem temporária. Encerrados apenas preview 4206 e API isolada 8086; nenhuma dessas portas permaneceu aberta. Preservados servidores do usuário em 4200/8080, uploads comerciais, imagens, migrations, backups, testes, dados demo necessários e configurações dos agentes. Sem limpeza externa ao repositório.

### Validação final executada

| Verificação | Resultado |
|---|---|
| TypeScript da aplicação após contratos | Aprovado |
| Angular completo em Chrome Headless 158 | **356 SUCCESS** |
| Go `CART_TEST_LOCAL=1 go test ./...` | Todos os pacotes aprovados; rotas 48,238 s; PostgreSQL isolado |
| `go vet ./...` | Aprovado, sem apontamentos |
| Compilação `go build` da API | Aprovada; executável temporário removido |
| ESLint sem warnings | Aprovado |
| Ferramenta local Bootstrap CSS | 2 testes aprovados |
| Build Angular de produção | Aprovado, pacote inicial 454,86 kB / estimativa transferida 119,74 kB |
| Avaliação dirigida no Playwright | 10 grupos PASS, antes da regressão integrada |
| Parcelamento dirigido no Playwright | 6 grupos PASS, incluindo quatro larguras |
| Regressão Playwright integrada | **7/7 suítes aprovadas**, uma rodada final |
| Integridade do principal | 63 tabelas públicas idênticas; migration 51 limpa |
| Smoke somente leitura após limpeza | frontend 4200 HTTP 200; GET /products 8080 HTTP 200; /admin/products sem sessão HTTP 401 |

Suítes finais: audit.cjs, product-crud.cjs, admin-orders.cjs, admin-orders-states.cjs, admin-customers.cjs, dashboard.cjs e reports.cjs. Resumo verificável em [regressao.json](docs/validacao-visual/finalizacao-2026-11-22/regressao.json). Todas executaram navegador real com sandbox habilitado e schema dedicado removido ao fim.

Cobertura funcional: cadastro/login e recuperação OTP sem SMTP externo; catálogo, filtros, busca, paginação e URL; variantes, preços, estoque, SKU; imagens gerais e específicas, principal/ordenação/remoção; favoritos/carrinho; entrega/checkout; avaliações/moderação; cancelamento e reposição; CRUD administrativo seguro; pedidos, clientes de consulta, dashboard/métricas e relatórios/CSV. Foram exercitados estados vazios, loading, erro HTTP/retry, respostas obsoletas, autorização e confirmações de descarte/exclusão. Condições concorrentes de compra/avaliação e constraints foram verificadas também no PostgreSQL.

Responsividade: 1440, 1024, 768 e 390 px, com navegação, teclado, modais/dropdowns e verificação de overflow. As [capturas finais da avaliação](docs/validacao-visual/avaliacao-pos-compra/review-1440.png) e do [parcelamento](docs/validacao-visual/parcelamento/payment-390.png) foram inspecionadas. Captura inicial após rolagem automática de foco foi refeita no topo; isso era artefato de automação, não motivo para alterar o header aprovado. Teste de renderização de e-mail não é prova de entrega real; build não foi considerado substituto de E2E.

### Auditoria por domínio e severidade

| Área | Evidência e conclusão |
|---|---|
| Arquitetura e organização | net/http, camadas existentes e rotas lazy preservadas; sem recriar módulos |
| Autenticação, recuperação e permissões | Login/OTP e autorização cliente/admin em navegador e testes Go; propriedade em pedidos/avaliações |
| Catálogo, variantes, estoque e mídias | CRUD e compras reais isoladas, imagens/vínculos e SKU preservados |
| Favoritos, carrinho, frete e checkout | UI/API reais, recálculo servidor, total e saldo transacionais |
| Pedidos e cancelamento | Snapshots, variante correta e reposição única; produto com histórico arquivado |
| Avaliações e campanhas | Unicidade/moderação e payload de escrita sem campos de auditoria; sem ampliar consentimento |
| Clientes, dashboard e relatórios | Consultas reais isoladas, filtros, exportações existentes e estados de erro/URL |
| Tipagem e persistência | Compilação, testes e DTOs por domínio sem círculos; JSONB/constraints históricos preservados |
| Responsividade e feedback | Quatro larguras, teclado, vazio/erro/retry; nenhuma certificação assistiva integral alegada |

- **Bloqueio operacional alto antes de implantação:** novo checkout exige coluna installments da 53; avaliação simplificada exige 52. Não ativar o novo backend contra schema 51. Resolver apenas com autorização específica, backup verificado e aplicação ordenada, sem editar migrations históricas.
- **Risco de segurança preexistente:** alertas de dependências/npm já analisados nas seções anteriores permanecem sujeitos a plano de atualização. Esta rodada não repetiu varredura online nem atualizou bibliotecas; não é alegada ausência universal de vulnerabilidades. Resultados históricos de govulncheck não são uma nova execução desta rodada.
- **Baixa severidade/manutenção:** aviso SCSS de Promoções 15,55 kB, acima de 14 kB de aviso e abaixo de 16 kB de erro; orçamento inalterado. URLs localhost em serviços e configurações SSR legadas merecem futura organização por ambiente, fora deste escopo.
- **Limites de demonstração:** sem gateway, cobrança bancária, logística/fiscal real ou prova de SMTP externo. Nenhuma regressão bloqueante foi encontrada nos cenários efetivamente executados; isso não equivale a garantir todos os caminhos possíveis.

### Arquivos desta finalização

Frontend: purchase-review.component.ts/html/scss/spec.ts; checkout.component.ts/html/spec.ts; checkout-success.component.ts/html/spec.ts; order-history.component.ts/html; components/admin/experience-reviews.component.ts/html; components/admin/orders/admin-orders.service.ts e admin-order-detail.component.ts/html; shared/css/focus.scss; shared/utils/installments.ts/spec.ts; shared/models.ts; shared/types/{products,checkout,orders,promotions,api,ui}; core/services/product.service.ts e pagination.service.ts; core/guards/admin.guard.ts; componente FeaturedProducts (import/injeção removidos); package.json e README do catálogo. A lista descreve o escopo desta tarefa e não atribui a ela todas as alterações anteriores ainda não commitadas.

Backend: migrations 000052 up/down e 000053 down revisados (000053 up manual preservado); models/home.go, checkout.go e admin_orders.go; models/payment_plan.go e teste; handlers/home.go e checkoutHandler.go; repositories/home_repository.go, checkout_repository.go, order_history.go e admin_orders.go; services/checkout_email.go e checkout_installments_test.go. A estrutura de testes PostgreSQL passou a aplicar a 53 depois da 51 nos fixtures que criam pedidos: cart, catalog_cushion_covers, catalog_decoracao, catalog_mesa, catalog_towels, checkout_stock, favorites, home, mesa_gallery_roles, order_history, product_admin_crud, product_create e product_variants_admin, além do harness audit_browser_test. Acrescentados purchase_review_test.go e installments_test.go.

Automação: frontend/e2e/audit.cjs adaptado à avaliação geral; post-purchase-review.cjs e installments.cjs reproduzem as novas funções. Capturas finais e regressao.json foram preservados; logs e ferramentas transitórios foram removidos.

Documentação: README.md técnico corrigido (Go 1.26.11/net/http/SPA), CODIGO_NAO_UTILIZADO.md, este relatório e os **14 documentos obrigatórios** de [GUIA_COMPLETO_TCC](docs/GUIA_COMPLETO_TCC/README.md), mais PROGRESSO.md. Guia com diagramas, quinze fluxos ligados ao código, 36 perguntas/respostas, glossário, mapa navegável e plano de quatro dias. Caminhos relativos e presença/conteúdo de todos os arquivos verificados. A implantação pendente é explicitada em todo o guia pertinente.

## Implantação concluída — 22/11/2026

**Resultado final: bd_box na versão 53, dirty=false; backend atualizado na porta 8080.** Aplicadas exclusivamente 52 UP e 53 UP, com autorização explícita. Não foram usados force, down, restauração automática ou migrations posteriores.

### Preparação e backup reutilizado

O erro inicial do backup era search_path indevidamente colocado na URI libpq. A conexão de pg_dump foi construída a partir dos campos da configuração, com sslmode e connect_timeout, sem search_path; senha somente no ambiente do processo filho. .env e configurações permanentes não foram alterados, e nenhuma credencial foi registrada.

Backup completo customizado já validado, **reutilizado sem gerar outro**:

- Caminho: `C:\Users\vitor\Documents\Box-Enxovais-tcc\db\backups\bd_box_pre_migrations_52_53_20261122_023002.dump`.
- Tamanho reconfirmado: **181585 bytes**.
- SHA-256 reconfirmado: `abb2ce94f8c3c773d45ffbd20f8f0fd4f2137df8a0b4eb9537321bbbabd348f8`.
- Validação anterior: pg_dump -Fc com saída 0, pg_restore --list aprovado e leitura integral com pg_restore --file=- aprovada, sem restaurar o principal.
- Preservado em db/backups, fora da área pública HTTP e ignorado pelo Git.

### Fonte do migrador validada antes de conectar ao principal

Executável: C:/Users/vitor/go/bin/migrate.exe. `-version` informa dev; os metadados go version -m identificam **golang-migrate v4.19.1**. O diretório da aplicação é C:/Users/vitor/Documents/Box-Enxovais-tcc/backend, com migrations na subpasta migrations; o diretório inicial do terminal era o workspace Box-Enxovais-v1, por isso não foi usado implicitamente.

O driver file da mesma versão foi aberto sem conexão com banco para localizar e ler os UP 52/53. A forma file:///C:/... não foi aceita por esse driver no Windows. A forma opaca **file:C:/Users/vitor/Documents/Box-Enxovais-tcc/backend/migrations** foi aceita e leu ambos os arquivos. Foi utilizada essa fonte explicitamente com -source, barras normalizadas e argumentos estruturados; não foi repetido o -path Windows que falhara. O teste auxiliar de fonte não modificou dependências ou código da aplicação.

### Aplicação e integridade

| Etapa | Confirmação |
|---|---|
| Antes de aplicar | bd_box 51, dirty=false; backup íntegro; hashes aprovados dos dois UP conferidos |
| Primeiro comando limitado a up 1 | Migration 52 aplicada; versão 52, dirty=false; dados/contagens inalterados |
| Segundo comando limitado a up 1 | Migration 53 aplicada; versão 53, dirty=false; dados/contagens inalterados |
| Conferência final após reinício | Versão 53 limpa; três pedidos preservados; nenhuma compra ou avaliação de teste criada |

Contagens e hashes das **62 tabelas públicas de dados** comparados ao baseline anterior ao backup: idênticos. Para pedidos, o hash compara todos os campos anteriores excluindo somente a nova chave installments, e essa chave foi verificada separadamente: **NULL nos três pedidos históricos**. Não houve mudança em valores, descontos, frete, estoque, produtos, clientes, campanhas ou vínculos. A 63ª tabela pública é schema_migrations, cuja mudança de versão era esperada e foi confirmada separadamente.

Estrutura final: navigation/service/experience aceitam NULL; overall continua obrigatório; installments existe com CHECK checkout_order_installments_valid para cartão 1–6, Pix/boleto 1 e NULL histórico. Os arquivos SQL permaneceram iguais aos aprovados.

### Backend e HTTP

Compilação concluída **antes** de interromper o servidor anterior, usando Go 1.26.11. Binário ativo: db/runtime/migrations52-53-20261122/backend.exe; executável anterior preservado como backend-anterior.exe no mesmo diretório. Somente o processo da API 8080 foi substituído: PID anterior 25468, novo PID 10088. Inicialização registrada sem erro em backend.stderr.log; logs ativos preservados nesse diretório ignorado pelo Git.

Frontend 4200 preservado, mesmo PID 34692; demais processos não foram reiniciados. Verificações somente leitura:

| Requisição | HTTP |
|---|---|
| GET localhost:8080/products | 200 |
| GET localhost:8080/home/reviews | 200 |
| GET localhost:8080/shipping/quote?cep=87502100 | 200 |
| GET localhost:8080/admin/products sem sessão | 401 esperado |
| GET localhost:4200 | 200 |

Não foram executados Playwright, auditoria geral, refatoração ou testes completos. O backend permanece em execução para uso da aplicação; não há servidor temporário de testes aberto. Auxiliares operacionais descartáveis foram removidos após consolidar este resultado; backup, binários e logs ativos preservados. **Implantação autorizada concluída, sem pendências operacionais desta etapa.**


## Auditoria de UX, responsividade e acessibilidade — 22/11/2026

Concluída a comparação com RNF01/RNF02, seções 2.3.3/2.3.5/2.3.8 e Quadro 4 do artigo v.4, sem editar o PDF ou criar funcionalidades previstas. Inventário: 51 entradas/47 padrões de rota; 75 estados e 600 medições em 320/360/390/430/768/1024/1440/1920. Consolidação: 150 análises axe sem violações finais nos estados examinados, 39 verificações funcionais, 56 leituras do catálogo real e 59 testes Angular direcionados aprovados. Build final 454,88 kB, mantendo aviso legado do SCSS de Promoções.

Corrigidos dez grupos de problemas: tabelas de Produtos/Relatórios em containers estreitos, contraste do CTA da galeria, alvo da busca, preços riscados, textos de autenticação/sacola/checkout, SKU/ações administrativas e alvo do input de nova senha. Sem refatoração comercial, API ou migration. Não há P0/P1 pendente conhecido nos cenários executados; não é declaração de conformidade WCAG AA integral nem aplicação SUS.

O schema isolado foi removido. O digest final do harness detectou mudança real no principal e retornou FAIL nesse controle; o usuário confirmou uso simultâneo da loja. Leitura contra o backup confirmou os três pedidos originais intactos e estado 53, dirty=false, agora com cinco pedidos e uma avaliação. Não houve reversão de atividade real ou alegação de igualdade global durante a auditoria.

Detalhes, arquivos, matriz, evidências, limitações e melhorias futuras em [AUDITORIA_USABILIDADE_ACESSIBILIDADE.md](docs/GUIA_COMPLETO_TCC/AUDITORIA_USABILIDADE_ACESSIBILIDADE.md). API e frontend principais preservados; processos temporários encerrados.


## Padronização de UI e revisão visual — 22/11/2026

Implementados estados compartilhados, avisos inline, UF Material, endereço compacto, ECharts modular, ações administrativas, cards de avaliações, Coleções e resumo de Preço/estoque sem moldura duplicada. Geometria e SVG originais do carrinho restaurados após comparação visual. Endereços vazio/erro passaram de aproximadamente 457 para 340 px no desktop (Dados: 343 px), sem altura fixa e sem colapso durante retry.

Validação separada: conjuntos Angular direcionados 66, 3, 26, 11 e 8 aprovados (execuções sobrepostas); build/TypeScript e lint aprovados. Playwright registra 63 verificações finais aprovadas; 54 análises axe sem violações das regras executadas. Capturas foram inspecionadas e problemas estéticos corrigidos; isso não equivale a aprovação automática do site por contagem de testes.

Principal confirmado por leitura: bd_box, 53, dirty=false, cinco pedidos. Uso simultâneo do principal foi confirmado pelo usuário e explica o FAIL de digest de uma sessão; últimas sessões isoladas encerraram com comparação inalterada e remoção dos schemas. Um schema de sessão expirada foi identificado e limpo isoladamente. Nenhum dado comercial foi revertido.

Candidatos novos a desuso foram somente registrados, sem exclusão, após consultar o histórico de limpeza. Permanece aviso de CSS de Promoções abaixo do limite de erro; budgets preservados. Detalhamento, arquivos, evidências, revisão visual e limitações: [PADRONIZACAO_UI_FINAL.md](docs/GUIA_COMPLETO_TCC/PADRONIZACAO_UI_FINAL.md).

Limpeza desta entrega: 229 temporários removidos (22.562.488 bytes); candidatos de código preservados. Última sessão isolada: PASS, schema removido, principal comercial inalterado nesse intervalo.
