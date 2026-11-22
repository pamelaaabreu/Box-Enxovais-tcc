# 06 — Segurança e limites

## Identidade não é permissão

Autenticação responde quem fez a requisição; autorização determina o que essa pessoa pode fazer. `AuthService.Login` compara a senha com bcrypt e assina JWT HS256 com validade de duas horas. `middleware/authMiddleware.go` exige Bearer, assinatura/método esperado, emissor, expiração e identificação válida. `AdminMiddleware` exige perfil administrativo. Não é suficiente decodificar o token e confiar no texto da role.

Guards Angular melhoram navegação e evitam abrir telas indevidas, mas são executados em uma máquina controlada pelo cliente. Um atacante pode chamar HTTP sem abrir Angular. Por isso produtos, campanhas, pedidos e clientes administrativos também são protegidos no backend. Nas consultas particulares, o repository filtra pelo usuário autenticado; mudar o ID na URL não concede acesso ao pedido de outra pessoa.

## Senhas e recuperação

Bcrypt armazena uma derivação da senha, não a senha original nem uma cifra que precise ser revertida no login. Recuperação usa código e autorização temporária para redefinição, vinculados ao fluxo no backend. Testes exercitam credenciais inválidas, tokens e redefinição; não se deve registrar senhas, códigos de clientes ou segredos de JWT em logs.

## Entrada, SQL e arquivos

Reactive Forms e máscara ajudam o usuário, mas o Go valida novamente e PostgreSQL garante constraints. Consultas usam placeholders como `$1` com argumentos separados. Filtros/ordenações dinâmicos precisam ser limitados aos campos permitidos, pois nomes de colunas não são parâmetros de valor. Não se concatena texto de pesquisa como SQL executável.

Uploads administrativos exigem autenticação e validação no backend. Galerias referenciam arquivos existentes. A remoção de vínculo não pode apagar antecipadamente o arquivo de um pedido ou outra variante; o banco deve confirmar a operação antes de uma limpeza física. Arquivos de ambiente, backups e uploads comerciais foram preservados nesta tarefa.

## Dinheiro, estoque e repetição

O checkout recalcula valores e frete no servidor. O cliente envia total esperado para detectar mudança, não para definir o preço definitivo. CEP fora de cobertura bloqueia a compra mesmo se o navegador for alterado. O parcelamento é validado pelo método e pela constraint; não basta a opção ter aparecido no select.

Transações e bloqueios coordenam concorrência. Duas compras disputando a última unidade não podem ambas baixar saldo. Idempotência com requestKey evita duplicação por reenvio de confirmação. Cancelamento repetido não repõe duas vezes. Avaliação tem unicidade por pedido e exige confirmação/propriedade; consentimento de publicação não é assumido a partir do comentário.

## Proteções não equivalem a certificação

CORS delimita origens no navegador, mas não autentica usuários e não bloqueia ferramentas HTTP. SessionStorage evita persistência após o fim da sessão da aba, porém um XSS ainda pode expor o token. Produção exige HTTPS, política de conteúdo apropriada, controle de dependências, gestão de segredos e monitoração. A aplicação de demonstração não possui gateway/antifraude real.

O histórico de auditoria registra atualizações de segurança de Go e alertas npm remanescentes. Esta rodada não atualizou dependências nem executou nova varredura online; não se afirma que o projeto está sem vulnerabilidades. Testes de autorização, SQL, concorrência e navegação fornecem evidências específicas, não uma garantia universal de segurança. Consulte [resultados e pendências](07_TESTES_E_QUALIDADE.md).
