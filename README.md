Billing Foundation API (BFA)
============================

Infraestrutura backend para governança de consumo e billing baseado em uso (mock), construída em Node.js + TypeScript + NestJS + Prisma + Supabase (PostgreSQL), seguindo arquitetura modular monolítica e Clean Architecture.

---

## 🔗 Navegação rápida

- ▶️ **Visão geral rápida** – ver abaixo
- 📚 **Arquitetura & domínio** – [docs/bfa_architecture_overview.md](docs/bfa_architecture_overview.md)
- ⚙️ **Setup inicial backend** – [docs/backend_initial_setup.md](docs/backend_initial_setup.md)
- 🧪 **Testes & incidentes** – [docs/tests](docs/tests)
- 🧭 **Mapa de rotas HTTP** – [docs/routes_map.md](docs/routes_map.md)
- 🛡️ **Prevenção de erros** – [docs/backend_error_prevention.md](docs/backend_error_prevention.md)

---

## 📚 Catálogo de documentação

### Guias principais

- **BFA-ARCH-001** – Arquitetura do backend (MVP)  
  Arquivo: [docs/bfa_architecture_overview.md](docs/bfa_architecture_overview.md)

- **BFA-SETUP-001** – Backend inicial – setup rápido (sem Docker)  
  Arquivo: [docs/backend_initial_setup.md](docs/backend_initial_setup.md)

- **BFA-GUIDE-001** – Boas práticas de prevenção de erros (build, startup, banco, logging)  
  Arquivo: [docs/backend_error_prevention.md](docs/backend_error_prevention.md)

- **BFA-ROUTES-001** – Mapa de rotas HTTP do backend (MVP)  
  Arquivo: [docs/routes_map.md](docs/routes_map.md)

### Testes e incidentes

- **BFA-INC-001** – Falha de build por dependências e Prisma  
  Arquivo: [docs/tests/2026-02-13_BUILD_DEPENDENCIAS_001.md](docs/tests/2026-02-13_BUILD_DEPENDENCIAS_001.md)

- **BFA-INC-002** – Falha de startup por logging (pino-pretty)  
  Arquivo: [docs/tests/2026-02-13_STARTUP_LOGGING_002.md](docs/tests/2026-02-13_STARTUP_LOGGING_002.md)

- **BFA-TEST-003** – Testes de fluxo Tenants + API Key  
  Arquivo: [docs/tests/2026-02-13_TENANTS_APIKEY_003.md](docs/tests/2026-02-13_TENANTS_APIKEY_003.md)

---

## 🧩 Visão geral do MVP

Este repositório implementa o núcleo de:

- Gestão de tenants e API Keys.
- Registro e agregação de consumo (usage).
- Planos e limites de uso.
- Ciclo de billing com invoices simuladas (mock).
- Observabilidade com logs estruturados.

O foco atual é o MVP backend, com rotas essenciais para healthcheck, criação de tenants e autenticação via API Key.

---

## 🏗️ Estrutura de pastas (backend)

Principais diretórios:

- `src/main.ts` – bootstrap NestJS, wiring de logger e módulos.
- `src/app.module.ts` – módulo raiz agregando core, infra e módulos de domínio.

- `src/core/`
  - `health/` – healthcheck HTTP (GET /health).
  - `logging/` – módulo global de logging com Pino (nestjs-pino).
  - `auth/` – middleware de autenticação por API Key.

- `src/infra/`
  - `database/` – PrismaService e DatabaseModule (acesso ao Supabase/PostgreSQL).
  - `migrations/` – reservado para artefatos de migração adicionais.
  - `repositories/` – reservado para repositórios compartilhados.

- `src/modules/`
  - `tenants/`
    - `controller/` – TenantsController (endpoints HTTP).
    - `service/` – TenantsService (regras de negócio).
    - `repository/` – TenantsRepository (acesso Prisma).
    - `dto/` – DTOs de entrada/saída.
    - `test/` – testes específicos do módulo.
  - `usage/`, `billing/`, `plans/` – estrutura criada para evolução futura, seguindo o mesmo padrão.

- `prisma/`
  - `schema.prisma` – modelagem de domínio no banco (Tenant, ApiKey, Plan, UsageEvent, Invoice).

- `tests/`
  - `tenants.e2e-spec.ts` – testes de integração iniciais (criação de tenant, acesso protegido por API Key).

- `docs/`
  - `bfa_architecture_overview.md` – visão arquitetural do backend.
  - `backend_initial_setup.md` – guia rápido de setup local.
  - `backend_error_prevention.md` – boas práticas de prevenção de erros (build, startup, banco, logging).
  - `routes_map.md` – mapa detalhado de rotas HTTP.
  - `tests/` – documentação de testes, debug e incidentes (padrão DATA_TIPO_INDICE).

---

## 🛠️ Stack técnica

- Runtime: Node.js (18+ recomendado).
- Linguagem: TypeScript.
- Framework: NestJS.
- Banco principal: Supabase (PostgreSQL).
- ORM: Prisma 6 (Prisma Client 6.19.x).
- Logs: Pino + nestjs-pino (JSON estruturado, pretty em desenvolvimento).
- Testes: Jest + Supertest.

Este MVP não depende de Docker; todo o fluxo de desenvolvimento e execução é local, apontando diretamente para o Supabase via `DATABASE_URL`.

---

## 🚀 Setup local (sem Docker)

1. **Pré-requisitos**

   - Node.js 18 ou superior.
   - Conta e banco criado no Supabase (com uma `DATABASE_URL` válida).

2. **Configurar `.env`**

   Na raiz do projeto, o arquivo `.env` deve conter ao menos:

   ```env
   DATABASE_URL=postgresql://usuario:senha@host:5432/postgres
   NODE_ENV=development
   LOG_LEVEL=info
   PORT=3000
   ```

   Para Supabase, use a URL de conexão fornecida pelo painel (adicionando `sslmode=require` se necessário).

3. **Instalar dependências**

   ```bash
   npm install
   ```

4. **Gerar client do Prisma**

   ```bash
   npm run prisma:generate
   ```

5. **Rodar migrations (criar schema no Supabase)**

   ```bash
   npm run prisma:migrate
   ```

   Este comando aplica o `schema.prisma` no banco apontado por `DATABASE_URL`, criando as tabelas `Tenant`, `ApiKey`, `Plan`, `UsageEvent` e `Invoice`.

6. **Subir a API em modo desenvolvimento**

   ```bash
   npm run start:dev
   ```

   Por padrão a API sobe em `http://localhost:3000`.

---

## 🌐 Rotas principais do MVP

Para detalhes completos (métodos, exemplos de request/response e autenticação), consulte o [Mapa de Rotas](docs/routes_map.md).

Resumo das rotas hoje implementadas:

- `GET /health` – healthcheck HTTP.
- `POST /tenants` – cria tenant e retorna API Key em texto claro.
- `GET /tenants/:id` – retorna tenant, autenticado por API Key.

---

## 🔐 Autenticação por API Key (resumo)

- Implementada em `src/core/auth/api-key.middleware.ts`.
- Lê a chave de `x-api-key` ou `Authorization: ApiKey <API_KEY>`.
- Calcula hash `sha256` da chave e busca em `ApiKey` com `keyHash` e status `ACTIVE`, incluindo o `Tenant` associado.
- Se não encontrar, retorna `401 Unauthorized`.
- Se o tenant estiver inativo/suspenso, retorna `403 Forbidden`.
- Injeta em `req`:
  - `tenantId`.
  - `apiKeyId`.

Esses campos são usados pelos serviços e pelo logger estruturado.

---

## 📊 Logging estruturado

- Configurado em `src/core/logging/logging.module.ts` usando `nestjs-pino`.
- Cada request loga, em JSON:
  - `request_id`.
  - `tenant_id` (quando resolvido via API Key).
  - `api_key_id`.
  - `status` (HTTP status code).
  - `latency` (tempo de resposta).
  - `timestamp`.
- Em `NODE_ENV=development`, a saída é formatada com `pino-pretty` para facilitar leitura.

---

## 🧱 Prisma, Supabase e multi-tenant

- O `schema.prisma` define os modelos centrais `Tenant`, `ApiKey`, `Plan`, `UsageEvent` e `Invoice`.
- Todos os modelos operacionais carregam `tenantId` para garantir isolamento lógico multi-tenant.
- `UsageEvent` possui `idempotencyKey` único por tenant (`@@unique([tenantId, idempotencyKey])`) para garantir idempotência.
- A conexão com o banco é feita via `DATABASE_URL` apontando para o Supabase PostgreSQL.

Para mais detalhes de modelagem e estratégias multi-tenant, veja:

- [docs/bfa_architecture_overview.md](docs/bfa_architecture_overview.md)
- Documentos em `context/` (domínio, fluxo de requisição, estratégia de billing mock).

---

## 🔭 Próximos passos sugeridos

- Implementar módulo `usage` com `POST /usage-events` e idempotência plena.
- Aplicar limites de plano (`Plan.monthlyRequestLimit`) no fluxo de registro de uso.
- Evoluir o módulo `billing` para fechar ciclos e gerar `Invoice` mock com base em consumo agregado.

Toda nova funcionalidade deve respeitar o documento de governança em `context/billing_foundation_api_agent_governance.md` e ser documentada em `docs/` antes da implementação.
