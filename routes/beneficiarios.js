import express from "express";
import Beneficiario from "../models/Beneficiario.js";

const router = express.Router();

// Rota para listar todos os beneficiários
router.get("/", async (req, res) => {
  try {
    const beneficiarios = await Beneficiario.find();
    console.log("Beneficiários carregados:", beneficiarios); // Alterar log para "Beneficiários carregados:"
    res.setHeader("Content-Type", "application/json"); // Adicionar cabeçalho Content-Type
    res.json(beneficiarios);
  } catch (error) {
    console.error("Erro ao buscar beneficiários:", error); // Adicionar log para depuração
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar um novo beneficiário
router.post("/", async (req, res) => {
  const beneficiario = new Beneficiario({
    ...req.body,
    endereco: req.body.endereco // Adicionar o campo endereco
  });
  try {
    const novoBeneficiario = await beneficiario.save();
    res.status(201).json(novoBeneficiario);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Rota para buscar um beneficiário específico
router.get("/:id", async (req, res) => {
  try {
    const beneficiario = await Beneficiario.findById(req.params.id);
    if (!beneficiario) {
      return res.status(404).json({ message: "Beneficiário não encontrado" });
    }
    res.json(beneficiario);
  } catch (error) {
    console.error("Erro ao buscar beneficiário:", error); // Adicionar log para depuração
    res.status(500).json({ message: error.message });
  }
});

// Rota para verificar se um beneficiário já existe
router.get("/exists/:document", async (req, res) => {
  try {
    const beneficiario = await Beneficiario.findOne({ document: req.params.document });
    if (beneficiario) {
      return res.status(200).json({ exists: true });
    }
    res.status(200).json({ exists: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um beneficiário
router.put("/:id", async (req, res) => {
  try {
    const beneficiario = await Beneficiario.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!beneficiario) {
      return res.status(404).json({ message: "Beneficiário não encontrado" });
    }
    res.json(beneficiario);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Rota para excluir um beneficiário
router.delete("/:id", async (req, res) => {
  try {
    const beneficiario = await Beneficiario.findByIdAndDelete(req.params.id);
    if (!beneficiario) {
      return res.status(404).json({ message: "Beneficiário não encontrado" });
    }
    res.setHeader("Content-Type", "application/json"); // Adicionar cabeçalho Content-Type
    res.json({ message: "Beneficiário excluído com sucesso" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
