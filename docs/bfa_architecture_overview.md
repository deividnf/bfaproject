# 🧱 Billing Foundation API – Arquitetura do Projeto

> **ID:** BFA-ARCH-001  
> **Escopo:** Arquitetura backend (MVP)  
> **Relacionados:** docs/backend_initial_setup.md, docs/routes_map.md, pasta `context/`.

## Visão Geral

A BFA é uma API multi-tenant para governança de consumo e billing baseado em uso (mock), estruturada em camadas:

- **Modules (`src/modules`)**: Domínios de negócio (tenants, usage, billing, plans).
- **Core (`src/core`)**: Cross-cutting (middleware, auth, logging).
- **Infra (`src/infra`)**: Banco de dados, migrations e repositórios.
- **Tests (`tests` + `*/test`)**: Testes de unidade e integração.
- **Docs (`docs` + `context`)**: Documentação viva e diagramas.

Os diagramas em:
- `context/architecture_overview.mmd`
- `context/request_flow.mmd`
- `context/bfa_document.md`

são a referência de alto nível de fluxo e componentes.

## Módulos de Negócio (`src/modules`)

Cada módulo segue o padrão obrigatório **controller / service / repository / dto / test**:

- `src/modules/tenants`
  - Responsável por tenants, API Keys e associação de planos.
- `src/modules/usage`
  - Responsável por `/usage-events`, idempotência e publicação em fila/stream.
- `src/modules/billing`
  - Responsável por agregação de consumo (interface com serviço de agregação) e ciclo de billing/mock invoices.
- `src/modules/plans`
  - Responsável por definição de planos e limites de uso.

Dentro de cada módulo:
- `controller`: Endpoints HTTP (sem regra de negócio).
- `service`: Regras de negócio e orquestração.
- `repository`: Acesso a dados, sempre filtrando por `tenant_id`.
- `dto`: Contratos de entrada/saída da API.
- `test`: Testes focados no módulo.

## Camada Core (`src/core`)

- `middleware`: 
  - Extração de `tenant_id` a partir da API Key.
  - Injeção de `request_id` e correlação para logs.
  - Rate limiting por tenant.
- `auth`:
  - Validação de API Keys (hash), vinculação a tenant.
- `logging`:
  - Logs estruturados JSON contendo: `request_id`, `tenant_id`, `api_key_id`, `timestamp`, `status`, `latency`, tipo de operação.

## Camada Infra (`src/infra`)

- `database`: Configuração de conexões (relacional, NoSQL, analítico) e estratégia multi-tenant.
- `migrations`: Migrações de schema (ex.: tenants, plans, api_keys, usage_events, aggregated_usage, invoices).
- `repositories`: Implementações concretas de acesso a dados (usadas por `src/modules/*/repository`).

## Testes

- `src/modules/*/test`: Testes unitários e de serviço por módulo.
- `tests/`: Testes de integração/end-to-end cobrindo especialmente:
  - Criação de tenant.
  - Geração/revogação de API Key.
  - Registro de `usage_event` com idempotência.
  - Concorrência e estouro de limite.
  - Fechamento de ciclo de billing e geração de invoice.

## Governança e Documentação

- Toda funcionalidade nova deve:
  - Atualizar primeiro a documentação em `docs/` e/ou `context/`.
  - Respeitar as regras técnicas obrigatórias (tenant_id em todas as queries, idempotency_key em eventos, controller sem regra de negócio, etc.).
  - Ser coberta por testes e logs estruturados.

Este documento é o ponto de partida; a cada evolução arquitetural, atualize aqui e nos arquivos de contexto relevantes.