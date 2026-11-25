# 07 — Testes e qualidade

## O que cada nível demonstra

Testes unitários Angular verificam controles, mensagens, estados e chamadas HTTP com respostas controladas. São rápidos, mas não provam que a API e o banco realmente trabalham juntos. Testes Go exercitam validação, modelos, serviços e handlers; os testes de integração abrem PostgreSQL isolado, aplicam migrations e verificam transações/constraints. Playwright navega em Chrome real e interage com formulários, radios, uploads, modais e URLs. Build confirma que o código produz artefatos de distribuição, não que todos os fluxos funcionam.

## Resultados históricos — 22/11/2026

| Verificação executada | Resultado real |
|---|---|
| TypeScript da aplicação após separar contratos | Aprovado, sem emissão de arquivos |
| Angular completo, Karma + Chrome Headless 158 | **356 testes aprovados** |
| Go `go test ./...` com opt-in PostgreSQL local isolado | Todos os pacotes aprovados; rotas 48,238 s; alguns pacotes aproveitaram cache válido |
| Go `go vet ./...` | Aprovado, sem apontamentos |
| Go build da API | Aprovado; executável de validação temporário |
| ESLint `npm run lint` | Aprovado, sem warnings |
| Ferramenta local Bootstrap CSS | 2 testes aprovados |
| Build Angular de produção | Aprovado; inicial 454,86 kB, transferência estimada 119,74 kB |
| Regressão final Playwright | **7 suítes aprovadas**; schemas removidos e principal sem alterações em todas |
| Avaliação pós-compra, E2E dirigido | 10 grupos PASS, incluindo 4 larguras e concorrência; executado antes da regressão final |
| Parcelamento, E2E dirigido | 6 grupos PASS; cartão, Pix/boleto, centavos, históricos e cancelamento |
| Banco principal antes/depois | 63 tabelas públicas com hashes idênticos, versão 51 e dirty=false |

O build mantém um aviso preexistente: SCSS de Promoções 15,55 kB, acima do aviso de 14 kB e abaixo do erro de 16 kB. O orçamento não foi aumentado. Não há erro de build, mas reduzir esse CSS é uma melhoria de manutenção, não foi uma refatoração autorizada para esta funcionalidade.

## Suítes de navegação final

`frontend/e2e/regression.cjs` executou uma rodada completa dos scripts `audit.cjs`, `product-crud.cjs`, `admin-orders.cjs`, `admin-orders-states.cjs`, `admin-customers.cjs`, `dashboard.cjs` e `reports.cjs`. Cada script recebeu servidor/schema próprios. A evidência consolidada está em [regressao.json](../validacao-visual/finalizacao-2026-11-22/regressao.json).

Foram exercitados login administrativo/cliente, cadastro público, OTP em teste sem SMTP, catálogo/ordenação/URL, variantes/preço/estoque, favorito, carrinho, checkout, confirmação, avaliação/moderação, cancelamento/reposição e CRUD de produtos, categorias, marcas e faixas. Os testes comerciais usam apenas dados criados no schema de teste. Promoções cobrem imagem, desconto, edição sem timestamps de leitura e prévia na Home.

Pedidos administrativos cobrem filtros, histórico imutável, inexistente, autorização e cancelamento duplicado. Clientes cobrem consulta, indicadores, carregamento, vazio e retry. Dashboard e relatórios verificam períodos, consultas obsoletas, filtros, CSV e proteção de exportação. Não foi inventada exportação de clientes. Foram exercitados modais, dropdowns e teclado nas quatro larguras.

## Avaliação e parcelamento

`purchase_review_test.go` verifica avaliação antiga, campos auxiliares opcionais, nota obrigatória, comentário limitado, permissões, propriedade, cancelamento e concorrência de dois envios. A unicidade produz um sucesso e um conflito, sem duplicar registro. A migration 52 foi revertida/reaplicada em schema isolado; o down recusa dados incompatíveis.

`installments_test.go` verifica quantidade persistida, plano exato, métodos inválidos, pedido histórico NULL, leitura do cliente/admin, idempotência e cancelamento. `payment_plan_test.go` testa a soma para valores pequenos e não divisíveis. O down da 53 interrompe quando apagaria planos gravados. Os testes de template de e-mail conferem renderização, sem enviar correspondência real.

## Evidências visuais

A avaliação foi capturada em [1440](../validacao-visual/avaliacao-pos-compra/review-1440.png), [1024](../validacao-visual/avaliacao-pos-compra/review-1024.png), [768](../validacao-visual/avaliacao-pos-compra/review-768.png) e [390 px](../validacao-visual/avaliacao-pos-compra/review-390.png), além do [estado salvo](../validacao-visual/avaliacao-pos-compra/saved-390.png). Parcelamento possui capturas de [pagamento desktop](../validacao-visual/parcelamento/payment-1440.png) e [mobile](../validacao-visual/parcelamento/payment-390.png).

A automação verificou ausência de overflow horizontal, elementos visíveis, teclado e respostas reais. Capturas foram inspecionadas visualmente para legibilidade e composição. Uma captura inicial de avaliação foi refeita com a página no topo: o header fixo havia sido fotografado após rolagem automática ao radio. Foi uma condição da captura, não justificativa para alterar o layout aprovado.

## Reprodução segura

Na raiz do frontend, use Node compatível com `.nvmrc`: `npm test -- --watch=false --browsers=ChromeHeadless`, `npm run lint` e `npm run build`. No backend, `go test ./...` e `go vet ./...`. Integração exige CART_TEST_DATABASE_URL e REVIEW_TEST_DATABASE_URL apontando explicitamente a um banco descartável. Evite o fallback local quando o objetivo é preservar integralmente o principal. Confira os helpers antes de executar: eles criam schemas e não aplicam a sequência ao public.

Para E2E, é necessário Playwright disponível na ferramenta de testes, Chrome/Chromium instalado, build servido por `frontend/e2e/serve.cjs` em 4206 e porta 8086 livre. `regression.cjs` gerencia a API isolada e exige `AUDIT_BROWSER=1`/flags internos no processo de teste. Não desative sandbox do Chromium nem segurança do navegador para fazê-lo funcionar. Ferramentas temporárias usadas nesta execução não são dependência comercial instalada no projeto.

## Limites da evidência

Não houve pagamento bancário, envio real de newsletter/recibo, certificação WCAG completa ou nova varredura online de vulnerabilidades nesta rodada. O histórico anterior de segurança está em [AUDITORIA_FINAL.md](../../AUDITORIA_FINAL.md). Ausência de erro nos cenários executados não comprova ausência de todos os defeitos possíveis. Essa situação de implantação era histórica; o estado confirmado na auditoria atual é 54, dirty=false. A 55 não foi aplicada.

## Validação atual — 25/11/2026

433 testes Angular aprovados; TypeScript sem emissão/noUnusedLocals, build produção, Go vet/build e go test normal/race com PostgreSQL isolado aprovados. Não somar estes resultados aos 356 históricos. Detalhes e limitações visuais estão no AUDITORIA_FINAL.md; evidências atuais em ../validacao-visual/angular-2026-11-25/.

Executor atual: frontend/e2e/frontend-audit.cjs, Playwright opcional, Chrome real com sandbox. O harness TestBrowserAuditServer exige DB_NAME com prefixo box_frontend_audit_ e AUDIT_ISOLATED_DATABASE idêntico; ambos opt-ins PostgreSQL devem usar o alvo descartável. Prepare banco com migrations em ambiente isolado, build em 4206 e API de teste em 8086. Nenhum desses comandos autoriza usar bd_box. Ao terminar, crie backend/audit-browser.stop, espere o teste encerrar e remova somente o banco descartável depois de fechar conexões; encerre o preview pelo PID próprio.

O driver atual cobre leitura/navegação, aliases e teclado; não substitui os cenários comerciais já executados separadamente. Scripts E2E históricos podem conter rotas antigas; aliases preservam compatibilidade, mas cada executor deve ser conferido antes de novo uso. Screenshots com fixture sintético não comprovam imagens comerciais. Build/overflow não são aprovação visual ou certificação WCAG.
