# Validação visual e evidências finais

Os resultados históricos e as ressalvas estão no [AUDITORIA_FINAL.md](../../AUDITORIA_FINAL.md). O acervo foi reduzido após revisão de referências; as quantidades históricas de capturas descrevem execuções passadas, não a quantidade atualmente retida.

## Acervo preservado

- `auditoria-2026-11-20/`: Home, conta, modal, catálogo Cama, produto e foco, em desktop e mobile.
- `crud-produtos-2026-11-20/`: edição, variantes, imagens e confirmação em 1440 e 390 px.
- `pedidos-admin-2026-11-21/`: lista/detalhe nas quatro larguras, confirmação/erro/vazio mobile e resultados JSON finais.
- `dashboard-2026-11-21/`: Dashboard nas quatro larguras, filtros/estados mobile e resultado JSON final.
- `clientes-admin-2026-11-21/`: lista/detalhe nas quatro larguras, cliente sem compras/vazio/erro mobile e resultados JSON finais.
- `../capturas/mesa-galerias/`: antes/depois da apresentação objetiva do kit de quatro peças #117.
- `../capturas/decoracao-tapetes/`: antes/depois do enquadramento do tapete #140.

As imagens comerciais, os manifestos de origem e os instaladores permanecem em `backend/demo-assets`, `backend/uploads` e `frontend/public`. Essas pastas não são artefatos de auditoria.

## Reprodução com Playwright

Use Node compatível com o projeto, Playwright disponível no ambiente e Chromium local. Não desative o sandbox do navegador. Execute `npm run build` em `frontend` antes do servidor estático `node frontend/e2e/serve.cjs`, na porta 4206.

Para cenários administrativos, inicie o servidor de testes em outro terminal, a partir de `backend`:

```powershell
$env:CART_TEST_LOCAL='1'
$env:AUDIT_BROWSER='1'
$env:ADMIN_CUSTOMERS_BROWSER='1'
go test ./src/routes -run '^TestBrowserAuditServer$' -count=1 -v -timeout=40m
```

Escolha somente a fixture do cenário: `ADMIN_CUSTOMERS_BROWSER`, `ADMIN_ORDERS_BROWSER`, `PRODUCT_CRUD_BROWSER` ou `DASHBOARD_BROWSER`. Não combine fixtures de módulos diferentes. O servidor cria e remove schema exclusivo, na porta 8086, e compara a integridade do principal. A automação redireciona a API para esse ambiente. Não use pedidos/clientes do principal para testes de gravação.

Se Playwright não estiver disponível, instale-o em um diretório temporário exclusivo do repositório e limpe-o com try/finally, sem alterar package.json/package-lock da aplicação:

```powershell
$workspacePath=(Get-Location).Path
$e2eTools=Join-Path $workspacePath ('.artifacts/e2e-sdk-'+[guid]::NewGuid().ToString('N'))
$previousNodePath=$env:NODE_PATH
try {
  npm install --prefix $e2eTools --no-save --package-lock=false playwright
  if($LASTEXITCODE -ne 0){throw 'Instalação temporária falhou'}
  $env:NODE_PATH=Join-Path $e2eTools 'node_modules'
  node frontend/e2e/admin-customers.cjs
} finally {
  $env:NODE_PATH=$previousNodePath
  $resolvedTools=[IO.Path]::GetFullPath($e2eTools)
  $allowedRoot=[IO.Path]::GetFullPath((Join-Path $workspacePath '.artifacts'))+'\'
  if($resolvedTools.StartsWith($allowedRoot,[StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTools)){
    Remove-Item -LiteralPath $resolvedTools -Recurse -Force
  }
}
```

Com Playwright já disponível, na raiz:

```powershell
node frontend/e2e/admin-customers.cjs
```

Por padrão, capturas intermediárias, uploads de teste e resultados da execução ficam em diretório único dentro de `.artifacts/e2e/` e são removidos ao encerrar o processo. Não redirecione logs para a raiz ou para docs; prefira o console. Quando um log for indispensável para depuração, use `.artifacts/` e apague-o ao encerrar a investigação. Dependências temporárias também devem ficar nessa área e ser removidas após uso.

Para atualizar deliberadamente o conjunto final de evidências, após analisar os resultados:

```powershell
$env:BOX_E2E_KEEP_EVIDENCE='1'
node frontend/e2e/admin-customers.cjs
Remove-Item Env:BOX_E2E_KEEP_EVIDENCE
```

Somente arquivos finais previstos na lista de retenção de cada script são copiados para docs, e apenas quando a execução termina sem falhas. Intermediários e uploads são limpos. Não se cria um novo relatório Markdown por execução. Scripts que não encerram o servidor isolado automaticamente devem ser seguidos pela criação de `backend/audit-browser.stop`; o próprio servidor remove o marcador e o OTP temporário ao encerrar. Encerre somente os processos de teste iniciados por você.

Valide a política sem navegador ou banco:

```powershell
node --test frontend/e2e/artifacts.test.cjs
```

`catalogo.cjs` é uma alternativa de comparação visual via Chrome/CDP e baseline explícita. Por padrão também usa saída temporária limpa. Uma pasta de saída passada como argumento é uma retenção deliberada, administrada pelo operador; mantenha-a dentro do repositório e apenas se necessária. Esse roteiro precisa de uma instância de teste do Chrome com endpoint CDP em 9228.
