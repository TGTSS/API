import express from "express";
import Orcamento from "../models/Orcamento.js";

const router = express.Router();

// Rota para criar um novo orçamento
router.post("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const orcamentoData = req.body;
    const novoOrcamento = new Orcamento({ ...orcamentoData, obraId });
    await novoOrcamento.save();
    res.status(201).json(novoOrcamento);
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    res.status(500).json({ message: "Erro ao criar orçamento" });
  }
});

// Rota para obter um orçamento por obraId
router.get("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const orcamento = await Orcamento.findOne({ obraId });
    if (!orcamento) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }
    res.json(orcamento);
  } catch (error) {
    console.error("Erro ao obter orçamento:", error);
    res.status(500).json({ message: "Erro ao obter orçamento" });
  }
});

// Rota para atualizar um orçamento por obraId
router.put("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const orcamentoData = req.body;
    const orcamentoAtualizado = await Orcamento.findOneAndUpdate(
      { obraId },
      orcamentoData,
      { new: true }
    );
    if (!orcamentoAtualizado) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }
    res.json(orcamentoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    res.status(500).json({ message: "Erro ao atualizar orçamento" });
  }
});

export default router;
