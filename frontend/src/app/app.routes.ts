import { authGuard } from './core/guards/auth.guard';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'sobre-nos',
    loadComponent: () =>
      import(
        './features/institutional/institutional-page/institutional-page.component'
      ).then((m) => m.InstitutionalPageComponent),
    data: {
      title: 'Sobre Nós',
      paragraphs: [
        'A Box Enxovais é uma loja fictícia desenvolvida para um Trabalho de Conclusão de Curso. O projeto explora uma compra acolhedora, acessível e organizada de artigos para o lar.',
        'Catálogo, administração e jornadas de compra demonstram recursos de software. Não há operação comercial real ou promessa de entrega por esta página.',
      ],
    },
  },
  {
    path: 'blog',
    loadComponent: () =>
      import(
        './features/institutional/institutional-page/institutional-page.component'
      ).then((m) => m.InstitutionalPageComponent),
    data: {
      title: 'Blog',
      paragraphs: [
        'Casa bem vivida: pequenas mudanças de textura e cor podem tornar o descanso mais acolhedor. Combine tons neutros com detalhes que expressem sua personalidade.',
        'Cuidado com os enxovais: consulte as instruções do fabricante na página de cada produto. Separe tecidos delicados e evite produtos de limpeza incompatíveis. Conteúdo editorial acadêmico, sem aconselhamento comercial.',
      ],
    },
  },
  {
    path: 'trocas-e-devolucoes',
    loadComponent: () =>
      import(
        './features/institutional/institutional-page/institutional-page.component'
      ).then((m) => m.InstitutionalPageComponent),
    data: {
      title: 'Trocas e Devoluções',
      paragraphs: [
        'Neste ambiente acadêmico, pedidos e pagamentos são simulados. O cancelamento disponível em Meus pedidos demonstra a preservação do histórico e a atualização do estoque.',
        'Esta página não estabelece política jurídica de uma empresa real. Uma futura operação comercial precisaria divulgar seus canais, condições e obrigações aplicáveis antes de atender consumidores.',
      ],
    },
  },
  {
    path: 'ajuda',
    loadComponent: () =>
      import(
        './features/institutional/institutional-page/institutional-page.component'
      ).then((m) => m.InstitutionalPageComponent),
    data: {
      title: 'Ajuda e FAQ',
      paragraphs: [
        'Como encontrar produtos? Use a pesquisa por nome ou SKU e as categorias da navegação. Escolha o tamanho disponível antes de adicionar ao carrinho.',
        'Como consultar pedidos? Entre na sua conta e acesse Meus pedidos. O frete é validado pelo CEP informado na entrega. Pagamentos são simulados e não solicitam dados reais de cartão.',
        'Como avaliar? Produtos comprados em pedidos elegíveis aparecem em Minha conta > Minhas avaliações. Avaliar o produto é diferente de avaliar a experiência na loja.',
      ],
    },
  },
  {
    path: 'contato',
    loadComponent: () =>
      import(
        './features/institutional/institutional-page/institutional-page.component'
      ).then((m) => m.InstitutionalPageComponent),
    data: {
      title: 'Fale Conosco',
      paragraphs: [
        'Esta é uma página informativa de um projeto acadêmico. Não existe atendimento comercial ativo nem formulário de envio nesta página.',
        'Para demonstrações, consulte Ajuda e FAQ e os detalhes de seus pedidos. Não envie dados pessoais ou de pagamento para contatos fictícios apresentados em materiais de exemplo.',
      ],
    },
  },
  {
    path: 'privacidade',
    loadComponent: () =>
      import(
        './features/institutional/institutional-page/institutional-page.component'
      ).then((m) => m.InstitutionalPageComponent),
    data: {
      title: 'Política de Privacidade',
      paragraphs: [
        'O sistema acadêmico utiliza dados de conta, endereços e histórico para demonstrar autenticação e compra. Utilize dados de teste ao participar de uma demonstração autorizada.',
        'Avaliações só são publicadas anonimamente quando autorizadas pelo cliente e aprovadas pela moderação. A autorização pode ser revogada editando a avaliação. Dados de cadastro não são publicados como identificação do autor.',
        'Não há pagamento real. Não informe dados bancários. Esta descrição técnica não substitui uma política jurídica para uma operação comercial.',
      ],
    },
  },
  {
    path: 'termos-de-uso',
    loadComponent: () =>
      import(
        './features/institutional/institutional-page/institutional-page.component'
      ).then((m) => m.InstitutionalPageComponent),
    data: {
      title: 'Termos de Uso',
      paragraphs: [
        'Ao utilizar a demonstração, você reconhece que a Box Enxovais é um projeto acadêmico, com pedidos e pagamentos simulados, sem compra ou cobrança real.',
        'Use somente informações próprias em ambientes autorizados ou dados fictícios em testes. Não forneça dados reais de cartão. A conta dá acesso apenas às suas informações e compras.',
        'As avaliações devem se referir às compras elegíveis. A publicação anônima depende de consentimento e moderação. Este texto descreve a demonstração e não constitui contrato comercial de uma loja ativa.',
      ],
    },
  },
  { path: 'account', redirectTo: 'minha-conta', pathMatch: 'full' },
  {
    path: 'checkout/success/:id',
    redirectTo: 'finalizar-compra/sucesso/:id',
    pathMatch: 'full',
  },
  { path: 'checkout', redirectTo: 'finalizar-compra', pathMatch: 'full' },
  { path: 'favorites', redirectTo: 'favoritos', pathMatch: 'full' },
  { path: 'cart', redirectTo: 'carrinho', pathMatch: 'full' },
  { path: 'home', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'forgot-password', redirectTo: 'recuperar-senha', pathMatch: 'full' },
  { path: 'verify-code', redirectTo: 'verificar-codigo', pathMatch: 'full' },
  { path: 'reset-password', redirectTo: 'redefinir-senha', pathMatch: 'full' },
  { path: 'register', redirectTo: 'cadastro', pathMatch: 'full' },

  // Rotas que exigem autenticação.
  {
    path: 'minha-conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/account.component').then(
        (m) => m.AccountComponent,
      ),
  },
  {
    path: 'meus-pedidos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/order-history/order-history.component').then(
        (m) => m.OrderHistoryComponent,
      ),
  },
  {
    path: 'meus-pedidos/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/order-history/order-history.component').then(
        (m) => m.OrderHistoryComponent,
      ),
  },
  {
    path: 'finalizar-compra/sucesso/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/checkout/checkout-success/checkout-success.component'
      ).then((m) => m.CheckoutSuccessComponent),
  },
  {
    path: 'finalizar-compra',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout.component').then(
        (m) => m.CheckoutComponent,
      ),
  },
  {
    path: 'favoritos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/favorites/favorites.component').then(
        (m) => m.FavoritesComponent,
      ),
  },
  {
    path: 'carrinho',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cart/cart.component').then((m) => m.CartComponent),
  },

  // Redireciona a URL inicial para a Home.
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full',
  },

  // Rotas públicas.
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'campanha/:id',
    loadComponent: () =>
      import('./features/campaign/campaign.component').then(
        (m) => m.CampaignComponent,
      ),
  },
  {
    path: 'categoria/:slug',
    loadComponent: () =>
      import('./features/catalog/pages/category/category.component').then(
        (m) => m.CategoryComponent,
      ),
  },
  {
    path: 'produto/:slug',
    loadComponent: () =>
      import(
        './features/catalog/pages/product-detail/product-detail.component'
      ).then((m) => m.ProductDetailComponent),
  },

  // Utiliza a mesma configuração de rota para login e cadastro.
  {
    matcher: (segments) =>
      segments.length === 1 && ['login', 'cadastro'].includes(segments[0].path)
        ? { consumed: segments, posParams: { authPage: segments[0] } }
        : null,

    // Define a aba correspondente à URL.
    resolve: {
      selectedTab: (route: ActivatedRouteSnapshot) =>
        route.paramMap.get('authPage') === 'cadastro' ? 1 : 0,
    },

    loadComponent: () =>
      import('./features/authentication/auth/auth.component').then(
        (m) => m.AuthComponent,
      ),
  },

  // Etapas de recuperação de senha.
  {
    path: 'recuperar-senha',
    data: { recoveryStep: 'email' },
    loadComponent: () =>
      import(
        './features/authentication/forgot-password/forgot-password.component'
      ).then(({ ForgotPasswordComponent }) => ForgotPasswordComponent),
  },
  {
    path: 'verificar-codigo',
    data: { recoveryStep: 'otp' },
    loadComponent: () =>
      import(
        './features/authentication/forgot-password/forgot-password.component'
      ).then(({ ForgotPasswordComponent }) => ForgotPasswordComponent),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import(
        './features/authentication/reset-password/reset-password.component'
      ).then((m) => m.ResetPasswordComponent),
  },

  // Rotas administrativas.
  {
    path: 'image-upload/:id',
    redirectTo: 'admin/produtos/:id/imagens',
    pathMatch: 'full',
  },
  {
    path: 'product-register',
    redirectTo: 'admin/produtos/novo',
    pathMatch: 'full',
  },

  // Redirecionamentos para as rotas administrativas atuais.
  {
    path: 'promotion-register',
    pathMatch: 'full',
    redirectTo: 'admin/promocoes/nova',
  },
  {
    path: 'add-to-promotion',
    pathMatch: 'full',
    redirectTo: 'admin/promocoes',
  },

  {
    path: 'admin',
    canMatch: [AdminGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  // Página não encontrada.
  {
    path: '404',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },

  // Captura URLs que não correspondem às rotas anteriores.
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
