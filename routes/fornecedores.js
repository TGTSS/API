import express from "express";
import Fornecedor from "../models/Fornecedor.js";

const router = express.Router();

// Rota para criar um novo fornecedor
router.post("/", async (req, res) => {
  try {
    const fornecedores = req.body;

    // Verificar se cnpj ou cpf são nulos
    fornecedores.forEach((fornecedor) => {
      if (!fornecedor.cnpj && !fornecedor.cpf) {
        throw new Error("CNPJ ou CPF é obrigatório");
      }
    });

    const savedFornecedores = await Fornecedor.insertMany(fornecedores);
    res.status(201).json(savedFornecedores);
  } catch (error) {
    console.error("Erro ao criar fornecedores:", error);
    res.status(400).json({ message: error.message });
  }
});

// Rota para listar todos os fornecedores
router.get("/", async (req, res) => {
  try {
    const fornecedores = await Fornecedor.find();
    res.json(fornecedores);
  } catch (error) {
    console.error("Erro ao buscar fornecedores:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um fornecedor específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const fornecedor = await Fornecedor.findById(id);
    if (!fornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }
    res.json(fornecedor);
  } catch (error) {
    console.error("Erro ao buscar fornecedor:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um fornecedor
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFornecedor = await Fornecedor.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }
    res.json(updatedFornecedor);
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um fornecedor
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFornecedor = await Fornecedor.findByIdAndDelete(id);
    if (!deletedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }
    res.status(200).json({ message: "Fornecedor excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir fornecedor:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o número de telefone de um fornecedor
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { telefone1 } = req.body;

    if (!telefone1) {
      return res
        .status(400)
        .json({ message: "Número de telefone é obrigatório" });
    }

    const updatedFornecedor = await Fornecedor.findByIdAndUpdate(
      id,
      { telefone1 },
      { new: true }
    );

    if (!updatedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }

    res.json(updatedFornecedor);
  } catch (error) {
    console.error("Erro ao atualizar número de telefone:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
