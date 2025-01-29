import express from "express";
import Funcionario from "../models/Funcionario.js";

const router = express.Router();

// Rota para cadastrar um novo funcionário
router.post("/", async (req, res) => {
  try {
    const funcionario = new Funcionario(req.body);
    const savedFuncionario = await funcionario.save();
    res.status(201).json(savedFuncionario);
  } catch (error) {
    console.error("Erro ao cadastrar funcionário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os funcionários
router.get("/", async (req, res) => {
  try {
    const funcionarios = await Funcionario.find().lean();
    res.json(funcionarios);
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um funcionário específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const funcionario = await Funcionario.findById(id);
    if (!funcionario) {
      return res.status(404).json({ message: "Funcionário não encontrado" });
    }
    res.json(funcionario);
  } catch (error) {
    console.error("Erro ao buscar funcionário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um funcionário
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFuncionario = await Funcionario.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedFuncionario) {
      return res.status(404).json({ message: "Funcionário não encontrado" });
    }
    res.json(updatedFuncionario);
  } catch (error) {
    console.error("Erro ao atualizar funcionário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um funcionário
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFuncionario = await Funcionario.findByIdAndDelete(id);
    if (!deletedFuncionario) {
      return res.status(404).json({ message: "Funcionário não encontrado" });
    }
    res.status(200).json({ message: "Funcionário excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir funcionário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para importar funcionários a partir de um arquivo JSON
router.post("/api/funcionarios/import", async (req, res) => {
  try {
    const funcionarios = req.body;
    if (!Array.isArray(funcionarios)) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const funcionariosToSave = funcionarios.map(funcionario => ({
      ...funcionario,
      dataNascimento: funcionario.dataNascimento ? new Date(funcionario.dataNascimento) : null // Garantir que a data de nascimento seja um objeto Date ou null
    }));

    const savedFuncionarios = await Funcionario.insertMany(funcionariosToSave);
    res.status(201).json(savedFuncionarios);
  } catch (error) {
    console.error("Erro ao importar funcionários:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
