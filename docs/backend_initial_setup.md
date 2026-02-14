Backend Inicial – Setup Rápido
==============================

> **ID:** BFA-SETUP-001  
> **Objetivo:** Guia mínimo para subir o backend localmente (sem Docker).  
> **Pré-requisito:** Ver também BFA-GUIDE-001 em docs/backend_error_prevention.md.

Passos básicos
--------------

1. Instalar dependências

Na raiz do projeto:

    npm install

2. Rodar migrations do Prisma (Supabase)

Certifique-se de que o arquivo .env contém uma DATABASE_URL válida apontando para o banco do Supabase.

Então execute:

    npx prisma migrate dev --name init

3. Subir a API em desenvolvimento

    npm run start:dev

4. Testar o healthcheck

    curl http://localhost:3000/health

5. Criar um tenant

    curl -X POST http://localhost:3000/tenants \
      -H "Content-Type: application/json" \
      -d '{"name":"Tenant Demo"}'

A resposta conterá o tenant.id e uma apiKey.key em texto claro para uso futuro.

6. Consultar tenant protegido por API Key

    curl http://localhost:3000/tenants/<TENANT_ID> \
      -H "x-api-key: <API_KEY_RETORNADA>"

Se a API Key for válida e pertencer ao tenant solicitado, os dados do tenant serão retornados.
