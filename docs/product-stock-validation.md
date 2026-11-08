# Validação de estoque no cadastro de produtos

## Escopo

Correção do cadastro em `/admin/products/manage` (e `/product-register`), sem implementar edição, reserva ou desconto de estoque. Layout, serviço HTTP e permissões preservados.

- Campo `quantity` / `product.quantity`: obrigatório, inteiro e não negativo; máximo 2147483647, correspondente ao INTEGER do PostgreSQL.
- Angular valida o campo, desabilita o envio inválido e também verifica dentro de `onSubmit()`. Mensagem acessível junto ao campo. Envios duplicados são bloqueados durante loading.
- `POST /products`: autenticação JWT e papel admin continuam obrigatórios. `CreateProduct` recebe quantidade obrigatória, rejeita negativos, frações, texto, null, ausência e valores fora do INTEGER com HTTP 400 no envelope `services.Error` (`success: false`, `message`).
- Sucesso permanece HTTP 201 com `{ "id": ... }`. O INSERT grava `products.quantity`; GET `/products/{id}` devolve `quantity` e `stock` iguais.
- Exemplo: cadastrar `quantity: 3` grava 3; para produto ativo a página pública indica “Últimas 3 unidades”.

## Migration 000004

Arquivos `backend/migrations/000004_products_quantity_nonnegative.up.sql` e `.down.sql`.
A migration adiciona `products_quantity_nonnegative CHECK (quantity >= 0)`. Antes de adicionar a constraint, verifica negativos e interrompe com mensagem se existirem. Não altera registros automaticamente. Migrations anteriores não foram editadas.

Consulta prévia somente leitura executada em 06/10/2026 no PostgreSQL local:

```sql
SELECT count(*) FROM public.products WHERE quantity < 0;
```

Resultado: **0**. Repetir a consulta no banco de destino antes de aplicar, pois os dados podem mudar.

**Estado na primeira verificação:** criada e aplicada somente no schema temporário de integração. Aplicação posterior no banco local registrada abaixo. O rollback foi criado, mas não executado.

## Testes — 06/10/2026

| Verificação | Comando (na pasta indicada) | Resultado |
|---|---|---|
| Formulário Angular, ChromeHeadless | frontend: `node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include=src/app/features/product-manage/register/product-create/product-create.component.spec.ts` | 14 testes aprovados |
| Build Angular | frontend: `npm run build` | Aprovado, exit 0; avisos preexistentes de bundle, SCSS, CommonJS e seletores CSS |
| Testes Go | backend: `go test ./...` | Aprovado; integrações opt-in não habilitadas neste comando |
| Build Go | backend: `go build ./...` | Aprovado, exit 0 |
| Endpoint real e PostgreSQL | backend: `$env:CART_TEST_LOCAL='1'; $env:CART_TEST_DATABASE_URL=$null; go test -count=1 -v ./routes -run '^TestProductCreatePostgres$'` | 1 teste com 13 subtestes aprovados |

### O que foi exercitado

Angular: interação com input e botão reais do componente em ChromeHeadless, envio de 0 e 3, bloqueio de negativo/fração/texto/vazio, defesa em chamada direta do método e bloqueio de envio duplicado. O HTTP é interceptado pelo HttpTestingController nesse teste; não é um teste ponta a ponta conectado ao PostgreSQL.

Integração: servidor HTTP local de teste (`httptest.NewServer`) com a rota, middleware JWT e handler reais, conectado ao PostgreSQL. Cria schema exclusivo `product_create_test_<timestamp>`, configura uma conexão com search_path isolado, aplica migrations e remove somente esse schema ao terminar. Produtos reais não são alterados.

Confirma HTTP 201, valor persistido e GET público para 0 e 3; HTTP 400 para -1, 1.5, texto, string numérica, null, quantidade ausente, overflow e JSON extra; HTTP 401 sem token e 403 para cliente. Confirma que requisições inválidas não inserem linhas. Testa a migration com um registro negativo fictício: ela falha e mantém o valor original. Após remover apenas essa fixture no schema temporário, aplica a migration e confirma que o banco rejeita um INSERT negativo direto.

Não foi realizada revisão visual manual nem teste ponta a ponta navegador → PostgreSQL. A edição administrativa de estoque permanece fora deste escopo.


## Aplicação no banco local — 06/10/2026

Procedimento de `backend/migrations/README.md`, com golang-migrate e DATABASE_URL apontando para `localhost:5432/bd_box`, usuário postgres. Senha não registrada neste documento.

- Antes: versão 3, dirty=false; 32 produtos; 0 estoques negativos.
- `psql.exe` local estava vazio (0 bytes). Consultas somente leitura foram feitas com database/sql e o driver PostgreSQL já usado pelo projeto.
- Backup completo em formato custom via pg_dump, antes da aplicação: `C:/Users/vitor/AppData/Local/Temp/bd_box_before_000004_20261006_202207.dump`.
- Comando aplicado, a partir de backend: `migrate -source $migrationSource -database $env:DATABASE_URL up 1`, com migrationSource resolvida conforme README. Resultado: `4/u products_quantity_nonnegative`.
- `migrate ... version`: 4. Consulta a schema_migrations: version=4, dirty=false.
- Constraint products_quantity_nonnegative: CHECK ((quantity >= 0)), convalidated=true.
- Depois: 32 produtos; 0 estoques negativos; checksum de todas as linhas de products permaneceu `d9fae45716bf0b56fd12f64596360731`. Não houve modificação dos produtos existentes.
- Backend recompilado (`go build`) e reiniciado com o código atualizado. Nova instância PID 27348; GET `/products?limit=1` retornou HTTP 200.

Pendências: o navegador recusou localhost:4200 por uma preferência salva de segurança. Não foi possível testar cadastro e disponibilidade visualmente, e nenhum produto de teste foi criado no banco da aplicação nesta rodada. Os testes de cadastro em schema temporário continuam registrados acima, sem serem apresentados como teste visual.

O pg_dump concluiu com aviso de incompatibilidade da versão de collation do banco (1540.3) com o sistema operacional (1541.2). Isso não impediu backup ou migration. Revisão dos índices/objetos afetados e atualização da collation devem ser tratadas separadamente; não foram executadas nesta tarefa. O backup está no diretório temporário e deve ser guardado em local durável caso seja necessário mantê-lo.
