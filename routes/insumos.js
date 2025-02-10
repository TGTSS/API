import express from "express";
import Insumo from "../models/Insumo.js";

const router = express.Router();

// Rota para cadastrar um novo insumo
router.post("/", async (req, res) => {
  try {
    const insumo = new Insumo(req.body);
    const savedInsumo = await insumo.save();
    res.status(201).json(savedInsumo);
  } catch (error) {
    console.error("Erro ao cadastrar insumo:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os insumos
router.get("/", async (req, res) => {
  try {
    const insumos = await Insumo.find().lean();
    res.json(insumos);
  } catch (error) {
    console.error("Erro ao buscar insumos:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um insumo específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const insumo = await Insumo.findById(id);
    if (!insumo) {
      return res.status(404).json({ message: "Insumo não encontrado" });
    }
    res.json(insumo);
  } catch (error) {
    console.error("Erro ao buscar insumo:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
