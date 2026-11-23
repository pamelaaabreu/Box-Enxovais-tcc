# Seed demonstrativo do Dashboard

Uso exclusivo em desenvolvimento. Não é migration e nunca deve ser executado em produção.

A partir de `backend`, com o `.env` do ambiente desejado:

```powershell
go run ./cmd/seed-dashboard -development -database bd_box -allow-stock-consumption -apply
```

Sem `-apply`, executa dentro de uma transação revertida; as sequências de IDs podem avançar. Prefira validar em schema isolado (`-schema nome_do_schema`) com catálogo e estrutura completos.

No schema `public`, a aplicação exige `pg_dump` e `pg_restore` no PATH, cria backup customizado em `db/backups`, valida listagem e leitura integral e informa SHA-256 antes de gravar. Credenciais não são impressas. O nome do banco informado precisa coincidir com o configurado.

Cria 20 clientes `dashboard-202611-XX@example.invalid`, sem login habilitado, e 35 pedidos identificados por `request_key = dashboard-demo-202611-N`, entre 24/10 e 22/11/2026. Usa preços e variantes reais e a primeira faixa ativa de frete; descontos seguem as campanhas aplicáveis à data. Endereços são explicitamente demonstrativos, não destinados a entregas reais.

São 30 pedidos aprovados e 5 cancelados. Cada item possui uma unidade: são consumidas 30 unidades disponíveis, sem estoque negativo. Cancelados têm registro de cancelamento e efeito líquido zero no estoque, como após reposição. Preços, SKUs e pedidos anteriores são preservados. Os horários e clientes são consistentes com a data de cada pedido.

A execução é transacional, possui bloqueio contra concorrência e rejeita estoque insuficiente ou colisões de identificadores. Reexecutar não duplica clientes/pedidos nem repete o consumo. Não execute exclusões manuais: a futura remoção exige recompor os estoques dos pedidos aprovados e preservar os vínculos comerciais.

Teste direcionado com PostgreSQL local e schema temporário automaticamente removido:

```powershell
$env:CART_TEST_LOCAL='1'
go test ./src/routes -run '^TestDashboardSeedPostgres$' -count=1
```
