# Catálogo Box Enxovais — primeira etapa

## Fluxo

`Navbar → /categoria/:slug → ProductGrid → ProductCard → /produto/:slug`

- Uma página de categoria atende os seis slugs: `cama`, `travesseiros`, `toalhas`, `almofadas`, `mesa`, `decoracao`.
- Exemplos: `/categoria/cama` e `/produto/jogo-de-cama-essencia-natural`.
- A navbar e o serviço compartilham `data/categories.ts`. Os atalhos de categoria da Home também usam as novas rotas.
- Home, autenticação e rotas administrativas mantêm seus componentes e contratos atuais.

## Responsabilidades

| Área | Responsabilidade |
| --- | --- |
| `pages/category` | Lê parâmetros da rota, carrega categoria/produtos e apresenta loading, erro, vazio ou categoria desconhecida. |
| `pages/product-detail` | Busca um produto por slug; controla somente quantidade e variante selecionada. |
| `services/catalog.service.ts` | Único acesso aos produtos demonstrativos; expõe Observables para facilitar a substituição por HttpClient. |
| `data/catalog.mock.ts` | Cinco produtos temporários, preços, variantes e descrições ilustrativas. |
| `data/categories.ts` | Taxonomia única, independente dos produtos temporários. |
| `components/catalog-layout` | Reutiliza topbar, header, navbar e footer; inicia a navegação do catálogo no topo. |
| `components/product-grid` | Grid responsivo, skeleton estático e mensagem de lista vazia. |
| `components/product-card` | Apresentação e link para produto; não consulta serviços. |
| `components/product-price` | Preço normal/promocional e formatação monetária pt-BR. |
| `components/product-gallery` | Ordenação de imagens por posição e seleção de thumbnail. |
| `components/product-media` | Imagem ou placeholder neutro, incluindo falha de carregamento. |
| `components/quantity-selector` | Controle de quantidade com input/output e limite mínimo de um. |
| `components/breadcrumbs` | Trilha navegável com aria-current. |
| `components/product-filters` / `product-sort` | Estruturas visuais desabilitadas para a próxima etapa. |

## Modelagem sem duplicar Product

O contrato atual em `shared/models.ts` é usado pelo cadastro administrativo e pelo `ProductService`. Ele não foi alterado.

`CatalogProduct extends Product` adiciona os campos necessários à vitrine (`slug`, categoria, imagens, variantes etc.) e torna `id` e `description` obrigatórios neste contexto. `price`, `promotional_price`, `quantity`, `measurements`, `status` e `care_instructions` continuam herdados. `promotional_price` permanece no contrato compartilhado do administrativo, mas não é consumido pela vitrine. ProductPrice exibe apenas o preço regular e seu parcelamento em quatro vezes. Avaliações e descontos não fazem parte desta etapa.

A API atual de produtos não fornece ainda todos os campos de vitrine. Ao conectar a API de catálogo, validar esse contrato e mapear a resposta para `CatalogProduct` dentro do serviço. Não enviar o modelo de vitrine diretamente ao endpoint administrativo de criação.

## Estado e rotas

As páginas usam `inject`, `toSignal`, `computed` e `switchMap`. Mudanças de slug atualizam a mesma instância da página; respostas antigas são canceladas. O estado discriminado `CatalogState<T>` diferencia loading, sucesso e erro. Valores nulos representam categoria/produto não encontrado, sem redirecionamento silencioso.

Os mocks respondem imediatamente. O skeleton está preparado para fontes assíncronas; não há atraso artificial. Almofadas e Decoração existem, mas estão vazias para permitir conferir o empty state.

As imagens dos mocks têm URL vazia intencionalmente. A galeria alterna os registros e seus textos de vista/detalhe usando placeholders CSS e o mesmo ícone outline. Nenhum arquivo de imagem foi gerado. Basta fornecer URLs válidas em `ProductImage` para exibir fotos e thumbnails.

## Limites desta etapa

- Dados, preços, estoque e variantes são demonstrativos; nada é cadastrado na API.
- Filtros, ordenação e botão de compra estão desabilitados e identificados na interface.
- Não foram implementados favoritos, carrinho, checkout, frete, avaliações reais, paginação, upload ou backend.
- O `ProductService` existente e os produtos em destaque da Home continuam usando seu comportamento anterior; os mocks não foram injetados ali.

## Validação

Build: `npm run build`.

Testes focados (PowerShell):

```powershell
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include=src/app/features/catalog/**/*.spec.ts
```

Os testes cobrem o contrato de consulta, vazio versus desconhecido, atualização de slug com cancelamento de resposta antiga, erro de carga, galeria e quantidade mínima.

## Próximas etapas

1. Definir o contrato de catálogo na API Go e a relação entre produtos, categorias, variantes e imagens.
2. Substituir apenas a fonte do CatalogService, mantendo as assinaturas Observable.
3. Conectar filtros/ordenação e depois paginação conforme o contrato real.
4. Planejar carrinho e frete em etapas separadas.

## Arquivos desta feature

- [components/breadcrumbs/breadcrumbs.component.html](components/breadcrumbs/breadcrumbs.component.html)
- [components/breadcrumbs/breadcrumbs.component.scss](components/breadcrumbs/breadcrumbs.component.scss)
- [components/breadcrumbs/breadcrumbs.component.ts](components/breadcrumbs/breadcrumbs.component.ts)
- [components/catalog-layout/catalog-layout.component.html](components/catalog-layout/catalog-layout.component.html)
- [components/catalog-layout/catalog-layout.component.scss](components/catalog-layout/catalog-layout.component.scss)
- [components/catalog-layout/catalog-layout.component.ts](components/catalog-layout/catalog-layout.component.ts)
- [components/product-card/product-card.component.html](components/product-card/product-card.component.html)
- [components/product-card/product-card.component.scss](components/product-card/product-card.component.scss)
- [components/product-card/product-card.component.ts](components/product-card/product-card.component.ts)
- [components/product-filters/product-filters.component.html](components/product-filters/product-filters.component.html)
- [components/product-filters/product-filters.component.scss](components/product-filters/product-filters.component.scss)
- [components/product-filters/product-filters.component.ts](components/product-filters/product-filters.component.ts)
- [components/product-gallery/product-gallery.component.html](components/product-gallery/product-gallery.component.html)
- [components/product-gallery/product-gallery.component.scss](components/product-gallery/product-gallery.component.scss)
- [components/product-gallery/product-gallery.component.spec.ts](components/product-gallery/product-gallery.component.spec.ts)
- [components/product-gallery/product-gallery.component.ts](components/product-gallery/product-gallery.component.ts)
- [components/product-grid/product-grid.component.html](components/product-grid/product-grid.component.html)
- [components/product-grid/product-grid.component.scss](components/product-grid/product-grid.component.scss)
- [components/product-grid/product-grid.component.ts](components/product-grid/product-grid.component.ts)
- [components/product-media/product-media.component.html](components/product-media/product-media.component.html)
- [components/product-media/product-media.component.scss](components/product-media/product-media.component.scss)
- [components/product-media/product-media.component.ts](components/product-media/product-media.component.ts)
- [components/product-price/product-price.component.html](components/product-price/product-price.component.html)
- [components/product-price/product-price.component.scss](components/product-price/product-price.component.scss)
- [components/product-price/product-price.component.ts](components/product-price/product-price.component.ts)
- [components/product-sort/product-sort.component.html](components/product-sort/product-sort.component.html)
- [components/product-sort/product-sort.component.scss](components/product-sort/product-sort.component.scss)
- [components/product-sort/product-sort.component.ts](components/product-sort/product-sort.component.ts)
- [components/quantity-selector/quantity-selector.component.html](components/quantity-selector/quantity-selector.component.html)
- [components/quantity-selector/quantity-selector.component.scss](components/quantity-selector/quantity-selector.component.scss)
- [components/quantity-selector/quantity-selector.component.spec.ts](components/quantity-selector/quantity-selector.component.spec.ts)
- [components/quantity-selector/quantity-selector.component.ts](components/quantity-selector/quantity-selector.component.ts)
- [data/catalog.mock.ts](data/catalog.mock.ts)
- [data/categories.ts](data/categories.ts)
- [interfaces/catalog-state.ts](interfaces/catalog-state.ts)
- [interfaces/category.interface.ts](interfaces/category.interface.ts)
- [interfaces/product-image.interface.ts](interfaces/product-image.interface.ts)
- [interfaces/product-variant.interface.ts](interfaces/product-variant.interface.ts)
- [interfaces/product.interface.ts](interfaces/product.interface.ts)
- [pages/category/category.component.html](pages/category/category.component.html)
- [pages/category/category.component.scss](pages/category/category.component.scss)
- [pages/category/category.component.spec.ts](pages/category/category.component.spec.ts)
- [pages/category/category.component.ts](pages/category/category.component.ts)
- [pages/product-detail/product-detail.component.html](pages/product-detail/product-detail.component.html)
- [pages/product-detail/product-detail.component.scss](pages/product-detail/product-detail.component.scss)
- [pages/product-detail/product-detail.component.ts](pages/product-detail/product-detail.component.ts)
- [services/catalog.service.spec.ts](services/catalog.service.spec.ts)
- [services/catalog.service.ts](services/catalog.service.ts)
