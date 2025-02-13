import express from "express";
import Fornecedor from "../models/Fornecedor.js";

const router = express.Router();

// Rota para criar um novo fornecedor
router.post("/", async (req, res) => {
  try {
    const fornecedores = req.body;
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

// Rota para verificar a duplicidade de CNPJ ou CPF
router.get("/check/:documento", async (req, res) => {
  try {
    const { documento } = req.params;
    console.log("Verificando duplicidade para o documento:", documento);

    // Remover formatação do documento
    const formattedDocumento = documento.replace(/[^\d]/g, "");
    console.log("Documento formatado:", formattedDocumento);

    const fornecedorExistente = await Fornecedor.findOne({
      $or: [{ cnpj: formattedDocumento }, { cpf: formattedDocumento }],
    });

    if (fornecedorExistente) {
      console.log("Documento já cadastrado:", fornecedorExistente);
      return res.json({ exists: true });
    } else {
      console.log("Documento não cadastrado");
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Erro ao verificar duplicidade de documento:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
