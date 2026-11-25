> Evidência histórica: datas, PIDs, contagens e estado de implantação abaixo descrevem a execução registrada. Para arquitetura e resultados atuais, consulte README.md deste guia e AUDITORIA_FINAL.md. Não reaplique migrations com base neste histórico.

# Padronização de UI e revisão visual — 22/11/2026

## Escopo implementado

Execução do pacote de referências, seguida por Coleções, Preço e estoque, refinamento visual dos estados/gráficos e correção adicional da altura de Endereços. A auditoria anterior não foi reiniciada e seus números não são resultados desta entrega.

- `AdminStateComponent` reutilizado em estados públicos e administrativos. Geometria original do carrinho restaurada: 108 × 104 px, fundo `#e8ede3`, inset original, rotação de −13° e `border-radius: 38% 62% 48% 52% / 54% 39% 61% 46%`. SVG original da sacola preservado; demais ícones finos usam Lucide. Variantes page/section/compact compartilham a identidade.
- `InlineNoticeComponent` e tipos em `shared/types/ui/feedback.ts`: erro, aviso, sucesso e informação; mensagens compactas, faixa lateral, sem anúncios live duplicados. Aplicação no carrinho, checkout, Conta e avaliação de compra. Validações de campo continuam locais e notificações transitórias continuam nos serviços existentes.
- Tokens e classes opt-in de botões/campos em `styles.scss`; cabeçalho, período, ações de produtos e promoções usam dimensões e hierarquia coerentes. Sem substituição global dos overlays Material.
- Endereço do checkout reorganizado conforme a Conta; UF usa `MatSelectModule` nos dois formulários, preservando Reactive Forms, CEP, cobertura, telefone e salvamento opcional.
- Dashboard/Métricas continuam usando o mesmo componente. Seis gráficos migrados para ECharts 6.1.0: faturamento, status, clientes, pedidos, produtos e categorias. Imports modulares, wrapper único, ResizeObserver, atualização da instância e dispose no destroy.
- Faturamento em barras; evolução em linhas sem curvas artificiais. Zeros preservados, resumos reais, datas curtas no eixo e completas no tooltip/tabela. Alturas adaptativas, nomes completos com quebra de linha, grade discreta e tooltip Montserrat/creme/oliva. Cada gráfico possui descrição textual e tabela; Canvas não é considerado automaticamente acessível.
- Avaliações: nota visual com alternativa textual, comentário/consentimento e moderação em composição compacta responsiva. Nenhuma mudança de API ou consentimento.
- Coleções reutilizam CatalogToolbarComponent, ProductCardComponent, PaginationComponent e estados compartilhados; busca por nome/SKU, ordenação e grid responsivo. Nenhuma regra de elegibilidade foi alterada.
- Preço e estoque: resumo embutido sem a segunda moldura; a moldura externa e a observação sobre promoções permanecem. Cálculos, IDs, preços e estoques preservados.
- Paginação compartilhada confirmada nas telas afetadas; nenhuma segunda implementação foi criada.

## Testes funcionais e compilação

| Verificação executada | Resultado |
| --- | --- |
| Angular: conjunto principal do MD | 66 aprovados |
| Angular: Coleções/toolbar | 3 aprovados |
| Angular: cadastro e resumo comercial | 26 aprovados |
| Angular: gráficos, estados e Conta após refinamento | 11 aprovados |
| Angular: última regressão de endereço, avaliações e estados | 8 aprovados |
| TypeScript e build de produção | Aprovados; última compilação após a correção da recuperação de endereços |
| ESLint | Aprovado, sem warnings de lint |
| Playwright/Chrome 158 local | 63 registros finais aprovados: 50 combinações de tela/largura e 13 cenários específicos; os retestes atualizam os mesmos registros |
| PostgreSQL isolado | Harness de API real; última sessão PASS, schema removido e comparação comercial do principal inalterada durante essa sessão |

As contagens Angular são execuções direcionadas com sobreposição, não uma soma de testes únicos. Não foram repetidas suítes gerais Go/Angular nem a auditoria anterior. A automação reproduz estados de HTTP 503 e indisponibilidade de estoque por interceptação identificada; demais consultas usam a API e o schema isolados.

## Acessibilidade verificada

54 análises axe do conjunto final: 50 combinações de tela/largura, duas de aviso inline e duas do formulário da Conta; nenhuma violação das regras executadas com tags WCAG 2 A/AA. UF foi operada por teclado nos dois formulários; overlay conferido dentro da viewport. Retry, mensagens semânticas, alternativa tabular, rolagem da tabela com foco e ausência de overflow da página foram verificados. Isso não equivale a certificação WCAG ou teste com leitor de tela físico.

## Revisão visual efetivamente realizada

As imagens foram abertas e inspecionadas; renderização e ausência de overflow não foram usadas como aprovação estética.

| Tela/composição inspecionada | Capturas e comparação |
| --- | --- |
| Carrinho vazio | 320, 390, 768, 1024 e 1440; comparação com referência 01 e SCSS/SVG originais |
| Dashboard, seis gráficos | 320, 390, 768, 1024 e 1440; KPIs, alturas, eixos, nomes completos e distribuição |
| Métricas | Capturas próprias desktop/mobile; mesma composição de gráficos do Dashboard, com navegação real nas cinco larguras |
| Tooltip de faturamento | Captura própria 1440, data completa e moeda, borda/fonte/fundo inspecionados |
| Produtos, Promoções e Avaliações | Capturas 390/1440; controles, ações, badges e hierarquia comparados às referências |
| Checkout e formulário da Conta | Capturas 390/1440, comparadas à referência 06; UF e responsividade exercitadas nas larguras previstas |
| Coleções e Preço e estoque | Capturas 390/1440, grade, alinhamentos e moldura externa inspecionados |
| Endereços vazio/erro e aviso de estoque | Capturas contextualizadas, medidas reais e recuperação verificadas |

Problemas encontrados visualmente e corrigidos: geometria circular e ícone divergente do carrinho; CTA quebrado em 320; período truncado em 320; rótulos dos gráficos com reticências; eixos/datas excessivos; altura uniforme inadequada; cartão de avaliações com área ociosa; regras locais que anulavam botões compartilhados; espaços vazios na grade de endereço; duas molduras no resumo comercial; padding acumulado no estado de endereços. Capturas feitas durante animação/rolagem foram substituídas por capturas estáveis; medidas do DOM confirmaram que navbar e etapas do checkout não se sobrepunham.

Evidências finais e resultados: `docs/validacao-visual/ui-final-20261122/`. Dados e fotografias neutras dessas capturas pertencem ao ambiente isolado; não foi feita uma revisão da qualidade de todas as fotografias comerciais.

## Altura adicional de Endereços

A captura enviada mostra vazio, não erro HTTP. Havia padding no corpo, no container local e no estado genérico. Foi aplicada densidade compacta contextual, sem altura fixa, clipping ou mudança no formulário de edição. O erro de carregamento agora fica no próprio painel com retry; não desaparece enquanto a tentativa está pendente.

| Largura | Meus dados | Endereços vazio antes | Vazio depois | Erro depois |
| --- | ---: | ---: | ---: | ---: |
| 320 | 546,92 | 551,38 | 384,28 | 388,19 |
| 390 | 546,92 | 501,28 | 384,28 | 361,19 |
| 768 | 342,95 | 451,19 | 334,19 | 334,19 |
| 1024 | 342,95 | 451,83 | 334,83 | 334,83 |
| 1440 | 342,95 | 456,58 | 339,58 | 339,58 |

Medidas em CSS px. O estado não aumenta o painel em relação a Dados. No desktop vazio e erro têm a mesma altura; no mobile, conteúdo textual pode alterar a altura natural sem gerar o crescimento anterior. A altura também foi comparada antes/durante retry pausado: diferença inferior a 1 px.

## Candidatos a desuso — somente registro, nenhuma exclusão

Histórico consultado: seção Limpeza comprovada de `AUDITORIA_FINAL.md` e `docs/auditoria/CODIGO_NAO_UTILIZADO.md`. Os 11 arquivos de uso incerto já classificados não foram reavaliados ou excluídos. O documento histórico contém estados anteriores de migrations; o estado atual confirmado é 53.

| Candidato localizado | Referências verificadas | Risco de exclusão futura |
| --- | --- | --- |
| `dashboard.component.ts`: maxTopUnits e maxUnits | Busca em frontend/src e e2e encontra somente as duas declarações; os novos gráficos usam productBars/categoryBars | Baixo, após teste direcionado; preservados |
| `dashboard-trend.component.scss`: svg e endpoints | O template atual usa app-chart e tabela, sem SVG/endpoints locais | Baixo; preservar até limpeza autorizada |
| `favorites.component.scss`: empty-symbol e seus SVGs | Nenhum consumidor em TS/HTML do componente; estado passou ao compartilhado | Baixo; preservados |
| `account.component.scss`: address-empty .section-icon, h3 e p locais | HTML usa app-admin-state; elementos internos são encapsulados e usam state-icon/h2 | Baixo a médio; preservar encapsulamento e futuras projeções |
| `not-found.component.scss`: error-illustration e estilos da antiga composição | TS/HTML atuais não instanciam essa ilustração/composição | Médio; não inclui autorização para excluir imagens ou documentação |

Nenhum serviço, componente compartilhado, rota lazy, dependência, asset comercial ou arquivo acadêmico foi removido por esta revisão. Nenhuma nova auditoria geral de grafo foi executada.

## Arquivos da implementação

- `frontend/package.json`, `package-lock.json`, `src/styles.scss`.
- Shared: `types/ui/feedback.ts`; componentes `admin-state`, `inline-notice`, `chart` (wrapper/configuração/barra/testes), `period-filter`, `admin-page-header` e `product-commerce-summary`.
- Admin: `dashboard` (componente/trend/teste), `product` (HTML/SCSS), `experience-reviews` (HTML/SCSS).
- Features: `cart`, `favorites`, `account` (inclui regressão), `checkout`, `campaign` (inclui teste), `not-found`, `order-history` (inclui adaptação do teste), `purchase-review`, `create-promotion`; catálogo `category`, `product-detail`, `catalog-toolbar`; cadastro `product-create` (HTML/SCSS).
- Automação: `frontend/e2e/ui-final.cjs`; seletor de `frontend/e2e/dashboard.cjs` adaptado de SVG para Canvas ECharts.
- Este relatório, evidências finais e resumo em `AUDITORIA_FINAL.md`.

## Banco, processos e limitações

Sem alterações de código Go, contratos HTTP ou migrations. Consultas finais somente leitura confirmaram `bd_box`, versão 53, dirty=false e cinco pedidos. Os writes de preparação dos testes foram enviados somente à API/schema isolados.

Uma comparação da sessão longa detectou atividade simultânea no principal, confirmada pelo usuário; essa sessão retornou FAIL no digest e não foi apresentada como prova de imutabilidade. Uma sessão temporária de cinco minutos expirou durante a continuidade; seu schema identificado foi removido após confirmar a identidade da fixture. Sessões posteriores encerradas normalmente registraram `PRIMARY_COMMERCIAL_STATE_UNCHANGED` e `ISOLATED_SCHEMA_REMOVED`.

Permanecem: warning de CSS de Promoções (15,97 kB, acima do aviso de 14 kB e abaixo do erro de 16 kB); não houve aumento de budgets. Não foi executado teste com leitor de tela físico nem uma nova auditoria de todas as fotografias/rotas. Os candidatos a desuso permanecem intocados. Nenhuma divergência visual relevante permanece identificada nas composições efetivamente inspecionadas; isso não transforma a amostra em aprovação irrestrita de todo o site.

Ferramentas, logs e helpers temporários desta tarefa são removidos ao final; somente evidências finais permanecem em docs. Serviços do usuário em 4200/8080 preservados; preview/API isolada encerrados.

Limpeza final confirmada: 229 arquivos auxiliares desta tarefa removidos, recuperando 22.562.488 bytes (21,52 MiB). Nenhum candidato de código ou asset foi excluído.
