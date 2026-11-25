# Box Enxovais — instalação e execução local

Consulte [README.md](README.md) para arquitetura, contratos e limitações. Requisitos: Node 22.23.5 (frontend/.nvmrc), npm, Go 1.26.11 e PostgreSQL. SMTP é necessário apenas para entregas reais de e-mail.

1. Em `frontend`, execute `npm ci`.
2. Em `backend`, execute `go mod download` e configure `.env` privado: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME e JWT_SECRET. SMTP usa EMAIL, EMAIL_KEY e EMAIL_SMTP. Não publique credenciais.
3. Prepare uma base local própria com as migrations autorizadas. Não execute migrations automaticamente no bd_box. O código inclui migrations até 55; a última versão confirmada do principal nesta auditoria é 54, dirty=false, e a 55 não foi aplicada.
4. Terminal da API: em `backend`, `go run ./src`.
5. Outro terminal: em `frontend`, `npm start`.
6. Abra http://localhost:4200. A API usa a porta 8080 por padrão.

Ao terminar, pressione Ctrl+C em cada terminal iniciado por você. Não mate processos de outros terminais para liberar portas sem identificar seu proprietário.

Verificações: em frontend, `npx ng test --watch=false --browsers=ChromeHeadless` e `npm run build`; em backend, `go test ./...` e `go vet ./...`. Testes PostgreSQL e Playwright exigem ambiente isolado; veja [testes](docs/GUIA_COMPLETO_TCC/07_TESTES_E_QUALIDADE.md).

Pagamentos e fretes são demonstrativos para o TCC. Fotografias em backend/uploads precisam de backup junto ao banco; Git não substitui esse backup. Não se incluem senhas/contas de clientes neste guia.
