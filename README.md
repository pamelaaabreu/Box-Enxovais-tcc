# Box Enxovais — arquitetura do projeto

E-commerce desenvolvido como evolução de um projeto de TCC. O repositório reúne uma aplicação Angular, uma API HTTP em Go e um banco PostgreSQL. Atualmente, os fluxos mais completos são autenticação, administração de produtos e promoções, upload de imagens e newsletter; catálogo, carrinho, checkout e relatórios ainda estão parciais.

## Visão geral

```mermaid
flowchart LR
    U[Usuário no navegador] -->|SPA / SSR| F[Frontend Angular 19]
    F -->|HTTP + JSON / Bearer JWT| API[API Go :8080]
    API -->|database/sql + lib/pq| DB[(PostgreSQL)]
    API -->|leitura e gravação| FS[(backend/uploads)]
    API -->|SMTP| SMTP[Servidor de e-mail]
    API -->|API HTTP| SG[SendGrid]
```

O frontend roda por padrão em `http://localhost:4200` e consome o backend em `http://localhost:8080`. A API permite CORS apenas para essa origem e publica `backend/uploads` em `/uploads/`.

## Tecnologias

| Camada | Tecnologias principais |
| --- | --- |
| Frontend | Angular 19, TypeScript 5.7, RxJS, Router, Bootstrap 5, SweetAlert2, Lucide e ngx-mask |
| Backend | Go 1.24, `net/http`, `database/sql` e PostgreSQL/lib/pq |
| Segurança | JWT HS256, bcrypt, guards Angular e middlewares de autenticação/autorização |
| Integrações | SendGrid para newsletter e SMTP/Gomail para recuperação de senha |
| Banco | PostgreSQL e migrações com golang-migrate |

Gorilla Mux consta no `go.mod`, mas o roteamento atual utiliza `http.ServeMux`.

## Organização do repositório

```text
Box-Enxovais-v1/
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

- `/admin/dashboard`
- `/admin/products` e `/admin/products/manage`
- `/admin/promotions/create` e `/admin/promotions/add-product`
- `/admin/reports`
- `/product-register`, `/image-upload/:id`, `/promotion-register` e `/add-to-promotion` são atalhos standalone também protegidos.

O token, nome, e-mail e role ficam no `sessionStorage`. O interceptor inclui `Authorization: Bearer <token>` nas requisições. O guard melhora a navegação, mas a autorização efetiva permanece no backend.

### Serviços e estado

- `AuthService`: cadastro, login, logout e recuperação de senha.
- `ProductService`: criação e consulta individual; a vitrine agrega IDs fixos com `forkJoin`.
- `PromoService`: criação, associação de produtos e consulta por nome.
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
| `POST` | `/api/newsletter/subscribe` | Público | Envia cupom via SendGrid e persiste assinante |
| `GET` | `/products/{id}` | Público | Retorna produto e imagens |
| `GET` | `/api/promotions/{nome}` | Público | Lista produtos de uma promoção ativa |
| `POST` | `/products` | Admin | Cria produto |
| `POST` | `/upload-image` | Admin | Salva imagem e associa ao produto |
| `POST` | `/api/promotions/create` | Admin | Cria promoção |
| `POST` | `/api/promotions/add` | Admin | Associa produto e preço promocional |
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
- credenciais SMTP e/ou SendGrid para testar e-mails

### Ambiente do backend

Crie `backend/.env` sem versioná-lo:

```dotenv
DB_HOST=...
DB_PORT=5432
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=uma-chave-longa-e-aleatoria
SENDGRID_API_KEY=...
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

Os testes Go cobrem validação de cadastro, método HTTP e autorização administrativa. A cobertura dos fluxos de negócio e do frontend ainda é limitada.

## Limitações e decisões pendentes

- URLs da API, CORS, portas e infraestrutura estão fixos para desenvolvimento local.
- A aplicação não usa a mesma `DATABASE_URL` das migrações e contém credenciais no código.
- Códigos de recuperação ficam em um `map` sem sincronização; reinícios os apagam e múltiplas instâncias não compartilham estado.
- O código de recuperação válido não é removido após uso.
- Uploads ficam no filesystem local, sem validação explícita de MIME/extensão e sem storage externo.
- Vários handlers acessam `db.DB` diretamente; somente usuários têm uma camada inicial de repositório.
- Respostas de erro alternam entre `APIResponse`, `ErrorResponse` e `http.Error`.
- Não há listagem, edição ou remoção de produtos, paginação ou filtros de catálogo.
- IDs de destaque e nomes de promoções estão fixos no frontend.
- Links de categorias, produto, conta e pedidos não possuem rotas correspondentes.
- Carrinho, checkout, dashboard e relatórios não têm regras completas.
- Não há containers, CI/CD, observabilidade ou configuração de deploy.

## Próximos passos recomendados

1. Externalizar banco, CORS, portas e URLs por ambiente.
2. Remover segredos do histórico, trocar credenciais e usar um secret manager.
3. Persistir códigos de recuperação no PostgreSQL, com uso único e expiração transacional.
4. Padronizar respostas, validação, logging e camadas de serviço/repositório.
5. Criar catálogo e concluir carrinho, checkout, pedidos e administração.
6. Migrar uploads para object storage.
7. Ampliar testes de integração, componentes e fluxos e2e.
