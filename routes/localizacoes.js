import express from "express";
import Localizacao from "../models/Localizacao.js";
import mongoose from "mongoose";

const router = express.Router();

// CREATE - Criar uma nova localização
router.post("/", async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    const novaLocalizacao = new Localizacao({ nome });
    const savedLocalizacao = await novaLocalizacao.save();

    res.status(201).json(savedLocalizacao);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Esta localização já existe" });
    }
    console.error("Erro ao criar localização:", error);
    res.status(500).json({ message: error.message });
  }
});

// READ - Listar todas as localizações
router.get("/", async (req, res) => {
  try {
    const localizacoes = await Localizacao.find().sort({ nome: 1 }).lean();
    res.json(localizacoes);
  } catch (error) {
    console.error("Erro ao listar localizações:", error);
    res.status(500).json({ message: error.message });
  }
});

// READ - Buscar uma localização específica pelo ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const localizacao = await Localizacao.findById(id);

    if (!localizacao) {
      return res.status(404).json({ message: "Localização não encontrada" });
    }

    res.json(localizacao);
  } catch (error) {
    console.error("Erro ao buscar localização:", error);
    res.status(500).json({ message: error.message });
  }
});

// UPDATE - Atualizar uma localização
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

    const updatedLocalizacao = await Localizacao.findByIdAndUpdate(
      id,
      { nome },
      { new: true }
    );

    if (!updatedLocalizacao) {
      return res.status(404).json({ message: "Localização não encontrada" });
    }

    res.json(updatedLocalizacao);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Esta localização já existe" });
    }
    console.error("Erro ao atualizar localização:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE - Excluir uma localização
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const deletedLocalizacao = await Localizacao.findByIdAndDelete(id);

    if (!deletedLocalizacao) {
      return res.status(404).json({ message: "Localização não encontrada" });
    }

    res.status(200).json({ message: "Localização excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir localização:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
