# Box Enxovais — arquitetura do projeto

E-commerce desenvolvido como evolução de um projeto de TCC. O repositório reúne uma aplicação Angular, uma API HTTP em Go e um banco PostgreSQL. Os fluxos implementados incluem autenticação, catálogo, favoritos, carrinho, checkout demonstrativo, administração de produtos/promoções/pedidos e consulta administrativa de clientes. Resultados, limites e evidências estão em [AUDITORIA_FINAL.md](AUDITORIA_FINAL.md).

O [guia completo para a defesa do TCC](docs/GUIA_COMPLETO_TCC/README.md) explica arquitetura, fluxos, segurança e testes. Estado confirmado nesta auditoria: principal em 54, dirty=false; migration 55 presente no código e não aplicada. Resultados de implantação 52/53 permanecem no guia histórico.

## Visão geral

```mermaid
flowchart LR
    U[Usuário no navegador] -->|SPA| F[Frontend Angular 19]
    F -->|HTTP + JSON / Bearer JWT| API[API Go :8080]
    API -->|database/sql + lib/pq| DB[(PostgreSQL)]
    API -->|leitura e gravação| FS[(backend/uploads)]
    API -->|SMTP| SMTP[Servidor de e-mail]
```

O frontend roda por padrão em `http://localhost:4200` e consome o backend em `http://localhost:8080`. A API permite CORS apenas para essa origem e publica `backend/uploads` em `/uploads/`.

## Tecnologias

| Camada | Tecnologias principais |
| --- | --- |
| Frontend | Angular 19, TypeScript 5.7, RxJS, Router, Bootstrap 5, SweetAlert2, Lucide e ngx-mask |
| Backend | Go 1.26.11, `net/http`, `database/sql` e PostgreSQL/lib/pq |
| Segurança | JWT HS256, bcrypt, guards Angular e middlewares de autenticação/autorização |
| Integrações | SMTP/Gomail para newsletter e recuperação de senha |
| Banco | PostgreSQL e migrações com golang-migrate |

O roteamento atual utiliza `http.ServeMux` da biblioteca padrão. O build ativo do Angular é de navegador; SSR não está habilitado.

## Organização do repositório

```text
Box-Enxovais-tcc/
├── frontend/
│   ├── public/                 # imagens e arquivos estáticos
│   └── src/app/
│       ├── core/               # autenticação, guards, interceptor e serviços HTTP
│       ├── features/           # públicas, autenticação e admin standalone
│       └── shared/             # types, forms, validações e UI reutilizável
├── backend/
│   ├── src/
│   │   ├── config/               # configuração da aplicação
│   │   ├── db/                   # conexão PostgreSQL
│   │   ├── handlers/             # controladores HTTP
│   │   ├── middleware/           # autenticação e autorização
│   │   ├── models/               # contratos e modelos
│   │   ├── pagination/           # paginação e filtros
│   │   ├── repositories/         # acesso a dados
│   │   ├── response/             # respostas HTTP
│   │   ├── routes/               # rotas da API
│   │   ├── services/             # regras da aplicação e emails
│   │   ├── templates/            # templates e imagens de email
│   │   └── main.go               # inicialização da API
│   ├── migrations/               # evolução versionada do schema
│   ├── uploads/                  # imagens de produtos em disco local
│   ├── go.mod                    # módulo Go
│   └── go.sum
└── README.md
```

## Frontend

A aplicação é formada majoritariamente por componentes standalone carregados de forma lazy. `app.config.ts` registra roteamento, cliente HTTP com `fetch`, interceptor JWT, animações, máscaras, ícones e restauração da sessão.

### Rotas

| Caminho canônico | Responsabilidade |
| --- | --- |
| `/inicio` | Home, catálogo em destaque, campanhas e newsletter |
| `/cadastro`, `/login` | AuthComponent compartilhado |
| `/recuperar-senha`, `/verificar-codigo`, `/redefinir-senha` | Recuperação por código e autorização temporária |
| `/minha-conta` (inclui Minhas avaliações), `/meus-pedidos` | Área autenticada |
| `/carrinho`, `/favoritos`, `/finalizar-compra` | Compra |
| `/admin/dashboard` | Indicadores e seis gráficos ECharts |
| `/admin/produtos` | Listagem, criação, edição, imagens e variantes |
| `/admin/pedidos`, `/admin/clientes`, `/admin/relatorios` | Gestão e consulta |
| `/admin/promocoes`, `/admin/cadastros` | Campanhas, categorias, marcas e faixas de CEP |

Rotas antigas em inglês e atalhos administrativos foram preservados como aliases. `/admin/metrics` redireciona para Dashboard. AdminGuard exige sessão válida e perfil admin; autorização efetiva permanece no Go. JWT em sessionStorage é enviado somente para a origem/prefixo da API configurada, não a serviços externos.

### Serviços e estado

- `AuthService`: cadastro, login, logout e recuperação de senha.
- `ProductService`: cadastro, edição, variantes, imagens e exclusão/arquivamento seguro; listagens utilizam filtros e paginação do backend.
- `PromotionService`: campanhas, participantes por nome/SKU, imagens e descontos.
- `UploadService`: envio multipart de imagens.
- `ConfirmDialogService`: confirmações acessíveis; `CustomAlertService`: feedback global. SweetAlertService permanece como candidato de revisão, sem remoção automática.

Não há store global: o estado fica nos componentes, em serviços singleton e no `sessionStorage`.

## Backend

`src/main.go` carrega `.env`, inicializa o banco, registra as rotas, expõe uploads e inicia `net/http` na porta `8080`.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant M as Middlewares
    participant H as Handler
    participant D as PostgreSQL
    F->>M: HTTP + Bearer JWT
    M->>M: valida método, assinatura, issuer, expiração e role
    M->>H: request com userID e role no context
    H->>D: SQL parametrizado
    D-->>H: resultado
    H-->>F: JSON + status HTTP
```

ServeMux registra método/caminho nativamente. Rotas administrativas passam por autenticação JWT e autorização; guardas de método em handlers preservam usos diretos quando necessários.

### API atual

| Método | Endpoint | Acesso | Função |
| --- | --- | --- | --- |
| `POST` | `/register` | Público | Cria cliente com senha bcrypt |
| `POST` | `/login` | Público | Autentica e emite JWT válido por 2 horas |
| `POST` | `/send-reset-token` | Público | Envia código de recuperação por SMTP |
| `POST` | `/reset-password` | Público | Valida código e troca a senha |
| `POST` | `/api/newsletter/subscribe` | Público | Persiste idempotentemente e tenta confirmação SMTP; resposta neutra e recuperação limitada |
| `GET` | `/products/{id}` | Público | Retorna produto e imagens |
| `GET` | `/api/promotions/{nome}` | Público | Lista produtos de uma promoção ativa |
| `POST` | `/products` | Admin | Cria produto |
| `POST` | `/upload-image` | Admin | Salva imagem e associa ao produto |
| `POST` | `/api/promotions/create` | Admin | Cria promoção |
| `POST` | `/api/promotions/add` | Admin | Associa produto e preço promocional |
| `GET` | `/admin/customers`, `/admin/customers/{id}`, `/admin/customers/{id}/orders` | Admin | Consulta de clientes, endereços e histórico |
| `GET` | `/admin/orders`, `/admin/orders/{id}` | Admin | Pedidos históricos paginados |
| `POST` | `/admin/orders/{id}/cancel` | Admin | Cancelamento transacional com reposição |
| `GET` | `/uploads/{arquivo}` | Público | Entrega imagem local |

Recuperação utiliza os endpoints POST /send-reset-token, /validate-reset-code, /validate-reset-token e /reset-password; consulte routes/auth.go para o contrato atual. Não se presume um fluxo GET por link.

## Banco de dados

- `000001_initial_schema`: usuários, redefinições de senha, marcas, tipos, produtos, imagens, assinantes, promoções e associação promoção-produto.
- `000002_simplify_customer_registration`: torna data de nascimento e documento opcionais e restringe roles a `customer` ou `admin`.

```mermaid
erDiagram
    USERS ||--o| PASSWORD_RESETS : possui
    BRANDS ||--o{ PRODUCTS : classifica
    PRODUCT_TYPES ||--o{ PRODUCTS : classifica
    PRODUCTS ||--o{ PRODUCT_IMAGES : possui
    PRODUCTS ||--o{ PROMOTION_PRODUCTS : participa
    PROMOTIONS ||--o{ PROMOTION_PRODUCTS : contem
```

Consulte `backend/migrations/README.md` antes de aplicar migrações, especialmente em uma base `bd_box` existente.

## Configuração local

### Pré-requisitos

- Node.js 22.23.5 (frontend/.nvmrc) e npm
- Go 1.26.11
- PostgreSQL
- golang-migrate
- credenciais SMTP para testar e-mails

### Ambiente do backend

Crie `backend/.env` sem versioná-lo:

```dotenv
DB_HOST=...
DB_PORT=5432
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=uma-chave-longa-e-aleatoria
EMAIL=...
EMAIL_KEY=...
EMAIL_SMTP=...
```

As migrações também esperam `DATABASE_URL`:

```powershell
$env:DATABASE_URL = "postgres://usuario:senha@localhost:5432/bd_box?sslmode=disable"
```

`backend/src/db/conn.go` usa os campos obrigatórios `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` do `.env`.

### Criar o banco

A partir de `backend/`, em uma base nova:

```powershell
$migrationSource = "file:$((Resolve-Path migrations).Path.Replace('\', '/'))"
migrate -source $migrationSource -database $env:DATABASE_URL up
```

Para uma base existente, siga o baseline descrito em `backend/migrations/README.md`.

### Executar

Os caminhos de uploads e templates são relativos, portanto inicie a API em `backend/`:

```powershell
cd backend
go mod download
go run ./src
```

Em outro terminal:

```powershell
cd frontend
npm ci
npm start
```

Acesse `http://localhost:4200`.

## Testes e build

```powershell
cd backend
go test ./src/...

cd ../frontend
npm test
npm run build
```

Os testes incluem Angular, HTTP/Go, integração PostgreSQL em schemas isolados e Playwright. Consulte [o roteiro de validação](docs/validacao-visual/README.md). Testes que escrevem dados não devem utilizar o schema principal.

## Limitações e decisões pendentes

- API_BASE_URL centraliza a URL da API; o valor padrão é localhost:8080. Produção precisa configurar origem/API e HTTPS.
- Checkout e dados comerciais do catálogo são demonstrativos para o TCC; não representam cobrança real.
- Pedidos antigos não registram detalhamento separado de frete/desconto nem acompanhamento de envio/entrega.
- Clientes administrativos são somente consulta. Dashboard é a página única de indicadores; a rota antiga de Métricas redireciona para ela. Relatórios oferece vendas, produtos, clientes e estoque; CSV apenas onde implementado.
- Kits de capas com estoque compartilhado precisam de modelagem de componentes antes da publicação.
- SMTP depende das credenciais do ambiente. Testes com envio controlado não comprovam entrega real.
- Deploy e observabilidade não foram revalidados durante a limpeza documental.

As migrations e os manifestos estruturados são a referência dos dados demonstrativos. Contratos permanentes ficam em docs; relatórios de etapas concluídas foram consolidados no AUDITORIA_FINAL.md. Artefatos intermediários usam `.artifacts/`, com retenção explícita das evidências finais.

## Arquitetura e manutenção atuais

Veja [estrutura Angular](docs/ESTRUTURA_ANGULAR.md): componentes standalone, types por domínio, Reactive Forms e HTTP em services. `API_BASE_URL` está em core/config; `AssetUrlService` resolve imagens. O interceptor limita credenciais à origem/prefixo da API. Login/cadastro compartilham AuthComponent em features/authentication/auth.

Navegação: /inicio, /login, /cadastro, /minha-conta, /carrinho, /favoritos, /finalizar-compra e /admin/{dashboard,produtos,pedidos,clientes,relatorios,promocoes,cadastros}. Aliases antigos preservados. Os endpoints da API continuam em inglês; navegação e HTTP são contratos distintos.

Configuração adicional Go: DB_SSLMODE, DB_CONNECT_TIMEOUT, HTTP_ADDR, CORS_ORIGIN, UPLOAD_DIR e HTTP_*_TIMEOUT. Não remova opções válidas da conexão; pg_dump não aceita search_path como parâmetro URI. Nunca imprima credenciais. O exemplo de migrate é exclusivamente para base nova autorizada, não para aplicar todas as pendentes no principal.

Newsletter preserva idempotência e resposta neutra; falha SMTP após persistência pode ser recuperada pela fila limitada em memória (três tentativas totais). Reinício perde pendências; não existe outbox durável. Avaliações de produto são separadas de avaliações da compra, com propriedade, elegibilidade e moderação no backend.

Para encerrar aplicação local, use Ctrl+C nos terminais que você abriu. Automações devem guardar PID, encerrar apenas seus processos e limpar artefatos após consolidar evidências. Testes de escrita nunca apontam ao bd_box. Para race use CGO e compilador C compatível apenas no ambiente do processo; para integrações use CART_TEST_DATABASE_URL e REVIEW_TEST_DATABASE_URL de banco descartável.

Resultados atuais: 433 Angular; Go normal/race com PostgreSQL isolado, vet e build aprovados. Build Angular aprovado; CSS de Promoções reduzido para13,81kB, abaixo do aviso14kB, sem ampliar budgets. E2E, acessibilidade verificada e inspeção visual têm evidências/limites separados no AUDITORIA_FINAL.md.
