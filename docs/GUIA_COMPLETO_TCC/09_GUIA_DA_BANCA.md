# 09 — Preparação para a banca

## Apresentação em um minuto

“A Box Enxovais é uma loja virtual demonstrativa desenvolvida para organizar a venda de artigos para casa. O cliente navega pelo catálogo, escolhe tamanhos disponíveis, salva favoritos e conclui uma compra com entrega validada por CEP. O administrador gerencia produtos, imagens, promoções e consulta pedidos, clientes e relatórios. A interface usa Angular, a API usa Go e os dados ficam no PostgreSQL. O principal cuidado foi manter coerência entre variantes, preços, estoque e histórico: o servidor recalcula a compra e protege operações concorrentes. Pagamentos e parcelamento são demonstrativos, sem coleta de cartão ou cobrança real.”

## Apresentação técnica em três minutos

Comece pelo problema de escolher a peça certa, com tamanho e entrega disponíveis. Mostre o catálogo e uma variante para explicar que a interface não inventa estoque. Em seguida, apresente o diagrama Angular → HTTP/JSON → Go → PostgreSQL. Explique que componentes e serviços organizam o frontend, enquanto handlers e repositories tratam requisições e dados no servidor.

Use a confirmação de pedido como exemplo de integração. A API valida usuário, carrinho, preço atual, promoção e faixa de CEP, bloqueia saldo e grava snapshots em uma transação. Uma chave de idempotência evita compra duplicada. Cancelar repõe uma vez, sem apagar o histórico. O parcelamento divide centavos exatamente e não envia dados bancários.

Mostre a avaliação única de experiência, reutilizada no sucesso e no histórico. Diferencie consentimento de publicação e moderação. Termine com o painel e a evidência de testes: 433 Angular na rodada atual, Go/PostgreSQL normal/race e navegação real em quatro larguras. Declare que banco principal e schemas isolados são ambientes diferentes e que as migrations pendentes exigem implantação autorizada.

## Roteiro prático de demonstração

Prepare previamente uma conta de cliente e uma administrativa no ambiente demonstrativo autorizado, um produto simples e outro com variantes e CEP coberto. Não use credenciais ou dados de pessoas reais na apresentação. Confirme antes se o ambiente está na versão de schema exigida; não aplique migrations durante a fala.

Mostre Home/categoria, variante com preço e saldo, favorito/carrinho e entrega. Selecione cartão demonstrativo e parcelas, revise total, confirme e abra detalhes. Envie avaliação, recarregue para provar persistência e apresente um cancelamento permitido. No admin, mostre listagem/edição e galeria, campanha e relatórios. Não exclua produtos do principal para impressionar a banca: use ambiente isolado ou apenas explique a confirmação/arquivamento.

Se uma integração externa falhar, explique a diferença entre indisponibilidade de SMTP/CEP e integridade do pedido. Não repita cliques de confirmação sem verificar o resultado. Tenha as capturas finais disponíveis como apoio, sem apresentá-las como navegação ao vivo.

## Dificuldades e soluções reais

Critérios obrigatórios demais dificultavam avaliar a compra: três notas auxiliares passaram a ser opcionais e a mesma UI foi reutilizada. Divisão monetária poderia perder centavos: adotou-se rateio inteiro determinístico. Timestamps de leitura causavam 400 em campanha: o payload de gravação foi delimitado. A ferramenta anterior de navegação teve bloqueios: Playwright local com sandbox habilitado forneceu navegação real isolada. A limpeza de código foi conservadora para não apagar assets usados por URLs do banco.

## Perguntas e respostas

### 1. Qual problema o projeto resolve?

Organiza compra e administração de enxovais com identificação, medidas, variantes, estoque e entrega coerentes.

### 2. Quais são as três camadas principais?

Angular apresenta a interface; Go valida e processa HTTP; PostgreSQL persiste e garante integridade.

### 3. O backend usa Fiber?

Não. A implementação atual usa net/http e http.ServeMux da biblioteca padrão de Go.

### 4. Por que Angular?

Oferece componentes, roteamento, injeção de dependências e formulários reativos adequados a um painel e uma loja com estado.

### 5. O que significa standalone?

O componente declara suas próprias dependências. Isso reduz necessidade de módulos por tela; o admin também usa Routes standalone.

### 6. Por que lazy loading?

Carrega páginas quando necessárias, reduzindo o pacote inicial. Não substitui autorização.

### 7. Qual é a diferença entre service e repository?

Service coordena regras/integrações; repository executa persistência SQL. Alguns fluxos usam repository direto no handler.

### 8. Como a comunicação acontece?

Por HTTP/JSON. Serviços ou componentes Angular fazem requisições e tratam respostas da API.

### 9. Qual é a função do JWT?

Transporta identidade/perfil assinados. A API verifica assinatura, emissor, expiração e autorização antes de operações privadas.

### 10. Guard Angular protege o banco?

Não. Guard organiza navegação; proteção efetiva está nos middlewares e verificações de propriedade no servidor.

### 11. Como as senhas são guardadas?

Como hashes bcrypt. Login compara a senha recebida ao hash, sem recuperar a senha original.

### 12. Como impedir acesso ao pedido alheio?

Consultas incluem o usuário autenticado. Alterar o ID da URL não satisfaz o filtro de propriedade.

### 13. Por que PostgreSQL?

Relacionamentos, constraints e transações ajudam a proteger estoque, pedidos, usuários e vínculos comerciais.

### 14. O que uma migration oferece?

Versiona mudanças de schema/dados de forma reproduzível. Aplicação no principal exige cuidado e backup.

### 15. Rollback sempre é possível?

Não sem condições. Downs 52/53 recusam operações quando apagariam dados ou reimporiam uma restrição incompatível.

### 16. Todos os preços estão em centavos no banco?

Não. Catálogo usa decimal; valores financeiros do checkout são tratados como centavos inteiros e snapshots.

### 17. Por que snapshot do pedido?

Nome, endereço e valores no momento da compra precisam sobreviver a edições posteriores de catálogo e conta.

### 18. Como funcionam variantes?

Cada tamanho tem ID, dimensões, preço e saldo. Carrinho mantém productId e variantId corretos.

### 19. O SKU substitui o ID?

Não. É identificação externa gerada automaticamente; ID continua chave interna e SKU permanece estável em edição.

### 20. Adicionar ao carrinho reserva estoque?

Não representa reserva definitiva. Quantidade é validada e o checkout verifica novamente o saldo em transação.

### 21. Como evitar vender a última unidade duas vezes?

O checkout bloqueia as linhas relevantes, confere o saldo e baixa o estoque atomicamente antes do commit.

### 22. O que é idempotência neste sistema?

Repetir a confirmação com a mesma requestKey/usuário retorna a compra existente, sem criar nova baixa.

### 23. Quem calcula o frete definitivo?

O Go consulta novamente faixa ativa de CEP na transação. Valor exibido pelo Angular não é fonte de confiança.

### 24. Como o total é formado?

Subtotal histórico dos produtos menos descontos aplicáveis mais frete confirmado pelo backend.

### 25. O cartão é cobrado?

Não. É pagamento demonstrativo, sem número, validade, CVV, gateway ou liquidação bancária.

### 26. Como funciona o parcelamento?

Cartão aceita 1–6 sem juros; Pix/boleto 1. O resto da divisão em centavos é distribuído para manter a soma exata.

### 27. Pedido antigo sem frete/parcelas vira grátis ou 1x?

Não. Informação ausente é preservada e indicada, sem recalcular ou inventar histórico.

### 28. Como evitar avaliação duplicada?

Pertencimento/estado do pedido são validados e há UNIQUE por pedido, além de controle transacional.

### 29. Qual a diferença entre avaliar e publicar?

Nota/comentário pertencem ao registro da experiência; publicação depende de consentimento e moderação administrativa.

### 30. O que acontece ao cancelar?

Registra o cancelamento e repõe saldo uma vez quando houve débito, preservando itens e valores históricos.

### 31. É possível excluir produto comprado?

O fluxo seguro arquiva produtos com vínculos que exigem preservação; exclusão física fica restrita a casos sem risco.

### 32. Quais testes existem?

Angular unitário, Go unitário/integrado PostgreSQL e navegação Playwright com schemas isolados e quatro resoluções.

### 33. O build prova funcionamento completo?

Não. Prova compilação/distribuição; a evidência funcional vem de testes de API, banco e navegador.

### 34. O principal foi alterado nos testes?

Não. Na rodada atual os hashes de todas as tabelas públicas ficaram idênticos; o principal foi confirmado em 54, dirty=false. Resultados anteriores em 51 são históricos.

### 35. Quais limitações você reconhece?

Pagamento e tarifas demonstrativos, ausência de logística/fiscal real, dependências com riscos documentados e auditoria assistiva não exaustiva.

### 36. O que falta para ativar as novas funções no principal?

Autorização específica e implantação controlada das migrations 52/53, com backup, revisão e reinício da API. Testes isolados já passaram.

## Encerramento sugerido

Destaque o aprendizado de integrar UI, regras transacionais e persistência, em vez de alegar equivalência a uma operação comercial real. Proponha gateway, logística, emissão fiscal e atualização planejada de dependências como evoluções. Para aprofundar respostas, consulte [decisões](08_DECISOES_TECNICAS.md), [segurança](06_SEGURANCA.md) e [banco](04_BANCO_DE_DADOS.md).

Na banca, diferencie avaliação da compra e do produto. Explique que newsletter é idempotente, mas recuperação de SMTP é limitada à memória da instância. Não afirme garantia absoluta de e-mail ou certificação completa de acessibilidade.
