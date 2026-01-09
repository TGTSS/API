import Budget from "../models/Budget.js";
import Project from "../models/Project.js";
import { formatError } from "../utils/error-handler.js";

/**
 * Buscar todos os orçamentos
 * GET /api/budgets
 */
export const getBudgets = async (req, res) => {
  try {
    const { status, projectId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (projectId) query.projectId = projectId;

    const budgets = await Budget.find(query)
      .populate({
        path: "projectId",
        select: "name code clientId",
        populate: { path: "clientId", select: "name email" },
      })
      .sort({ updatedAt: -1 });

    res.json(budgets);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Buscar orçamento por ID do projeto
 * GET /api/projects/:projectId/budget
 */
export const getBudgetByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verificar se o projeto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }

    let budget = await Budget.findOne({ projectId });

    // Se não existir orçamento, criar um novo com valores padrão
    if (!budget) {
      budget = new Budget({ projectId });
      await budget.save();
    }

    res.json(budget);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Criar ou atualizar orçamento do projeto
 * PUT /api/projects/:projectId/budget
 */
export const upsertBudget = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verificar se o projeto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }

    const budgetData = { ...req.body, projectId };

    // Remove campos que não devem ser atualizados diretamente (calculados automaticamente)
    delete budgetData._id;
    delete budgetData.subtotalOperational;
    delete budgetData.subtotalEquipment;
    delete budgetData.subtotalIndirect;
    delete budgetData.total;

    let budget = await Budget.findOne({ projectId });

    if (budget) {
      // Atualizar orçamento existente
      // Atualiza campos de custo individualmente para preservar estrutura
      const costFields = [
        "tecnico",
        "auxiliar",
        "ajudante",
        "alimentacao",
        "marco",
        "placa",
        "gasolina",
        "lavagem",
        "art",
        "rtk",
        "droneMatrice",
        "droneMini",
        "estacaoTotal",
        "projetoTecnico",
        "memorialDescritivo",
      ];

      costFields.forEach((field) => {
        if (budgetData[field]) {
          budget[field] = {
            ...(budget[field]?.toObject?.() || budget[field] || {}),
            ...budgetData[field],
          };
        }
      });

      // Atualiza arrays dinâmicos
      if (budgetData.outrosEquipamentos !== undefined) {
        budget.outrosEquipamentos = budgetData.outrosEquipamentos;
      }
      if (budgetData.outrosIndiretos !== undefined) {
        budget.outrosIndiretos = budgetData.outrosIndiretos;
      }

      // Atualiza outros campos
      if (budgetData.status) budget.status = budgetData.status;
      if (budgetData.clientNotes !== undefined)
        budget.clientNotes = budgetData.clientNotes;

      await budget.save();
    } else {
      // Criar novo orçamento
      budget = new Budget(budgetData);
      await budget.save();
    }

    res.json(budget);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Atualizar um item de custo específico
 * PATCH /api/projects/:projectId/budget/cost-item/:itemKey
 */
export const updateCostItem = async (req, res) => {
  try {
    const { projectId, itemKey } = req.params;
    const itemData = req.body;

    const validItems = [
      "tecnico",
      "auxiliar",
      "ajudante",
      "alimentacao",
      "marco",
      "placa",
      "gasolina",
      "lavagem",
      "art",
      "rtk",
      "droneMatrice",
      "droneMini",
      "estacaoTotal",
      "projetoTecnico",
      "memorialDescritivo",
    ];

    if (!validItems.includes(itemKey)) {
      return res.status(400).json({
        message: `Item inválido. Itens válidos: ${validItems.join(", ")}`,
      });
    }

    let budget = await Budget.findOne({ projectId });
    if (!budget) {
      budget = new Budget({ projectId });
    }

    // Atualiza o item específico mantendo valores existentes
    budget[itemKey] = {
      ...(budget[itemKey]?.toObject?.() || budget[itemKey] || {}),
      ...itemData,
    };

    await budget.save();
    res.json(budget);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Adicionar item dinâmico (equipamento ou indireto)
 * POST /api/projects/:projectId/budget/items
 */
export const addBudgetItem = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type, name, value } = req.body; // type: 'outrosEquipamentos' ou 'outrosIndiretos'

    if (!["outrosEquipamentos", "outrosIndiretos"].includes(type)) {
      return res.status(400).json({
        message: "Tipo inválido. Use 'outrosEquipamentos' ou 'outrosIndiretos'",
      });
    }

    let budget = await Budget.findOne({ projectId });
    if (!budget) {
      budget = new Budget({ projectId });
    }

    budget[type].push({ name: name || "Novo Item", value: value || 0 });
    await budget.save();

    res.json(budget);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Remover item dinâmico
 * DELETE /api/projects/:projectId/budget/items/:itemId
 */
export const removeBudgetItem = async (req, res) => {
  try {
    const { projectId, itemId } = req.params;
    const { type } = req.query; // type: 'outrosEquipamentos' ou 'outrosIndiretos'

    if (!["outrosEquipamentos", "outrosIndiretos"].includes(type)) {
      return res.status(400).json({
        message: "Tipo inválido. Use 'outrosEquipamentos' ou 'outrosIndiretos'",
      });
    }

    const budget = await Budget.findOne({ projectId });
    if (!budget) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }

    budget[type].pull(itemId);
    await budget.save();

    res.json(budget);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Enviar orçamento para aprovação do cliente
 * POST /api/projects/:projectId/budget/send-approval
 */
export const sendForApproval = async (req, res) => {
  try {
    const { projectId } = req.params;

    const budget = await Budget.findOne({ projectId });
    if (!budget) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }

    budget.status = "pending_approval";
    budget.sentForApprovalAt = new Date();
    await budget.save();

    // Aqui poderia enviar email para o cliente
    // await sendBudgetApprovalEmail(project.clientId, budget);

    res.json({
      message: "Orçamento enviado para aprovação",
      budget,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Aprovar orçamento (endpoint para portal do cliente)
 * POST /api/projects/:projectId/budget/approve
 */
export const approveBudget = async (req, res) => {
  try {
    const { projectId } = req.params;

    const budget = await Budget.findOne({ projectId });
    if (!budget) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }

    if (budget.status !== "pending_approval") {
      return res.status(400).json({
        message: "Orçamento não está pendente de aprovação",
      });
    }

    budget.status = "approved";
    budget.approvedAt = new Date();
    await budget.save();

    // Atualizar o valor do orçamento no projeto
    await Project.findByIdAndUpdate(projectId, { budget: budget.total });

    res.json({
      message: "Orçamento aprovado com sucesso",
      budget,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Rejeitar orçamento (endpoint para portal do cliente)
 * POST /api/projects/:projectId/budget/reject
 */
export const rejectBudget = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { notes } = req.body;

    const budget = await Budget.findOne({ projectId });
    if (!budget) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }

    if (budget.status !== "pending_approval") {
      return res.status(400).json({
        message: "Orçamento não está pendente de aprovação",
      });
    }

    budget.status = "rejected";
    budget.rejectedAt = new Date();
    budget.clientNotes = notes || "";
    await budget.save();

    res.json({
      message: "Orçamento rejeitado",
      budget,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Deletar orçamento
 * DELETE /api/projects/:projectId/budget
 */
export const deleteBudget = async (req, res) => {
  try {
    const { projectId } = req.params;

    const budget = await Budget.findOneAndDelete({ projectId });
    if (!budget) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }

    res.json({ message: "Orçamento removido com sucesso" });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Buscar orçamento público (para visualização do cliente)
 * GET /api/orcamento/:projectId
 */
export const getPublicBudget = async (req, res) => {
  try {
    const { projectId } = req.params;

    const budget = await Budget.findOne({ projectId }).populate({
      path: "projectId",
      select: "name code clientId location serviceType",
      populate: { path: "clientId", select: "name email" },
    });

    if (!budget) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }

    res.json(budget);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Obter resumo dos totais do orçamento
 * GET /api/projects/:projectId/budget/totals
 */
export const getBudgetTotals = async (req, res) => {
  try {
    const { projectId } = req.params;

    const budget = await Budget.findOne({ projectId });
    if (!budget) {
      return res.json({
        operational: 0,
        equipment: 0,
        indirect: 0,
        total: 0,
      });
    }

    res.json({
      operational: budget.subtotalOperational,
      equipment: budget.subtotalEquipment,
      indirect: budget.subtotalIndirect,
      total: budget.total,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
