import express from "express";
import TransacaoIndependente from "../models/TransacaoIndependente.js";

const router = express.Router();

// Get all independent transactions
router.get("/", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find();
    res.status(200).json(transacoes);
  } catch (error) {
    console.error("Erro ao buscar transações independentes:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single independent transaction
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transacao = await TransacaoIndependente.findById(id);
    if (!transacao) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    res.status(200).json(transacao);
  } catch (error) {
    console.error("Erro ao buscar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

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
  } catch (error) {
    console.error("Erro ao excluir transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
