import FinancialTransaction from "../models/FinancialTransaction.js";
import Project from "../models/Project.js";
import cloudinary from "../../cloudinary.js";
import { formatError } from "../utils/error-handler.js";

/**
 * Buscar transações financeiras
 * GET /api/transactions
 * Query params: projectId, type (INCOME/EXPENSE)
 */
export const getTransactions = async (req, res) => {
  try {
    const { projectId, type } = req.query;
    const query = {};

    if (projectId) query.projectId = projectId;
    if (type && ["INCOME", "EXPENSE"].includes(type)) query.type = type;

    const transactions = await FinancialTransaction.find(query)
      .populate("projectId", "name code")
      .sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Buscar transação por ID
 * GET /api/transactions/:id
 */
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findById(
      req.params.id
    ).populate("projectId", "name code");

    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    res.json(transaction);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Criar nova transação financeira
 * POST /api/transactions
 */
export const createTransaction = async (req, res) => {
  try {
    const {
      projectId,
      type,
      category,
      amount,
      description,
      date,
      dueDate,
      status,
    } = req.body;

    // Validar se o projeto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }

    // Validar tipo
    if (!["INCOME", "EXPENSE"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Tipo inválido. Use 'INCOME' ou 'EXPENSE'" });
    }

    // Validar valor
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ message: "O valor deve ser maior que zero" });
    }

    const transaction = new FinancialTransaction({
      projectId,
      type,
      category,
      amount: Number(amount),
      description,
      date: date || new Date(),
      dueDate: dueDate || null,
      status: status || "pending",
    });

    await transaction.save();

    // Popula o projeto para retornar dados completos
    await transaction.populate("projectId", "name code");

    res.status(201).json(transaction);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Atualizar transação financeira
 * PUT /api/transactions/:id
 */
export const updateTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date, dueDate, status } =
      req.body;

    const transaction = await FinancialTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    // Validar tipo se fornecido
    if (type && !["INCOME", "EXPENSE"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Tipo inválido. Use 'INCOME' ou 'EXPENSE'" });
    }

    // Validar valor se fornecido
    if (amount !== undefined && amount <= 0) {
      return res
        .status(400)
        .json({ message: "O valor deve ser maior que zero" });
    }

    // Atualizar campos
    if (type) transaction.type = type;
    if (category) transaction.category = category;
    if (dueDate !== undefined) transaction.dueDate = dueDate;
    if (amount !== undefined) transaction.amount = Number(amount);
    if (description) transaction.description = description;
    if (date) transaction.date = date;
    if (status && ["paid", "pending"].includes(status))
      transaction.status = status;

    await transaction.save();
    await transaction.populate("projectId", "name code");

    res.json(transaction);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Deletar transação financeira
 * DELETE /api/transactions/:id
 */
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    // Deletar anexos do Cloudinary se existirem
    if (transaction.attachments && transaction.attachments.length > 0) {
      for (const attachment of transaction.attachments) {
        if (attachment.publicId) {
          await cloudinary.uploader.destroy(attachment.publicId);
        }
      }
    }

    await FinancialTransaction.findByIdAndDelete(req.params.id);

    res.json({ message: "Transação excluída com sucesso" });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Obter resumo financeiro do projeto
 * GET /api/projects/:projectId/financial-summary
 */
export const getProjectFinancialSummary = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verificar se o projeto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }

    const transactions = await FinancialTransaction.find({ projectId });

    const income = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const expense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const paidIncome = transactions
      .filter((t) => t.type === "INCOME" && t.status === "paid")
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const paidExpense = transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "paid")
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    res.json({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      paidIncome,
      paidExpense,
      paidBalance: paidIncome - paidExpense,
      transactionCount: transactions.length,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const uploadAttachments = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transação não encontrada" });

    const newAttachments = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.public_id,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    }));

    transaction.attachments.push(...newAttachments);
    await transaction.save();

    res.status(200).json(transaction.attachments);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteAttachment = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transação não encontrada" });

    const attachment = transaction.attachments.id(req.params.attachmentId);
    if (!attachment)
      return res.status(404).json({ message: "Anexo não encontrado" });

    // Delete from Cloudinary
    if (attachment.publicId) {
      await cloudinary.uploader.destroy(attachment.publicId);
    }

    transaction.attachments.pull(req.params.attachmentId);
    await transaction.save();

    res.json({ message: "Anexo removido com sucesso" });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
