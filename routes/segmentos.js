import express from "express";
import Segmento from "../models/Segmento.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ message: "Nome do segmento é obrigatório" });
    }
    const novoSegmento = new Segmento({ nome });
    await novoSegmento.save();
    res.status(201).json({ message: "Segmento adicionado com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar segmento:", error);
    res.status(500).json({ message: "Erro ao adicionar segmento" });
  }
});

export default router;
