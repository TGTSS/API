# Vale GNSS - API Documentation

> Documentação completa da API para integração com o frontend.
> **Base URL:** `{API_URL}`

---

## Sumário

- [Autenticação](#autenticação)
- [Usuários](#usuários)
- [Clientes](#clientes)
- [Portal do Cliente](#portal-do-cliente)
- [Projetos](#projetos)
- [Timeline do Projeto](#timeline-do-projeto)
- [Responsáveis Técnicos](#responsáveis-técnicos)
- [Documentos do Projeto](#documentos-do-projeto)
- [Financeiro (Projeto)](#financeiro-projeto)
- [Financeiro Geral](#financeiro-geral)
- [Orçamentos (Budget)](#orçamentos-budget)
- [Motivos de Recusa](#motivos-de-recusa)
- [Equipe](#equipe)
- [Calendário](#calendário)
- [E-mail / Orçamento](#e-mail--orçamento)
- [Dashboard](#dashboard)
- [Migração / Admin](#migração--admin)
- [Models / DTOs](#models--dtos)
- [Enums e Constantes](#enums-e-constantes)

---

## Autenticação

### `POST /api/auth/register`

Registra um novo usuário.

**Content-Type:** `multipart/form-data`

| Campo      | Tipo   | Obrigatório | Descrição                                       |
| ---------- | ------ | ----------- | ----------------------------------------------- |
| `name`     | string | Sim         | Nome do usuário                                 |
| `email`    | string | Sim         | E-mail (único)                                  |
| `password` | string | Sim         | Senha (será hasheada com bcrypt, salt 12)        |
| `role`     | string | Não         | `ADMIN` \| `ENGINEER` \| `CLIENT` \| `CARTORIO` (default: `ENGINEER`) |
| `phone`    | string | Não         | Telefone                                        |
| `avatar`   | file   | Não         | Imagem de avatar (upload Cloudinary)             |

**Response `200`:**
```json
{
  "message": "Usuário registrado com sucesso!",
  "user": { "_id", "name", "email", "role", "phone", "avatar", "createdAt" }
}
```

**Errors:** `400` campo faltando | `400` e-mail já existe

---

### `POST /api/auth/login`

Autentica um usuário.

| Campo      | Tipo   | Obrigatório |
| ---------- | ------ | ----------- |
| `email`    | string | Sim         |
| `password` | string | Sim         |

**Response `200`:**
```json
{
  "message": "Login realizado com sucesso!",
  "user": { "_id", "name", "email", "role", "phone", "avatar", "createdAt" }
}
```

> **Nota:** O campo `password` é excluído da resposta.

**Errors:** `404` usuário não encontrado | `401` senha inválida

---

## Usuários

### `GET /api/users`

Lista todos os usuários.

**Response `200`:**
```json
[
  { "_id", "name", "email", "role", "phone", "createdAt" }
]
```

---

### `GET /api/users/:id`

Retorna detalhes de um usuário.

**Response `200`:**
```json
{
  "_id", "name", "email", "role", "phone", "avatar", "clients", "createdAt"
}
```

**Errors:** `404` usuário não encontrado

---

### `PUT /api/users/:id`

Atualiza um usuário.

| Campo   | Tipo   | Obrigatório |
| ------- | ------ | ----------- |
| `name`  | string | Não         |
| `email` | string | Não         |
| `phone` | string | Não         |
| `role`  | string | Não         |

**Response `200`:** Objeto do usuário atualizado.

---

### `DELETE /api/users/:id`

Deleta um usuário.

**Response `200`:**
```json
{ "message": "Usuário deletado com sucesso!", "id": "uuid" }
```

---

### `GET /api/users/:userId/clients`

Lista clientes vinculados a um usuário (cartório).

**Response `200`:** Array de objetos Client (populated).

---

### `POST /api/users/:userId/clients`

Vincula um cliente a um usuário.

| Campo      | Tipo   | Obrigatório |
| ---------- | ------ | ----------- |
| `clientId` | string | Sim         |

**Response `200`:** Usuário com clients populated.

**Errors:** `400` cliente já vinculado

---

### `DELETE /api/users/:userId/clients/:clientId`

Remove vínculo de cliente do usuário.

**Response `200`:** Usuário atualizado com clients populated.

---

## Clientes

### `GET /api/clients`

Lista clientes com paginação e busca.

**Query Params:**

| Param    | Tipo   | Default | Descrição                          |
| -------- | ------ | ------- | ---------------------------------- |
| `page`   | number | 1       | Página atual                       |
| `limit`  | number | 50      | Itens por página                   |
| `search` | string | —       | Busca por nome, documento ou email |

**Response `200`:**
```json
{
  "clients": [Client],
  "totalPages": 1,
  "currentPage": 1,
  "totalClients": 10
}
```

---

### `POST /api/clients`

Cria um novo cliente.

| Campo         | Tipo   | Obrigatório |
| ------------- | ------ | ----------- |
| `name`        | string | Sim         |
| `document`    | string | Sim         |
| `email`       | string | Não         |
| `phone`       | string | Sim         |
| `address`     | string | Não         |
| `contactName` | string | Não         |
| `notes`       | string | Não         |

**Response `201`:** Objeto do cliente criado.

---

### `GET /api/clients/:id`

Retorna detalhes do cliente e seus 5 projetos mais recentes.

**Response `200`:**
```json
{
  "client": { Client },
  "recentProjects": [Project]
}
```

---

### `PUT /api/clients/:id`

Atualiza um cliente.

**Response `200`:** Objeto do cliente atualizado.

---

### `DELETE /api/clients/:id`

Deleta um cliente, seus documentos no Cloudinary e o usuário vinculado.

**Response `200`:**
```json
{ "message": "Cliente deletado com sucesso" }
```

---

### `POST /api/clients/:id/invite`

Envia convite de acesso ao portal do cliente.

**Response `200`:**
```json
{
  "message": "Convite enviado com sucesso",
  "link": "https://app.valegnss.com.br/portal/ativar?code=123456&email=...",
  "code": "123456"
}
```

> Gera código de 6 dígitos, válido por 7 dias. Atualiza status do cliente para `invited`.

---

### Documentos do Cliente

#### `POST /api/clients/:id/documents`

**Content-Type:** `multipart/form-data`

| Campo   | Tipo   | Obrigatório | Descrição              |
| ------- | ------ | ----------- | ---------------------- |
| `files` | file[] | Sim         | Arquivos para upload   |

**Response `200`:**
```json
[
  {
    "name": "arquivo.pdf",
    "url": "https://res.cloudinary.com/...",
    "publicId": "vale/documents/...",
    "type": "application/pdf",
    "size": 102400,
    "uploadedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

#### `DELETE /api/clients/:id/documents/:docId`

**Response `200`:**
```json
{ "message": "Documento removido com sucesso" }
```

---

## Portal do Cliente

### `GET /api/portal/profile`

Retorna perfil do cliente autenticado.

**Headers:**

| Header      | Descrição       |
| ----------- | --------------- |
| `x-user-id` | ID do usuário   |

**Response `200`:** Objeto Client com user populated.

---

### `POST /api/portal/activate`

Ativa a conta do cliente no portal.

| Campo      | Tipo   | Obrigatório |
| ---------- | ------ | ----------- |
| `code`     | string | Sim         |
| `name`     | string | Sim         |
| `email`    | string | Sim         |
| `password` | string | Sim         |

**Response `200`:**
```json
{
  "message": "Conta ativada com sucesso!",
  "user": { User }
}
```

**Errors:** `400` convite inválido/expirado/já usado | `400` e-mail já registrado

---

### `GET /api/portal/projects`

Lista projetos do cliente autenticado.

**Headers:** `x-user-id`

**Response `200`:** Array de projetos do cliente.

---

### `GET /api/portal/projects/:id`

Detalhes de um projeto do cliente.

**Headers:** `x-user-id`

**Response `200`:** Projeto com `technicalLead` populated (name, email, phone).

**Errors:** `403` projeto não pertence ao cliente

---

## Projetos

### `GET /api/projects`

Lista projetos com filtro.

**Query Params:**

| Param      | Tipo   | Descrição                                     |
| ---------- | ------ | --------------------------------------------- |
| `status`   | string | `PROSPECTING` \| `NEGOTIATION_APPROVED` \| `NEGOTIATION_LOST` \| `FIELD_TEAM` \| `PROJECT_PRODUCTION` \| `COMPLETED` |
| `clientId` | string | Filtrar por cliente                            |

**Response `200`:** Array de projetos com `clientId` e `technicalLead` populated.

---

### `POST /api/projects`

Cria um novo projeto.

**Content-Type:** `multipart/form-data`

| Campo          | Tipo   | Obrigatório | Descrição                                |
| -------------- | ------ | ----------- | ---------------------------------------- |
| `name`         | string | Sim         | Nome do projeto                          |
| `description`  | string | Sim         | Descrição                                |
| `serviceType`  | string | Sim         | Tipo de serviço (ver constantes)         |
| `status`       | string | Não         | Default: `PROSPECTING` (auto-calculado)  |
| `location`     | string | Não         | Endereço                                 |
| `latitude`     | number | Não         | Latitude                                 |
| `longitude`    | number | Não         | Longitude                                |
| `startDate`    | date   | Não         | Data de início                           |
| `deadline`     | date   | Não         | Prazo                                    |
| `deliveryDays` | number | Não         | Dias para entrega                        |
| `budget`       | number | Sim         | Valor do orçamento                       |
| `clientId`     | string | Sim         | ID do cliente                            |
| `registry`     | string | Não         | Cartório / Registro                      |
| `hasDeed`      | string | Não         | `yes` \| `no` (default: `no`)           |
| `area`         | string | Não         | Área                                     |
| `perimeter`    | string | Não         | Perímetro                                |
| `imagem`       | file   | Não         | Imagem do projeto (upload Cloudinary)    |

> O código é auto-gerado sequencialmente: `PROJ-01`, `PROJ-02`, etc.
> A timeline é auto-preenchida com as etapas do `SERVICE_STAGES` correspondente ao `serviceType`.

**Response `201`:** Projeto criado com timeline populated.

---

### `GET /api/projects/:id`

Retorna detalhes do projeto.

**Response `200`:**
```json
{
  "project": { Project },
  "timeline": [TimelineStage],
  "financials": [FinancialTransaction]
}
```

---

### `GET /api/projects/code/:code`

Busca projeto pelo código (ex: `PROJ-01`).

**Response `200`:** Mesmo formato do `GET /api/projects/:id`.

---

### `PUT /api/projects/:id`

Atualiza um projeto.

**Content-Type:** `multipart/form-data`

Aceita todos os campos do POST. A imagem antiga é removida do Cloudinary ao enviar uma nova.

**Response `200`:** Projeto atualizado.

---

### `DELETE /api/projects/:id`

Deleta um projeto. Remove referência do cliente e imagem do Cloudinary.

**Response `200`:** Objeto do projeto deletado.

---

## Timeline do Projeto

### `POST /api/projects/:id/timeline`

Adiciona uma etapa à timeline.

| Campo        | Tipo   | Obrigatório |
| ------------ | ------ | ----------- |
| `title`      | string | Sim         |
| `date`       | date   | Não         |
| `status`     | string | Não         |
| `assignedTo` | string | Não         |

**Response `200`:** Projeto atualizado com nova timeline.

---

### `PUT /api/projects/:id/timeline/reorder`

Reordena as etapas da timeline.

| Campo      | Tipo     | Obrigatório | Descrição                        |
| ---------- | -------- | ----------- | -------------------------------- |
| `stageIds` | string[] | Sim         | IDs das etapas na nova ordem     |

**Response `200`:**
```json
{ "project": { Project } }
```

---

### `PUT /api/projects/:id/timeline/:stageId`

Atualiza uma etapa da timeline. **O status do projeto é recalculado automaticamente.**

| Campo           | Tipo   | Obrigatório | Descrição                                     |
| --------------- | ------ | ----------- | --------------------------------------------- |
| `title`         | string | Não         | Título da etapa                               |
| `date`          | date   | Não         | Data                                          |
| `status`        | string | Não         | `pending` \| `in_progress` \| `completed` \| `refused` |
| `assignedTo`    | string | Não         | ID do TeamMember                              |
| `refusalReason` | string | Condicional | Obrigatório se status = `refused`             |

> - Quando `status` muda para `completed`, `completedAt` é preenchido automaticamente.
> - Quando `status` muda para `refused`, `refusedAt` é preenchido. O status `refused` só é válido para a etapa de contrato.
> - **Efeito colateral:** Atualiza `project.status` automaticamente e recalcula `client.status`.

**Response `200`:** Projeto atualizado.

---

### `DELETE /api/projects/:id/timeline/:stageId`

Remove uma etapa da timeline.

**Response `200`:** Projeto atualizado.

---

## Responsáveis Técnicos

### `POST /api/projects/:id/technical-leads`

Adiciona responsáveis técnicos ao projeto.

| Campo            | Tipo     | Obrigatório |
| ---------------- | -------- | ----------- |
| `technicalLeads` | string[] | Sim         |

**Response `200`:** Projeto com `technicalLead` populated.

---

### `DELETE /api/projects/:id/technical-leads/:leadId`

Remove um responsável técnico.

**Response `200`:** Projeto com `technicalLead` populated.

---

## Documentos do Projeto

### `POST /api/projects/:id/documents`

**Content-Type:** `multipart/form-data`

| Campo   | Tipo   | Obrigatório |
| ------- | ------ | ----------- |
| `files` | file[] | Sim         |

**Response `200`:**
```json
[
  { "name", "url", "publicId", "type", "size", "uploadedAt" }
]
```

### `DELETE /api/projects/:id/documents/:docId`

**Response `200`:**
```json
{ "message": "Documento removido com sucesso" }
```

---

## Financeiro (Projeto)

### `GET /api/transactions`

Lista transações financeiras.

**Query Params:**

| Param       | Tipo   | Descrição                |
| ----------- | ------ | ------------------------ |
| `projectId` | string | Filtrar por projeto      |
| `type`      | string | `INCOME` \| `EXPENSE`   |

**Response `200`:** Array de transações ordenadas por data (DESC).

---

### `POST /api/transactions`

Cria uma transação financeira.

| Campo         | Tipo   | Obrigatório | Descrição                        |
| ------------- | ------ | ----------- | -------------------------------- |
| `projectId`   | string | Sim         | ID do projeto                    |
| `type`        | string | Sim         | `INCOME` \| `EXPENSE`           |
| `category`    | string | Sim         | Categoria                        |
| `amount`      | number | Sim         | Valor (> 0)                      |
| `description` | string | Sim         | Descrição                        |
| `date`        | date   | Não         | Default: now                     |
| `dueDate`     | date   | Não         | Data de vencimento               |
| `status`      | string | Não         | `paid` \| `pending` \| `overdue` |

**Response `201`:** Transação criada.

**Errors:** `400` projeto não encontrado | `400` tipo inválido | `400` valor <= 0

---

### `GET /api/transactions/:id`

**Response `200`:** Transação com `projectId` populated.

---

### `PUT /api/transactions/:id`

Atualiza uma transação. Aceita os mesmos campos do POST.

**Response `200`:** Transação atualizada.

---

### `DELETE /api/transactions/:id`

Deleta transação e seus anexos do Cloudinary.

**Response `200`:**
```json
{ "message": "Transação deletada com sucesso" }
```

---

### `GET /api/projects/:projectId/financial-summary`

Resumo financeiro de um projeto.

**Response `200`:**
```json
{
  "totalIncome": 15000,
  "totalExpense": 5000,
  "balance": 10000,
  "paidIncome": 10000,
  "paidExpense": 3000,
  "paidBalance": 7000,
  "transactionCount": 8
}
```

---

### Anexos de Transação

#### `POST /api/transactions/:id/attachments`

**Content-Type:** `multipart/form-data`

| Campo   | Tipo   | Obrigatório |
| ------- | ------ | ----------- |
| `files` | file[] | Sim         |

**Response `200`:**
```json
[{ "name", "url", "publicId", "type", "size", "uploadedAt" }]
```

#### `DELETE /api/transactions/:id/attachments/:attachmentId`

**Response `200`:**
```json
{ "message": "Anexo removido com sucesso" }
```

---

## Financeiro Geral

> Lançamentos financeiros **não vinculados a projetos** (despesas administrativas, receitas avulsas, etc).

### `GET /api/general-transactions`

Lista lançamentos gerais.

**Query Params:**

| Param  | Tipo   | Descrição               |
| ------ | ------ | ----------------------- |
| `type` | string | `INCOME` \| `EXPENSE`  |

**Response `200`:** Array de lançamentos ordenados por data (DESC).

---

### `POST /api/general-transactions`

Cria um lançamento financeiro geral (fora de projetos).

| Campo         | Tipo   | Obrigatório | Descrição                        |
| ------------- | ------ | ----------- | -------------------------------- |
| `type`        | string | Sim         | `INCOME` \| `EXPENSE`           |
| `category`    | string | Sim         | Categoria                        |
| `amount`      | number | Sim         | Valor (> 0)                      |
| `description` | string | Sim         | Descrição                        |
| `date`        | date   | Não         | Default: now                     |
| `dueDate`     | date   | Não         | Data de vencimento               |
| `status`      | string | Não         | `paid` \| `pending` (default: `pending`) |

**Response `201`:** Lançamento criado.

**Errors:** `400` tipo inválido | `400` categoria obrigatória | `400` descrição obrigatória | `400` valor <= 0

---

### `GET /api/general-transactions/:id`

**Response `200`:** Objeto do lançamento geral.

**Errors:** `404` lançamento não encontrado

---

### `PUT /api/general-transactions/:id`

Atualiza um lançamento geral. Aceita os mesmos campos do POST.

**Response `200`:** Lançamento atualizado.

**Errors:** `404` lançamento não encontrado | `400` tipo inválido | `400` valor <= 0

---

### `DELETE /api/general-transactions/:id`

Deleta lançamento e seus anexos do Cloudinary.

**Response `200`:**
```json
{ "message": "Lançamento excluído com sucesso" }
```

---

### `GET /api/general-transactions/summary`

Resumo financeiro dos lançamentos gerais.

**Response `200`:**
```json
{
  "totalIncome": 10000,
  "totalExpense": 3000,
  "balance": 7000,
  "paidIncome": 8000,
  "paidExpense": 2000,
  "paidBalance": 6000,
  "transactionCount": 12
}
```

---

### Anexos de Lançamento Geral

#### `POST /api/general-transactions/:id/attachments`

**Content-Type:** `multipart/form-data`

| Campo   | Tipo   | Obrigatório |
| ------- | ------ | ----------- |
| `files` | file[] | Sim         |

**Response `200`:**
```json
[{ "name", "url", "publicId", "type", "size", "uploadedAt" }]
```

#### `DELETE /api/general-transactions/:id/attachments/:attachmentId`

**Response `200`:**
```json
{ "message": "Anexo removido com sucesso" }
```

---

## Orçamentos (Budget)

### `GET /api/budgets`

Lista orçamentos com filtro.

**Query Params:**

| Param       | Tipo   | Descrição                                           |
| ----------- | ------ | --------------------------------------------------- |
| `status`    | string | `draft` \| `pending_approval` \| `approved` \| `rejected` |
| `projectId` | string | Filtrar por projeto                                 |

**Response `200`:** Array de budgets com `projectId` e `projectId.clientId` populated.

---

### `GET /api/projects/:projectId/budget`

Retorna o orçamento do projeto. Se não existir, cria um vazio automaticamente.

**Response `200`:** Objeto Budget.

---

### `PUT /api/projects/:projectId/budget`

Cria ou atualiza o orçamento completo do projeto. Subtotais e total são calculados automaticamente.

**Body:** Objeto Budget completo (ver model).

**Response `200`:** Budget atualizado.

---

### `PATCH /api/projects/:projectId/budget/cost-item/:itemKey`

Atualiza um item de custo específico.

**itemKey válidos:**
`tecnico` | `auxiliar` | `ajudante` | `alimentacao` | `marco` | `placa` | `gasolina` | `lavagem` | `art` | `rtk` | `droneMatrice` | `droneMini` | `estacaoTotal` | `projetoTecnico` | `memorialDescritivo`

| Campo      | Tipo    | Obrigatório |
| ---------- | ------- | ----------- |
| `active`   | boolean | Não         |
| `days`     | number  | Não         |
| `quantity` | number  | Não         |
| `distance` | number  | Não         |
| `rate`     | number  | Não         |

**Response `200`:** Budget atualizado.

---

### `POST /api/projects/:projectId/budget/items`

Adiciona item dinâmico ao orçamento.

| Campo   | Tipo   | Obrigatório | Descrição                                    |
| ------- | ------ | ----------- | -------------------------------------------- |
| `type`  | string | Sim         | `outrosEquipamentos` \| `outrosIndiretos`    |
| `name`  | string | Sim         | Nome do item                                 |
| `value` | number | Sim         | Valor                                        |

**Response `200`:** Budget atualizado.

---

### `DELETE /api/projects/:projectId/budget/items/:itemId`

Remove item dinâmico.

**Query Params:**

| Param  | Tipo   | Obrigatório | Descrição                                 |
| ------ | ------ | ----------- | ----------------------------------------- |
| `type` | string | Sim         | `outrosEquipamentos` \| `outrosIndiretos` |

**Response `200`:** Budget atualizado.

---

### `POST /api/projects/:projectId/budget/send-approval`

Envia orçamento para aprovação.

**Response `200`:**
```json
{ "message": "Orçamento enviado para aprovação", "budget": { Budget } }
```

---

### `POST /api/projects/:projectId/budget/approve`

Aprova o orçamento. Atualiza o campo `budget` do projeto com o total.

**Response `200`:**
```json
{ "message": "Orçamento aprovado com sucesso", "budget": { Budget } }
```

**Errors:** `400` orçamento não está pendente de aprovação

---

### `POST /api/projects/:projectId/budget/reject`

Rejeita o orçamento.

| Campo   | Tipo   | Obrigatório |
| ------- | ------ | ----------- |
| `notes` | string | Não         |

**Response `200`:**
```json
{ "message": "Orçamento rejeitado", "budget": { Budget } }
```

---

### `DELETE /api/projects/:projectId/budget`

Deleta o orçamento.

**Response `200`:**
```json
{ "message": "Orçamento deletado com sucesso" }
```

---

### `GET /api/projects/:projectId/budget/totals`

Retorna os totais do orçamento.

**Response `200`:**
```json
{
  "operational": 5000,
  "equipment": 2000,
  "indirect": 1500,
  "total": 8500
}
```

---

### `GET /api/orcamento/:projectId`

Visualização pública do orçamento (sem autenticação).

**Response `200`:** Budget com `projectId` e `projectId.clientId` populated.

---

## Motivos de Recusa

> Opções predefinidas para o motivo de recusa ao recusar a etapa "Contrato assinado" de um projeto.

### `GET /api/refusal-reasons`

Lista motivos de recusa.

**Query Params:**

| Param    | Tipo    | Descrição                       |
| -------- | ------- | ------------------------------- |
| `active` | boolean | Filtrar por ativos (`true`/`false`) |

**Response `200`:** Array de motivos ordenados por label (A-Z).

---

### `POST /api/refusal-reasons`

Cria um novo motivo de recusa.

| Campo   | Tipo   | Obrigatório | Descrição           |
| ------- | ------ | ----------- | ------------------- |
| `label` | string | Sim         | Texto do motivo     |

**Response `201`:** Motivo criado.

**Errors:** `400` label vazio | `400` motivo já existe

---

### `PUT /api/refusal-reasons/:id`

Atualiza um motivo de recusa.

| Campo    | Tipo    | Obrigatório | Descrição                 |
| -------- | ------- | ----------- | ------------------------- |
| `label`  | string  | Não         | Novo texto do motivo      |
| `active` | boolean | Não         | Ativar/desativar motivo   |

**Response `200`:** Motivo atualizado.

**Errors:** `404` não encontrado | `400` motivo duplicado

---

### `DELETE /api/refusal-reasons/:id`

Deleta um motivo de recusa.

**Response `200`:**
```json
{ "message": "Motivo de recusa removido com sucesso" }
```

> **Nota:** Ao recusar um contrato (`PUT /api/projects/:id/timeline/:stageId` com `status: "refused"`), o campo `refusalReason` deve conter exatamente o `label` de um motivo ativo. Motivos inativos ou inexistentes serão rejeitados com `400`.

---

## Equipe

### `GET /api/team`

Lista membros da equipe com contagem de projetos.

**Response `200`:**
```json
[
  {
    "_id": "uuid",
    "name": "João",
    "role": "Engenheiro",
    "email": "joao@email.com",
    "phone": "11999999999",
    "type": "user",
    "status": "active",
    "avatar": "https://...",
    "projects": 5
  }
]
```

---

### `POST /api/team`

Cria membro da equipe.

**Content-Type:** `multipart/form-data`

| Campo    | Tipo   | Obrigatório | Descrição                            |
| -------- | ------ | ----------- | ------------------------------------ |
| `name`   | string | Sim         | Nome                                 |
| `role`   | string | Sim         | Função                               |
| `email`  | string | Sim         | E-mail (único)                       |
| `phone`  | string | Sim         | Telefone                             |
| `userId` | string | Sim         | ID do usuário vinculado              |
| `type`   | string | Não         | `user` \| `admin` (default: `user`)  |
| `status` | string | Não         | `active` \| `inactive` (default: `active`) |
| `avatar` | file   | Não         | Imagem de avatar                     |

> Se nenhum avatar for enviado, uma inicial é gerada automaticamente.

**Response `201`:** Membro criado.

---

### `PUT /api/team/:id`

Atualiza membro da equipe.

**Content-Type:** `multipart/form-data`

Aceita os mesmos campos do POST. Avatar antigo é removido do Cloudinary.

**Response `200`:** Membro atualizado.

---

### `DELETE /api/team/:id`

Deleta membro e seu avatar do Cloudinary.

**Response `200`:**
```json
{ "message": "Membro da equipe deletado com sucesso" }
```

---

## Calendário

### `GET /api/calendar`

Lista eventos do calendário com filtros.

**Query Params:**

| Param        | Tipo   | Descrição                         |
| ------------ | ------ | --------------------------------- |
| `start`      | date   | Data início (ISO)                 |
| `end`        | date   | Data fim (ISO)                    |
| `assignedTo` | string | ID do membro da equipe            |
| `projectId`  | string | ID do projeto                     |

**Response `200`:** Array de eventos ordenados por data e hora.

---

### `POST /api/calendar`

Cria evento no calendário.

| Campo         | Tipo   | Obrigatório | Descrição                                              |
| ------------- | ------ | ----------- | ------------------------------------------------------ |
| `title`       | string | Sim         | Título                                                 |
| `description` | string | Não         | Descrição                                              |
| `date`        | date   | Sim         | Data do evento                                         |
| `time`        | string | Não         | Horário                                                |
| `location`    | string | Não         | Local                                                  |
| `type`        | string | Não         | `field` \| `meeting` \| `deadline` \| `office` \| `other` (default: `field`) |
| `status`      | string | Não         | `pending` \| `completed` \| `canceled` (default: `pending`) |
| `assignedTo`  | string | Não         | ID do TeamMember                                       |
| `projectId`   | string | Não         | ID do Projeto                                          |
| `createdBy`   | string | Não         | ID do User                                             |

**Response `201`:** Evento criado.

---

### `PUT /api/calendar/:id`

Atualiza evento. Aceita mesmos campos do POST.

**Response `200`:** Evento atualizado.

---

### `DELETE /api/calendar/:id`

**Response `200`:**
```json
{ "message": "Evento deletado com sucesso" }
```

---

## E-mail / Orçamento

### `POST /send-quote`

Envia solicitação de orçamento por e-mail.

| Campo     | Tipo   | Obrigatório |
| --------- | ------ | ----------- |
| `name`    | string | Sim         |
| `email`   | string | Sim         |
| `phone`   | string | Sim         |
| `message` | string | Sim         |

**Response `200`:**
```json
{ "success": true, "message": "Email enviado com sucesso" }
```

---

### `GET /test`

Testa o serviço de e-mail.

**Response `200`:**
```json
{ "success": true, "message": "Email enviado com sucesso" }
```

---

## Dashboard

### `GET /api/dashboard/metrics`

Retorna todas as métricas do CRM em uma única chamada.

**Response `200`:**
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
      { "month": "2026-01", "income": 80000, "expense": 30000 }
    ],
    "expensesByCategory": {
      "Abastecimento": 15000,
      "Alimentação": 10000
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

---

## Histórico de Status

### `GET /api/projects/:id/status-history`

Retorna o histórico de mudanças de status do projeto.

**Response `200`:**
```json
[
  {
    "_id": "uuid",
    "projectId": "uuid",
    "fromStatus": "PROSPECTING",
    "toStatus": "NEGOTIATION_APPROVED",
    "changedAt": "2026-01-15T10:00:00.000Z",
    "triggeredBy": "timeline_update",
    "stageTitle": "Contrato assinado",
    "refusalReason": null
  }
]
```

---

## Migração / Admin

### `POST /api/admin/migrate-statuses`

Migra todos os projetos e clientes do sistema antigo de status para o novo (auto-calculado).

**Query Params:**

| Param    | Tipo    | Descrição                                    |
| -------- | ------- | -------------------------------------------- |
| `dryRun` | boolean | `true` para simular sem aplicar mudanças     |

**Response `200`:**
```json
{
  "message": "Migração concluída com sucesso",
  "dryRun": false,
  "summary": {
    "totalProjects": 40,
    "migrated": {
      "PENDING → PROSPECTING": 8,
      "IN_PROGRESS → FIELD_TEAM": 12,
      "CANCELED → NEGOTIATION_LOST": 5
    },
    "totalClients": 25,
    "clientsRecalculated": 25,
    "clientStatusResults": {
      "NEGOTIATING": 5,
      "ACTIVE": 10,
      "LOST": 3
    }
  },
  "details": [
    {
      "projectId": "uuid",
      "projectName": "Projeto X",
      "projectCode": "PROJ-01",
      "oldStatus": "IN_PROGRESS",
      "newStatus": "FIELD_TEAM",
      "reason": "Calculado pela timeline"
    }
  ]
}
```

> **Idempotente:** pode rodar múltiplas vezes. Projetos já migrados são ignorados.

---

### `POST /api/admin/rollback-statuses`

Reverte a migração usando o histórico de mudanças.

**Response `200`:**
```json
{
  "message": "Rollback concluído com sucesso",
  "totalReverted": 25,
  "reverted": [
    {
      "projectId": "uuid",
      "revertedFrom": "FIELD_TEAM",
      "revertedTo": "IN_PROGRESS"
    }
  ]
}
```

---

## Models / DTOs

### User

```typescript
interface User {
  _id: string;          // UUID v4
  name: string;
  email: string;        // único, indexado
  password: string;     // bcrypt hash (nunca retornado na resposta)
  role: "ADMIN" | "ENGINEER" | "CLIENT" | "CARTORIO";
  clients: string[];    // refs ValeClient (apenas CARTORIO)
  avatar?: string;      // URL Cloudinary
  avatarPublicId?: string;
  phone?: string;
  createdAt: Date;
}
```

### Client

```typescript
interface Client {
  _id: string;           // UUID v4
  name: string;
  document: string;      // CPF ou CNPJ
  email?: string;
  phone: string;
  address?: string;
  contactName?: string;
  notes?: string;
  userId?: string;       // ref ValeUser
  projects: string[];    // refs ValeProject
  status: "NEGOTIATING" | "ACTIVE" | "LOST" | "PARTIAL" | "COMPLETED";
  documents: Document[];
}

interface Document {
  name: string;
  url: string;           // URL Cloudinary
  publicId: string;
  type: string;          // MIME type
  size: number;          // bytes
  uploadedAt: Date;
}
```

### Project

```typescript
interface Project {
  _id: string;            // UUID v4
  name: string;
  description: string;
  serviceType: string;    // deve corresponder a uma chave de SERVICE_STAGES
  status: "PROSPECTING" | "NEGOTIATION_APPROVED" | "NEGOTIATION_LOST" | "FIELD_TEAM" | "PROJECT_PRODUCTION" | "COMPLETED";
  location?: string;
  latitude?: number;
  longitude?: number;
  startDate?: Date;
  deadline?: Date;
  deliveryDays?: number;
  budget: number;
  technicalLead: string[];  // refs ValeTeamMember
  clientId: string;         // ref ValeClient
  code: string;             // auto-gerado (PROJ-01, PROJ-02, ...)
  registry?: string;
  hasDeed: "yes" | "no";
  area?: string;
  perimeter?: string;
  imagem?: string;          // URL Cloudinary
  imagemPublicId?: string;
  documents: Document[];
  timeline: TimelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

interface TimelineStage {
  _id: string;
  title: string;
  date?: Date;
  status: "pending" | "in_progress" | "completed" | "refused";
  assignedTo?: string;    // ref ValeTeamMember
  completedAt?: Date;
  refusedAt?: Date;       // preenchido quando status = "refused"
  refusalReason?: string; // motivo da recusa (apenas etapa de contrato)
}
```

### TeamMember

```typescript
interface TeamMember {
  _id: string;            // UUID v4
  name: string;
  role: string;
  email: string;          // único
  userId: string;         // ref ValeUser
  phone: string;
  type: "user" | "admin";
  status: "active" | "inactive";
  avatar?: string;        // URL Cloudinary
  avatarPublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### FinancialTransaction

```typescript
interface FinancialTransaction {
  _id: string;            // UUID v4
  projectId: string;      // ref ValeProject
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;         // min: 0
  description: string;
  date: Date;
  dueDate?: Date;
  status: "paid" | "pending" | "overdue";
  attachments: Document[];
  createdAt: Date;
  updatedAt: Date;
}
```

### GeneralTransaction

```typescript
interface GeneralTransaction {
  _id: string;            // UUID v4
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;         // min: 0
  description: string;
  date: Date;
  dueDate?: Date;
  status: "paid" | "pending" | "overdue";
  attachments: Document[];
  createdAt: Date;
  updatedAt: Date;
}
```

### CalendarEvent

```typescript
interface CalendarEvent {
  _id: string;            // UUID v4
  title: string;
  description?: string;
  date: Date;
  time?: string;
  location?: string;
  type: "field" | "meeting" | "deadline" | "office" | "other";
  status: "pending" | "completed" | "canceled";
  assignedTo?: string;    // ref ValeTeamMember
  projectId?: string;     // ref ValeProject
  stageId?: string;
  createdBy?: string;     // ref ValeUser
  createdAt: Date;
  updatedAt: Date;
}
```

### ProjectStatusLog

```typescript
interface ProjectStatusLog {
  _id: string;              // UUID v4
  projectId: string;        // ref ValeProject
  fromStatus: string;
  toStatus: string;
  changedAt: Date;
  triggeredBy: "timeline_update" | "manual" | "migration";
  stageTitle?: string;      // qual etapa causou a mudança
  refusalReason?: string;   // se for NEGOTIATION_LOST
  createdAt: Date;
  updatedAt: Date;
}
```

### Budget

```typescript
interface CostItem {
  active: boolean;
  days: number;
  quantity: number;
  distance: number;
  rate: number;
}

interface DynamicItem {
  _id: string;
  name: string;
  value: number;
}

interface Budget {
  _id: string;              // UUID v4
  projectId: string;        // ref ValeProject (único)

  // Custos Operacionais
  tecnico: CostItem;
  auxiliar: CostItem;
c:\Users\tiago\OneDrive\Documentos\Programacao\Projetos\Vale GNSS\web-vue\docs\plans\2026-03-10-api-status-update.md  ajudante: CostItem;
  alimentacao: CostItem;
  marco: CostItem;
  placa: CostItem;
  gasolina: CostItem;      // usa campo distance
  lavagem: CostItem;
  art: CostItem;

  // Custos de Equipamentos
  rtk: CostItem;
  droneMatrice: CostItem;
  droneMini: CostItem;
  estacaoTotal: CostItem;
  outrosEquipamentos: DynamicItem[];

  // Custos Indiretos
  projetoTecnico: CostItem;
  memorialDescritivo: CostItem;
  outrosIndiretos: DynamicItem[];

  // Status e Controle
  status: "draft" | "pending_approval" | "approved" | "rejected";
  sentForApprovalAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  clientNotes?: string;

  // Totais (calculados automaticamente)
  subtotalOperational: number;
  subtotalEquipment: number;
  subtotalIndirect: number;
  total: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### RefusalReason

```typescript
interface RefusalReason {
  _id: string;           // UUID v4
  label: string;         // texto do motivo (único)
  active: boolean;       // default: true
  createdAt: Date;
  updatedAt: Date;
}
```

### Invite

```typescript
interface Invite {
  _id: string;           // UUID v4
  code: string;          // 6 dígitos, único
  email: string;
  clientId: string;      // ref ValeClient
  expiresAt: Date;       // 7 dias após criação
  used: boolean;
  createdAt: Date;
}
```

---

## Enums e Constantes

### Roles de Usuário

| Valor       | Descrição                    |
| ----------- | ---------------------------- |
| `ADMIN`     | Administrador                |
| `ENGINEER`  | Engenheiro                   |
| `CLIENT`    | Cliente (acesso portal)      |
| `CARTORIO`  | Cartório (acesso clientes)   |

### Status do Projeto (auto-calculado pela timeline)

| Valor                  | Descrição             | Quando                                                |
| ---------------------- | --------------------- | ----------------------------------------------------- |
| `PROSPECTING`          | Em Prospecção         | Projeto criado (default)                              |
| `NEGOTIATION_APPROVED` | Negociação Aprovada   | Etapa "Contrato assinado" concluída                   |
| `NEGOTIATION_LOST`     | Negociação Perdida    | Etapa "Contrato assinado" recusada                    |
| `FIELD_TEAM`           | Equipe em Campo       | Etapas pós-contrato iniciadas                         |
| `PROJECT_PRODUCTION`   | Produção do Projeto   | Etapa "Elaboração de projeto técnico" iniciada        |
| `COMPLETED`            | Concluído             | Etapa "Entrega ao cliente" concluída                  |

> **Importante:** O status do projeto é calculado automaticamente pelo backend quando a timeline é atualizada. Não é necessário enviar o campo `status` manualmente.

### Status do Cliente (auto-calculado pelos projetos)

| Valor         | Descrição      | Regra                                                   |
| ------------- | -------------- | ------------------------------------------------------- |
| `NEGOTIATING` | Em Negociação  | Tem projetos em PROSPECTING ou NEGOTIATION_APPROVED     |
| `ACTIVE`      | Ativo          | Tem projetos em FIELD_TEAM ou PROJECT_PRODUCTION        |
| `LOST`        | Perdido        | Todos os projetos são NEGOTIATION_LOST                  |
| `PARTIAL`     | Parcial        | Mix de projetos ativos/aprovados E perdidos             |
| `COMPLETED`   | Finalizado     | Todos os projetos são COMPLETED                         |

> **Importante:** O status do cliente é recalculado automaticamente quando o status de qualquer projeto muda, ou quando projetos são criados/deletados.

### Status da Timeline

| Valor         | Descrição    |
| ------------- | ------------ |
| `pending`     | Pendente     |
| `in_progress` | Em andamento |
| `completed`   | Concluído    |
| `refused`     | Recusado (apenas para etapa de contrato) |

### Tipo de Transação

| Valor     | Descrição |
| --------- | --------- |
| `INCOME`  | Receita   |
| `EXPENSE` | Despesa   |

### Status da Transação

| Valor     | Descrição  |
| --------- | ---------- |
| `paid`    | Pago       |
| `pending` | Pendente   |
| `overdue` | Atrasado   |

### Status do Orçamento

| Valor              | Descrição            |
| ------------------ | -------------------- |
| `draft`            | Rascunho             |
| `pending_approval` | Pendente de aprovação|
| `approved`         | Aprovado             |
| `rejected`         | Rejeitado            |

### Tipo de Evento

| Valor      | Descrição    |
| ---------- | ------------ |
| `field`    | Campo        |
| `meeting`  | Reunião      |
| `deadline` | Prazo        |
| `office`   | Escritório   |
| `other`    | Outro        |

### Tipos de Serviço (SERVICE_STAGES)

| Tipo de Serviço                               | Qtd Etapas |
| --------------------------------------------- | ---------- |
| Projeto Topográfico Planimétrico              | 14         |
| Projeto Topográfico Planialtimétrico          | 14         |
| Usucapião                                     | 14         |
| Fusão/Desmembramento                          | 14         |
| Georreferenciamento Urbano                    | 14         |
| Georreferenciamento Rural                     | 19         |
| Aerofotogrametria                             | 14         |
| Projeto de Loteamento                         | 14         |
| Execução de Loteamento                        | 14         |
| Execução de marcação de Lotes                 | 14         |
| Terraplenagem e nivelamento                   | 14         |
| Estradas                                      | 14         |
| Inspeção de radiância solar                   | 14         |

> Cada tipo inicia com "Contato com o cliente" e termina com "Coleta de NPS".
> **Georreferenciamento Rural** possui etapas adicionais: CAR, SIGEF, ITR, CCIR, Protocolo INCRA.

---

## Padrão de Erros

Todas as rotas utilizam um handler centralizado. Formato padrão de erro:

```json
{
  "message": "Descrição do erro"
}
```

| Código | Cenário                          |
| ------ | -------------------------------- |
| `400`  | Validação, campo faltando, duplicata |
| `401`  | Senha inválida                   |
| `403`  | Acesso negado (portal)           |
| `404`  | Recurso não encontrado           |
| `500`  | Erro interno do servidor         |

---

## Notas Gerais

- **IDs:** Todos os `_id` usam UUID v4 (não ObjectId do MongoDB)
- **Upload de imagens:** Cloudinary (pasta `vale/`)
- **Upload de documentos:** Cloudinary (pasta `vale/documents/`)
- **E-mails:** Resend API
- **Senhas:** bcrypt com salt 12
- **Paginação:** Apenas `GET /api/clients` possui paginação nativa
- **Populações:** Rotas de listagem populam referências automaticamente (client, technicalLead, etc.)
- **Status automático:** O status de projetos e clientes é calculado automaticamente pelo backend. Não envie `status` manualmente nos endpoints de criação/atualização.
- **Migração:** Use `POST /api/admin/migrate-statuses?dryRun=true` para simular antes de aplicar. Use `POST /api/admin/rollback-statuses` para reverter.
