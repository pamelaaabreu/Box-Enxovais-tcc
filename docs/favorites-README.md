# Favoritos — Box Enxovais

Status: **implementado**. API, estado compartilhado, corações e página `/favorites` entregues. A migration `000005` foi aplicada no banco local, com versão 5 e `dirty=false`.

## Objetivo

Permitir que clientes autenticados salvem produtos para consultar depois. Os favoritos ficam no PostgreSQL, vinculados ao usuário, e os corações permanecem sincronizados entre Home, ofertas, catálogo, detalhes e a página `/favorites`.

Preservar a identidade visual e os componentes existentes. Favoritar não adiciona ao carrinho, não reserva estoque e não altera a quantidade disponível.

## Base existente a reutilizar

- Middleware JWT em `backend/src/middleware` e registro de rotas com `http.ServeMux`, como em `backend/src/routes/cart.go`.
- Conexão PostgreSQL de `backend/src/db`, repositories e helpers de resposta existentes.
- Serviço `backend/src/pagination/pagination.go` para paginação e filtros permitidos.
- `AuthService.userChanged`, interceptor de autenticação e `authGuard` no Angular.
- Signals e controle de requisições do `CartService` como referência para sincronização e troca de sessão.
- Layout do catálogo, cards, ícones de coração e componente de imagem com placeholder já existentes.

Ver [paginação](pagination.md) e [carrinho](cart-implementation.md).

## Banco de dados

Migration criada: `000005_favorites.up.sql` e `000005_favorites.down.sql`. A sequência anterior terminava em `000004_products_quantity_nonnegative`.

Estrutura proposta:

```sql
CREATE TABLE favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);
```

A chave composta impede duplicatas e permite localizar os favoritos por usuário. Não é necessário criar um identificador adicional para cada favorito. A migration de reversão remove somente a tabela `favorites`.

## API proposta

Todas as rotas exigem JWT válido. Obter o usuário exclusivamente do contexto criado pelo middleware, nunca de `user_id` enviado no body, path ou filtro.

| Método | Rota | Comportamento |
| --- | --- | --- |
| GET | `/favorites?offset=0&limit=20` | Lista os produtos favoritados do usuário autenticado. |
| PUT | `/favorites/{productId}` | Adiciona um favorito de forma idempotente, sem body. |
| DELETE | `/favorites/{productId}` | Remove o favorito do usuário, sem body; repetir a remoção continua sendo sucesso. |

### Listagem

Reutilizar o contrato atual de paginação, sem envolver a resposta em `data`:

```json
{
  "items": [],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 0,
    "hasMore": false
  }
}
```

Cada item usa o DTO público de produto, incluindo `id`, `name`, `price`, `quantity`, `stock`, `status` e `image_paths`, conforme os campos atuais. `stock` corresponde a `products.quantity`.

- Padrões: `offset=0`, `limit=20`; máximo de 100 por página.
- Ordem estável por `product_id` crescente.
- Aplicar `WHERE favorites.user_id = $usuarioAutenticado` antes dos filtros dinâmicos.
- Habilitar explicitamente filtros públicos necessários, como `name__contains`, `product_type_id`, `status` e `stock__gte`.
- Não permitir filtros de proprietário ou SQL arbitrário.
- Retornar total após filtros, com a mesma regra de contagem e snapshot usada nas demais listagens.
- Usar `Cache-Control: no-store` nas respostas pessoais.

### Adicionar e remover

Responder HTTP 200 usando o helper de sucesso existente:

```json
{
  "success": true,
  "data": {
    "productId": 42,
    "favorited": true
  }
}
```

Na remoção, `favorited` será `false`. O número acima é apenas um exemplo de contrato.

Para adicionar, validar o ID e a existência de produto com status `active`. Permitir produto ativo sem estoque. Usar `INSERT ... ON CONFLICT DO NOTHING`, garantindo idempotência inclusive em requisições concorrentes. Executar a verificação de elegibilidade e a inserção de modo consistente, preferencialmente em um único comando parametrizado.

Para remover, usar `DELETE ... WHERE user_id = $1 AND product_id = $2`. Nunca remover registros de outro usuário. A inexistência do favorito não é um erro.

### Erros

- 400: ID, paginação ou filtros inválidos.
- 401: sessão ausente ou expirada.
- 404: produto inexistente ao adicionar.
- 409: produto inativo/arquivado ao tentar adicionar um novo favorito.
- 500: falha interna, sem exposição de detalhes SQL.

Reutilizar `response.Error`, com mensagem legível para o frontend.

## Produtos indisponíveis

- Produto ativo sem estoque pode ser favoritado e continua na lista com “Produto indisponível”.
- Produto que ficar inativo/arquivado depois de favoritado continua identificado como indisponível e pode ser removido. Não permitir compra ou navegação para um detalhe que o catálogo bloqueia.
- Se o produto for excluído fisicamente, `ON DELETE CASCADE` remove a associação.
- Não aplicar o filtro fixo `status='active'` da listagem pública de produtos à lista pessoal, pois esconderia favoritos indisponíveis sem permitir sua remoção.
- A validação de estoque e preço do carrinho permanece inalterada no backend.

## Angular

Criar `FavoritesService` em `core/services`, sem duplicar autenticação ou infraestrutura de paginação.

Estado sugerido com Signals:

- conjunto de IDs favoritados;
- indicador de carregamento e estado de sincronização inicial;
- conjunto de IDs com alteração pendente;
- mensagens de erro por produto;
- estado da página de favoritos com metadados de paginação.

Operações: carregar, verificar se um produto está favoritado, adicionar, remover e alternar o estado do coração.

### Sincronização e paginação

Uma página carregada não representa todos os favoritos. Não marcar produtos fora dela como “não favoritados”.

Na primeira versão, carregar sequencialmente todas as páginas para montar o conjunto de IDs, usando `PaginationService.getAll`, mantendo a página `/favorites` paginada na apresentação. Enquanto a sincronização inicial estiver incompleta, os corações devem indicar carregamento e impedir alternância baseada em estado desconhecido.

Se houver falha intermediária, não publicar um conjunto parcial como estado completo. Para listas muito grandes, avaliar futuramente uma consulta de associação por lote; esse endpoint adicional não faz parte do escopo inicial.

Confirmar alterações após a resposta da API. Bloquear clique repetido no mesmo produto durante a requisição. Não usar respostas antigas de uma consulta para sobrescrever uma alteração mais recente: serializar operações ou invalidar consultas com uma versão de estado.

Em `AuthService.userChanged`:

1. cancelar requisições da sessão anterior;
2. limpar IDs, páginas, loading e mensagens;
3. carregar favoritos da nova sessão, se autenticada;
4. descartar respostas atrasadas da conta anterior.

Não armazenar favoritos de contas distintas em uma chave global de localStorage. A fonte persistente é o PostgreSQL.

### Interação dos corações

- Coração vazio: produto não favoritado.
- Coração preenchido: produto favoritado.
- Loading por produto durante a requisição.
- `button type="button"`, `aria-pressed`, `aria-label` contextual e foco visível.
- Ícone decorativo com `aria-hidden="true"`.
- Em cards clicáveis, impedir que o clique no coração também navegue para o produto.
- Erro de rede: manter o último estado confirmado e exibir mensagem acessível.
- Sem login: navegar para `/login`, seguindo o comportamento atual do carrinho. Retomar automaticamente a ação após login não faz parte desta versão.

### Página `/favorites`

Criar componente standalone carregado via `loadComponent`, protegido por `authGuard`. Reutilizar layout e cards existentes.

Estados necessários: carregando, lista com produtos, vazio e erro com opção de tentar novamente. Disponibilizar remover dos favoritos, abrir produtos disponíveis e adicionar ao carrinho usando o `CartService` existente.

Após remoção, atualizar a lista e os corações; recarregar a página para preencher a posição removida e atualizar o total. Se a última página ficar vazia, retornar à página anterior válida.

Adicionar acesso a “Favoritos” no menu da conta, preservando o restante do header. Badge adicional não é obrigatório nesta versão.

## Arquivos e pontos de integração

Arquivos principais da implementação:

Backend:

- `backend/migrations/000005_favorites.up.sql` e `.down.sql`.
- `backend/src/repositories/favorites_repository.go`.
- `backend/src/handlers/favoritesHandler.go`.
- `backend/src/services/favorites_service.go`.
- `backend/src/routes/favorites.go`.
- Registrar rotas em `backend/src/main.go`, sem substituir CORS ou rotas existentes.
- Reutilizar `models.Product`; criar DTO adicional somente se necessário para a resposta da operação.
- `backend/src/routes/favorites_test.go`: autorização e integração PostgreSQL isolada.

Frontend:

- `frontend/src/app/core/services/favorites.service.ts` e testes.
- `frontend/src/app/features/favorites/` para página standalone e testes.
- `frontend/src/app/shared/favorite-button/`: botão compartilhado e teste de acessibilidade.
- Nova rota em `frontend/src/app/app.routes.ts`.
- Conectar corações de destaques, promoções, catálogo e detalhe, reutilizando ou extraindo um botão compartilhado se houver repetição.
- Link no menu da conta em `components/top-navbar`.

## Ordem de implementação

1. Revisar estado Git, migrations, modelos e locais dos corações.
2. Implementar migration, repository, handlers e rotas autenticadas.
3. Validar API com PostgreSQL real em schema isolado.
4. Implementar `FavoritesService` e testes de sessão/concorrência.
5. Integrar corações e página `/favorites`.
6. Testar fluxo funcional, acessibilidade e responsividade.
7. Atualizar este documento com arquivos finais, comandos e resultados efetivamente executados.

## Critérios de aceite e testes

Backend:

- Requisição sem JWT retorna 401.
- Um usuário não consulta nem remove favoritos de outro.
- PUT repetido ou concorrente não duplica a associação.
- DELETE repetido é idempotente.
- Produto inexistente/inativo é tratado conforme o contrato.
- Produto sem estoque pode permanecer favoritado sem alterar estoque.
- Paginação, filtros, contagem, página vazia e entradas inválidas funcionam.
- Exclusão física do produto/usuário remove associações pela FK.

Frontend:

- Favoritar em um card atualiza o mesmo produto nas outras áreas.
- Remover na página de favoritos desmarca os demais corações.
- Recarregar a aplicação mantém o estado salvo no backend.
- Clique duplo, falha de rede e 401 não deixam estado inconsistente.
- Logout/troca de conta não reaproveita dados anteriores.
- Mais de uma página de favoritos não produz corações incorretos.
- Produtos indisponíveis não permitem adicionar ao carrinho.
- Teclado e leitores de tela identificam a ação e o estado.

Fluxo funcional:

```text
Login → favoritar produto → coração preenchido → abrir Favoritos
→ recarregar → produto permanece → remover → coração vazio
→ logout → login em outra conta → lista isolada
```

Executar `go test ./...`, `go build ./...`, testes Angular sem watch em ChromeHeadless e `npm run build`. Configurar a integração PostgreSQL conforme o padrão dos testes do carrinho, sem executar testes destrutivos nas tabelas da aplicação. Registrar separadamente testes automatizados e validação manual real.

## Fora do escopo

Checkout, reserva de estoque, notificações de preço/disponibilidade, listas públicas, compartilhamento, favoritos anônimos e redesign das páginas.

## Entrega e verificações realizadas em 2026-11-08

- `go test ./...`: passou; integrações continuam opt-in.
- `CART_TEST_LOCAL=1` com `go test ./src/routes -run '^TestFavorites(Authorization|Postgres)$' -count=1 -v`: passou. Somente um schema temporário foi criado/modificado/removido durante a integração.
- `go build ./...`: passou.
- ChromeHeadless: **34 testes passaram**, cobrindo FavoritesService, FavoriteButton, página de favoritos, detalhe, categoria, carrinho e ofertas.
- `npm.cmd run build`: passou com avisos de orçamento do bundle/estilo, CommonJS do SweetAlert2 e seletores CSS do Bootstrap. Não foram alterados limites ou dependências.
- Após os testes, a migration `000005_favorites.up.sql` foi aplicada separadamente no banco local, em transação, atualizando `schema_migrations` de 4 para 5. A tabela estava ausente e a versão anterior foi verificada como limpa antes da aplicação.
- Validação manual com uma conta real e inspeção visual em diferentes dispositivos não foram executadas. Os fluxos de sessão, acessibilidade do botão e indisponibilidade foram verificados automaticamente.

Reinicie a API para carregar as novas rotas e acesse **Favoritos** no menu da conta. A rota é `/favorites`.
