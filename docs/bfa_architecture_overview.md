# 🧱 Billing Foundation API – Arquitetura do Projeto

> **ID:** BFA-ARCH-001  
> **Escopo:** Arquitetura backend (MVP)  
> **Relacionados:** context/bfa_document.md, docs/backend_initial_setup.md, docs/routes_map.md

---

## 1. Contexto e objetivos arquiteturais

A Billing Foundation API (BFA) é uma infraestrutura SaaS multi-tenant focada em **governança de consumo** e **billing baseado em uso (mock)**. Ela nasce para resolver um problema recorrente em plataformas SaaS/B2B:

- Implementações ad hoc de billing e medição de consumo.
- Ausência de idempotência e rastreabilidade.
- Falta de isolamento multi-tenant consistente.
- Dificuldade de evolução e escalabilidade.

Do ponto de vista arquitetural, os objetivos principais são:

- Prover um **núcleo de billing usage-based** reutilizável, independente do produto final.
- Garantir **isolamento multi-tenant** robusto via `tenantId` em todo o modelo de dados.
- Assegurar **idempotência** no registro de eventos de uso.
- Estruturar uma API com **camadas bem definidas** (core, infra, módulos) e governança forte.
- Manter **observabilidade desde o início** (logs estruturados, request_id, tenant_id, api_key_id).

O documento completo de contexto e decisões está em [context/bfa_document.md](context/bfa_document.md).

---

## 2. Decisão arquitetural macro

### 2.1 Modular Monolith orientado a domínios

Embora o estudo de caso conceitual descreva uma arquitetura de microsserviços (Gateway, Tenants, Usage, Aggregation, Billing, etc.), o **MVP backend** é implementado como um **monólito modular em NestJS**, com módulos claramente separados por domínio:

- `src/modules/tenants`
- `src/modules/usage`
- `src/modules/billing`
- `src/modules/plans`

Cada módulo é autônomo em termos de regras de negócio, porém compartilha:

- Infraestrutura comum (`PrismaService`, configuração de banco, logging).
- Convenções de logs, autenticação, DTOs e testes.

> Motivação: reduzir complexidade operacional inicial (sem orquestração de múltiplos serviços) sem abrir mão de **limites de contexto** claros. A migração futura para microsserviços é facilitada pela separação atual.

### 2.2 Supabase + PostgreSQL como backbone de dados

O estudo original fala em **persistência poliglota** (relacional, NoSQL, analítico). No MVP, essa visão é consolidada em uma implementação pragmática:

- **Supabase (PostgreSQL)** é o banco transacional principal.
- O modelo de dados foi projetado para suportar:
  - `Tenant`, `ApiKey`, `Plan`, `UsageEvent`, `Invoice`.
  - Idempotência via `UsageEvent.idempotencyKey` (único por tenant).
  - Isolamento lógico por `tenantId` em todas as entidades operacionais.

Futuramente, o mesmo modelo pode ser particionado/replicado para stores NoSQL e analíticos, mas a complexidade é adiada para além do MVP.

### 2.3 Prisma como camada de acesso a dados

- Prisma é usado como **ORM e camada de schema**.
- O `schema.prisma` é a fonte da verdade para o modelo relacional.
- O `PrismaService` é exposto via `DatabaseModule` global para os módulos de domínio.

Essa decisão mantém forte tipagem, facilita migrações e torna visível a estratégia multi-tenant diretamente no schema.

---

## 3. Visão de camadas

A arquitetura de código é organizada em três camadas principais no backend NestJS:

### 3.1 Camada de Módulos de Domínio (`src/modules`)

Cada módulo segue o padrão obrigatório **controller / service / repository / dto / test**:

- **Tenants** (`src/modules/tenants`)
  - Responsável por criação/gestão de tenants, geração de API Keys e associação de planos.
- **Usage** (`src/modules/usage`)
  - Responsável por ingestão de eventos de uso (`/usage-events`), idempotência e (futuramente) publicação em fila/stream.
- **Billing** (`src/modules/billing`)
  - Responsável por orquestrar ciclos de billing e invoices mock.
- **Plans** (`src/modules/plans`)
  - Responsável por definição de planos e limites de uso.

Dentro de cada módulo:

- `controller`: adapta HTTP ↔ aplicação; sem regra de negócio.
- `service`: contém regras de negócio, orquestra repositórios.
- `repository`: acessa o banco via Prisma, sempre com filtros de `tenantId` quando pertinente.
- `dto`: contratos de entrada/saída.
- `test`: testes unitários e/ou de integração locais ao módulo.

### 3.2 Camada Core (`src/core`)

- `health/`  
  - Endpoint `GET /health` para verificação rápida de disponibilidade.

- `auth/`  
  - `ApiKeyMiddleware`: resolve `tenantId` e `apiKeyId` a partir de uma API Key enviada nos headers, valida status da chave e do tenant, e injeta contexto na requisição.

- `logging/`  
  - `LoggingModule`: integra `nestjs-pino` como logger global, gerando logs JSON estruturados com:
    - `request_id`
    - `tenant_id`
    - `api_key_id`
    - `status`
    - `latency`
    - `timestamp`

### 3.3 Camada Infra (`src/infra`)

- `database/`  
  - `PrismaService`: provê conexão com o banco, usado por repositórios.
  - `DatabaseModule`: módulo global exportando o `PrismaService`.

- `migrations/`  
  - Reservado para scripts/processos adicionais de migração além do fluxo Prisma padrão.

- `repositories/`  
  - Reservado para repositórios transversais (caso surjam) que não pertençam a um único módulo de domínio.

---

## 4. Estratégia multi-tenant

A estratégia multi-tenant implementada no MVP é do tipo **Shared Database, Shared Schema com `tenantId` por linha**.

Principais características:

- **Chave de isolamento:**
  - Todas as entidades que representam dados de negócio carregam um campo `tenantId` (ex.: `UsageEvent`, `Invoice`, `ApiKey`).
  - O `Tenant` é a raiz do relacionamento; tudo o que pertence a um cliente é ligado a ele.

- **API Key como ponto de entrada multi-tenant:**
  - Cada API Key é associada a um `tenantId` em `ApiKey.tenantId`.
  - O middleware resolve o tenant a partir da chave e injeta no contexto da requisição.

- **Filtragem por tenant em todas as consultas:**
  - Repositórios e serviços nunca consultam dados sem considerar o `tenantId` apropriado.
  - Exemplo: leitura de tenant via API impõe que `id` solicitado seja igual ao `tenantId` associado à API Key.

- **Evolução futura:**
  - O modelo atual é compatível com estratégias de isolamento mais fortes (schemas separados ou bancos separados) sem alterar o contrato da API.
  - Para eventos de uso em alto volume, a estrutura de `UsageEvent` permite migração futura para um store otimizado (NoSQL ou streaming) preservando a semântica atual.

Mais detalhes conceituais em [context/bfa_document.md](context/bfa_document.md), seção "Estratégia Multi-Tenant".

---

## 5. Modelagem de domínio

O `schema.prisma` consolida a modelagem discutida no documento conceitual.

Entidades principais:

- **Tenant**
  - Representa um cliente/organização.
  - Atributos chave: `id`, `name`, `status`, `planId`, `createdAt`, `updatedAt`.
  - Relações: `apiKeys`, `usageEvents`, `invoices`, `plan`.

- **ApiKey**
  - Representa uma credencial de acesso da API, vinculada a um tenant.
  - Atributos chave: `id`, `tenantId`, `keyHash`, `status`, `createdAt`, `expiresAt?`, `revokedAt?`.
  - Regra crítica: **a chave em texto claro nunca é armazenada**, apenas o hash (`keyHash`).

- **Plan**
  - Define os limites e características de um plano de uso.
  - Atributos chave: `id`, `name`, `description?`, `monthlyRequestLimit?`, `isActive`.
  - Um plano pode ser associado a vários tenants.

- **UsageEvent**
  - Representa um evento de consumo granular (ex.: uma chamada de API).
  - Atributos chave: `id`, `tenantId`, `metricName`, `value`, `occurredAt`, `idempotencyKey`, `source?`.
  - Regra fundamental: `@@unique([tenantId, idempotencyKey])` garante idempotência por tenant.

- **Invoice** (mock)
  - Representa uma fatura simulada para um ciclo de billing.
  - Atributos chave: `id`, `tenantId`, `billingCycleStart`, `billingCycleEnd`, `amount`, `currency`, `status`.
  - Usada para demonstrar ciclo de billing sem integração real com gateways de pagamento.

---

## 6. Fluxos principais (visão resumida)

Detalhes completos de requisição estão em [docs/routes_map.md](docs/routes_map.md) e no futuro documento de fluxos da API (ID BFA-FLOW-001). Aqui fica uma visão resumida:

### 6.1 Criação de tenant + API Key

1. Cliente chama `POST /tenants` com dados mínimos do tenant.
2. `TenantsService` cria o registro `Tenant` via repositório.
3. Gera uma API Key segura (random bytes) e calcula o hash.
4. Persiste `ApiKey` com `keyHash` e `tenantId`.
5. Retorna o tenant + API Key em texto claro (somente nesta resposta).

### 6.2 Acesso autenticado com API Key

1. Cliente chama `GET /tenants/:id` com header `x-api-key` ou `Authorization: ApiKey`.
2. `ApiKeyMiddleware` valida a chave, resolve `tenantId` e injeta no `req`.
3. Controller delega para `TenantsService`, que verifica se `:id` corresponde ao `tenantId` da chave.
4. Se bater, retorna os dados do tenant; se não, responde com `404`.

### 6.3 Registro de uso (futuro próximo)

1. Cliente chama `POST /usage-events` com `idempotencyKey`, `metricName`, `value`, `occurredAt`.
2. Serviço de Usage valida a idempotência e status do plano.
3. Persiste `UsageEvent` e (opcionalmente) publica em uma fila/stream.
4. Serviços de agregação e billing consomem esses eventos para atualizar consumo e gerar invoices mock.

O fluxo completo de registro de uso está descrito em [context/bfa_document.md](context/bfa_document.md), seção "Fluxo de Requisição".

---

## 7. Trade-offs e riscos arquiteturais

Principais decisões e trade-offs (resumidos do documento conceitual):

- **Monólito modular vs microsserviços:**
  - Prós: simplicidade operacional, menor overhead de deploy e observabilidade, onboarding mais rápido.
  - Contras: limites de escala por serviço compartilhados; migração futura para microsserviços exigirá extração de módulos.

- **Shared database com tenantId:**
  - Prós: custo operacional menor, simplicidade de migrações, queries mais diretas.
  - Contras: isolamento físico menor; risco de consultas sem filtro de tenant se a disciplina não for seguida.

- **Prisma + Supabase:**
  - Prós: alto nível de produtividade, modelo fortemente tipado, migrações controladas.
  - Contras: acoplamento a uma stack específica (Node/Postgres) no curto prazo.

Riscos mitigados pela governança (ver `context/billing_foundation_api_agent_governance.md`):

- Erros de isolamento multi-tenant → mitigados exigindo `tenantId` em todas as queries e cobertura de testes.
- Problemas de idempotência → uso obrigatório de `idempotencyKey` em `UsageEvent`.
- Falhas de observabilidade → logging estruturado obrigatório em todos os endpoints.

---

## 8. Escopo do MVP x visão futura

**MVP atual cobre:**

- Gestão de tenants + geração de API Key.
- Autenticação por API Key em rotas protegidas.
- Modelagem completa de `Tenant`, `ApiKey`, `Plan`, `UsageEvent`, `Invoice` no banco.
- Healthcheck e logging estruturado com contexto multi-tenant.

**Próximas evoluções naturais:**

- Implementar o módulo `usage` com idempotência completa e validação de limites de plano.
- Implementar o módulo `billing` para ciclos de billing e invoices mock baseadas em consumo real.
- Introduzir fluxo de agregação (batch/stream) para `UsageEvent`.

Essas evoluções devem manter a coerência com as decisões registradas em [context/bfa_document.md](context/bfa_document.md) e neste documento, atualizando-os sempre que uma mudança arquitetural relevante for introduzida.