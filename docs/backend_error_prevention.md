# 🛡️ Boas práticas de prevenção de erros – Backend BFA

> **ID:** BFA-GUIDE-001  
> **Escopo:** Backend / Setup / Runtime  
> **Objetivo:** Consolidar práticas para evitar os principais erros de build, startup, banco e logging.

## 1. Gerenciamento de dependências (npm)

- Evite `npm audit fix --force` em projetos com múltiplas dependências críticas (Nest, Prisma, etc.).
  - Use primeiro:
    - `npm audit` para inspecionar.
    - `npm audit fix` (sem `--force`) quando possível.
  - Reserve `--force` apenas para casos em que você esteja disposto a lidar com upgrades *major* e possíveis quebras.
- Sempre que houver grandes atualizações:
  - Verifique compatibilidade entre:
    - Versão do NestJS (`@nestjs/common`, `@nestjs/core`).
    - Versão do `@nestjs/swagger`.
    - Versão do `prisma` e `@prisma/client`.
  - Registre mudanças importantes e problemas em `docs/tests/` usando o padrão `DATA_TIPO_INDICE`.

## 2. Prisma, migrations e conexão com o banco

- Após configurar `DATABASE_URL` em `.env`:
  - Rode `npm run prisma:generate` para gerar o Prisma Client.
  - Rode `npm run prisma:migrate` para aplicar o schema ao banco.
- Sintomas comuns e como evitar:
  - Erro: `The table "public.Tenant" does not exist in the current database`.
    - Causa: migrations ainda não foram aplicadas.
    - Prevenção: garantir que `npm run prisma:migrate` foi executado com sucesso antes de testar os endpoints.
  - Erros de tipo nativo no schema (`@db.Numeric` não suportado, etc.).
    - Manter o schema alinhado à versão do Prisma em uso (ex.: usar `@db.Decimal` na versão 6).
- Sempre que trocar de banco (novo projeto Supabase, por exemplo):
  - Atualizar `DATABASE_URL`.
  - Rodar novamente `npm run prisma:migrate` e `npm run prisma:generate`.

## 3. Variáveis de ambiente (.env)

- Campos mínimos recomendados:

  ```env
  DATABASE_URL=postgresql://usuario:senha@host:5432/postgres
  NODE_ENV=development
  LOG_LEVEL=info
  PORT=3000
  ```

- Boas práticas:
  - Nunca commitar `.env` com credenciais reais.
  - Usar `.env.example` (futuro) para indicar o formato esperado.
  - Verificar se `NODE_ENV` está em `development` para permitir logging com `pino-pretty`.

## 4. Logging (pino / nestjs-pino)

- Quando usar transports customizados (ex.: `pino-pretty`):
  - Certifique-se de instalar o pacote correspondente:

    ```bash
    npm install -D pino-pretty
    ```

  - Em `development`, o módulo de logging está configurado para:

    - Usar `target: 'pino-pretty'`.
    - Formatar logs em uma linha, coloridos.

- Se aparecer erro `unable to determine transport target for "pino-pretty"`:
  - Causa provável: `pino-pretty` ausente ou incompatível.
  - Ação: instalar o pacote na versão indicada pelo `pino` e tentar novamente.

## 5. Startup da API e testes básicos

- Antes de testar qualquer endpoint:
  - Rodar:

    ```bash
    npm run build
    npm run start:dev
    ```

  - Confirmar no console que não há erros de inicialização (database, logging, config).
- Testes básicos de fumaça (smoke tests):
  - `GET /health` deve retornar `200`.
  - `POST /tenants` deve criar um tenant e uma API Key.
  - `GET /tenants/:id` com a API Key correta deve retornar o tenant.

## 6. Documentação de incidentes e testes

- Sempre que ocorrer um erro relevante (build, startup, banco, autenticação):
  - Criar um arquivo em `docs/tests/` com o padrão:

    ```
    AAAA-MM-DD_TIPO_DO_PROBLEMA_INDICE.md
    ```

  - Exemplo:
    - `2026-02-13_BUILD_DEPENDENCIAS_001.md`.
    - `2026-02-13_STARTUP_LOGGING_002.md`.
    - `2026-02-13_TENANTS_APIKEY_003.md`.
- Estrutura sugerida do documento:
  - Contexto.
  - Sintomas.
  - Análise de causa raiz.
  - Ações executadas.
  - Estado atual.
  - Recomendações de prevenção.

## 7. Próximos passos sugeridos

- Criar um `.env.example` com placeholders para facilitar onboarding.
- Adicionar scripts de teste rápido (ex.: `npm run smoke`) que executem uma sequência mínima de validações de saúde.
- Integrar essas práticas ao fluxo de CI/CD futuro, garantindo que builds falhem cedo em caso de problemas de migração, conexão ou dependências.
