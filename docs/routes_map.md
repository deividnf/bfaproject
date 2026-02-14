# 🧭 Mapa de Rotas – Billing Foundation API

> **ID:** BFA-ROUTES-001  
> **Escopo:** Rotas HTTP do backend (MVP)  
> **Objetivo:** Centralizar a documentação de rotas sem poluir o README.

> Base URL padrão em desenvolvimento: `http://localhost:3000`

## Convenções gerais

- Formato de resposta: JSON.
- Autenticação:
  - Rotas públicas (sem autenticação): healthcheck, criação de tenant.
  - Rotas protegidas: leitura de tenant exige API Key.
- API Key pode ser enviada via:
  - Header `x-api-key: <API_KEY>` **ou**
  - Header `Authorization: ApiKey <API_KEY>`.

---

## Core / Health

**Controller**: `src/core/health/health.controller.ts`

### `GET /health`

- Descrição: healthcheck simples da API.
- Autenticação: **não requer**.
- Resposta (exemplo):

```json
{
  "status": "ok",
  "timestamp": "2026-02-14T02:30:00.000Z"
}
```

---

## Módulo Tenants

**Controller**: `src/modules/tenants/controller/tenants.controller.ts`

### `POST /tenants`

- Descrição: cria um novo tenant e gera uma API Key associada.
- Autenticação: **não requer**.
- Body (JSON):

```json
{
  "name": "Tenant Demo",
  "planId": "<opcional>"
}
```

- Resposta (exemplo):

```json
{
  "tenant": {
    "id": "f6592383-8c09-4834-a9e3-32ff992a5136",
    "name": "Tenant Demo",
    "status": "ACTIVE",
    "createdAt": "2026-02-14T02:32:50.836Z",
    "updatedAt": "2026-02-14T02:32:50.836Z",
    "planId": null
  },
  "apiKey": {
    "id": "c2dbabc0-b543-4600-8ad3-5dfd39e67561",
    "key": "<API_KEY_EM_TEXTO_CLARO>"
  }
}
```

> Observação: a chave em texto claro (`apiKey.key`) é retornada apenas nessa chamada; no banco é armazenado apenas o hash (`keyHash`).

---

### `GET /tenants/:id`

- Descrição: retorna os dados do tenant identificado por `:id`.
- Autenticação: **requer API Key válida**.
  - A API Key precisa pertencer ao próprio tenant solicitado.
- Headers de autenticação (uma das opções):

```http
x-api-key: <API_KEY>
```

ou

```http
Authorization: ApiKey <API_KEY>
```

- Comportamento de segurança:
  - O middleware de API Key resolve `tenantId` a partir da chave e injeta em `req.tenantId`.
  - O serviço `TenantsService` apenas retorna o tenant se `:id` for igual ao `tenantId` da API Key.
  - Caso contrário, retorna `404 Not Found` para não expor a existência de outros tenants.

- Resposta (exemplo):

```json
{
  "id": "f6592383-8c09-4834-a9e3-32ff992a5136",
  "name": "Tenant Demo",
  "status": "ACTIVE",
  "createdAt": "2026-02-14T02:32:50.836Z",
  "updatedAt": "2026-02-14T02:32:50.836Z",
  "planId": null
}
```

---

## Rotas planejadas (estrutura criada, ainda sem implementação)

Os seguintes módulos já possuem estrutura de pastas em `src/modules/`, mas ainda não tiveram suas rotas implementadas no MVP atual:

- `usage/` – registro de eventos de uso (ex.: `/usage-events`).
- `billing/` – ciclo de billing e invoices mock.
- `plans/` – planos e limites de uso.

Quando essas rotas forem implementadas, este documento deve ser atualizado com:
- Método HTTP.
- Caminho completo.
- Regras de autenticação/autorização.
- Exemplos de request/response.
