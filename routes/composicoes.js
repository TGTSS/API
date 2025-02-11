import express from "express";
import Composicao from "../models/Composicao.js";

const router = express.Router();

// Rota para listar todas as composições
router.get("/", async (req, res) => {
  try {
    const composicoes = await Composicao.find().lean();
    res.json(composicoes);
  } catch (error) {
    console.error("Erro ao buscar composições:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar uma nova composição
router.post("/", async (req, res) => {
  try {
    const composicao = new Composicao(req.body);
    const savedComposicao = await composicao.save();
    res.status(201).json(savedComposicao);
  } catch (error) {
    console.error("Erro ao adicionar composição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar uma composição
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedComposicao = await Composicao.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedComposicao) {
      return res.status(404).json({ message: "Composição não encontrada" });
    }
    res.json(updatedComposicao);
  } catch (error) {
    console.error("Erro ao atualizar composição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma composição
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedComposicao = await Composicao.findByIdAndDelete(id);
    if (!deletedComposicao) {
      return res.status(404).json({ message: "Composição não encontrada" });
    }
    res.status(200).json({ message: "Composição excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir composição:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
