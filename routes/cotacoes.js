import express from "express";
import Cotacao from "../models/Cotacao.js";

const router = express.Router();

// Rota para criar uma nova cotação
router.post("/", async (req, res) => {
  try {
    const { items, status } = req.body;
    const novaCotacao = new Cotacao({ items, status });
    const savedCotacao = await novaCotacao.save();
    res.status(201).json(savedCotacao);
  } catch (error) {
    console.error("Erro ao criar cotação:", error);
    res.status(500).json({ message: "Erro ao criar cotação" });
  }
});

// Rota para listar todas as cotações
router.get("/", async (req, res) => {
  try {
    const cotacoes = await Cotacao.find().lean();
    res.json(cotacoes);
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
    res.status(500).json({ message: "Erro ao buscar cotações" });
  }
});

// Rota para obter uma cotação específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cotacao = await Cotacao.findById(id).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.json(cotacao);
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    res.status(500).json({ message: "Erro ao buscar cotação" });
  }
});

// Rota para atualizar uma cotação
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cotacaoData = req.body;
    const updatedCotacao = await Cotacao.findByIdAndUpdate(id, cotacaoData, {
      new: true,
    });
    if (!updatedCotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.json(updatedCotacao);
  } catch (error) {
    console.error("Erro ao atualizar cotação:", error);
    res.status(500).json({ message: "Erro ao atualizar cotação" });
  }
});

// Rota para excluir uma cotação
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCotacao = await Cotacao.findByIdAndDelete(id);
    if (!deletedCotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.status(200).json({ message: "Cotação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cotação:", error);
    res.status(500).json({ message: "Erro ao excluir cotação" });
  }
});

export default router;
