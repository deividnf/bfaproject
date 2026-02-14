# 🧪 Registro de testes – Fluxo Tenants + API Key

> **ID:** BFA-TEST-003  
> **Data:** 2026-02-13  
> **Tipo:** Testes de fluxo / Tenants & API Key  
> **Relacionado a:** BFA-INC-001, BFA-INC-002

## Contexto

- Projeto: Billing Foundation API (NestJS + Prisma + Supabase).
- Objetivo destes testes: validar o fluxo fim a fim de:
  - Criação de tenant.
  - Geração de API Key associada ao tenant.
  - Acesso protegido ao tenant via API Key (happy path e cenários de erro).

## Pré-condições

- Backend buildando sem erros (`npm run build`).
- Prisma migrations aplicadas no Supabase (`npm run prisma:migrate`).
- API rodando em modo desenvolvimento:

  ```bash
  npm run start:dev
  ```

- Variáveis de ambiente configuradas em `.env`, especialmente `DATABASE_URL`, `NODE_ENV=development`, `LOG_LEVEL=info` e `PORT=3000`.

## Teste 1 – Healthcheck (`GET /health`)

### Passos

1. Enviar requisição:

   ```bash
   curl http://localhost:3000/health
   ```

2. Observar resposta.

### Resultado esperado

- Status HTTP: `200 OK`.
- Corpo JSON simples indicando saúde do serviço.

### Resultado obtido

- Status `200` e resposta JSON conforme esperado.

---

## Teste 2 – Criação de tenant + API Key (`POST /tenants`)

### Passos

1. Enviar requisição:

   ```bash
   curl -X POST http://localhost:3000/tenants \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Tenant Demo"
     }'
   ```

2. Observar resposta JSON.

### Resultado esperado

- Status HTTP: `201 Created` (ou `200 OK`, dependendo da implementação).
- Corpo com:
  - Objeto `tenant` com campos básicos (`id`, `name`, `status`, `createdAt`, `updatedAt`, `planId`).
  - Objeto `apiKey` com `id` e `key` (a chave em texto claro, retornada apenas nesta chamada).

### Resultado obtido (exemplo real)

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
    "key": "960cacf4182665f072b09f1d9877cb93678183a6ca08cf36d82b8ea0ff02bb3f"
  }
}
```

### Observações

- A chave em `apiKey.key` **não é armazenada em texto claro** no banco; apenas o hash (`keyHash`) é persistido.
- Para testes subsequentes, é necessário guardar:
  - `TENANT_ID = tenant.id`.
  - `API_KEY = apiKey.key`.

---

## Teste 3 – Consulta de tenant com API Key válida (`GET /tenants/:id`)

### Passos

1. Usar os valores retornados no Teste 2:
   - `TENANT_ID = f6592383-8c09-4834-a9e3-32ff992a5136`
   - `API_KEY = 960cacf4182665f072b09f1d9877cb93678183a6ca08cf36d82b8ea0ff02bb3f`

2. Enviar requisição usando header `x-api-key`:

   ```bash
   curl http://localhost:3000/tenants/f6592383-8c09-4834-a9e3-32ff992a5136 \
     -H "x-api-key: 960cacf4182665f072b09f1d9877cb93678183a6ca08cf36d82b8ea0ff02bb3f"
   ```

### Resultado esperado

- Status HTTP: `200 OK`.
- Corpo JSON contendo os dados do tenant (sem bloco `apiKey`).

### Resultado obtido

- Resposta OK, retornando o tenant associado à API Key.

---

## Teste 4 – API Key inválida (segurança)

### Passos

1. Enviar requisição com `TENANT_ID` correto, mas `API_KEY` inválida:

   ```bash
   curl http://localhost:3000/tenants/f6592383-8c09-4834-a9e3-32ff992a5136 \
     -H "x-api-key: 123"
   ```

### Resultado esperado

- Status HTTP: `401 Unauthorized`.
- Corpo JSON com mensagem de credenciais inválidas ou API Key inválida.

### Resultado obtido

- Requisição rejeitada com `401 Unauthorized` (comportamento esperado para chave inválida).

---

## Teste 5 – TenantId diferente do tenant da API Key (isolamento multi-tenant)

### Passos

1. Utilizar uma `API_KEY` válida, mas forçar um `TENANT_ID` diferente (exemplo genérico):

   ```bash
   curl http://localhost:3000/tenants/00000000-0000-0000-0000-000000000000 \
     -H "x-api-key: 960cacf4182665f072b09f1d9877cb93678183a6ca08cf36d82b8ea0ff02bb3f"
   ```

### Resultado esperado

- Status HTTP: `404 Not Found`.
- Não vazar informação sobre a existência de outros tenants.

### Resultado obtido

- Requisição retornou `404`, mantendo o isolamento entre tenants conforme o design de segurança.

---

## Conclusões

- O fluxo de criação de tenants e autenticação por API Key está funcionando de ponta a ponta.
- As principais garantias verificadas:
  - Geração de tenant e API Key funcional.
  - Autenticação via header `x-api-key`.
  - Rejeição de chaves inválidas.
  - Isolamento multi-tenant via validação de `tenantId` associado à API Key.

## Recomendações de prevenção de erros

- Sempre rodar `npm run prisma:migrate` ao apontar para um novo banco (ou após mudanças em `schema.prisma`).
- Validar se a API está rodando (`npm run start:dev`) antes de testar endpoints.
- Manter o padrão de documentação de incidentes e testes em `docs/tests` para facilitar debug futuro.
