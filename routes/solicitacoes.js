import express from "express";
import Solicitacao from "../models/Solicitacao.js";
import Obra from "../models/Obra.js";

const router = express.Router();

// Get all solicitacoes
router.get("/", async (req, res) => {
  try {
    const solicitacoes = await Solicitacao.find()
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .sort({ data: -1 });
    res.json(solicitacoes);
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    res.status(500).json({
      message: "Erro ao buscar solicitações",
      error: error.message,
    });
  }
});

// Get solicitacoes by obra
router.get("/obra/:obraId", async (req, res) => {
  try {
    const solicitacoes = await Solicitacao.find({ obra: req.params.obraId })
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .sort({ data: -1 });
    res.json(solicitacoes);
  } catch (error) {
    console.error("Erro ao buscar solicitações da obra:", error);
    res.status(500).json({
      message: "Erro ao buscar solicitações da obra",
      error: error.message,
    });
  }
});

// Create new solicitacao for specific obra
router.post("/obra/:obraId", async (req, res) => {
  try {
    const obraId = req.params.obraId;
    const obra = await Obra.findById(obraId);

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Get the last numeroSequencial for this obra
    const lastSolicitacao = await Solicitacao.findOne({ obra: obraId }).sort({
      numeroSequencial: -1,
    });

    const numeroSequencial = lastSolicitacao
      ? lastSolicitacao.numeroSequencial + 1
      : 1;

    // Process items to ensure all required fields are present
    const processedItems = req.body.items.map((item) => ({
      ...item,
      custoUnitario: item.custoUnitario || 0, // Set default value if missing
      unidade: item.unidade || "UN", // Set default unit if missing
      descricao:
        item.descricao || item.insumoId?.descricao || "Item sem descrição", // Use insumo description or default
      quantidade: item.quantidade || 1, // Set default quantity if missing
    }));

    // Calculate total value from items
    const valor = processedItems.reduce((total, item) => {
      return total + item.quantidade * (item.custoUnitario || 0);
    }, 0);

    const solicitacao = new Solicitacao({
      ...req.body,
      obra: obraId,
      obraNome: obra.nome,
      numeroSequencial,
      valor,
      items: processedItems,
      solicitante: req.body.solicitante || "Usuário",
      status: "Pendente",
      data: new Date(),
    });

    const newSolicitacao = await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(newSolicitacao._id)
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.status(201).json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    res.status(400).json({
      message: "Erro ao criar solicitação",
      error: error.message,
      details: error.errors, // Include validation errors if any
    });
  }
});

// Get single solicitacao
router.get("/:id", async (req, res) => {
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
    console.error("Erro ao buscar solicitação:", error);
    res.status(500).json({
      message: "Erro ao buscar solicitação",
      error: error.message,
    });
  }
});

// Update solicitacao
router.patch("/:id", async (req, res) => {
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

    // Recalculate total value if items were updated
    if (req.body.items) {
      solicitacao.valor = solicitacao.items.reduce((total, item) => {
        return total + item.quantidade * (item.custoUnitario || 0);
      }, 0);
    }

    const updatedSolicitacao = await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(
      updatedSolicitacao._id
    )
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);
    res.status(400).json({
      message: "Erro ao atualizar solicitação",
      error: error.message,
      details: error.errors,
    });
  }
});

// Delete solicitacao
router.delete("/:id", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    await solicitacao.deleteOne();
    res.json({ message: "Solicitação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir solicitação:", error);
    res.status(500).json({
      message: "Erro ao excluir solicitação",
      error: error.message,
    });
  }
});

// Add cotacao to solicitacao
router.post("/:id/cotacoes", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    solicitacao.cotacoes.push(req.body);
    const updatedSolicitacao = await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(
      updatedSolicitacao._id
    )
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.status(201).json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao adicionar cotação:", error);
    res.status(400).json({
      message: "Erro ao adicionar cotação",
      error: error.message,
    });
  }
});

// Update cotacao in solicitacao
router.patch("/:id/cotacoes/:cotacaoId", async (req, res) => {
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

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(
      updatedSolicitacao._id
    )
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao atualizar cotação:", error);
    res.status(400).json({
      message: "Erro ao atualizar cotação",
      error: error.message,
    });
  }
});

// Delete cotacao from solicitacao
router.delete("/:id/cotacoes/:cotacaoId", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    solicitacao.cotacoes.pull(req.params.cotacaoId);
    const updatedSolicitacao = await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(
      updatedSolicitacao._id
    )
      .populate("obra", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao excluir cotação:", error);
    res.status(400).json({
      message: "Erro ao excluir cotação",
      error: error.message,
    });
  }
});

export default router;
