import express from "express";
import Unit from "../models/Unit.js";

const router = express.Router();

// Rota para listar todas as unidades
router.get("/", async (req, res) => {
  try {
    const units = await Unit.find().lean();
    res.json(units);
  } catch (error) {
    console.error("Erro ao buscar unidades:", error);
    res.status(500).json({ message: "Erro ao buscar unidades" });
  }
});

// Rota para adicionar uma nova unidade
router.post("/", async (req, res) => {
  try {
    const { unidade } = req.body;
    const newUnit = new Unit({ unidade });
    await newUnit.save();
    res.status(201).json(newUnit);
  } catch (error) {
    console.error("Erro ao adicionar unidade:", error);
    res.status(500).json({ message: "Erro ao adicionar unidade" });
  }
});

// Rota para adicionar várias unidades
router.post("/bulk", async (req, res) => {
  try {
    const { unidades } = req.body; // Espera um array de unidades
    const newUnits = await Unit.insertMany(unidades);
    res.status(201).json(newUnits);
  } catch (error) {
    console.error("Erro ao adicionar unidades:", error);
    res.status(500).json({ message: "Erro ao adicionar unidades" });
  }
});

export default router;
