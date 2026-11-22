# 12 — Revisão intensiva em quatro dias

## Prioridades

**Indispensável:** explicar o problema, a comunicação Angular/Go/PostgreSQL, autenticação versus autorização, variante e estoque, total/frete histórico, pagamento demonstrativo e limites. Saber percorrer uma compra e reconhecer o que depende de migration no ambiente da apresentação.

**Importante:** diferenciar componentes/services/handlers/repositories, entender snapshots, transações, idempotência, cancelamento e moderação. Explicar testes unitários versus integração/navegador e demonstrar um erro recuperável sem perder dados.

**Complementar:** detalhes de operadores RxJS, tags JSON, índices, normalização de DTO e composição de SCSS. A banca precisa entender as decisões; decorar sintaxe de imports não substitui saber explicar comportamento.

## Dia 1 — História do projeto e arquitetura

Leia [visão geral](00_VISAO_GERAL.md), [arquitetura](01_ARQUITETURA.md) e o início do [guia da banca](09_GUIA_DA_BANCA.md). Desenhe o caminho navegador → API → banco sem consultar. Abra app.routes.ts e main.go para localizar uma rota em cada lado. Explique em voz alta por que Angular não fala diretamente com PostgreSQL e por que o backend atual é net/http.

Pratique a fala de um minuto três vezes, cronometrando. Depois escreva cinco funcionalidades demonstradas e cinco limitações reais. Ao final do dia, outra pessoa deve conseguir compreender o objetivo sem conhecer programação.

## Dia 2 — Compra e dados

Estude [fluxos](05_FLUXOS_DO_SISTEMA.md) e [banco](04_BANCO_DE_DADOS.md). Trace produto → variante → carrinho → pedido e explique onde ficam preço/saldo antes e depois da compra. Faça um exemplo de R$ 22,91 dividido em seis, conferindo a soma. Explique por que editar o catálogo não muda o pedido antigo e por que NULL não significa frete grátis.

Em ambiente de demonstração já preparado, pratique seleção de tamanho, CEP coberto/não coberto, revisão e confirmação. Não use o banco principal para ensaiar exclusões. Verifique se as migrations exigidas foram autorizadas/aplicadas antes de planejar demonstrar avaliações simplificadas e parcelamento.

Autoavaliação: consigo explicar o que acontece se duas pessoas compram a última unidade? E se a confirmação for enviada duas vezes? Consigo apontar CheckoutRepository e os respectivos testes?

## Dia 3 — Segurança e administração

Leia [segurança](06_SEGURANCA.md) e [decisões](08_DECISOES_TECNICAS.md). Compare guard Angular e middleware Go. Estude as diferenças entre login, permissão administrativa e propriedade de pedido. Veja como a campanha separa dados de leitura e payload de gravação.

Pratique painel, formulário simples/com variantes, galeria, confirmação de descarte, campanha, pedidos, clientes e relatórios. Explique arquivamento seguro e por que consulta de clientes não significa CRUD irrestrito. Treine responder metade das perguntas da banca sem ler; marque dúvidas e retorne ao arquivo real pelo [mapa](11_MAPA_DE_ARQUIVOS.md).

Autoavaliação: consigo explicar senha com bcrypt sem dizer que é descriptografada? Sei que CORS não autentica? Sei separar falha temporária, erro de validação e conflito?

## Dia 4 — Ensaio completo e evidências

Leia [testes](07_TESTES_E_QUALIDADE.md) e revise o [glossário](10_GLOSSARIO.md). Prepare a fala técnica de três minutos e uma demonstração curta com começo, meio e fim. Tenha capturas finais como apoio e identifique claramente que são evidências de execução anterior.

Confirme frontend/API acessíveis, conta de teste, CEP coberto e produto com estoque no ambiente autorizado. Não atualize dependências, aplique migrations ou faça refatorações na hora do ensaio. Treine uma falha: explique o estado de erro e recarregue sem inventar sucesso. Finalize respondendo todas as perguntas, priorizando clareza e honestidade sobre limites.

## Lista de verificação antes da defesa

- Sei dizer o problema, objetivo e público em menos de um minuto.
- Sei apontar um componente, serviço, endpoint, repository e tabela do mesmo fluxo.
- Sei explicar total, frete, parcelas e snapshots sem confundir exemplo com cobrança real.
- Sei distinguir funcionalidades implementadas e pendências de implantação.
- Conheço os números efetivos de testes e não apresento build como E2E.
- Tenho um plano de demonstração com dados de teste e preservação do histórico.

Se o tempo apertar, revise os conhecimentos indispensáveis e a fala. Dominar o caminho de uma compra é mais útil do que memorizar todos os arquivos.
