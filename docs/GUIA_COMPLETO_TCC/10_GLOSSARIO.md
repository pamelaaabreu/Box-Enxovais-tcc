# 10 — Glossário com exemplos do projeto

Leia os conceitos em conjunto com [arquitetura](01_ARQUITETURA.md) e [fluxos](05_FLUXOS_DO_SISTEMA.md). O mesmo nome, como service, pode existir em camadas distintas com responsabilidades diferentes.

## API

Interface de comunicação entre programas. A API Go recebe as ações enviadas pelo Angular.

## Endpoint

Combinação de método e caminho de uma operação; GET /products consulta catálogo.

## JSON

Formato textual de dados. O pedido retorna propriedades como installments e installmentAmounts.

## DTO

Contrato de transferência de dados. O DTO de gravação da campanha não envia created_at/updated_at.

## Interface

Descrição TypeScript da forma de um objeto. Product define os dados usados por cards e detalhes; não valida runtime sozinho.

## Struct

Tipo composto de Go. PaymentPlan reúne quantidade e valores das parcelas com tags JSON.

## Component

Unidade visual Angular. PurchaseReviewComponent combina formulário, estado e template reutilizados.

## Service

Classe/camada que coordena operações. AuthService Angular gerencia sessão; AuthService Go valida login e emite JWT.

## Handler

Função/controlador Go que interpreta HTTP e produz resposta. CheckoutHandler recebe POST /checkout.

## Repository

Código de acesso a dados. CheckoutRepository executa SQL/transação da compra.

## Middleware

Etapa anterior ao handler. AuthMiddleware verifica o Bearer e coloca identidade no contexto.

## JWT

Token assinado com declarações de identidade. Não é uma senha nem um mecanismo de esconder dados do payload.

## Guard

Controle de navegação Angular. AdminGuard impede abertura indevida do painel, sem substituir o backend.

## Interceptor

Intercepta chamadas HTTP Angular. auth.interceptor.ts participa do envio/tratamento da sessão.

## Migration

Arquivo versionado que muda schema/dados. A 53 adiciona o número de parcelas.

## Constraint

Regra do banco. CHECK restringe parcelas; UNIQUE impede SKU duplicado.

## Transaction

Grupo de operações atômicas. Criar pedido, baixar estoque e limpar carrinho devem confirmar juntos.

## Rollback

Desfaz a transação não confirmada ou reverte migration quando seguro. Não significa apagar qualquer histórico sem condições.

## Commit

Confirma alterações da transação. Só então a compra passa a existir com baixa correspondente.

## Idempotência

Repetir a mesma operação identificada não duplica seu efeito. requestKey protege a confirmação de compra.

## Concorrência

Operações sobrepostas no tempo. Dois clientes podem tentar comprar a última unidade.

## Snapshot

Cópia do estado no momento de um evento. Endereço e preço do pedido não mudam quando o cadastro atual é editado.

## Lazy loading

Carregamento sob demanda. app.routes.ts importa páginas quando suas rotas são acessadas.

## Signals

Valores reativos Angular lidos pelo template. A cotação/estado do checkout pode atualizar a UI sem cópias manuais.

## RxJS

Biblioteca de fluxos assíncronos. Operadores organizam HTTP, filtros e cancelamento de respostas obsoletas.

## SKU

Código externo estável da loja; não substitui o ID nem a chave primária.

## JSONB

Formato PostgreSQL para consultar JSON armazenado. Usado em características e snapshots de endereço.

## Chave estrangeira

Relação que exige registro referenciado existente, como variante pertencente a um produto.

## Centavos

Representação inteira do dinheiro. 1290 representa R$ 12,90 na regra financeira do checkout.

## Consentimento

Escolha explícita de permitir publicação da avaliação, separada de enviar a nota.

## Mock

Resposta/dado controlado no teste. Não deve ser confundido com produto real persistido no catálogo.

## Schema isolado

Namespace PostgreSQL criado para teste, com tabelas próprias e removido ao final; evita escrever no public comercial.

