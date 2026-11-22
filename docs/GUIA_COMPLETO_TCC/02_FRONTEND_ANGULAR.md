# 02 — Frontend Angular

## Componentes, templates e estilos

Um componente combina estado TypeScript, template HTML e estilos SCSS. A maioria das páginas é standalone: declara diretamente o que utiliza, sem exigir um módulo para cada tela. O painel ainda possui organização própria em módulo/rotas; não foi refeito por estética. Montserrat, cores oliva/bege, bordas e estados de foco são preservados pelos estilos compartilhados.

`app.routes.ts` usa `loadComponent` para carregar páginas como catálogo, favoritos e checkout sob demanda. A área administrativa é carregada pelas rotas do admin. Lazy loading reduz o código inicial, mas cada rota continua dependendo da autorização da API; esconder uma página não protege um endpoint.

## Serviços e comunicação

`core/services/product.service.ts` consulta produtos e operações administrativas. `cart.service.ts`, `favorites.service.ts` e `account.service.ts` encapsulam seus respectivos contratos. `pagination.service.ts` normaliza páginas, filtros e metadados. Serviços retornam Observables: o componente decide como representar carregamento, sucesso ou falha.

`core/auth.interceptor.ts` participa do envio da autenticação nas chamadas pertinentes. `AuthService` gerencia o token e a expiração da sessão no navegador; `authGuard` e `AdminGuard` controlam a navegação. Login e cadastro compartilham `features/authorization/register/register.component.ts` (`AuthComponent`), preservando a experiência ao alternar as duas rotas.

## Estado: Signals e RxJS

Signals representam valores reativos lidos pelo template, como seleção e estado visível. `computed` deriva informação sem duplicar a fonte dos dados. RxJS representa eventos e operações assíncronas: HTTP, alterações de filtro e cancelamento de consultas. Não são tecnologias concorrentes; resolvem partes distintas do estado da interface.

Na avaliação, uma mudança de pedido cancela a consulta anterior para impedir que a resposta atrasada apareça no pedido seguinte. O formulário mantém o comentário quando ocorre erro temporário e oferece nova tentativa. No catálogo, mudanças de filtros/ordenação precisam retornar à primeira página quando a página atual deixa de ser válida.

## Formulários reais

`ProductCreateComponent` é usado no fluxo administrativo de criação/edição. Reactive Forms mantém controles e validadores no TypeScript. Produtos simples têm preço e estoque editáveis. Com variantes, os valores gerais passam a ser resumo: menor preço, soma do estoque e quantidade de variações. O campo genérico Tamanho fica oculto quando há variantes, sem apagar o valor anterior. A máscara monetária converte dígitos para valor de preço sem exigir vírgula digitada.

`CheckoutComponent` separa entrega, pagamento e revisão. O endereço salvo ou manual deve ter CEP válido e coberto antes do avanço. A resposta de frete distingue erro de formato, ausência de cobertura e falha temporária. Selecionar outro CEP exige nova consulta. O backend repete a validação no momento decisivo.

O controle de parcelamento aceita 1 a 6 no cartão. Pix e boleto enviam 1 mesmo se o cliente havia escolhido seis no cartão. `shared/utils/installments.ts` calcula a prévia com inteiros em centavos; o resultado real volta da API, cujo cálculo prevalece. Não se envia número de cartão.

## Reutilização e contratos

O componente `features/purchase-review` é reutilizado na confirmação e nos pedidos. Possui cinco radios para nota geral, comentário opcional e checkbox de publicação. Agradecimento aparece no próprio componente; recarregar a página consulta o estado persistido e impede nova submissão.

`shared/components/confirm-dialog` mantém confirmação e foco acessível para descarte/exclusão. Os estados administrativos compartilham identidade visual; validação de campo não é substituída por uma tela vazia. Cards, toolbar e paginação devem continuar reutilizados nas categorias.

`shared/types` contém contratos de domínio. `shared/models.ts` agora é uma fachada de reexportação para não quebrar os imports existentes. Tipos de leitura podem conter timestamps; DTOs de gravação devem selecionar apenas campos aceitos. Isso evita repetir o erro de enviar `created_at` e `updated_at` na edição de campanhas.

## Acessibilidade e responsividade

Rótulos, radios nativos, botões semânticos e `:focus-visible` permitem teclado sem contornos azuis duplicados. O foco não deve ser removido para esconder um problema visual. Testes em 1440, 1024, 768 e 390 px verificam overflow e leitura; eles não substituem uma auditoria formal de todas as páginas e tecnologias assistivas.

Veja [fluxos](05_FLUXOS_DO_SISTEMA.md) para seguir requisições e [testes](07_TESTES_E_QUALIDADE.md) para resultados reais.
