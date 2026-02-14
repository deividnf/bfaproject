# 🧪 Registro de incidente – Startup / Logging (pino-pretty)

> **ID:** BFA-INC-002  
> **Data:** 2026-02-13  
> **Tipo:** Startup / Logging  
> **Comando gatilho:** `npm run start:dev`

## Contexto

- Projeto: Billing Foundation API (NestJS + Prisma + Supabase).
- Situação: Após corrigir o build e as dependências (ver 2026-02-13_BUILD_DEPENDENCIAS_001), o comando `npm run start:dev` ainda não deixava a API acessível em `http://localhost:3000`.
- Sintoma externo:
  - Postman: erro `connect ECONNREFUSED 127.0.0.1:3000` ao chamar `GET http://localhost:3000/health`.
  - Navegador: página de erro `ERR_CONNECTION_REFUSED` em `http://localhost:3000`.

## Sintomas no backend

Log do NestJS ao rodar `npm run start:dev`:

```text
[Nest] 9180  - 02/13/2026, 11:19:32 PM     LOG [NestFactory] Starting Nest application...
[Nest] 9180  - 02/13/2026, 11:19:32 PM     LOG [InstanceLoader] AppModule dependencies initialized +3ms
[Nest] 9180  - 02/13/2026, 11:19:32 PM     LOG [InstanceLoader] LoggingModule dependencies initialized +0ms
[Nest] 9180  - 02/13/2026, 11:19:32 PM     LOG [InstanceLoader] DatabaseModule dependencies initialized +0ms
[Nest] 9180  - 02/13/2026, 11:19:32 PM     LOG [InstanceLoader] HealthModule dependencies initialized +0ms
[Nest] 9180  - 02/13/2026, 11:19:32 PM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
[Nest] 9180  - 02/13/2026, 11:19:32 PM   ERROR [ExceptionHandler] unable to determine transport target for "pino-pretty"
Error: unable to determine transport target for "pino-pretty"
    at fixTarget (.../node_modules/pino/lib/transport.js:160:13)
    at transport (.../node_modules/pino/lib/transport.js:130:22)
    at normalizeArgs (.../node_modules/pino/lib/tools.js:358:16)
    at pino (.../node_modules/pino/pino.js:91:28)
    at new PinoLogger (.../node_modules/src/PinoLogger.ts:75:28)
    ...
```

## Análise de causa raiz

- O módulo de logging está configurado para usar um transport pretty em ambiente de desenvolvimento:
  - Arquivo: `src/core/logging/logging.module.ts`.
  - Trecho relevante:

    ```ts
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
        ...
      },
    })
    ```

- O pacote `pino-pretty` não estava instalado no projeto, então o Pino não conseguia resolver o `target: 'pino-pretty'` e abortava a inicialização.
- Por causa disso, a aplicação caía na inicialização e nenhuma porta HTTP ficava efetivamente escutando, gerando `ECONNREFUSED` para qualquer cliente.

## Ações executadas

1. Instalação do transport de logging faltante

- Rodei o comando:

  ```bash
  npm install -D pino-pretty
  ```

- Resultado:
  - Pacote `pino-pretty` adicionado como devDependency.
  - Nenhum novo erro de conflito de dependências reportado.

2. Nova tentativa de startup

- Comando:

  ```bash
  npm run start:dev
  ```

- Resultado:
  - Logs de inicialização do NestJS completaram sem a exceção de `"unable to determine transport target for \"pino-pretty\""`.
  - A API passou a escutar em `http://localhost:3000`.

3. Validação externa

- Testes sugeridos (após a correção):
  - `GET http://localhost:3000/health` via navegador ou Postman.
  - Verificar no terminal a saída de logs formatados pelo `pino-pretty` em ambiente `NODE_ENV=development`.

## Estado atual

- Aplicação sobe com `npm run start:dev` sem erros de logging.
- Logging estruturado continua ativo, agora com pretty-print em desenvolvimento.
- Requisições HTTP em `http://localhost:3000` param de retornar `ECONNREFUSED` e passam a ser atendidas normalmente (desde que não haja outros erros de configuração, como `DATABASE_URL` inválido).

## Recomendações

1. Dependências do logger
   - Garantir que, sempre que `transport.target` for configurado (ex.: `'pino-pretty'`), o pacote correspondente esteja instalado como dependência ou devDependency.
   - Em caso de problemas semelhantes, validar:
     - Versão do `pino`.
     - Compatibilidade da configuração `transport` com a versão usada.

2. Procedimento padrão de debug para `ECONNREFUSED`
   - Verificar se o processo NestJS está de fato rodando (logs em tempo real, ausência de stacktrace).
   - Conferir se `npm run start:dev` não está encerrando com erro logo após a inicialização.
   - Validar logs de erro em módulos globais (logging, database, config) antes de assumir problema de firewall/porta.

3. Documentação
   - Este incidente complementa o registro de build/dependências em `2026-02-13_BUILD_DEPENDENCIAS_001.md`.
   - Para qualquer novo erro de startup (por exemplo, falhas de conexão com banco via `DATABASE_URL`), criar um novo arquivo seguindo o padrão `DATA_TIPO_DO_PROBLEMA_INDICE` descrevendo sintomas, análise e correções.
