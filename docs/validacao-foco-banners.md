# Validação de foco, banners e trust bar

Este relatório registra a etapa anterior, com gradiente lateral. O refinamento fotográfico solicitado depois removeu essa faixa e adicionou capas alternativas de Banho e Almofadas; os originais foram preservados. As capturas posteriores estão em `banner-fotografico-depois`, no mesmo diretório de validação.

O contorno azul da navbar vinha da sombra de foco do Bootstrap, combinada com outro outline local. O Bootstrap também era carregado em duplicidade (CDN 5.3.2 e bundle Angular local 5.3.8), causando timers e handlers concorrentes; a versão local foi preservada e as referências duplicadas do CDN foram removidas. O reset global removia bordas e outlines dos campos com `!important`, e `transition: all` animava o contorno nativo antes do personalizado.

O foco agora usa tokens compartilhados, anel de 2 px e distância de 3 px, com oliva claro nos fundos escuros. Campos compostos e Material destacam uma única superfície. O helper da raiz revela controles encobertos pelo header ou pela compra mobile, sem interferir no foco de diálogos. Contrastes calculados: 6,20:1 no creme, 5,43:1 no bege e 6,70:1 no oliva escuro.

Referências avaliadas: [WCAG 2.4.7 — foco visível](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible), [WCAG 2.4.11 — foco não encoberto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) e [WCAG 2.2 — teclado e contraste não textual](https://www.w3.org/TR/WCAG22/). Esta validação direcionada não equivale a uma certificação integral de conformidade.

Os três banners preservam as fotografias de `frontend/public/home/`, com textos curtos editáveis, Cormorant Garamond nos títulos e Montserrat nos demais textos. O gradiente parte da extremidade esquerda. Banho e Almofadas receberam enquadramento CSS mais próximo. Nenhuma imagem foi sobrescrita.

A trust bar é um componente separado, renderizado uma única vez após o carrossel. São três benefícios compactos, com SVGs, divisórias e empilhamento no mobile. Não foram adicionadas condições de frete ou parcelamento.

## Testes

- 57 testes Angular direcionados passaram: foco, navbar, autenticação, conta, checkout, carrinho, cadastro de produtos, galeria, diálogos, favoritos, quantidade e paginação.
- 2 testes adicionais de banners/trust bar passaram. Reexecução final de 5 testes de foco e banners também passou.
- Build de produção concluído; permanecem os avisos já existentes sobre budgets, CommonJS, optional chaining e seletores Bootstrap.
- Chrome em 1440, 1024, 768 e 390 px: sem overflow horizontal; três slides com alturas iguais; imagens carregadas; uma trust bar independente; CTAs e indicadores conferidos.
- Navegação com Tab: 32 passos por largura, sem foco oculto nos percursos verificados. Espaço abre zoom e menu; Escape fecha e restaura o foco do menu. Campos Material exibem anel na superfície externa e nenhum contorno interno duplicado.
- Banco, APIs, estoque e funcionalidades comerciais preservados; nenhuma migration ou dependência instalada.

## Capturas e medições

- [Foco antes](C:/Users/vitor/.codex/visualizations/2026/09/13/01a09c5b-68bc-7c42-85a5-d4f3f7260a09/focus-antes)
- [Foco depois](C:/Users/vitor/.codex/visualizations/2026/09/13/01a09c5b-68bc-7c42-85a5-d4f3f7260a09/focus-depois)
- [Banners antes](C:/Users/vitor/.codex/visualizations/2026/09/13/01a09c5b-68bc-7c42-85a5-d4f3f7260a09/banner-antes)
- [Banners depois](C:/Users/vitor/.codex/visualizations/2026/09/13/01a09c5b-68bc-7c42-85a5-d4f3f7260a09/banner-depois)

## Arquivos desta implementação

- [frontend/src/index.html](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/index.html)

- [frontend/src/styles.css](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/styles.css)
- [frontend/src/app/app.component.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/app.component.ts)
- [frontend/src/app/shared/css/focus.css](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/shared/css/focus.css)
- [frontend/src/app/shared/accessibility/focus-visibility.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/shared/accessibility/focus-visibility.ts)
- [frontend/src/app/shared/accessibility/focus-visibility.spec.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/shared/accessibility/focus-visibility.spec.ts)
- [frontend/src/app/shared/accessibility/focus-styles.spec.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/shared/accessibility/focus-styles.spec.ts)
- [frontend/src/app/components/top-navbar/top-navbar.component.css](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/top-navbar/top-navbar.component.css)
- [frontend/src/app/components/admin/admin/admin.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/admin/admin/admin.component.scss)
- [frontend/src/app/features/home/home.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/home/home.component.scss)
- [frontend/src/app/features/catalog/components/product-card/product-card.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/catalog/components/product-card/product-card.component.scss)
- [frontend/src/app/features/account/account.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/account/account.component.scss)
- [frontend/src/app/features/order-history/order-history.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/order-history/order-history.component.scss)
- [frontend/src/app/features/checkout/checkout.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/checkout/checkout.component.scss)
- [frontend/src/app/features/catalog/pages/category/category.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/catalog/pages/category/category.component.scss)
- [frontend/src/app/features/product-manage/register/product-create/product-create.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/product-manage/register/product-create/product-create.component.scss)
- [frontend/src/app/features/authorization/register/register.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/authorization/register/register.component.scss)
- [frontend/src/app/shared/forgot-password/forgot-password.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/shared/forgot-password/forgot-password.component.scss)
- [frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.ts)
- [docs/design-system/mensagens-e-estados-ui.md](C:/Users/vitor/Documents/Box-Enxovais-tcc/docs/design-system/mensagens-e-estados-ui.md)
- [frontend/src/app/components/carousel/carousel.component.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/carousel/carousel.component.ts)
- [frontend/src/app/components/carousel/carousel.component.html](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/carousel/carousel.component.html)
- [frontend/src/app/components/carousel/carousel.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/carousel/carousel.component.scss)
- [frontend/src/app/components/carousel/carousel.component.spec.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/carousel/carousel.component.spec.ts)
- [frontend/src/app/components/trust-bar/trust-bar.component.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/trust-bar/trust-bar.component.ts)
- [frontend/src/app/components/trust-bar/trust-bar.component.html](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/trust-bar/trust-bar.component.html)
- [frontend/src/app/components/trust-bar/trust-bar.component.scss](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/trust-bar/trust-bar.component.scss)
- [frontend/src/app/components/trust-bar/trust-bar.component.spec.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/components/trust-bar/trust-bar.component.spec.ts)
- [frontend/src/app/features/home/home.component.ts](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/home/home.component.ts)
- [frontend/src/app/features/home/home.component.html](C:/Users/vitor/Documents/Box-Enxovais-tcc/frontend/src/app/features/home/home.component.html)

## Pendência

A conferência visual autenticada de Minha Conta, checkout e administração permanece pendente. Essas funcionalidades foram cobertas por testes de componentes, mas a nova janela Chrome para login interativo foi rejeitada pela revisão automática de aprovação com o motivo `blocked by policy`. Não foram contornados os guards nem criadas credenciais de teste no banco.
