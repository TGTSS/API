import express from "express";
import Categoria from "../models/Categoria.js";
import mongoose from "mongoose";

const router = express.Router();

// CREATE - Criar uma nova categoria
router.post("/", async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    const novaCategoria = new Categoria({ nome });
    const savedCategoria = await novaCategoria.save();

    res.status(201).json(savedCategoria);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Esta categoria já existe" });
    }
    console.error("Erro ao criar categoria:", error);
    res.status(500).json({ message: error.message });
  }
});

// READ - Listar todas as categorias
router.get("/", async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ nome: 1 }).lean();
    res.json(categorias);
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    res.status(500).json({ message: error.message });
  }
});

// READ - Buscar uma categoria específica pelo ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const categoria = await Categoria.findById(id);

    if (!categoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    res.json(categoria);
  } catch (error) {
    console.error("Erro ao buscar categoria:", error);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE - Atualizar uma categoria
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (!nome) {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    const updatedCategoria = await Categoria.findByIdAndUpdate(
      id,
      { nome },
      { new: true }
    );

    if (!updatedCategoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    res.json(updatedCategoria);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Esta categoria já existe" });
    }
    console.error("Erro ao atualizar categoria:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE - Excluir uma categoria
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const deletedCategoria = await Categoria.findByIdAndDelete(id);

    if (!deletedCategoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    res.status(200).json({ message: "Categoria excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
