import express from "express";
import Cliente from "../models/Cliente.js";

const router = express.Router();

// Rota para cadastrar um novo cliente
router.post("/", async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    const savedCliente = await cliente.save();
    res.status(201).json({ message: "Cliente cadastrado com sucesso", cliente: savedCliente });
  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error);
    res.status(500).json({ message: "Erro ao cadastrar cliente", error: error.message });
  }
});

// Rota para listar todos os clientes
router.get("/", async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({ message: "Erro ao listar clientes", error: error.message });
  }
});

// Rota para buscar um cliente específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json(cliente);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    res.status(500).json({ message: "Erro ao buscar cliente", error: error.message });
  }
});

// Rota para atualizar um cliente
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCliente = await Cliente.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedCliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json({ message: "Cliente atualizado com sucesso", cliente: updatedCliente });
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ message: "Erro ao atualizar cliente", error: error.message });
  }
});

// Rota para excluir um cliente
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCliente = await Cliente.findByIdAndDelete(id);
    if (!deletedCliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json({ message: "Cliente excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    res.status(500).json({ message: "Erro ao excluir cliente", error: error.message });
  }
});

export default router;
