import GeneralTransaction from "../models/GeneralTransaction.js";
import cloudinary from "../../cloudinary.js";
import { formatError } from "../utils/error-handler.js";

/**
 * Buscar lançamentos gerais (fora de projetos)
 * GET /api/general-transactions
 */
export const getTransactions = async (req, res) => {
  try {
    const { type } = req.query;
    const query = {};

    if (type && ["INCOME", "EXPENSE"].includes(type)) query.type = type;

    const transactions = await GeneralTransaction.find(query).sort({
      date: -1,
    });
    res.json(transactions);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Buscar lançamento geral por ID
 * GET /api/general-transactions/:id
 */
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await GeneralTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Lançamento não encontrado" });
    }

    res.json(transaction);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Criar novo lançamento geral (fora de projetos)
 * POST /api/general-transactions
 */
export const createTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date, dueDate, status } =
      req.body;

    // Validar tipo
    if (!["INCOME", "EXPENSE"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Tipo inválido. Use 'INCOME' ou 'EXPENSE'" });
    }

    // Validar categoria
    if (!category || !category.trim()) {
      return res.status(400).json({ message: "A categoria é obrigatória" });
    }

    // Validar descrição
    if (!description || !description.trim()) {
      return res.status(400).json({ message: "A descrição é obrigatória" });
    }

    // Validar valor
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ message: "O valor deve ser maior que zero" });
    }

    const transaction = new GeneralTransaction({
      type,
      category,
      amount: Number(amount),
      description,
      date: date || new Date(),
      dueDate: dueDate || null,
      status: status || "pending",
    });

    await transaction.save();

    res.status(201).json(transaction);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Atualizar lançamento geral
 * PUT /api/general-transactions/:id
 */
export const updateTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date, dueDate, status } =
      req.body;

    const transaction = await GeneralTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Lançamento não encontrado" });
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

    res.json(transaction);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Deletar lançamento geral
 * DELETE /api/general-transactions/:id
 */
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await GeneralTransaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Lançamento não encontrado" });
    }

    // Deletar anexos do Cloudinary se existirem
    if (transaction.attachments && transaction.attachments.length > 0) {
      for (const attachment of transaction.attachments) {
        if (attachment.publicId) {
          await cloudinary.uploader.destroy(attachment.publicId);
        }
      }
    }

    await GeneralTransaction.findByIdAndDelete(req.params.id);

    res.json({ message: "Lançamento excluído com sucesso" });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Resumo financeiro geral (fora de projetos)
 * GET /api/general-transactions/summary
 */
export const getFinancialSummary = async (req, res) => {
  try {
    const transactions = await GeneralTransaction.find();

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

/**
 * Upload de anexos
 * POST /api/general-transactions/:id/attachments
 */
export const uploadAttachments = async (req, res) => {
  try {
    const transaction = await GeneralTransaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Lançamento não encontrado" });

    const newAttachments = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.filename,
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

/**
 * Deletar anexo
 * DELETE /api/general-transactions/:id/attachments/:attachmentId
 */
export const deleteAttachment = async (req, res) => {
  try {
    const transaction = await GeneralTransaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Lançamento não encontrado" });

    const attachment = transaction.attachments.id(req.params.attachmentId);
    if (!attachment)
      return res.status(404).json({ message: "Anexo não encontrado" });

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
