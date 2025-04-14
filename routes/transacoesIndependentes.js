import express from "express";
import TransacaoIndependente from "../models/TransacaoIndependente.js";

const router = express.Router();

<<<<<<< HEAD
// Get all independent transactions
router.get("/", async (req, res) => {
=======
// Rota para adicionar uma nova transação independente
router.post("/", async (req, res) => {
>>>>>>> parent of 8dc8675 (Atualizações)
  try {
    const novaTransacao = new TransacaoIndependente(req.body);
    const transacaoSalva = await novaTransacao.save();
    res.status(201).json(transacaoSalva);
  } catch (error) {
    console.error("Erro ao adicionar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

<<<<<<< HEAD
// Get a single independent transaction
router.get("/:id", async (req, res) => {
=======
// Rota para excluir uma transação independente
router.delete("/:id", async (req, res) => {
>>>>>>> parent of 8dc8675 (Atualizações)
  try {
    const { id } = req.params;
    const transacaoExcluida = await TransacaoIndependente.findByIdAndDelete(id);
    if (!transacaoExcluida) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    res.status(200).json({ message: "Transação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

<<<<<<< HEAD
// Create a new independent transaction
router.post("/", async (req, res) => {
  const transacao = new TransacaoIndependente({
    ...req.body,
    valorPago: req.body.tipo === "despesa" ? req.body.valor : 0,
    valorRecebido: req.body.tipo === "receita" ? req.body.valor : 0,
  });

  try {
    const novaTransacao = await transacao.save();
    res.status(201).json(novaTransacao);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update an independent transaction
router.put("/:id", async (req, res) => {
  try {
    const transacao = await TransacaoIndependente.findById(req.params.id);
    if (!transacao) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    // Update fields
    Object.keys(req.body).forEach((key) => {
      transacao[key] = req.body[key];
    });

    // Update valorPago and valorRecebido based on tipo
    if (req.body.tipo === "despesa") {
      transacao.valorPago = req.body.valor;
      transacao.valorRecebido = 0;
    } else if (req.body.tipo === "receita") {
      transacao.valorRecebido = req.body.valor;
      transacao.valorPago = 0;
    }

    const transacaoAtualizada = await transacao.save();
    res.json(transacaoAtualizada);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an independent transaction
router.delete("/:id", async (req, res) => {
  try {
    const transacao = await TransacaoIndependente.findById(req.params.id);
    if (!transacao) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    await transacao.remove();
    res.json({ message: "Transação excluída com sucesso" });
=======
// Rota para atualizar uma transação independente
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transacaoAtualizada = await TransacaoIndependente.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!transacaoAtualizada) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    res.status(200).json(transacaoAtualizada);
>>>>>>> parent of 8dc8675 (Atualizações)
  } catch (error) {
    console.error("Erro ao atualizar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

<<<<<<< HEAD
// Get transactions by date range
router.get("/periodo/:inicio/:fim", async (req, res) => {
  try {
    const inicio = new Date(req.params.inicio);
    const fim = new Date(req.params.fim);

    const transacoes = await TransacaoIndependente.find({
      data: {
        $gte: inicio,
        $lte: fim,
      },
    })
      .populate("beneficiario")
      .sort({ data: -1 });

    res.json(transacoes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get transactions by status
router.get("/status/:status", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find({
      status: req.params.status,
    })
      .populate("beneficiario")
      .sort({ data: -1 });

    res.json(transacoes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get transactions by type
router.get("/tipo/:tipo", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find({
      tipo: req.params.tipo,
    })
      .populate("beneficiario")
      .sort({ data: -1 });

    res.json(transacoes);
=======
// Rota para obter todas as transações independentes
router.get("/", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find();
    res.status(200).json(transacoes);
>>>>>>> parent of 8dc8675 (Atualizações)
  } catch (error) {
    console.error("Erro ao buscar transações independentes:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
