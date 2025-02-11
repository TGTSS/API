import express from "express";
import Type from "../models/Type.js";

const router = express.Router();

// Rota para listar todos os tipos
router.get("/", async (req, res) => {
  try {
    const types = await Type.find().lean();
    res.json(types);
  } catch (error) {
    console.error("Erro ao buscar tipos:", error);
    res.status(500).json({ message: "Erro ao buscar tipos" });
  }
});

// Rota para adicionar um novo tipo
router.post("/", async (req, res) => {
  try {
    const { tipo } = req.body;
    const newType = new Type({ tipo });
    await newType.save();
    res.status(201).json(newType);
  } catch (error) {
    console.error("Erro ao adicionar tipo:", error);
    res.status(500).json({ message: "Erro ao adicionar tipo" });
  }
});

export default router;
