# Estrutura Angular — Box Enxovais

Reorganização de arquivos; seletores, rotas, templates, regras SCSS e lógica preservados.

## Estrutura administrativa

```text
components/admin/
├── admin/
├── catalog-registration/
├── experience-reviews/
├── dashboard/ (com models/)
├── product/
├── promotion/
├── report/ (com models/)
├── shipping-ranges/
├── orders/
│   ├── admin-orders/
│   ├── admin-order-detail/
│   ├── services/
│   └── styles/ (regras compartilhadas, sem duplicação)
└── customers/
    ├── admin-customers/
    ├── admin-customer-detail/
    ├── services/
    ├── models/
    └── styles/

features/create-promotion/ (componente principal)
└── campaign-summary/
features/product-manage/ (componente principal)
├── product-variants-page/
├── images/product-image-upload/
└── register/product-create/
features/catalog/pages/product-detail/
└── shipping-quote/
shared/components/bar-chart/
shared/components/chart/ (gráfico base e utilitários)
```

Métricas Analíticas continua como redirecionamento para Dashboard, sem componente duplicado. Pastas já corretas foram preservadas. Não foi criada outra raiz global de componentes.

## Arquivos movidos

| Origem | Destino |
| --- | --- |
| `frontend/src/app/components/admin/catalog-registration.component.ts` | `frontend/src/app/components/admin/catalog-registration/catalog-registration.component.ts` |
| `frontend/src/app/components/admin/catalog-registration.component.html` | `frontend/src/app/components/admin/catalog-registration/catalog-registration.component.html` |
| `frontend/src/app/components/admin/catalog-registration.component.scss` | `frontend/src/app/components/admin/catalog-registration/catalog-registration.component.scss` |
| `frontend/src/app/components/admin/catalog-registration.component.spec.ts` | `frontend/src/app/components/admin/catalog-registration/catalog-registration.component.spec.ts` |
| `frontend/src/app/components/admin/experience-reviews.component.ts` | `frontend/src/app/components/admin/experience-reviews/experience-reviews.component.ts` |
| `frontend/src/app/components/admin/experience-reviews.component.html` | `frontend/src/app/components/admin/experience-reviews/experience-reviews.component.html` |
| `frontend/src/app/components/admin/experience-reviews.component.scss` | `frontend/src/app/components/admin/experience-reviews/experience-reviews.component.scss` |
| `frontend/src/app/components/admin/experience-reviews.component.spec.ts` | `frontend/src/app/components/admin/experience-reviews/experience-reviews.component.spec.ts` |
| `frontend/src/app/components/admin/orders/admin-orders.component.ts` | `frontend/src/app/components/admin/orders/admin-orders/admin-orders.component.ts` |
| `frontend/src/app/components/admin/orders/admin-orders.component.html` | `frontend/src/app/components/admin/orders/admin-orders/admin-orders.component.html` |
| `frontend/src/app/components/admin/orders/admin-orders.component.spec.ts` | `frontend/src/app/components/admin/orders/admin-orders/admin-orders.component.spec.ts` |
| `frontend/src/app/components/admin/orders/admin-order-detail.component.ts` | `frontend/src/app/components/admin/orders/admin-order-detail/admin-order-detail.component.ts` |
| `frontend/src/app/components/admin/orders/admin-order-detail.component.html` | `frontend/src/app/components/admin/orders/admin-order-detail/admin-order-detail.component.html` |
| `frontend/src/app/components/admin/orders/admin-order-detail.component.scss` | `frontend/src/app/components/admin/orders/admin-order-detail/admin-order-detail.component.scss` |
| `frontend/src/app/components/admin/orders/admin-order-detail.component.spec.ts` | `frontend/src/app/components/admin/orders/admin-order-detail/admin-order-detail.component.spec.ts` |
| `frontend/src/app/features/create-promotion/campaign-summary.component.ts` | `frontend/src/app/features/create-promotion/campaign-summary/campaign-summary.component.ts` |
| `frontend/src/app/features/create-promotion/campaign-summary.component.html` | `frontend/src/app/features/create-promotion/campaign-summary/campaign-summary.component.html` |
| `frontend/src/app/features/create-promotion/campaign-summary.component.scss` | `frontend/src/app/features/create-promotion/campaign-summary/campaign-summary.component.scss` |
| `frontend/src/app/features/product-manage/product-variants-page.component.ts` | `frontend/src/app/features/product-manage/product-variants-page/product-variants-page.component.ts` |
| `frontend/src/app/features/product-manage/product-variants-page.component.html` | `frontend/src/app/features/product-manage/product-variants-page/product-variants-page.component.html` |
| `frontend/src/app/features/product-manage/product-variants-page.component.scss` | `frontend/src/app/features/product-manage/product-variants-page/product-variants-page.component.scss` |
| `frontend/src/app/features/product-manage/product-variants-page.component.spec.ts` | `frontend/src/app/features/product-manage/product-variants-page/product-variants-page.component.spec.ts` |
| `frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.ts` | `frontend/src/app/features/catalog/pages/product-detail/shipping-quote/shipping-quote.component.ts` |
| `frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.html` | `frontend/src/app/features/catalog/pages/product-detail/shipping-quote/shipping-quote.component.html` |
| `frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.scss` | `frontend/src/app/features/catalog/pages/product-detail/shipping-quote/shipping-quote.component.scss` |
| `frontend/src/app/features/catalog/pages/product-detail/shipping-quote.component.spec.ts` | `frontend/src/app/features/catalog/pages/product-detail/shipping-quote/shipping-quote.component.spec.ts` |
| `frontend/src/app/shared/components/chart/bar-chart.component.ts` | `frontend/src/app/shared/components/bar-chart/bar-chart.component.ts` |
| `frontend/src/app/shared/components/chart/bar-chart.component.html` | `frontend/src/app/shared/components/bar-chart/bar-chart.component.html` |
| `frontend/src/app/shared/components/chart/bar-chart.component.scss` | `frontend/src/app/shared/components/bar-chart/bar-chart.component.scss` |
| `frontend/src/app/components/admin/orders/admin-orders.service.ts` | `frontend/src/app/components/admin/orders/services/admin-orders.service.ts` |
| `frontend/src/app/components/admin/orders/admin-orders.service.spec.ts` | `frontend/src/app/components/admin/orders/services/admin-orders.service.spec.ts` |
| `frontend/src/app/components/admin/customers/admin-customers.service.ts` | `frontend/src/app/components/admin/customers/services/admin-customers.service.ts` |
| `frontend/src/app/components/admin/customers/admin-customers.service.spec.ts` | `frontend/src/app/components/admin/customers/services/admin-customers.service.spec.ts` |
| `frontend/src/app/components/admin/orders/admin-orders.scss` | `frontend/src/app/components/admin/orders/styles/order-layout.scss` |
| `frontend/src/app/components/admin/customers/admin-customers.scss` | `frontend/src/app/components/admin/customers/styles/customer-layout.scss` |
| `frontend/src/app/components/admin/report/report.models.ts` | `frontend/src/app/components/admin/report/models/report.models.ts` |

## Arquivos organizacionais adicionais

- `orders/admin-orders/admin-orders.component.scss`: entrada com @use para as regras compartilhadas; o detalhe preserva as duas folhas e a ordem original.
- `customers/models/customer.models.ts`: interfaces existentes extraídas sem mudança de formato; reexportadas pelo serviço para compatibilidade.
- Imports relativos, lazy loading, templateUrl/styleUrl, specs e dependências SCSS corrigidos.
- Convenção permanente registrada no AGENTS.md.

## Validação

- Build Angular de produção: aprovado. Permanece o aviso preexistente do SCSS de Promoções (15,79 kB ante orçamento de aviso de 14 kB); orçamento e regras visuais não foram alterados.
- Testes Angular direcionados: **168/168 aprovados** em ChromeHeadless. Incluídos Admin, Pedidos/serviços, Clientes/serviços, Cadastros, Promoções, gerenciamento de produtos, detalhe do produto/cálculo de frete e utilitários de gráficos.
- Novo teste resolve os componentes lazy de Pedidos, detalhe do pedido, Clientes, detalhe do cliente, Avaliações e Faixas de CEP. Também verifica Categorias/Marcas, Variações e guarda do editor; preservados os endereços e o redirecionamento de Métricas para Dashboard.
- Duas expectativas anteriores estavam desatualizadas: cor fixa de tooltip e cabeçalho duplicado no painel externo. Ajustados somente os specs ao tema e à responsabilidade atuais; cor e cabeçalho da aplicação permaneceram inalterados. O spec do editor verifica o cabeçalho real e breadcrumb.
- Inventário completo: 79 componentes, nenhuma pasta com múltiplos componentes de produção e nenhum seletor duplicado. 548 imports relativos e 8 dependências Sass verificados, sem referências ausentes. Todos os templateUrl/styleUrl locais existem.
- Os templates movidos foram comparados byte a byte durante o movimento e permaneceram idênticos. Regras SCSS preservadas, com atualização apenas de caminhos e uma entrada @use para a listagem de Pedidos; ordem das folhas do detalhe mantida.
- Caminhos antigos dos componentes movidos removidos, sem cópias duplicadas. git diff --check aprovado.
- Sem alterações de banco, backend, URLs públicas, regras comerciais ou estilos nesta tarefa. Não foi realizada nova auditoria visual geral; o escopo foi organização e validação direcionada. O aviso 404 de queen.webp no Karma pertence à imagem fictícia de teste e não impediu as 168 verificações.
- Processo de testes encerrado ao finalizar; nenhum servidor do usuário foi iniciado, reiniciado ou encerrado.
