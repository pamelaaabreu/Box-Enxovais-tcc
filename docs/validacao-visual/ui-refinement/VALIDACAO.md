# Refinamento administrativo — 23/11/2026

## Escopo e arquitetura

Implementação sobre os arquivos existentes. Reutilizados AdminPageHeader, ProductSku, ProductVariants, ProductCommerceSummary, ProductCreate, ProductImageUpload, MatTabs, MatSelect, MatMenu e ConfirmDialog. Nenhum componente novo, endpoint, contrato, model, migration ou dado comercial foi criado/alterado.

- Pedido: apenas Produtos comprados, Resumo financeiro e Entrega. Cliente/eventos permanecem no objeto e na API, mas não são renderizados. Financeiro oliva escuro, textos claros, total destacado e alturas naturais.
- Produtos: estoque centralizado e remoção da largura mínima global de 230 px das opções administrativas, que excedia o gatilho do seletor de paginação. Posicionamento continua nativo do CDK.
- Variações: menos padding, quatro campos alinhados no desktop, duas colunas em celulares a partir de 360 px e uma abaixo disso. Dimensões obrigatórias e IDs preservados. Estado vazio e indicação de alterações pendentes.
- Edição: cabeçalho único com nome real e SKU somente leitura/copiar. A aba Variações projeta um template do ProductCreate e usa exatamente o mesmo FormArray; não carrega uma segunda cópia de edição. A rota antiga de variações e seu fluxo de salvamento permanecem disponíveis.
- Galeria: grade responsiva e alvos de ação de 44 px; upload, capa, ordenação e remoção existentes preservados. Não foi adicionado drag-and-drop, inexistente no editor atual.

## Testes automatizados

- Angular: 50/50 testes direcionados aprovados (pedido, produtos, gerenciamento, cadastro/edição, variações, SKU, galeria e cabeçalho).
- Build de produção aprovado. Permanece aviso anterior do SCSS de Promoções: 15,97 kB para orçamento de aviso de 14 kB. Orçamentos não foram aumentados.
- Chrome local com sandbox habilitado, build de produção servido apenas em 127.0.0.1:4287 e respostas HTTP interceptadas em contexto isolado. Nenhuma operação foi encaminhada ao backend principal.
- Navegação real em 320, 390, 768, 1024, 1440 e 1920 px: pedido, rota de variações, aba Variações, Imagens e dropdown da listagem. Capturas com esses sufixos nesta pasta. Ausência de overflow horizontal da página nas verificações realizadas.
- Máscara monetária; persistência da edição entre abas; adicionar/remover variantes; PATCH do produto sem enviar SKU; PUT da rota de variantes; caso sem variantes e valores simples; doze variantes; bloqueio de valor inválido; recusa de descarte.
- Galeria: reordenação, capa, remoção confirmada e upload validados contra respostas simuladas em memória. Isto não certifica persistência em PostgreSQL ou upload real de arquivos no servidor.

## Conferência interativa e visual

Uso direto do Chrome visível por Computer Use em 1280 e 390 px: troca de abas, máscara (29990 → 299,90), atualização do menor preço, copiar SKU com confirmação, diálogo de descarte e retorno sem salvar, abertura do seletor na borda direita e escolha de 50 por teclado, abertura da sidebar mobile e fechamento por Esc com foco restaurado. Captura `interacao-mobile-390.png`.

As nove referências do ZIP foram abertas e comparadas com as capturas. Foram mantidas Montserrat e paleta real, sem copiar serifadas, vinho ou conteúdo fictício. As seis larguras foram navegadas e capturadas por automação; não se confunde essa cobertura com uma sessão interativa humana em cada resolução.

Problemas encontrados/corrigidos durante a revisão:

1. Cabeçalho atualizado durante a checagem inicial com resposta síncrona: corrigido o ciclo de atualização, com teste de regressão.
2. Capturas no meio da animação mostravam dois painéis: espera explícita pelo fim das animações antes da captura, sem alterar o comportamento das abas.
3. Rótulo Dados do produto recortado no mobile: texto responsivo com quebra dentro da aba.
4. Área ociosa na rota de variações: fieldset dimensionado pela largura do container.
5. Resposta incorreta do mock de remoção de imagens: corrigido somente o roteiro para devolver a lista atualizada, conforme contrato real.

## Limites preservados

- A API não possui SKU individual de variante: nenhum código fictício foi gerado na interface. Mantidos SKU principal e identificação existente das variantes.
- Com variantes, preço inicial e estoque total continuam calculados; a referência não foi usada para criar edição manual conflitante desses valores.
- Persistência comercial, permissões no servidor e banco não foram reavaliados nesta tarefa de interface. O banco principal não foi acessado pelos testes.
- Não há certificação completa de WCAG. Foram verificados foco, teclado, labels existentes e legibilidade visual nos estados exercitados.

## Etapa seguinte — espaçamento das abas

Executada depois do refinamento anterior. Retirado o padding exclusivo de `.tab-content` e aplicado `padding-block: 14px 4px` ao `.mat-mdc-tab-body-wrapper` deste ProductManage. Sem seletores globais para outros grupos de abas.

A medição em Chrome confirmou distância de 14 px entre o fim da barra e o primeiro card em Dados do produto, Imagens e Variações nas seis larguras. Evidências `espacamento-0-*`, `espacamento-1-*` e `espacamento-2-*` (0=Dados, 1=Imagens, 2=Variações). O último ajuste mobile também faz os campos e os painéis auxiliares empilharem abaixo de 530 px, evitando uma prévia espremida em duas colunas.

Verificações adicionais: overlays da paginação e do menu junto ao rodapé, com rolagem, em 390 e 1440 px; pedido cancelado com dois itens, cancelamento bloqueado e dados financeiros ausentes. Todos passaram no contexto HTTP isolado.

## Arquivos completos alterados nesta entrega

Arquivos mantidos integralmente no workspace, sem substituir o código por trechos:

- `frontend/src/styles.scss`
- `frontend/src/app/components/admin/admin/admin.component.html`
- `frontend/src/app/components/admin/orders/admin-order-detail.component.html`
- `frontend/src/app/components/admin/orders/admin-order-detail.component.scss`
- `frontend/src/app/components/admin/orders/admin-order-detail.component.spec.ts`
- `frontend/src/app/components/admin/product/product.component.html`
- `frontend/src/app/components/admin/product/product.component.scss`
- `frontend/src/app/shared/components/admin-page-header/admin-page-header.component.scss`
- `frontend/src/app/shared/components/product-sku/product-sku.component.ts`
- `frontend/src/app/shared/components/product-sku/product-sku.component.html`
- `frontend/src/app/shared/components/product-sku/product-sku.component.scss`
- `frontend/src/app/shared/components/product-variants/product-variants.component.html`
- `frontend/src/app/shared/components/product-variants/product-variants.component.scss`
- `frontend/src/app/features/product-manage/product-manage.component.ts`
- `frontend/src/app/features/product-manage/product-manage.component.html`
- `frontend/src/app/features/product-manage/product-manage.component.scss`
- `frontend/src/app/features/product-manage/product-manage.component.spec.ts`
- `frontend/src/app/features/product-manage/product-variants-page.component.html`
- `frontend/src/app/features/product-manage/product-variants-page.component.scss`
- `frontend/src/app/features/product-manage/register/product-create/product-create.component.ts`
- `frontend/src/app/features/product-manage/register/product-create/product-create.component.html`
- `frontend/src/app/features/product-manage/register/product-create/product-create.component.scss`
- `frontend/src/app/features/product-manage/images/product-image-upload/product-image-upload.component.scss`
- `frontend/e2e/admin-orders.cjs` e `frontend/e2e/product-crud.cjs`: expectativas adaptadas à interface atual; checagem de sintaxe executada. Suítes persistentes completas com Go/PostgreSQL não executadas nesta tarefa.

Nenhum processo do usuário em 4200/8080 foi encerrado ou reiniciado. A janela e o servidor de validação são temporários e encerrados ao fim; somente referências extraídas e runtime descartável desta tarefa são removidos.

Capturas finais de Imagens e da aba Variações usam os prefixos `espacamento-1-` e `espacamento-2-`. Capturas intermediárias anteriores ao ajuste de espaçamento foram removidas; preservadas referências originais no ZIP fornecido pelo usuário e a evidência interativa.

## Galeria e variações — 23/11/2026

Executada a sequência solicitada: galeria e estados compartilhados; depois acabamento da linha inválida.

- Galeria: upload múltiplo automático e sequencial, erros por arquivo, capa em destaque, miniaturas, arraste CDK, alternativa por teclado, confirmação de remoção e recuperação de falha. Mantidos endpoints e IDs existentes.
- Variações: estado vazio reutiliza AdminStateComponent; resumo dinâmico em três indicadores; campos alinhados, mensagem associada por aria-describedby e erro somente após interação. Corrigida sobreposição real da lixeira com Dimensões no mobile, causada pelo posicionamento herdado do grid.
- Angular: rodada direcionada de 43 testes aprovada; rechecagens de 5 testes da galeria e 7 de variações/resumo/gerenciamento aprovadas (contagens sobrepostas).
- Chrome real com respostas HTTP isoladas: capa, reordenação por teclado, arraste CDK, exclusão confirmada, envio múltiplo, salvamento e recuperação de erro aprovados. Sem gravações no banco principal. Conferência interativa adicional da galeria e estado vazio realizada.
- Capturas e geometria em 320, 390, 768, 1024, 1440 e 1920 px. Inspeção visual das capturas de galeria, estado vazio, resumo e linha inválida; última revisão em 390 e 1440 confirmou lixeira separada dos campos e mensagem abaixo dos controles. Evidências em ../galeria-variacoes/.
- Acessibilidade direcionada: rótulos, mensagem de validação vinculada aos campos, botões de 44 px e alternativa de reordenação por teclado. Não representa auditoria WCAG completa.
- Build de produção aprovado. Permanece aviso preexistente do SCSS de Promoções: 15,97 kB ante orçamento de aviso de 14 kB. Não alterado nesta tarefa.
- node --check frontend/e2e/product-crud.cjs e git diff --check aprovados.
- Arquivos principais: product-image-upload.component (TS/HTML/SCSS/spec), product-variants.component (TS/HTML/SCSS/spec), product-commerce-summary.component (TS/HTML/SCSS), admin-page-header.component (TS/HTML/SCSS), product-create.component (HTML/SCSS), product-manage.component.html, product-variants-page.component.html e frontend/e2e/product-crud.cjs.
- Limite: persistência real Go/PostgreSQL não reexecutada nesta etapa de interface; fluxos de navegador utilizaram fixtures isoladas. Frontend e API do usuário preservados; portas temporárias 4287 e 9876 sem listeners ao finalizar.
