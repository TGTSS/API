import express from "express";
import Obra from "../models/Obra.js";

const router = express.Router();

// Rota para criar um novo orçamento
router.post("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const orcamentoData = req.body;
    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    obra.orcamento = { ...orcamentoData, dataCriacao: new Date() };
    await obra.save();
    res.status(201).json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    res.status(500).json({ message: "Erro ao criar orçamento" });
  }
});

// Rota para obter um orçamento por obraId
router.get("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const obra = await Obra.findById(obraId);
    if (!obra || !obra.orcamento) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }
    res.json(obra.orcamento);
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
    const obra = await Obra.findById(obraId);
    if (!obra || !obra.orcamento) {
      return res.status(404).json({ message: "Orçamento não encontrado" });
    }
    obra.orcamento = { ...orcamentoData, dataAtualizacao: new Date() };
    await obra.save();
    res.json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    res.status(500).json({ message: "Erro ao atualizar orçamento" });
  }
});

export default router;
