# 🔄 Fluxos da API – Billing Foundation API

> **ID:** BFA-FLOW-001  
> **Escopo:** Fluxos técnicos da API (MVP + visão próxima)  
> **Relacionados:** docs/routes_map.md, docs/bfa_architecture_overview.md, context/request_flow.mmd

Este documento descreve os principais fluxos de requisição da Billing Foundation API sob a ótica técnica, conectando endpoints, middleware, serviços e banco de dados.

---

## 1. Convenções gerais

- Todas as requisições HTTP passam pela aplicação NestJS (não há API Gateway externo no MVP).
- Logs estruturados são gerados para cada requisição, incluindo `request_id`, `tenant_id`, `api_key_id` (quando disponíveis), `status` e `latency`.
- Quando a rota exige autenticação, a API Key é validada sempre antes de qualquer acesso ao domínio.

---

## 2. Fluxo – Healthcheck (`GET /health`)

Objetivo: verificação rápida de disponibilidade da API.

Passos:

1. Cliente chama `GET /health`.
2. Requisição é roteada diretamente para `HealthController`.
3. Nenhum middleware de autenticação é aplicado.
4. Controller retorna um JSON com `status` e `timestamp`.
5. Logger registra o request com `request_id`, status `200` e latência.

Este fluxo serve como verificação de que a aplicação está inicializada e consegue responder requisições HTTP básicas.

---

## 3. Fluxo – Criação de Tenant + API Key (`POST /tenants`)

Objetivo: criar um novo tenant e emitir uma API Key associada.

Passos detalhados:

1. Cliente chama `POST /tenants` com corpo JSON contendo ao menos `name`.
2. A requisição é roteada para `TenantsController.createTenant`.
3. DTO `CreateTenantDto` valida os campos de entrada.
4. `TenantsService.createTenant` é chamado com os dados já validados.
5. O serviço:
   - Usa `TenantsRepository` para criar um registro `Tenant` via Prisma.
   - Gera uma API Key criptograficamente segura (ex.: 32 bytes aleatórios em hex).
   - Calcula o hash `sha256` da chave (sem nunca persistir o valor em texto claro).
   - Cria um registro `ApiKey` com `tenantId` e `keyHash` via Prisma.
6. A resposta HTTP inclui:
   - Objeto `tenant` recém-criado.
   - Objeto `apiKey` contendo:
     - `id` (identificador interno da chave).
     - `key` (valor em texto claro, retornado apenas nesta resposta).
7. Logger registra o request com o novo `tenant.id` (quando aplicável) e status `201`.

Erros comuns e comportamento esperado:

- Payload inválido → erro `400 Bad Request` (validação DTO).
- Erro de banco (ex.: indisponível) → erro `5xx`, logado com contexto suficiente para diagnóstico.

---

## 4. Fluxo – Leitura de Tenant autenticada (`GET /tenants/:id`)

Objetivo: permitir que um tenant consulte seus próprios dados de forma segura.

Passos detalhados:

1. Cliente chama `GET /tenants/:id` com uma API Key em um dos headers suportados:
   - `x-api-key: <API_KEY>`
   - ou `Authorization: ApiKey <API_KEY>`
2. A requisição entra no `ApiKeyMiddleware` antes de chegar ao controller.
3. O middleware:
   - Extrai a chave do header.
   - Calcula o hash `sha256` da chave.
   - Consulta `ApiKey` via Prisma com `keyHash` e `status = ACTIVE`, incluindo o `Tenant` associado.
   - Se não encontrar, lança `UnauthorizedException` (`401`).
   - Se o tenant não estiver `ACTIVE`, lança `ForbiddenException` (`403`).
   - Injeta em `req`:
     - `tenantId` = `apiKeyRecord.tenantId`.
     - `apiKeyId` = `apiKeyRecord.id`.
4. `TenantsController.getTenant` é então invocado com:
   - `id` vindo da rota (`/tenants/:id`).
   - `req` contendo `tenantId` e `apiKeyId`.
5. `TenantsService.getTenantById` aplica as regras de segurança:
   - Se `id` for diferente de `tenantId` do contexto, lança `NotFoundException` (`404`).
   - Caso contrário, consulta o repositório (`findByIdForTenant`).
   - Se não encontrar registro consistente, retorna `404`.
6. Se encontrar, devolve o objeto `Tenant` em JSON com `200 OK`.
7. Logger inclui `tenant_id` e `api_key_id` no log, além de `status` e `latency`.

Motivação de design:

- Usar `404` quando o tenant não corresponde à API Key evita vazar a existência de outros tenants (melhor segurança).
- Toda lógica de autenticação fica centralizada no middleware; controllers e services recebem apenas o contexto já resolvido.

---

## 5. Fluxo – Registro de evento de uso (conceitual / futuro)

> Este fluxo ainda não está implementado no código do MVP, mas sua definição é importante para alinhar a arquitetura com o estudo de caso em context/bfa_document.md e context/request_flow.mmd.

### 5.1 Fluxo conceitual de /usage-events

1. Cliente chama `POST /usage-events` com uma API Key válida e corpo JSON contendo:
   - `metricName`
   - `value`
   - `occurredAt`
   - `idempotencyKey`
2. Middleware de API Key autentica a requisição e injeta `tenantId`.
3. Controller de Usage delega para `UsageService.registerEvent`.
4. O serviço aplica, em ordem:
   - Validação de idempotência:
     - Verifica se já existe `UsageEvent` com o mesmo `tenantId` e `idempotencyKey`.
     - Se sim, retorna sucesso idempotente (por exemplo, `200` ou `202`) sem duplicar o evento.
   - Validação de plano/limites:
     - Consulta o `Plan` associado ao tenant.
     - Verifica se o novo evento ultrapassaria algum limite configurado.
     - Se extrapolar, retorna erro (e.g. `403` com código de erro específico).
   - Persistência do evento:
     - Cria o registro em `UsageEvent` com `tenantId`, `metricName`, `value`, `occurredAt`, `idempotencyKey`, `source`.
   - (Futuro) Publicação em fila/stream para agregação assíncrona.
5. Retorna um status de aceitação (`202 Accepted`) ou sucesso (`201 Created`), conforme a semântica escolhida.

### 5.2 Integração com agregação e billing (visão futura)

Com base no estudo de caso:

- Um serviço de agregação consome eventos de uso (diretamente do banco ou de uma fila) e mantém estruturas de `AggregatedUsage` por período.
- O serviço de billing consulta esses dados agregados ao fechar um ciclo (e.g. mensal) e gera `Invoice` mock com base em regras de plano.

Esses componentes ainda não estão presentes no código, mas a modelagem de `UsageEvent` e `Invoice` já foi desenhada para suportar essa evolução.

---

## 6. Diagrama de sequência (conceitual)

Para referência rápida, o fluxo conceitual de registro de uso (inspirado em context/request_flow.mmd) pode ser descrito assim:

- Cliente → API (Usage Controller) → Serviço de Uso → Banco (UsageEvent) → (Futuro) Fila → Serviço de Agregação → Banco Analítico / Billing.

Em termos de componentes:

1. Cliente envia `POST /usage-events` autenticado.
2. API valida API Key e idempotência.
3. Evento é persistido.
4. Evento é publicado em um canal assíncrono (futuro).
5. Agregador consome eventos e atualiza consumo por tenant/plano/período.
6. Serviço de billing fecha ciclos e gera invoices mock.

Este documento deve ser atualizado à medida que novos endpoints (usage, billing, plans) forem implementados, mantendo a rastreabilidade entre rotas, serviços e fluxos técnicos.
