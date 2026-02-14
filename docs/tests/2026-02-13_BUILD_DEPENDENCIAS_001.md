# 🧪 Registro de incidente – Build / Dependências / Prisma

> **ID:** BFA-INC-001  
> **Data:** 2026-02-13  
> **Tipo:** Build / Dependências / Prisma  
> **Comando gatilho:** `npm audit fix --force`

## Contexto

- Projeto: Billing Foundation API (NestJS + Prisma + Supabase).
- Comando executado inicialmente: `npm audit fix --force`.
- Objetivo: corrigir vulnerabilidades reportadas pelo `npm audit`.

## Sintomas observados

1. Conflitos de dependência após `npm audit fix --force`
   - `@nestjs/swagger` atualizado para `11.2.6` enquanto o projeto usa NestJS 10.
   - `prisma` e `@prisma/client` ficaram em versões desencontradas.
   - Remoção implícita de `class-validator` / `class-transformer`.

2. Erros de build (`npm run build`)
   - `Property 'apiKey' does not exist on type 'PrismaService'.`
   - `Property 'uuid' does not exist on type 'Logger<...>'.`
   - `Module '@prisma/client' has no exported member 'PrismaClient'.`
   - Erros de strictPropertyInitialization em DTO.
   - Erros de tipos no repositório de tenants (where com chaves duplicadas / campos inexistentes).

3. Erros do Prisma (`npm run prisma:generate`)
   - Falha ao parsear `prisma.config.ts` / `prisma.config.js`.
   - Erros de schema: `Native type Numeric is not supported for postgresql connector`.

## Análise de causa raiz

- `npm audit fix --force` aplicou atualizações *major* sem respeitar a compatibilidade:
  - `@nestjs/swagger@11.x` exige `@nestjs/common`/`@nestjs/core@11.x`, mas o projeto usa `10.x`.
  - `@prisma/client` ficou em `^7.4.0` enquanto o projeto foi pensado para Prisma 6.
- O Prisma Client não estava gerado corretamente para o schema atual (por isso o erro no import de `PrismaClient` e nas propriedades `apiKey` / `tenant`).
- O schema do Prisma usava `@db.Numeric(18, 6)`, tipo não suportado pela versão de Prisma em uso.
- `prisma.config.*` (TS/JS) estava sendo carregado pela CLI e falhando na validação/sintaxe.
- O DTO `CreateTenantDto` estava com strict mode ativado e sem inicialização explícita da propriedade `name`.
- O repositório de tenants tinha:
  - Filtro `where` com `id` duplicado (`id`, `id: tenantId`).
  - Tentativa de filtro por `tenantId` em modelo `Tenant` que não possui esse campo.
- Logging usava `pino().uuid()`, API não disponível no tipo retornado.

## Ações executadas

### 1. Ajustes em dependências (package.json)

- [package.json](../package.json)
  - Alinhei Prisma com mesma major version:
    - `"@prisma/client": "^6.19.2"`
    - `"prisma": "^6.19.2"`
  - Ajustei `@nestjs/swagger` para versão compatível com Nest 10:
    - De `^11.2.6` para `^7.0.0`.
  - Reinstalei dependências de validação:
    - `"class-validator": "^0.14.0"`
    - `"class-transformer": "^0.5.1"`
  - Rodei `npm install` até não haver mais conflitos de peer dependencies.

### 2. Correções no schema do Prisma

- [prisma/schema.prisma](../prisma/schema.prisma)
  - Adicionei URL diretamente na `datasource`:
    - `url = env("DATABASE_URL")`.
  - Corrigi tipos nativos para PostgreSQL:
    - `value          Decimal  @db.Numeric(18, 6)` → `Decimal  @db.Decimal(18, 6)`.
    - `amount         Decimal  @db.Numeric(18, 6)` → `Decimal  @db.Decimal(18, 6)`.
  - Removi dependência de `prisma.config.ts` / `prisma.config.js` (arquivos apagados) para simplificar configuração.
  - Com `.env` contendo `DATABASE_URL`, rodei `npm run prisma:generate` com sucesso.

### 3. Correções no serviço de banco / PrismaService

- [src/infra/database/prisma.service.ts](../src/infra/database/prisma.service.ts)
  - Mantida a estrutura padrão de extensão do `PrismaClient`:
    - `export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy { ... }`.
  - Após o `prisma generate`, o tipo `PrismaClient` e os delegates (`apiKey`, `tenant`, etc.) passaram a existir corretamente.

### 4. Correções no logging

- [src/core/logging/logging.module.ts](../src/core/logging/logging.module.ts)
  - Antes: `genReqId: () => pino().uuid(),`.
  - Depois: uso do `crypto.randomUUID()` da própria runtime do Node:
    - `import { randomUUID } from 'crypto';`
    - `genReqId: () => randomUUID(),`.

### 5. Correções no repositório de tenants

- [src/modules/tenants/repository/tenants.repository.ts](../src/modules/tenants/repository/tenants.repository.ts)
  - Mantido o método de criação:
    - `createTenant(data: { name: string; planId?: string })` usando `this.prisma.tenant.create({ data })`.
  - Corrigido o método de busca:
    - Antes:
      - `findByIdForTenant(id: string, tenantId: string)`
      - `where: { id, id: tenantId }` (chave duplicada) e tentativa de usar `tenantId` em `Tenant`.
    - Depois:
      - Assinatura simplificada: `findByIdForTenant(id: string)`.
      - Filtro: `where: { id }`.

### 6. Ajustes no service de tenants

- [src/modules/tenants/service/tenants.service.ts](../src/modules/tenants/service/tenants.service.ts)
  - Criação de tenant:
    - Usa `this.tenantsRepository.createTenant` e depois cria API Key via `this.prisma.apiKey.create`.
  - Busca por tenant:
    - Antes: chamava `findByIdForTenant(id, tenantIdFromApiKey)`.
    - Depois: `const tenant = await this.tenantsRepository.findByIdForTenant(id);`.
    - Verificação adicional mantida: se `id !== tenantIdFromApiKey`, lança `NotFoundException`.

### 7. Ajustes no DTO de criação de tenant

- [src/modules/tenants/dto/create-tenant.dto.ts](../src/modules/tenants/dto/create-tenant.dto.ts)
  - Erro: strictPropertyInitialization reclamando da propriedade `name`.
  - Correção:
    - `name!: string;` (definite assignment assertion) mantendo anotações do `class-validator`.

### 8. Geração do Prisma Client e build final

- Com o schema corrigido e o `DATABASE_URL` configurado:
  - Rodei `npm run prisma:generate` com sucesso (Prisma Client v6.19.2).
- Depois rodei `npm run build`:
  - Primeira tentativa ainda mostrou erros em DTO e repositório.
  - Após correções (itens 5 e 7), o `npm run build` passou sem erros.

## Estado atual

- `npm run prisma:generate` funciona e gera o client.
- `npm run build` conclui sem erros de TypeScript.
- Dependências principais estão coerentes:
  - NestJS 10 + `@nestjs/swagger` 7.
  - `prisma` e `@prisma/client` alinhados em `6.19.2`.
  - `class-validator` / `class-transformer` presentes.
- Persistem algumas vulnerabilidades de baixo/médio/alto risco reportadas pelo `npm audit`, mas concentradas principalmente em ferramentas de desenvolvimento (`@nestjs/cli`, etc.).

## Recomendações futuras

1. Evitar `npm audit fix --force` em projetos complexos
   - Preferir:
     - `npm audit` para inspecionar.
     - `npm audit fix` (sem `--force`) sempre que possível.
   - Quando precisar de *major upgrades*, planejar uma task específica (ex.: upgrade completo para Nest 11 ou Prisma 7).

2. Padronizar o processo de debug
   - Sempre que houver falha de build ou de geração do Prisma:
     - Registrar comandos executados e mensagens de erro neste tipo de documento.
     - Verificar compatibilidade de versões (Nest, Prisma, Swagger, etc.).

3. Próximos testes sugeridos
   - `npm run start:dev` para validar a inicialização da API.
   - Testar healthcheck: `GET /health`.
   - Seguir o fluxo descrito em `docs/backend_initial_setup.md` para criar tenant e testar autenticação por API Key.
   - Rodar testes automatizados quando disponíveis: `npm test`, `npm run test:e2e`.

4. Monitorar atualizações de segurança
   - Rodar `npm audit` periodicamente.
   - Quando for fazer upgrades maiores (Nest 11, Prisma 7), criar um novo documento seguindo o padrão `DATA_TIPO_DO_PROBLEMA_INDICE_DO_ERRO` para rastreabilidade.
