import express from "express";
import TransacaoIndependente from "../models/TransacaoIndependente.js";

const router = express.Router();

// Rota para adicionar uma nova transação independente
router.post("/", async (req, res) => {
  try {
    const novaTransacao = new TransacaoIndependente(req.body);
    const transacaoSalva = await novaTransacao.save();
    res.status(201).json(transacaoSalva);
  } catch (error) {
    console.error("Erro ao adicionar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma transação independente
router.delete("/:id", async (req, res) => {
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
  } catch (error) {
    console.error("Erro ao atualizar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter todas as transações independentes
router.get("/", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find();
    res.status(200).json(transacoes);
  } catch (error) {
    console.error("Erro ao buscar transações independentes:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
