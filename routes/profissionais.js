import express from "express";
import Profissional from "../models/Profissional.js";

const router = express.Router();

// Rota para cadastrar um novo profissional
router.post("/", async (req, res) => {
  try {
    const profissional = new Profissional(req.body);
    const savedProfissional = await profissional.save();
    res.status(201).json(savedProfissional);
  } catch (error) {
    console.error("Erro ao cadastrar profissional:", error);
    res.status(500).json({ message: "Erro ao cadastrar profissional" });
  }
});

// Rota para listar todos os profissionais
router.get("/", async (req, res) => {
  try {
    const profissionais = await Profissional.find().lean();
    res.json(profissionais);
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    res.status(500).json({ message: "Erro ao buscar profissionais" });
  }
});

export default router;
