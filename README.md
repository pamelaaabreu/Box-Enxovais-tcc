# Box Enxovais — arquitetura do projeto

E-commerce desenvolvido como evolução de um projeto de TCC. O repositório reúne uma aplicação Angular, uma API HTTP em Go e um banco PostgreSQL. Os fluxos implementados incluem autenticação, catálogo, favoritos, carrinho, checkout demonstrativo, administração de produtos/promoções/pedidos e consulta administrativa de clientes. Resultados, limites e evidências estão em [AUDITORIA_FINAL.md](AUDITORIA_FINAL.md).

O [guia completo para a defesa do TCC](docs/GUIA_COMPLETO_TCC/README.md) explica arquitetura, fluxos, segurança e testes. As migrations 52 e 53 permanecem pendentes de aplicação autorizada no banco principal.

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
│       ├── components/         # navegação, rodapé e área administrativa
│       ├── core/               # autenticação, guards, interceptor e serviços HTTP
│       ├── features/           # páginas e funcionalidades de negócio
│       └── shared/             # modelos, validações, alertas e UI reutilizável
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

| Caminho | Responsabilidade |
| --- | --- |
| `/home` | Home composta por navegação, carrossel, produtos, categorias, depoimentos, promoções e newsletter |
| `/register` e `/login` | Cadastro e autenticação |
| `/forgot-password` | Solicitação do código de recuperação |
| `/reset-password` | Validação do código e nova senha |
| `/404` | Recurso não encontrado |

Rotas administrativas usam `AdminGuard`, que decodifica o JWT, verifica expiração e exige role `admin`:

- `/admin/dashboard` e `/admin/metrics` (indicadores e gráficos com filtro de período)
- `/admin/products` e `/admin/products/manage`
- `/admin/promotions`, `/admin/promotions/new` e `/admin/promotions/:id/edit`
- `/admin/orders` e `/admin/orders/:id`
- `/admin/customers` e `/admin/customers/:id` (somente consulta)
- `/admin/reports`
- `/product-register`, `/image-upload/:id`, `/promotion-register` e `/add-to-promotion` são atalhos standalone também protegidos.

O token, nome, e-mail e role ficam no `sessionStorage`. O interceptor inclui `Authorization: Bearer <token>` nas requisições. O guard melhora a navegação, mas a autorização efetiva permanece no backend.

### Serviços e estado

- `AuthService`: cadastro, login, logout e recuperação de senha.
- `ProductService`: cadastro, edição, variantes, imagens e exclusão/arquivamento seguro; listagens utilizam filtros e paginação do backend.
- `PromoService`: campanhas, participantes por nome/SKU, imagens e descontos.
- `UploadService`: envio multipart de imagens.
- `SweetAlertService` e `CustomAlertService`: feedback visual.

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

Rotas públicas passam pelo middleware de método. Rotas administrativas passam pela validação do método, autenticação JWT e autorização de administrador.

### API atual

| Método | Endpoint | Acesso | Função |
| --- | --- | --- | --- |
| `POST` | `/register` | Público | Cria cliente com senha bcrypt |
| `POST` | `/login` | Público | Autentica e emite JWT válido por 2 horas |
| `POST` | `/send-reset-token` | Público | Envia código de recuperação por SMTP |
| `POST` | `/reset-password` | Público | Valida código e troca a senha |
| `POST` | `/api/newsletter/subscribe` | Público | Envia confirmação por SMTP e persiste assinante, sem cupom não configurado |
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

Existe um handler para `GET /validate-reset-token/{token}`, porém ele não está registrado. O frontend usa hoje o fluxo de código enviado por e-mail, e não o schema `password_resets` baseado em link.

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

- Node.js compatível com Angular 19 e npm
- Go 1.24
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
$migrationSource = "file://$((Resolve-Path migrations).Path.Replace('\', '/'))"
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
npm install
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

- URLs da API e configuração de desenvolvimento permanecem locais.
- Checkout e dados comerciais do catálogo são demonstrativos para o TCC; não representam cobrança real.
- Pedidos antigos não registram detalhamento separado de frete/desconto nem acompanhamento de envio/entrega.
- Clientes administrativos são somente consulta. Relatórios ainda possui escopo pendente descrito na auditoria; Dashboard/Métricas utiliza indicadores e gráficos reais com filtros de período.
- Kits de capas com estoque compartilhado precisam de modelagem de componentes antes da publicação.
- SMTP depende das credenciais do ambiente. Testes com envio controlado não comprovam entrega real.
- Deploy e observabilidade não foram revalidados durante a limpeza documental.

As migrations e os manifestos estruturados são a referência dos dados demonstrativos. Contratos permanentes ficam em docs; relatórios de etapas concluídas foram consolidados no AUDITORIA_FINAL.md. Artefatos intermediários usam `.artifacts/`, com retenção explícita das evidências finais.
