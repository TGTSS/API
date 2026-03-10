# Atualização de Status: Projetos e Clientes

## Resumo das Mudanças

### 1. Novos Status de Projeto

O status do projeto passa a ser **calculado automaticamente pelo backend** baseado no progresso da timeline.

| Status | Valor (enum) | Quando |
|---|---|---|
| Em Prospecção | `PROSPECTING` | Projeto criado (default inicial) |
| Negociação Aprovada | `NEGOTIATION_APPROVED` | Etapa "Assinatura do contrato" concluída |
| Negociação Perdida | `NEGOTIATION_LOST` | Etapa "Assinatura do contrato" recusada |
| Equipe em Campo | `FIELD_TEAM` | Após assinatura, equipe executando etapas técnicas |
| Produção do Projeto | `PROJECT_PRODUCTION` | Etapa "Elaboração do projeto técnico" iniciada/atingida |
| Concluído | `COMPLETED` | Etapa "Entrega ao cliente" concluída |

**Status antigos removidos:** `PENDING`, `IN_PROGRESS`, `CANCELED`

#### Fluxo da Timeline → Status

```
Contato com o cliente
Visita técnica
Elaboração do orçamento
Envio do orçamento
Assinatura do contrato ← PONTO DE DECISÃO
  ├── completed → NEGOTIATION_APPROVED
  └── refused (novo status) → NEGOTIATION_LOST + motivo
Coleta de dados em campo ← FIELD_TEAM (status muda ao iniciar qualquer etapa pós-contrato)
Processamento dos dados
...etapas técnicas...
Elaboração do projeto técnico ← PROJECT_PRODUCTION (status muda ao iniciar esta etapa)
...
Entrega ao cliente ← COMPLETED (status muda ao concluir)
Coleta de NPS
```

#### Mudança no Model TimelineStage

```typescript
interface TimelineStage {
  _id: string;
  title: string;
  date?: Date;
  status: "pending" | "in_progress" | "completed" | "refused"; // NOVO: "refused"
  completedAt?: Date;
  refusedAt?: Date;        // NOVO
  refusalReason?: string;  // NOVO: motivo da recusa
  assignedTo?: string;
}
```

> O status `refused` só é válido para a etapa "Assinatura do contrato". O backend deve validar isso.

#### Lógica do Backend (automática)

Quando uma etapa da timeline for atualizada (`PUT /api/projects/:id/timeline/:stageId`):

```
SE etapa.title contém "contrato" E etapa.status === "refused":
  → projeto.status = "NEGOTIATION_LOST"

SE etapa.title contém "contrato" E etapa.status === "completed":
  → projeto.status = "NEGOTIATION_APPROVED"

SE qualquer etapa APÓS "contrato" mudar para "in_progress" ou "completed":
  → SE projeto.status === "NEGOTIATION_APPROVED":
    → projeto.status = "FIELD_TEAM"

SE etapa.title contém "elaboração do projeto" E etapa.status === "in_progress" ou "completed":
  → projeto.status = "PROJECT_PRODUCTION"

SE etapa.title contém "entrega ao cliente" E etapa.status === "completed":
  → projeto.status = "COMPLETED"
```

> **Matching por título:** Usar `.toLowerCase().includes()` para flexibilidade. As etapas são auto-geradas pelo SERVICE_STAGES do backend.

---

### 2. Novos Status de Cliente

O status do cliente passa a ser **calculado automaticamente pelo backend** baseado nos status dos seus projetos.

| Status | Valor (enum) | Regra |
|---|---|---|
| Em Negociação | `NEGOTIATING` | Tem pelo menos 1 projeto em `PROSPECTING` ou `NEGOTIATION_APPROVED` |
| Ativo | `ACTIVE` | Tem pelo menos 1 projeto em `FIELD_TEAM` ou `PROJECT_PRODUCTION` |
| Perdido | `LOST` | Todos os projetos são `NEGOTIATION_LOST` |
| Parcial | `PARTIAL` | Tem mix de projetos aprovados/ativos E perdidos |
| Finalizado | `COMPLETED` | Todos os projetos são `COMPLETED` |

**Status antigos removidos:** `active`, `invited`, `blocked`, `inactive`

> **Exceção:** Manter `invited` como status temporário antes do primeiro projeto. Um cliente convidado sem projetos fica como `NEGOTIATING` por default.

#### Prioridade de cálculo (quando há múltiplos projetos)

```
1. Se tem QUALQUER projeto FIELD_TEAM ou PROJECT_PRODUCTION → ACTIVE
2. Se tem projetos ativos/aprovados E perdidos → PARTIAL
3. Se tem QUALQUER projeto PROSPECTING ou NEGOTIATION_APPROVED → NEGOTIATING
4. Se TODOS projetos NEGOTIATION_LOST → LOST
5. Se TODOS projetos COMPLETED → COMPLETED
6. Se não tem projetos → NEGOTIATING (default)
```

#### Lógica do Backend (automática)

O status do cliente deve ser recalculado automaticamente:
- Quando o status de qualquer projeto do cliente mudar
- Quando um projeto for criado/deletado para o cliente

Criar uma função `recalculateClientStatus(clientId)` chamada nos endpoints:
- `PUT /api/projects/:id/timeline/:stageId` (após atualizar status do projeto)
- `POST /api/projects` (após criar projeto)
- `DELETE /api/projects/:id` (após deletar projeto)

---

### 3. Cálculos que o Backend Deve Fazer (sugestões)

Além do status, recomendo mover para o backend:

#### 3.1 Dashboard CRM — Endpoint `GET /api/dashboard/metrics`

Retorna todas as métricas do CRM em uma única chamada:

```json
{
  "clients": {
    "total": 25,
    "byStatus": {
      "NEGOTIATING": 5,
      "ACTIVE": 10,
      "LOST": 3,
      "PARTIAL": 2,
      "COMPLETED": 5
    }
  },
  "projects": {
    "total": 40,
    "byStatus": {
      "PROSPECTING": 8,
      "NEGOTIATION_APPROVED": 3,
      "NEGOTIATION_LOST": 5,
      "FIELD_TEAM": 10,
      "PROJECT_PRODUCTION": 6,
      "COMPLETED": 8
    }
  },
  "budgets": {
    "total": 30,
    "approved": 15,
    "rejected": 5,
    "pending": 10,
    "conversionRate": 50,
    "averageValue": 15000
  },
  "financial": {
    "totalIncome": 500000,
    "totalExpense": 200000,
    "balance": 300000,
    "realizedRevenue": 350000,
    "projectedRevenue": 150000,
    "overdueCount": 3,
    "overdueAmount": 25000,
    "monthlyBreakdown": [
      { "month": "2026-01", "income": 80000, "expense": 30000 },
      { "month": "2026-02", "income": 90000, "expense": 35000 }
    ],
    "expensesByCategory": {
      "Abastecimento": 15000,
      "Alimentação": 10000,
      "ART/TRT": 5000
    },
    "revenueByStatus": {
      "paid": 350000,
      "pending": 120000,
      "overdue": 30000
    }
  },
  "team": {
    "total": 8,
    "active": 6
  }
}
```

**Vantagens:**
- 1 chamada ao invés de 5 (getProjects + getClients + getTransactions + getTeam + getBudgets)
- Cálculos pesados no servidor (não no browser)
- Dados já agregados e formatados
- Menos tráfego de rede (não transfere arrays inteiros)

#### 3.2 Auto-detecção de transações vencidas — Cron/Middleware

O backend deveria automaticamente mudar `status: "pending"` → `status: "overdue"` para transações com `dueDate < hoje`.

Opções:
- **Cron job** diário que varre transações pendentes com dueDate passada
- **Middleware** que verifica no `GET /api/transactions`

#### 3.3 Histórico de mudanças de status do projeto

Criar um log automático quando o status muda:

```typescript
interface ProjectStatusLog {
  _id: string;
  projectId: string;
  fromStatus: string;
  toStatus: string;
  changedAt: Date;
  triggeredBy: string; // "timeline_update" | "manual"
  stageTitle?: string; // qual etapa causou a mudança
  refusalReason?: string; // se for NEGOTIATION_LOST
}
```

Endpoint: `GET /api/projects/:id/status-history`

---

### 4. Mudanças no Frontend

#### 4.1 Arquivos que precisam ser atualizados

| Arquivo | Mudança |
|---|---|
| `src/composables/useApi.ts` | Atualizar types ProjectData (status enum), TimelineStage (refused + refusalReason), ClientData (status enum). Adicionar `getDashboardMetrics()`. Remover status antigos. |
| `src/components/StatusBadge.vue` | Novos status com cores e labels em PT-BR |
| `src/views/dashboard/EngineerDashboard.vue` | Usar `getDashboardMetrics()` ao invés de múltiplas chamadas |
| `src/views/dashboard/engineer/ProjectDetailsView.vue` | Adicionar botão "Recusar" na etapa do contrato com modal para motivo |
| `src/views/dashboard/engineer/ProjectsListView.vue` | Atualizar filtros de status |
| `src/views/dashboard/engineer/ClientsView.vue` | Novos badges de status |
| `src/views/dashboard/client/ProjectDetailsClientView.vue` | Novos status labels |
| `src/views/TrackingDetailsView.vue` | Novos status labels no tracking público |

#### 4.2 Mapeamento de cores dos novos status

**Projetos:**
| Status | Cor | Label PT-BR |
|---|---|---|
| `PROSPECTING` | amber/yellow | Em Prospecção |
| `NEGOTIATION_APPROVED` | blue | Negociação Aprovada |
| `NEGOTIATION_LOST` | red | Negociação Perdida |
| `FIELD_TEAM` | cyan | Equipe em Campo |
| `PROJECT_PRODUCTION` | purple | Produção do Projeto |
| `COMPLETED` | green | Concluído |

**Clientes:**
| Status | Cor | Label PT-BR |
|---|---|---|
| `NEGOTIATING` | amber/yellow | Em Negociação |
| `ACTIVE` | blue | Ativo |
| `LOST` | red | Perdido |
| `PARTIAL` | orange | Parcial |
| `COMPLETED` | green | Finalizado |

---

### 5. Mudanças na API (resumo para atualizar API-Implemtion.md)

#### Endpoints modificados:

1. **`PUT /api/projects/:id/timeline/:stageId`**
   - Aceita novo campo: `refusalReason` (string, obrigatório se status === "refused")
   - Efeito colateral: atualiza `project.status` automaticamente
   - Efeito colateral: recalcula `client.status` automaticamente

2. **`POST /api/projects`**
   - Status default muda de `PENDING` → `PROSPECTING`
   - Efeito colateral: recalcula `client.status`

3. **`DELETE /api/projects/:id`**
   - Efeito colateral: recalcula `client.status`

#### Endpoints novos:

4. **`GET /api/dashboard/metrics`**
   - Retorna métricas agregadas do CRM (ver seção 3.1)

5. **`GET /api/projects/:id/status-history`** (opcional)
   - Retorna histórico de mudanças de status

#### Enums atualizados:

6. **Status do Projeto:** `PROSPECTING` | `NEGOTIATION_APPROVED` | `NEGOTIATION_LOST` | `FIELD_TEAM` | `PROJECT_PRODUCTION` | `COMPLETED`

7. **Status do Cliente:** `NEGOTIATING` | `ACTIVE` | `LOST` | `PARTIAL` | `COMPLETED`

8. **Status da Timeline Stage:** `pending` | `in_progress` | `completed` | `refused`

---

### 6. Migração de Dados Existentes

> **CRÍTICO:** Todos os projetos e clientes existentes precisam ser migrados para os novos status sem perda de dados.

#### 6.1 Endpoint de migração: `POST /api/admin/migrate-statuses`

Endpoint protegido (apenas ADMIN/ENGINEER) que roda a migração de forma controlada.

**Comportamento:**

```
1. Buscar TODOS os projetos existentes
2. Para cada projeto, analisar status atual + timeline:

   PENDING → PROSPECTING
     (projeto ainda não começou)

   IN_PROGRESS → análise inteligente pela timeline:
     a) Verificar se etapa "contrato" existe e está "completed"
        - Se NÃO → PROSPECTING (ainda negociando)
        - Se SIM → verificar etapas posteriores:
          - Se etapa "elaboração do projeto" está in_progress/completed → PROJECT_PRODUCTION
          - Se etapa "entrega ao cliente" está completed → COMPLETED
          - Se qualquer etapa pós-contrato está in_progress/completed → FIELD_TEAM
          - Se nenhuma pós-contrato iniciada → NEGOTIATION_APPROVED

   COMPLETED → COMPLETED
     (mantém)

   CANCELED → NEGOTIATION_LOST
     (com refusalReason = "Migrado de status CANCELED")

3. Atualizar cada projeto com o novo status
4. Recalcular status de TODOS os clientes (usando recalculateClientStatus)
5. Gerar relatório da migração
```

**Response `200`:**
```json
{
  "message": "Migração concluída com sucesso",
  "summary": {
    "totalProjects": 40,
    "migrated": {
      "PENDING → PROSPECTING": 8,
      "IN_PROGRESS → FIELD_TEAM": 12,
      "IN_PROGRESS → PROJECT_PRODUCTION": 3,
      "IN_PROGRESS → NEGOTIATION_APPROVED": 2,
      "COMPLETED → COMPLETED": 10,
      "CANCELED → NEGOTIATION_LOST": 5
    },
    "totalClients": 25,
    "clientsRecalculated": 25,
    "clientStatusResults": {
      "NEGOTIATING": 5,
      "ACTIVE": 10,
      "LOST": 3,
      "PARTIAL": 2,
      "COMPLETED": 5
    }
  },
  "details": [
    {
      "projectId": "uuid",
      "projectName": "Projeto X",
      "oldStatus": "IN_PROGRESS",
      "newStatus": "FIELD_TEAM",
      "reason": "Etapas pós-contrato em andamento"
    }
  ]
}
```

#### 6.2 Segurança da migração

- **Idempotente:** pode rodar múltiplas vezes sem causar problemas. Se o projeto já tem um status novo, é ignorado.
- **Dry-run:** aceitar query param `?dryRun=true` que retorna o relatório SEM aplicar mudanças. Permite visualizar o que vai acontecer antes de executar.
- **Backup:** antes de atualizar, salvar os status antigos no log de histórico (seção 3.3).
- **Rollback:** endpoint `POST /api/admin/rollback-statuses` que reverte para os status antigos usando o histórico.

```
POST /api/admin/migrate-statuses?dryRun=true   → Simula, retorna relatório
POST /api/admin/migrate-statuses               → Executa de verdade
POST /api/admin/rollback-statuses              → Reverte usando o histórico
```

#### 6.3 Compatibilidade temporária no frontend

Durante a transição (até a migração rodar), o frontend deve aceitar AMBOS os status (antigos e novos):

```typescript
// StatusBadge.vue — aceitar os dois formatos temporariamente
function normalizeStatus(status: string): string {
  const legacyMap: Record<string, string> = {
    'PENDING': 'PROSPECTING',
    'pending': 'PROSPECTING',
    'IN_PROGRESS': 'FIELD_TEAM',
    'in_progress': 'FIELD_TEAM',
    'CANCELED': 'NEGOTIATION_LOST',
    'canceled': 'NEGOTIATION_LOST',
    'COMPLETED': 'COMPLETED',
    'completed': 'COMPLETED',
  };
  return legacyMap[status] || status;
}
```

Isso garante que a interface funciona mesmo se a migração ainda não rodou.

#### 6.4 Ordem de deploy

```
1. Deploy backend com:
   - Novos enums (aceita antigos E novos)
   - Endpoint de migração
   - Lógica automática de status na timeline
   - recalculateClientStatus()
   - GET /api/dashboard/metrics

2. Rodar migração:
   POST /api/admin/migrate-statuses?dryRun=true  → revisar relatório
   POST /api/admin/migrate-statuses              → executar

3. Deploy frontend com:
   - Novos status/cores/labels
   - Dashboard usando /api/dashboard/metrics
   - Botão "Recusar" na etapa do contrato
   - Compatibilidade legada (normalizeStatus)

4. Após confirmar que tudo funciona:
   - Remover compatibilidade legada do frontend
   - Remover aceitação de status antigos do backend
```
