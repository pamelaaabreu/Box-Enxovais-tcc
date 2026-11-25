# Estrutura Angular — implementação atual

## Organização

```text
frontend/src/app/
├── app.routes.ts
├── app.config.ts
├── core/
│   ├── config/api.config.ts
│   ├── guards/
│   ├── interceptors/auth.interceptor.ts
│   └── services/
├── features/
│   ├── authentication/auth/
│   ├── authentication/forgot-password/
│   ├── authentication/reset-password/
│   ├── admin/
│   │   ├── admin.routes.ts
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── products/product-manage/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── reports/
│   │   ├── promotions/
│   │   ├── catalog/
│   │   ├── shipping/
│   │   └── experience-reviews/
│   ├── account/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── favorites/
│   ├── home/
│   ├── order-history/
│   └── purchase-review/
└── shared/
    ├── components/
    ├── types/
    ├── forms/product-variants.ts
    ├── validators/
    ├── utils/
    └── css/
```

Cada componente tem pasta própria, TS/HTML/SCSS/spec juntos. Feature pode conter componentes filhos com pastas próprias; não criar componentes apenas para mover arquivos. Serviços locais ficam em services; contratos de domínio compartilhados em shared/types. Tipos de leitura e DTOs de gravação não são intercambiáveis. A antiga fachada shared/models.ts foi removida após migrar os consumidores.

## Inicialização e rotas

app.config.ts registra HTTP, interceptor, Router e provideAppInitializer para restaurar AuthService. app.routes.ts usa loadComponent e carrega features/admin/admin.routes.ts por loadChildren. Admin não depende mais de AdminModule. Login/cadastro compartilham AuthComponent em features/authentication/auth e preservam estado ao alternar.

Navegação canônica: /inicio, /login, /cadastro, /recuperar-senha, /verificar-codigo, /redefinir-senha, /minha-conta, /carrinho, /favoritos, /finalizar-compra e /admin/produtos. Rotas antigas continuam como aliases; preserve query, fragmentos e IDs. Métricas redireciona para Dashboard. Os endpoints Go continuam em inglês.

## Comunicação e estado

core/config/api.config.ts define API_BASE_URL e apiEndpoint. Serviços encapsulam HttpClient; componentes apresentam estado, formulários e eventos. AssetUrlService resolve caminhos de imagens mantendo URLs absolutas. Interceptor só envia credencial para origem/prefixo configurados e trata 401 da sessão correspondente.

Reactive Forms controla validações e máscara monetária. Builders de variantes ficam em shared/forms; interfaces em shared/types. Signals/computed representam estado e derivações; RxJS organiza HTTP, cancelamento e eventos. AuthService expõe eventos por Observable; ProductReviewService expõe resumo como Signal somente leitura e mudanças via Observable. Lotes e TTL evitam consulta individual por card.

## UI e manutenção

Reutilize shared/components: estados, confirmação, feedback, cards, paginação, tabelas responsivas e gráficos ECharts. Preserve SCSS manual, Montserrat, oliva/creme e foco visível. Validações de campo permanecem associadas ao campo; vazio/erro de página não substitui mensagem de validação.

Antes de mover arquivos, atualize imports estáticos/dinâmicos, rotas, templateUrl/styleUrl e dependências SCSS/specs. Não use reexportações obsoletas para esconder imports quebrados. Consulte AUDITORIA_FINAL.md para resultados executados e limitações; build não substitui E2E ou inspeção visual.
