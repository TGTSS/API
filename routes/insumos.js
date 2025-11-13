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

// Rota para importar vários insumos a partir de um arquivo JSON
router.post("/import", async (req, res) => {
  try {
    const insumos = req.body;
    if (!Array.isArray(insumos)) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const insumosToSave = insumos.map((insumo) => ({
      ...insumo,
    }));

    const savedInsumos = await Insumo.insertMany(insumosToSave);
    res.status(201).json(savedInsumos);
  } catch (error) {
    console.error("Erro ao importar insumos:", error);
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

// Rota para atualizar um insumo
// Rota para atualizar um insumo (também registra histórico se o custo mudar)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const insumo = await Insumo.findById(id);
    if (!insumo) {
      return res.status(404).json({ message: "Insumo não encontrado" });
    }

    const custoAnterior = insumo.custo;

    // Atualiza campos do insumo com os dados enviados
    Object.keys(req.body).forEach((key) => {
      insumo[key] = req.body[key];
    });

    // Se o custo foi enviado e é diferente do anterior, registra no histórico
    if (
      Object.prototype.hasOwnProperty.call(req.body, "custo") &&
      typeof req.body.custo === "number" &&
      req.body.custo !== custoAnterior
    ) {
      insumo.historicoValores = insumo.historicoValores || [];
      insumo.historicoValores.push({
        data: new Date(),
        valor: req.body.custo,
        origem: req.body.origem || "Atualização Manual",
      });
      insumo.ultimaAtualizacao = new Date();
    }

    // Salva com validação
    const updatedInsumo = await insumo.save();
    res.json(updatedInsumo);
  } catch (error) {
    console.error("Erro ao atualizar insumo:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para deletar um insumo
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInsumo = await Insumo.findByIdAndDelete(id);
    if (!deletedInsumo) {
      return res.status(404).json({ message: "Insumo não encontrado" });
    }
    res.json({ message: "Insumo deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar insumo:", error);
    res.status(500).json({ message: error.message });
  }
});

// ➕ NOVA ROTA: Atualiza custo e registra histórico (usada por entradas de estoque ou integrações)
router.put("/:id/valor", async (req, res) => {
  try {
    const { id } = req.params;
    const { valor, origem } = req.body;

    if (typeof valor !== "number" || !(valor > 0)) {
      return res.status(400).json({ message: "Valor inválido." });
    }

    const insumo = await Insumo.findById(id);
    if (!insumo) {
      return res.status(404).json({ message: "Insumo não encontrado." });
    }

    // Atualiza os dados principais
    insumo.custo = valor;
    insumo.ultimaAtualizacao = new Date();

    // Adiciona o registro no histórico
    insumo.historicoValores = insumo.historicoValores || [];
    insumo.historicoValores.push({
      data: new Date(),
      valor,
      origem: origem || "Atualização de Estoque",
    });

    await insumo.save();

    res.json({
      message: "Custo atualizado e histórico registrado com sucesso!",
      insumo,
    });
  } catch (error) {
    console.error("Erro ao atualizar valor do insumo:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
