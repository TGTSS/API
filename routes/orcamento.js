import express from "express";
import Obra from "../models/Obra.js";

const router = express.Router();

// Rota para obter o orçamento de uma obra
router.get("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const obra = await Obra.findById(obraId);

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.orcamento || { stages: [], globalBdi: 0 });
  } catch (error) {
    console.error("Erro ao buscar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar/atualizar o orçamento de uma obra
router.post("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { stages, globalBdi } = req.body;

    const obra = await Obra.findById(obraId);

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Atualiza ou cria o orçamento
    obra.orcamento = {
      stages,
      globalBdi,
      dataCriacao: obra.orcamento?.dataCriacao || new Date(),
      dataAtualizacao: new Date(),
    };

    const updatedObra = await obra.save();
    res.status(201).json(updatedObra.orcamento);
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o orçamento de uma obra
router.put("/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { stages, globalBdi } = req.body;

    const obra = await Obra.findById(obraId);

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Atualiza o orçamento
    obra.orcamento = {
      ...obra.orcamento,
      stages,
      globalBdi,
      dataAtualizacao: new Date(),
    };

    const updatedObra = await obra.save();
    res.json(updatedObra.orcamento);
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
