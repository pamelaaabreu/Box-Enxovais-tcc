# 03 — Backend Go

## Inicialização e dependências

`backend/go.mod` define Go 1.26.11. O backend usa `net/http`, `database/sql`, driver `lib/pq`, JWT, bcrypt e Gomail. `src/main.go` ajusta o diretório de execução quando iniciado em `src`, carrega configuração, abre a conexão PostgreSQL e constrói os handlers com dependências explícitas. Erros de inicialização retornam de `run()` e impedem servir uma aplicação parcialmente configurada.

A API utiliza `http.ServeMux`, que associa método/caminho a funções. `routes/products.go`, por exemplo, registra `GET /products`, `POST /products` administrativo e `PATCH /admin/products/{id}`. Métodos de leitura e alteração têm finalidades distintas; o cliente não escolhe a autorização apenas enviando um campo no JSON.

## Responsabilidade de cada camada

O handler interpreta parâmetros, autenticação já estabelecida, corpo e validações de entrada. Define o código HTTP e uma resposta JSON. Um service aplica regras e integrações: `AuthService` compara senha, emite token e coordena recuperação; `ProductService` intermedeia operações do catálogo. Repositories guardam SQL e persistência: `CheckoutRepository` mantém a transação financeira/estoque e `HomeRepository` mantém avaliações/publicação.

Models são structs com tags JSON. Não se deve presumir que todos os nomes sejam iguais entre SQL e HTTP: o banco usa nomes como `total_cents`, enquanto respostas têm valores serializados pelo tipo `Money` e propriedades como `installmentAmounts`. Por isso, o contrato deve ser lido antes de construir um payload.

```go
count, err := models.NormalizeInstallments(input.PaymentMethod, input.Installments)
```

A função centraliza o intervalo de parcelas e a restrição Pix/boleto. O repository também a chama, protegendo usos diretos além do handler. `PaymentPlan.PopulateInstallments` deriva valores a partir do total histórico e do número persistido; não consulta o preço atual do catálogo.

## Erros e respostas

400 indica entrada inválida; 401 ausência/token inválido; 403 operação não permitida ao perfil; 404 recurso não encontrado ou não pertencente ao usuário conforme o fluxo; 409 conflito, como avaliação repetida ou edição concorrente. Erros internos devem ter mensagem apropriada sem expor SQL, credenciais ou dados de clientes. O frontend pode manter o formulário e oferecer tentativa novamente em falhas temporárias.

A validação acontece em camadas. Um radio pode impedir uma escolha no navegador, mas uma chamada manual ainda chega ao Go. O backend verifica conteúdo e o PostgreSQL aplica constraints. Na avaliação, o corpo é limitado, campos desconhecidos são recusados e a nota geral é obrigatória entre 1 e 5. Critérios antigos continuam aceitos opcionalmente para compatibilidade.

## Transações e concorrência

`CheckoutRepository.Create` inicia transação, bloqueia o carrinho e lê produtos em ordem estável. Variantes são bloqueadas especificamente quando existem. O saldo é conferido antes da baixa. Preços promocionais e entrega são recalculados; divergência com o total esperado interrompe a conclusão. Só após gravar pedido/itens e limpar o carrinho ocorre commit. Qualquer erro provoca rollback.

`request_key` junto ao usuário identifica uma tentativa de compra: repetir uma requisição não cria outra baixa. Cancelamento também é transacional e deve repor apenas uma vez. Para avaliação, bloqueio do pedido e unicidade de `order_id` impedem duas avaliações simultâneas. É diferente de simplesmente desabilitar o botão na interface.

## Integrações e operação

Arquivos comerciais são publicados em `/uploads/` e vinculados por tabelas, não embutidos no JSON dos produtos. Templates de e-mail usam os valores confirmados do pedido, inclusive frete e plano de pagamento. A renderização foi testada sem disparo real de SMTP. Falha de e-mail não deve ser confundida com ausência de pedido já confirmado.

Os testes PostgreSQL criam schemas específicos, aplicam migrations e removem o schema ao final. Eles não precisam recriar `bd_box`. Antes de executar ferramentas manuais, confirme o opt-in e o isolamento; não rode um comando genérico de migration no principal como parte de uma demonstração.
