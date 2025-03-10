import express from "express";
import DiarioObra from "../models/DiarioObra.js";

const router = express.Router();

// Rota para listar todos os diários de obras
router.get("/", async (req, res) => {
  try {
    const diarios = await DiarioObra.find().lean();
    res.json(diarios);
  } catch (error) {
    console.error("Erro ao buscar diários de obras:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo diário de obras
router.post("/", async (req, res) => {
  try {
    const novoDiario = new DiarioObra(req.body);
    const savedDiario = await novoDiario.save();
    res.status(201).json(savedDiario);
  } catch (error) {
    console.error("Erro ao criar diário de obras:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um diário de obras específico
router.get("/:id", async (req, res) => {
  try {
    const diario = await DiarioObra.findById(req.params.id);
    if (!diario) {
      return res
        .status(404)
        .json({ message: "Diário de obras não encontrado" });
    }
    res.json(diario);
  } catch (error) {
    console.error("Erro ao buscar diário de obras:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um diário de obras
router.put("/:id", async (req, res) => {
  try {
    const diarioAtualizado = await DiarioObra.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!diarioAtualizado) {
      return res
        .status(404)
        .json({ message: "Diário de obras não encontrado" });
    }
    res.json(diarioAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar diário de obras:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um diário de obras
router.delete("/:id", async (req, res) => {
  try {
    const diarioExcluido = await DiarioObra.findByIdAndDelete(req.params.id);
    if (!diarioExcluido) {
      return res
        .status(404)
        .json({ message: "Diário de obras não encontrado" });
    }
    res.status(200).json({ message: "Diário de obras excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir diário de obras:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
