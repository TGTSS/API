import express from "express";
import Solicitacao from "../models/Solicitacao.js";
import Obra from "../models/Obra.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Get all solicitacoes
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const solicitacoes = await Solicitacao.find()
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .sort({ data: -1 });
    res.json(solicitacoes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get solicitacoes by obra
router.get("/obra/:obraId", isAuthenticated, async (req, res) => {
  try {
    const solicitacoes = await Solicitacao.find({ obra: req.params.obraId })
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .sort({ data: -1 });
    res.json(solicitacoes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single solicitacao
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id)
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    res.json(solicitacao);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new solicitacao
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const obra = await Obra.findById(req.body.obra);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Get the last numeroSequencial for this obra
    const lastSolicitacao = await Solicitacao.findOne({
      obra: req.body.obra,
    }).sort({ numeroSequencial: -1 });

    const numeroSequencial = lastSolicitacao
      ? lastSolicitacao.numeroSequencial + 1
      : 1;

    const solicitacao = new Solicitacao({
      ...req.body,
      numeroSequencial,
      solicitante: req.user.name, // Assuming user info is available in req.user
    });

    const newSolicitacao = await solicitacao.save();
    res.status(201).json(newSolicitacao);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update solicitacao
router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    // Update only allowed fields
    const allowedUpdates = [
      "nome",
      "descricao",
      "status",
      "prioridade",
      "items",
      "fornecedores",
      "cotacoes",
    ];

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        solicitacao[key] = req.body[key];
      }
    });

    const updatedSolicitacao = await solicitacao.save();
    res.json(updatedSolicitacao);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete solicitacao
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    await solicitacao.deleteOne();
    res.json({ message: "Solicitação excluída com sucesso" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add cotacao to solicitacao
router.post("/:id/cotacoes", isAuthenticated, async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    solicitacao.cotacoes.push(req.body);
    const updatedSolicitacao = await solicitacao.save();
    res.status(201).json(updatedSolicitacao);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update cotacao in solicitacao
router.patch("/:id/cotacoes/:cotacaoId", isAuthenticated, async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    const cotacao = solicitacao.cotacoes.id(req.params.cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    Object.assign(cotacao, req.body);
    const updatedSolicitacao = await solicitacao.save();
    res.json(updatedSolicitacao);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete cotacao from solicitacao
router.delete("/:id/cotacoes/:cotacaoId", isAuthenticated, async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    solicitacao.cotacoes.pull(req.params.cotacaoId);
    const updatedSolicitacao = await solicitacao.save();
    res.json(updatedSolicitacao);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
