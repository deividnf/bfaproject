# 📋 Especificação de Requisitos – Billing Foundation API

> **ID:** BFA-REQ-001  
> **Escopo:** Requisitos funcionais e não funcionais da BFA (MVP + visão futura)  
> **Relacionados:** context/bfa_document.md, docs/bfa_architecture_overview.md

Este documento consolida os requisitos funcionais (RF) e não funcionais (RNF) da Billing Foundation API, alinhados ao estudo de caso completo em context/bfa_document.md.

---

## 1. Visão geral e escopo

A BFA é responsável por:

- Gestão multi-tenant (tenants, planos, API Keys).
- Registro e governança de eventos de uso (usage-based).
- Aplicação de limites de uso por plano.
- Ciclos de billing com invoices simuladas (mock).
- Garantia de auditabilidade, idempotência e isolamento multi-tenant.

O **MVP atual** implementa integralmente a parte de **tenants + API Keys**, modelagem de dados completa e observabilidade básica. Os demais requisitos são parcialmente atendidos ou planejados, conforme indicado abaixo.

---

## 2. Requisitos funcionais (RF)

### 2.1 Gestão de tenants (GT)

- **RF.GT.001 – Criação de tenant**  
  O sistema deve permitir a criação de novos tenants, registrando nome, status inicial e datas de criação/atualização.

- **RF.GT.002 – Ativação/Desativação de tenant**  
  O sistema deve permitir alterar o status de um tenant para `ACTIVE`, `INACTIVE` ou `SUSPENDED`, controlando o acesso à API.

- **RF.GT.003 – Associação de plano a tenant**  
  O sistema deve permitir associar um plano de billing a um tenant (`tenant.planId`), definindo limites de uso e regras de faturamento simuladas.

- **RF.GT.004 – Geração de API Keys**  
  O sistema deve gerar uma ou mais API Keys por tenant, usadas para autenticação das requisições.

- **RF.GT.005 – Revogação de API Keys**  
  O sistema deve permitir revogar API Keys, marcando-as como `REVOKED` e impedindo novos acessos.

- **RF.GT.006 – Consulta de detalhes de tenant**  
  O sistema deve permitir a leitura dos dados de um tenant, respeitando o isolamento multi-tenant (um tenant só pode ver a si mesmo via API Key).

Status no MVP:

- RF.GT.001 e RF.GT.006 – **Implementados** (POST /tenants, GET /tenants/:id).
- RF.GT.004 – **Implementado** (geração automática de API Key na criação de tenant).
- RF.GT.002, RF.GT.003, RF.GT.005 – **Modelados no domínio**, mas ainda sem endpoints dedicados.

### 2.2 Registro de eventos de uso (RU)

- **RF.RU.001 – Registro de UsageEvent**  
  O sistema deve aceitar e registrar eventos de uso (`UsageEvent`) com `tenantId`, `metricName`, `value`, `occurredAt`.

- **RF.RU.002 – Suporte a idempotencyKey**  
  O sistema deve processar requisições de uso de forma idempotente, usando `idempotencyKey` único por tenant (`@@unique([tenantId, idempotencyKey])`).

- **RF.RU.003 – Associação de evento a tenant**  
  Cada evento de uso deve ser associado inequivocamente a um tenant.

Status no MVP:

- Estrutura de dados (`UsageEvent`) – **implementada no schema**.
- Endpoints / lógica de fluxo – **planejados**, ainda não implementados.

### 2.3 Agregação de consumo (AC)

- **RF.AC.001 – Consolidação diária de consumo**  
  O sistema deve consolidar eventos de uso por tenant/métrica em períodos diários.

- **RF.AC.002 – Consolidação mensal de consumo**  
  O sistema deve consolidar consumo mensal por tenant para base de billing.

- **RF.AC.003 – Consulta de consumo atual**  
  O sistema deve permitir consultas de consumo acumulado em tempo quase real.

- **RF.AC.004 – Consulta de histórico de consumo**  
  O sistema deve permitir consultas de histórico de consumo acumulado por período.

Status no MVP: **conceitual/modelado**, sem implementação de serviços nem endpoints.

### 2.4 Planos e limites (PL)

- **RF.PL.001 – Criação de planos com limite mensal**  
  O sistema deve permitir criar planos com limites mensais de consumo (por métrica ou agregado).

- **RF.PL.002 – Validação de limites no registro de uso**  
  No momento de registrar um evento de uso, o sistema deve verificar se o novo consumo ultrapassaria o limite do plano.

- **RF.PL.003 – Retorno de erro por limite excedido**  
  Caso um limite seja excedido, o sistema deve retornar um erro claro (ex.: `403 Forbidden`) indicando o bloqueio por limite.

Status no MVP:

- Modelagem de `Plan` – **implementada no schema**.
- Lógica de limites – **planejada**, ainda não implementada.

### 2.5 Ciclo de billing mock (BC)

- **RF.BC.001 – Fechamento de ciclo de billing**  
  O sistema deve permitir fechar ciclos de billing (ex.: mensal) por tenant.

- **RF.BC.002 – Geração de Invoice mock**  
  Após o fechamento, o sistema deve gerar `Invoice` simulada com resumo de consumo e valor calculado.

- **RF.BC.003 – Gerenciamento de status de Invoice**  
  O sistema deve permitir transições de status (`DRAFT`, `ISSUED`, `PAID`, `VOID`).

- **RF.BC.004 – Consulta de histórico de Invoices**  
  O sistema deve permitir consultar invoices antigas por tenant.

Status no MVP:

- Modelagem de `Invoice` – **implementada no schema**.
- Serviços/endpoints de billing – **planejados**, ainda não implementados.

### 2.6 Observabilidade e auditoria (OB)

- **RF.OB.001 – Logs estruturados por requisição**  
  Toda requisição deve gerar log estruturado com contexto mínimo (request_id, tenant_id, api_key_id, status, latência).

- **RF.OB.002 – Registro de eventos relevantes**  
  Criação de tenant, geração/revogação de API Key, registro de uso e fechamento de billing devem ser auditáveis.

Status no MVP:

- RF.OB.001 – **implementado** (Pino + nestjs-pino).
- RF.OB.002 – **parcial** (tenants + API Key já geram logs; demais fluxos virão com novos módulos).

---

## 3. Requisitos não funcionais (RNF)

### 3.1 Isolamento multi-tenant (IMT)

- **RNF.IMT.001 – Isolamento de dados**  
  Nenhum tenant deve conseguir acessar dados de outro tenant.

- **RNF.IMT.002 – Isolamento de recursos**  
  O consumo de recursos por um tenant não deve degradar de forma incontrolada a experiência de outros.

Status no MVP:

- IMT.001 – **garantido logicamente** via `tenantId` e middleware de API Key.
- IMT.002 – **planejado**; será endereçado com rate limiting e quotas em módulos futuros.

### 3.2 Idempotência (ID)

- **RNF.ID.001 – Idempotência de operações críticas**  
  Operações de registro de uso e billing devem ser idempotentes, evitando duplicidade de eventos ou faturas.

Status no MVP:

- Estrutura de idempotência em `UsageEvent` – **modelada**.
- Implementação de fluxo de uso e billing – **pendente**.

### 3.3 Consistência sob concorrência (CSC)

- **RNF.CSC.001 – Consistência de dados**  
  O sistema deve garantir consistência de dados em cenários concorrentes, aceitando consistência eventual para dados agregados.

- **RNF.CSC.002 – Integridade transacional**  
  Operações críticas (ex.: geração de Invoice) devem ser transacionais.

Status no MVP: conceitos prontos, ainda sem cenários concorrentes intensos implementados.

### 3.4 Auditabilidade (AUD)

- **RNF.AUD.001 – Registro de auditoria**  
  Operações críticas devem ser registradas com `tenantId`, timestamp e tipo de operação.

- **RNF.AUD.002 – Rastreabilidade ponta a ponta**  
  Deve ser possível rastrear um valor de Invoice até os eventos de uso que a originaram.

Status no MVP:

- AUD.001 – **parcialmente atendido** via logs estruturados; será ampliado com billing e usage.
- AUD.002 – **planejado** (depende de agregação e billing completos).

### 3.5 Escalabilidade (EH)

- **RNF.EH.001 – Escalabilidade de ingestão**  
  A arquitetura deve suportar aumento de throughput de eventos de uso.

- **RNF.EH.002 – Escalabilidade de processamento**  
  Processos de agregação e billing devem escalar horizontalmente.

Status no MVP: modelado conceitualmente; implementação ficará para fases futuras.

### 3.6 Observabilidade (OBS)

- **RNF.OBS.001 – Monitoramento e métricas**  
  O sistema deve expor métricas e logs suficientes para monitoramento.

- **RNF.OBS.002 – Alerta precoce**  
  Deve haver capacidade futura de alertar sobre falhas ou limites.

Status no MVP:

- OBS.001 – **parcial** (logs estruturados prontos; métricas e alertas ainda não configurados).
- OBS.002 – **planejado**.

### 3.7 Segurança (SEG)

- **RNF.SEG.001 – Armazenamento seguro de credenciais**  
  API Keys jamais devem ser armazenadas em texto claro, apenas hashes.

- **RNF.SEG.002 – Validação de entrada**  
  Entradas devem ser validadas para evitar injeção e outras vulnerabilidades.

- **RNF.SEG.003 – Rate limiting**  
  Deve existir proteção contra abuso (DoS) por tenant.

Status no MVP:

- SEG.001 – **implementado** (hash de API Key).
- SEG.002 – **parcialmente implementado** (DTOs + validações NestJS).
- SEG.003 – **planejado** (ficará em camada de middleware/gateway no futuro).

---

## 4. Mapeamento para o MVP atual

Resumo do que já está efetivamente entregue no código:

- Gestão de tenants e API Keys – **operacional**, com autenticação e isolamento lógico.
- Modelagem completa do domínio em Prisma – **implementada**.
- Logging estruturado – **operacional**.
- Setup de conexão Supabase/PostgreSQL – **operacional** via `DATABASE_URL`.

Os requisitos restantes estão parcialmente atendidos ou planejados e servirão de guia para as próximas etapas do roadmap (usage, billing, aggregation, observabilidade avançada).
