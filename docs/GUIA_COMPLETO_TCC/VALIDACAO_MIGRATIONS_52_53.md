# Validação das migrations 52 e 53

## Parecer atualizado — 22/11/2026

**APTA PARA APLICAÇÃO**, quanto aos scripts revisados, após corrigir e revalidar a concorrência do DOWN 53. A implantação foi posteriormente autorizada e concluída: **52 e 53 aplicadas no principal, versão 53, dirty=false**, com backup validado e reinício somente da API. O resultado final está ao fim deste documento.

O parecer anterior era NÃO APTA: havia uma janela entre a consulta do DOWN 53 e o DROP, reproduzida com duas conexões isoladas. A correção descrita abaixo encerrou essa janela sem modificar 52 ou o UP 53.

## Estado principal confirmado somente por leitura

- Banco: bd_box, PostgreSQL 17.4, versão **53, dirty=false**, após implantação autorizada.
- Pedidos existentes: 3; avaliações existentes: 0, conforme revisão precedente.
- installments presente e NULL nos três pedidos históricos; critérios auxiliares nullable e overall obrigatório.
- Na revisão isolada anterior, as 63 tabelas públicas permaneceram idênticas. Na implantação autorizada, as 62 tabelas de dados conservaram conteúdo/contagens e schema_migrations passou legitimamente de 51 para 53.
- Um arquivo UP/DOWN por versão, sem conflito de numeração. Dependências indispensáveis verificadas: pedidos (6), avaliações (45), frete (51).

## Modificações dos scripts

**52 UP:** permite NULL somente em navigation, service e experience, mantendo overall obrigatório e CHECKs entre 1 e 5. Não altera avaliações antigas. **52 DOWN:** recusa restaurar NOT NULL quando há critérios ausentes; caso contrário, restaura a restrição. Arquivos preservados.

**53 UP:** adiciona installments smallint nullable, sem default, e CHECK para cartão 1–6, Pix/boleto 1 ou NULL histórico. Não recalcula totais nem inventa parcelamento para pedidos antigos. Arquivo preservado.

**53 DOWN corrigido:** um único bloco DO adquire `LOCK TABLE checkout_orders IN ACCESS EXCLUSIVE MODE` antes do IF EXISTS. A consulta, a exceção de proteção e os dois ALTER TABLE ficam dentro desse bloco. O bloqueio é mantido até terminar a transação. Se existir qualquer installments não nulo, a exceção impede toda a remoção, preservando coluna, constraint e dados.

Não foram adicionados BEGIN/COMMIT externos nem divisão manual de transações. Um DO é uma instrução atômica do PostgreSQL, inclusive quando executada diretamente, sem transação explícita do chamador. Dentro de transação existente, o bloqueio continua até seu término.

## Compatibilidade com o executor

Confirmado binário local golang-migrate v4.19.1 e inspecionado seu driver PostgreSQL. No modo padrão `x-multi-statement=false`, Run lê o arquivo inteiro e o envia por ExecContext. O DO é compatível com esse caminho e não exige que o executor agrupe instruções separadas. Não ativar o splitter opcional por ponto e vírgula para este arquivo PL/pgSQL; o projeto já utiliza blocos DO em migrations.

Os testes executaram o SQL completo via lib/pq, como o caminho padrão do driver. Não foram executados comandos migrate no principal nem simulada alteração de sua tabela de versão. A compatibilidade do driver foi inspecionada; não foi alegada execução da CLI nesta rodada.

## Testes PostgreSQL isolados

Comando direcionado, dentro do backend, com CART_TEST_LOCAL=1:

```text
go test ./src/routes -run '^TestInstallments(DownConcurrency)?Postgres$' -count=1 -v
```

**Aprovados:** TestInstallmentsDownConcurrencyPostgres, seus quatro subtestes e TestInstallmentsPostgres. Sem suítes completas, Angular, Playwright ou build.

1. Preparação isolada e aplicação de UP 52 seguido de UP 53.
2. DOWN 53 sem parcelas registradas: remove coluna e preserva o total histórico. Reaplicação do UP aprovada.
3. DOWN 53 com seis parcelas: exceção P0001 esperada; coluna, constraint, parcelas e total preservados. Valor inválido continua rejeitado pela constraint e a conexão permanece utilizável.
4. **Escritor primeiro:** B atualiza parcelas em transação; A solicita ACCESS EXCLUSIVE e aguarda, comprovado por pg_locks. Após B confirmar, A vê o plano e recusa o rollback. Nenhuma perda.
5. **Rollback primeiro:** A executa o DOWN e mantém sua transação aberta; B tenta gravar e aguarda RowExclusiveLock, comprovado por pg_locks. Após o commit de A, B recebe erro de coluna inexistente (42703), sem confirmar uma gravação que seria descartada silenciosamente. O UP é reaplicado e mantém o pedido antigo com NULL.
6. Teste existente de parcelamento: valores exatos, idempotência, histórico, cancelamento e recusa de rollback preservados.

A sincronização usa estado real de bloqueios, com prazo limitado, sem presumir concorrência por espera arbitrária. Todos os testes usam schemas checkout_test próprios, removidos pelo helper ao término. Nenhuma escrita é direcionada a public.

Na revisão precedente também passaram UP 52/53, DOWN 53/52 e reaplicação, comparação de registros antigos, avaliação legada sintética, oito combinações válidas e quatro inválidas. Esses resultados são históricos identificados, não uma nova execução integral nesta correção.

## Riscos operacionais mantidos

ACCESS EXCLUSIVE pode aguardar transações longas e bloqueia acesso à tabela durante o rollback. Planejar manutenção com escrita suspensa e backend compatível: depois do DOWN, o backend novo não pode continuar tentando usar installments. O erro 42703 no teste representa essa incompatibilidade esperada, não perda silenciosa de histórico.

Uma recusa protege os dados, mas o golang-migrate ainda pode marcar sua versão como dirty antes de executar SQL. Timeout, interrupção ou exceção exigem diagnóstico; não usar migrate force automaticamente. Esta correção garante atomicidade da operação SQL, não ausência universal de dirty no controle externo do migrador.

A autorização específica foi recebida, e o backup e a aplicação ordenada foram verificados. A restrição de implantação sem autorização continua válida para mudanças futuras. Nenhuma mudança de 52, UP 53, contratos, preços, estoque ou histórico foi necessária.

## Arquivos alterados e identificação

- backend/migrations/000053_checkout_installments.down.sql: bloqueio antecipado e DDL no mesmo DO.
- backend/src/routes/installments_down_test.go: regressão isolada e duas ordens concorrentes.
- Este documento: parecer atualizado e evidências.

SHA-256 dos scripts atuais:

- `000052_purchase_review_optional_criteria.down.sql`: `85bf45c24da37158505e41f580c52391b33b9dec714fef18c9a3c66f289e8b7f`.
- `000052_purchase_review_optional_criteria.up.sql`: `fe4572d3f889631b2132d007613bc6df02e34b5ab028968397b5bf320eed0fea`.
- `000053_checkout_installments.down.sql`: `b99c116db06e45301c19f1cc8b92a4e6e62b23fc28aaae8d9217d1aa3e0a8021`.
- `000053_checkout_installments.up.sql`: `45a263de1d568c06dc72fba884e21dfef047bdfd0c14b42bcef53ba58c28caf9`.

## Implantação concluída — 22/11/2026

**Resultado final: bd_box na versão 53, dirty=false; backend atualizado na porta 8080.** Aplicadas exclusivamente 52 UP e 53 UP, com autorização explícita. Não foram usados force, down, restauração automática ou migrations posteriores.

### Preparação e backup reutilizado

O erro inicial do backup era search_path indevidamente colocado na URI libpq. A conexão de pg_dump foi construída a partir dos campos da configuração, com sslmode e connect_timeout, sem search_path; senha somente no ambiente do processo filho. .env e configurações permanentes não foram alterados, e nenhuma credencial foi registrada.

Backup completo customizado já validado, **reutilizado sem gerar outro**:

- Caminho: `C:\Users\vitor\Documents\Box-Enxovais-tcc\db\backups\bd_box_pre_migrations_52_53_20261122_023002.dump`.
- Tamanho reconfirmado: **181585 bytes**.
- SHA-256 reconfirmado: `abb2ce94f8c3c773d45ffbd20f8f0fd4f2137df8a0b4eb9537321bbbabd348f8`.
- Validação anterior: pg_dump -Fc com saída 0, pg_restore --list aprovado e leitura integral com pg_restore --file=- aprovada, sem restaurar o principal.
- Preservado em db/backups, fora da área pública HTTP e ignorado pelo Git.

### Fonte do migrador validada antes de conectar ao principal

Executável: C:/Users/vitor/go/bin/migrate.exe. `-version` informa dev; os metadados go version -m identificam **golang-migrate v4.19.1**. O diretório da aplicação é C:/Users/vitor/Documents/Box-Enxovais-tcc/backend, com migrations na subpasta migrations; o diretório inicial do terminal era o workspace Box-Enxovais-v1, por isso não foi usado implicitamente.

O driver file da mesma versão foi aberto sem conexão com banco para localizar e ler os UP 52/53. A forma file:///C:/... não foi aceita por esse driver no Windows. A forma opaca **file:C:/Users/vitor/Documents/Box-Enxovais-tcc/backend/migrations** foi aceita e leu ambos os arquivos. Foi utilizada essa fonte explicitamente com -source, barras normalizadas e argumentos estruturados; não foi repetido o -path Windows que falhara. O teste auxiliar de fonte não modificou dependências ou código da aplicação.

### Aplicação e integridade

| Etapa | Confirmação |
|---|---|
| Antes de aplicar | bd_box 51, dirty=false; backup íntegro; hashes aprovados dos dois UP conferidos |
| Primeiro comando limitado a up 1 | Migration 52 aplicada; versão 52, dirty=false; dados/contagens inalterados |
| Segundo comando limitado a up 1 | Migration 53 aplicada; versão 53, dirty=false; dados/contagens inalterados |
| Conferência final após reinício | Versão 53 limpa; três pedidos preservados; nenhuma compra ou avaliação de teste criada |

Contagens e hashes das **62 tabelas públicas de dados** comparados ao baseline anterior ao backup: idênticos. Para pedidos, o hash compara todos os campos anteriores excluindo somente a nova chave installments, e essa chave foi verificada separadamente: **NULL nos três pedidos históricos**. Não houve mudança em valores, descontos, frete, estoque, produtos, clientes, campanhas ou vínculos. A 63ª tabela pública é schema_migrations, cuja mudança de versão era esperada e foi confirmada separadamente.

Estrutura final: navigation/service/experience aceitam NULL; overall continua obrigatório; installments existe com CHECK checkout_order_installments_valid para cartão 1–6, Pix/boleto 1 e NULL histórico. Os arquivos SQL permaneceram iguais aos aprovados.

### Backend e HTTP

Compilação concluída **antes** de interromper o servidor anterior, usando Go 1.26.11. Binário ativo: db/runtime/migrations52-53-20261122/backend.exe; executável anterior preservado como backend-anterior.exe no mesmo diretório. Somente o processo da API 8080 foi substituído: PID anterior 25468, novo PID 10088. Inicialização registrada sem erro em backend.stderr.log; logs ativos preservados nesse diretório ignorado pelo Git.

Frontend 4200 preservado, mesmo PID 34692; demais processos não foram reiniciados. Verificações somente leitura:

| Requisição | HTTP |
|---|---|
| GET localhost:8080/products | 200 |
| GET localhost:8080/home/reviews | 200 |
| GET localhost:8080/shipping/quote?cep=87502100 | 200 |
| GET localhost:8080/admin/products sem sessão | 401 esperado |
| GET localhost:4200 | 200 |

Não foram executados Playwright, auditoria geral, refatoração ou testes completos. O backend permanece em execução para uso da aplicação; não há servidor temporário de testes aberto. Auxiliares operacionais descartáveis foram removidos após consolidar este resultado; backup, binários e logs ativos preservados. **Implantação autorizada concluída, sem pendências operacionais desta etapa.**
