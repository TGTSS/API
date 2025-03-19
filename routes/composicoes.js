import express from "express";
import Composicao from "../models/Composicao.js";

const router = express.Router();

// Rota para listar todas as composições
router.get("/", async (req, res) => {
  try {
    const composicoes = await Composicao.find().lean();
    res.json(composicoes);
  } catch (error) {
    console.error("Erro ao buscar composições:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar uma nova composição
router.post("/", async (req, res) => {
  try {
    if (req.body.custoTotal) {
      req.body.custoTotal = Number(req.body.custoTotal.replace(",", "."));
    }
    const composicao = new Composicao(req.body);
    const savedComposicao = await composicao.save();
    res.status(201).json(savedComposicao);
  } catch (error) {
    console.error("Erro ao adicionar composição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar várias composições ao mesmo tempo
router.post("/bulk", async (req, res) => {
  try {
    const composicoes = req.body.map((composicao) => {
      if (composicao.custoTotal) {
        composicao.custoTotal = Number(composicao.custoTotal.replace(",", "."));
      }
      return composicao;
    });
    const result = await Composicao.insertMany(composicoes);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Rota para atualizar uma composição
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedComposicao = await Composicao.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedComposicao) {
      return res.status(404).json({ message: "Composição não encontrada" });
    }
    res.json(updatedComposicao);
  } catch (error) {
    console.error("Erro ao atualizar composição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma composição
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedComposicao = await Composicao.findByIdAndDelete(id);
    if (!deletedComposicao) {
      return res.status(404).json({ message: "Composição não encontrada" });
    }
    res.status(200).json({ message: "Composição excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir composição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para deletar todas as composições
router.delete("/all", async (req, res) => {
  try {
    await Composicao.deleteMany({});
    res
      .status(200)
      .json({ message: "Todas as composições foram excluídas com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir todas as composições:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o campo custoTotal de todas as composições
router.put("/update-all/custoTotal", async (req, res) => {
  try {
    const composicoes = await Composicao.find();
    const updatePromises = composicoes.map((composicao) => {
      if (typeof composicao.custoTotal === "string") {
        composicao.custoTotal = Number(composicao.custoTotal.replace(",", "."));
      } else {
        composicao.custoTotal = Number(composicao.custoTotal);
      }
      return composicao.save();
    });
    await Promise.all(updatePromises);
    res
      .status(200)
      .json({ message: "Todas as composições foram atualizadas com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar todas as composições:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
