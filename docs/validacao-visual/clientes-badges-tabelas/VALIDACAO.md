# Validação — Clientes, badges e tabelas

As imagens recebidas no ZIP estão na pasta `referencias/`. Foram usadas como referência de proporção, paleta e hierarquia; Montserrat e os fluxos existentes foram preservados.

## Implementação e arquivos

- Novos componentes em pastas próprias: `shared/components/status-badge/` (sucesso, erro, neutro e aviso; altura mínima de 30 px, fonte 13 px/600) e `shared/components/admin-data-table/` (projeção de tabela nativa, superfície comum, estado vazio compartilhado e adaptação em cards).
- Tabela aplicada em Clientes, histórico de compras, listagem de Pedidos e Faixas de CEP. CEP mantém rolagem confinada nas telas estreitas; as demais usam cards responsivos.
- Badge reutilizado em Clientes/histórico, Pedidos/cabeçalhos, Produtos, Dashboard/estoque, Relatórios, Promoções e Avaliações. Removidas regras locais substituídas; não alteradas as funções que traduzem status nem os cálculos.
- Componentes de Clientes organizados em `components/admin/customers/admin-customers/` e `admin-customer-detail/`, com TS, HTML, SCSS e testes juntos. Serviço permanece no diretório da feature; rotas e imports corrigidos.
- Clientes reutiliza AdminKpiCard, AdminFilters, Pagination e AdminState. Resumo de compras verde, detalhe dourado discreto, endereço vazio sem card externo. Histórico e Visualizar preservados.
- Variações: título 20 px, subtítulo curto, resumo superior com superfície creme discreta, borda contínua da lista e primeira linha corrigida. Formulários, IDs, SKU, máscara e validações preservados.
- Removido o link redundante de rodapé Voltar aos pedidos; preservado o CTA de recuperação quando o pedido não existe.
- Automação: `frontend/e2e/customers-badges-ui.cjs` e `shipping-ranges-ui.cjs`; seletor do novo badge atualizado em `admin-orders.cjs`.

## Testes funcionais executados

- Angular: 78 testes direcionados aprovados; rechecagens de 63 e 32 aprovadas (conjuntos sobrepostos, não somar como testes únicos).
- PostgreSQL: `CART_TEST_LOCAL=1 go test ./src/routes -run '^TestDashboardSeedPostgres$' -count=1` aprovado, em schema descartável. Verificada reexecução, atualização dos identificadores antigos, mesmos IDs, 20 perfis, 35 pedidos, snapshots históricos e estoque preservados.
- `go test ./cmd/seed-dashboard`: comando compilado, sem arquivos de teste próprios.
- Build Angular de produção aprovado. Sem avisos de imports não utilizados após a correção final. Persiste aviso preexistente do SCSS de Promoções: 15,79 kB ante limite de aviso de 14 kB; orçamento não aumentado.
- Chrome real com HTTP isolado: busca por nome/e-mail, vazio, paginação da listagem e histórico, detalhe, endereços presentes/ausentes, 404, falhas e recuperação, links dos pedidos e tabela compartilhada. Nenhum erro JavaScript ou requisição de escrita na suíte de Clientes.
- Faixas de CEP/variações rechecadas após a integração da tabela compartilhada: fluxos completos em memória aprovados. Uma tentativa do filtro após redimensionar expirou na espera de estabilidade; reprodução isolada passou. Os cenários foram separados por navegação limpa e a execução completa voltou a passar, sem force-click ou alteração funcional da tela.
- Syntax checks dos scripts e git diff --check aprovados. Frontend 4200 e GET /products na API 8080 retornaram HTTP 200.

## Acessibilidade e inspeção visual

- Capturas em 320, 390, 768, 1024, 1440 e 1920 px. Inspecionadas listagem de Clientes, detalhe, endereços/histórico, Pedidos, variações válidas/inválidas e drawer de CEP nas composições desktop/tablet/mobile. Conferidos alinhamento, bordas, contraste, resumo verde e ausência de sobreposição. Status mantêm texto, além da cor.
- Conferência interativa adicional no Chrome/Windows: resumo verde, endereço vazio integrado, tabela e badges; clique na página 2 do histórico alterou a URL e o conteúdo corretamente. Faixas de CEP teve abertura/fechamento por Escape e filtro Material conferidos interativamente na etapa anterior.
- Verificações direcionadas de labels/erros, foco do drawer e controles de 44 px; não foi executada auditoria WCAG integral nem nova suíte axe nesta tarefa.
- Nenhuma divergência visual relevante conhecida nas capturas inspecionadas. Tabelas complexas da Dashboard e formulários de variações mantêm sua estrutura especializada; a base compartilhada não substitui formulários, cálculos nem rowspans.

## Perfis fictícios e integridade do principal

- Origem ajustada em `backend/cmd/seed-dashboard/seed.sql`, `main.go` e README. Novo modo `-refresh-customers` atualiza somente os 20 perfis reconhecidos, sem inserts, pedidos novos, consumo de estoque ou avanço de sequências. Colisões/conjunto incompleto são rejeitados. Nomes brasileiros, telefones sintéticos e e-mails reservados @example.test evitam contato com pessoas reais.
- Aplicação no banco demonstrativo solicitada no Markdown, após teste isolado e backup customizado validado por pg_restore --list e leitura integral.
- Backup preservado: `db/backups/before-dashboard-seed-20261123-162457.dump`, 185.393 bytes. SHA-256: `519381ebc47ffec3ffffb336b60a8abfad6665802c57c29bf5f50b2e8a900949`.
- Antes/depois: bd_box em versão 53, dirty=false; mesmos IDs dos 20 clientes. Digest e contagens das 61 tabelas protegidas e dos usuários que não pertencem ao seed permaneceram idênticos. Produtos, variantes, pedidos, itens, preços, estoques, promoções, endereços e snapshots comerciais não foram modificados.
- Nenhuma migration ou contrato HTTP alterado. Os testes visuais usam fixtures isoladas; não equivalem a nova auditoria ponta a ponta de todo o backend.

Processos temporários encerrados e helpers/runtime descartáveis removidos ao finalizar. Preservados os servidores do usuário, os arquivos-fonte de testes, capturas finais, referências e backup.
