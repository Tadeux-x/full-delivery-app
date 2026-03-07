# 🍔 Comanda Digital — Sistema para Dark Kitchen

Sistema completo de gestão para Dark Kitchens com cardápio público, gestão de pedidos, fichas técnicas e controle de estoque.

---

## 📁 Estrutura do Projeto

```
comanda-digital/
├── backend/                         # Spring Boot 3.x
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/comandadigital/
│       │   ├── ComandaDigitalApplication.java
│       │   ├── config/
│       │   │   ├── SecurityConfig.java      # Spring Security + CORS
│       │   │   └── OpenApiConfig.java       # Swagger / SpringDoc
│       │   ├── controller/
│       │   │   ├── AuthController.java      # POST /auth/login
│       │   │   ├── CardapioController.java  # GET /cardapio (público)
│       │   │   ├── PedidoController.java    # CRUD + fluxo de status
│       │   │   ├── FichaTecnicaController.java
│       │   │   ├── EstoqueController.java
│       │   │   └── DashboardController.java
│       │   ├── service/
│       │   │   ├── PedidoService.java       # ⭐ Fluxo completo + baixa estoque
│       │   │   ├── FichaTecnicaService.java # ⭐ Cálculo custo via fórmula
│       │   │   ├── EstoqueService.java
│       │   │   └── DashboardService.java
│       │   ├── repository/           # Spring Data JPA interfaces
│       │   ├── model/                # Entities JPA
│       │   │   ├── enums/            # StatusPedido, FormaPagamento, etc.
│       │   │   ├── Usuario.java
│       │   │   ├── Prato.java
│       │   │   ├── FichaTecnica.java
│       │   │   ├── Pedido.java
│       │   │   ├── ItemPedido.java
│       │   │   └── MovimentacaoEstoque.java
│       │   ├── dto/
│       │   │   ├── request/          # Records de entrada validados com Jakarta
│       │   │   └── response/         # Records de saída (sem senha)
│       │   ├── security/
│       │   │   ├── JwtService.java          # Geração e validação JWT
│       │   │   └── JwtAuthenticationFilter.java
│       │   └── exception/
│       │       ├── GlobalExceptionHandler.java  # @RestControllerAdvice
│       │       ├── RecursoNaoEncontradoException.java
│       │       ├── RegraDeNegocioException.java
│       │       └── EstoqueInsuficienteException.java
│       └── resources/
│           ├── application.yml
│           └── db/migration/
│               ├── V1__create_tables.sql    # Schema completo
│               └── V2__seed_data.sql        # Dados iniciais
│
└── frontend/                         # Angular 17+
    └── src/app/
        ├── core/
        │   ├── guards/auth.guard.ts          # authGuard + adminGuard
        │   ├── interceptors/jwt.interceptor.ts  # Bearer token automático
        │   ├── models/                       # Interfaces TypeScript
        │   └── services/
        │       ├── auth.service.ts
        │       ├── cardapio.service.ts
        │       ├── carrinho.service.ts       # Signal-based state
        │       └── pedido.service.ts
        ├── modules/
        │   ├── cliente/
        │   │   ├── cardapio/         # ⭐ Cardápio público com busca e filtros
        │   │   ├── carrinho/         # Carrinho de compras
        │   │   └── checkout/         # ⭐ Reactive Forms + steps de checkout
        │   └── admin/
        │       ├── dashboard/        # ⭐ KPIs + Chart.js
        │       ├── pedidos/          # ⭐ Kanban da cozinha (auto-refresh)
        │       ├── fichatecnica/     # Formulário de ficha técnica
        │       └── estoque/          # Controle de ingredientes
        ├── app.config.ts
        └── app.routes.ts             # Lazy loading + guards
```

---

## 🏗️ Arquitetura & Decisões Técnicas

### Backend (Spring Boot 3 / Java 17+)

| Camada      | Responsabilidade                                     |
|-------------|------------------------------------------------------|
| Controller  | Recebe requisições HTTP, valida DTOs, delega ao Service |
| Service     | **Toda a lógica de negócio** — cálculos, validações, orquestração |
| Repository  | Acesso a dados via Spring Data JPA |
| Model/Entity| Mapeamento JPA das tabelas |
| DTO         | Records Java imutáveis — entrada (request) e saída (response) |
| Security    | JWT stateless via `JwtAuthenticationFilter` |
| Exception   | `GlobalExceptionHandler` centralizado com `@RestControllerAdvice` |

### Frontend (Angular 17+)

| Recurso                  | Uso                                               |
|--------------------------|---------------------------------------------------|
| Signals                  | Estado reativo do carrinho e dados do dashboard   |
| Reactive Forms           | Checkout em múltiplos steps com validação dinâmica|
| HttpInterceptor          | Injeção automática do Bearer token JWT            |
| Route Guards             | `authGuard` (login) e `adminGuard` (ROLE_ADMIN)   |
| Lazy Loading             | Módulos carregados sob demanda via `loadComponent`|
| Chart.js                 | Gráficos no dashboard administrativo              |

---

## 🔢 Fórmula de Custo — Ficha Técnica

```
Custo por item = (quantidade × fator_correcao × custo_unitario_ingrediente) / rendimento

Custo total do prato = Σ(custo por item) para todos os ingredientes
```

**Exemplos de Fatores:**
- `fator_correcao = 1.10` → 10% de perda no pré-preparo (cascas, aparas)
- `rendimento = 0.95` → 5% de perda durante o cozimento

---

## 🔄 Fluxo de Status do Pedido

```
RECEBIDO → CONFIRMADO → EM_PREPARO → PRONTO → SAIU_ENTREGA → ENTREGUE
                ↑
    [Baixa automática no estoque]
                                                   ↓
                                              CANCELADO (soft cancel + estorno de estoque)
```

---

## 🚀 Setup Rápido

### Pré-requisitos
- Java 17+, Maven 3.9+
- MySQL 8.0+
- Node.js 20+, Angular CLI 17+

### Backend
```bash
# 1. Crie o banco de dados
mysql -u root -p -e "CREATE DATABASE comanda_digital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Configure as variáveis (ou edite application.yml)
export DB_USERNAME=root
export DB_PASSWORD=sua_senha
export JWT_SECRET=sua_chave_secreta_muito_longa

# 3. Execute — Flyway roda as migrations automaticamente
cd backend
mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm install chart.js @angular/material

# Inicie o servidor de desenvolvimento
ng serve --open
```

### Acessos
| URL | Descrição |
|-----|-----------|
| `http://localhost:4200/cardapio` | Cardápio público |
| `http://localhost:4200/admin/dashboard` | Painel admin |
| `http://localhost:8080/api/v1/swagger-ui.html` | Swagger UI |

### Credenciais de teste
| Email | Senha | Perfil |
|-------|-------|--------|
| `admin@comandadigital.com` | `Admin@123` | ADMIN |
| `cozinha@comandadigital.com` | `Admin@123` | COZINHA |

---

## 🛡️ Segurança

- Senhas criptografadas com **BCrypt (cost factor 12)**
- JWT com expiração de **24h**, assinado com HMAC-SHA256
- Senhas **nunca expostas** em respostas JSON (DTOs não incluem o campo)
- CORS configurado apenas para `http://localhost:4200`
- Endpoints admin protegidos por `@PreAuthorize("hasRole('ADMIN')")`

---

## 🗃️ Modelo de Dados (principais tabelas)

```
usuario          → perfil: ADMIN | COZINHA | ENTREGADOR | CLIENTE
categoria        → categorias do cardápio
prato            → itens do cardápio com custo_calculado
ingrediente      → estoque com quantidade e estoque_minimo
ficha_tecnica    → ingredientes × prato com quantidade/fator/rendimento
pedido           → cabeçalho do pedido + status + pagamento
item_pedido      → itens do pedido com preço snapshot
movimentacao_estoque → auditoria de entradas/saídas de estoque
```

**Soft Delete:** todos os registros possuem campo `status ENUM('ATIVO','INATIVO')`.
Deleção física **nunca** é realizada — apenas `status = 'INATIVO'`.
