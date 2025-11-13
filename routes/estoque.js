import express from "express";
import Estoque from "../models/Estoque.js";
import MovimentacaoEstoque from "../models/MovimentacaoEstoque.js";

const router = express.Router();

// ===== ROTAS DE ESTOQUE =====

// Listar todos os itens de estoque
router.get("/", async (req, res) => {
  try {
    const estoques = await Estoque.find().lean();
    res.json(estoques);
  } catch (error) {
    console.error("Erro ao buscar estoques:", error);
    res.status(500).json({ message: error.message });
  }
});

// Buscar estoque por categoria
router.get("/categoria/:categoria", async (req, res) => {
  try {
    const { categoria } = req.params;
    const estoques = await Estoque.find({ category: categoria }).lean();
    res.json(estoques);
  } catch (error) {
    console.error("Erro ao buscar estoques por categoria:", error);
    res.status(500).json({ message: error.message });
  }
});

// Buscar estoque por localização
router.get("/localizacao/:localizacao", async (req, res) => {
  try {
    const { localizacao } = req.params;
    const estoques = await Estoque.find({ location: localizacao }).lean();
    res.json(estoques);
  } catch (error) {
    console.error("Erro ao buscar estoques por localização:", error);
    res.status(500).json({ message: error.message });
  }
});

// Buscar estoque com baixa quantidade
router.get("/status/baixo", async (req, res) => {
  try {
    const estoques = await Estoque.find({ status: "Estoque Baixo" }).lean();
    res.json(estoques);
  } catch (error) {
    console.error("Erro ao buscar estoques com baixa quantidade:", error);
    res.status(500).json({ message: error.message });
  }
});

// Buscar um estoque específico por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const estoque = await Estoque.findById(id);
    if (!estoque) {
      return res.status(404).json({ message: "Estoque não encontrado" });
    }
    res.json(estoque);
  } catch (error) {
    console.error("Erro ao buscar estoque:", error);
    res.status(500).json({ message: error.message });
  }
});

// Criar novo item de estoque
router.post("/", async (req, res) => {
  try {
    const { name, category, quantity, unit, minQuantity, location, cost } =
      req.body;

    if (!name || !category || !unit || !location) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }

    const estoque = new Estoque({
      name,
      category,
      quantity: quantity || 0,
      unit,
      minQuantity: minQuantity || 0,
      location,
      cost: cost || 0,
    });

    const savedEstoque = await estoque.save();
    res.status(201).json(savedEstoque);
  } catch (error) {
    console.error("Erro ao criar estoque:", error);
    res.status(500).json({ message: error.message });
  }
});

// Atualizar um item de estoque
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEstoque = await Estoque.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedEstoque) {
      return res.status(404).json({ message: "Estoque não encontrado" });
    }
    res.json(updatedEstoque);
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    res.status(500).json({ message: error.message });
  }
});

// Deletar um item de estoque
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEstoque = await Estoque.findByIdAndDelete(id);
    if (!deletedEstoque) {
      return res.status(404).json({ message: "Estoque não encontrado" });
    }
    res.json({ message: "Estoque deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar estoque:", error);
    res.status(500).json({ message: error.message });
  }
});

// Importar vários itens de estoque
router.post("/import/batch", async (req, res) => {
  try {
    const estoques = req.body;
    if (!Array.isArray(estoques)) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const estoquesToSave = estoques.map((estoque) => ({
      ...estoque,
    }));

    const savedEstoques = await Estoque.insertMany(estoquesToSave);
    res.status(201).json(savedEstoques);
  } catch (error) {
    console.error("Erro ao importar estoques:", error);
    res.status(500).json({ message: error.message });
  }
});

// ===== ROTAS DE MOVIMENTAÇÃO =====

// Registrar uma movimentação (entrada ou saída)
router.post("/movimentacao/registrar", async (req, res) => {
  try {
    const { estoqueId, type, quantity, responsible, location, source, work } =
      req.body;

    if (!estoqueId || !type || !quantity || !responsible) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }

    // Buscar o estoque
    const estoque = await Estoque.findById(estoqueId);
    if (!estoque) {
      return res.status(404).json({ message: "Estoque não encontrado" });
    }

    const quantityNum = Number(quantity);

    // Validar saída
    if (type === "saida" && quantityNum > estoque.quantity) {
      return res.status(400).json({
        message: `Quantidade de saída não pode ultrapassar o estoque disponível! Estoque atual: ${estoque.quantity} ${estoque.unit}`,
      });
    }

    // Calcular nova quantidade
    const previousQuantity = estoque.quantity;
    const newQuantity =
      type === "entrada"
        ? estoque.quantity + quantityNum
        : Math.max(0, estoque.quantity - quantityNum);

    // Atualizar estoque
    estoque.quantity = newQuantity;
    estoque.lastUpdate = new Date();
    await estoque.save();

    // Registrar movimentação
    const currentDate = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString("pt-BR");

    const movimentacao = new MovimentacaoEstoque({
      estoque: estoqueId,
      itemName: estoque.name,
      itemCategory: estoque.category,
      type,
      quantity: quantityNum,
      previousQuantity,
      newQuantity,
      responsible: type === "saida" ? responsible : "Sistema",
      location: location || estoque.location,
      source: type === "entrada" ? source : "",
      work: type === "saida" ? work : "",
      date: currentDate,
      time: currentTime,
    });

    const savedMovimentacao = await movimentacao.save();

    res.status(201).json({
      message: `Movimentação de ${type} registrada com sucesso!`,
      movimentacao: savedMovimentacao,
      estoque: estoque,
    });
  } catch (error) {
    console.error("Erro ao registrar movimentação:", error);
    res.status(500).json({ message: error.message });
  }
});

// Buscar histórico de movimentações
router.get("/historico/todas", async (req, res) => {
  try {
    const movimentacoes = await MovimentacaoEstoque.find()
      .populate("estoque")
      .sort({ timestamp: -1 });
    res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ message: error.message });
  }
});

// Buscar histórico de movimentações de um estoque específico
router.get("/historico/:estoqueId", async (req, res) => {
  try {
    const { estoqueId } = req.params;
    const movimentacoes = await MovimentacaoEstoque.find({ estoque: estoqueId })
      .populate("estoque")
      .sort({ timestamp: -1 });
    res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao buscar histórico do estoque:", error);
    res.status(500).json({ message: error.message });
  }
});

// Filtrar histórico por tipo (entrada ou saída)
router.get("/historico/tipo/:tipo", async (req, res) => {
  try {
    const { tipo } = req.params;
    if (!["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo inválido" });
    }

    const movimentacoes = await MovimentacaoEstoque.find({ type: tipo })
      .populate("estoque")
      .sort({ timestamp: -1 });
    res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao buscar histórico por tipo:", error);
    res.status(500).json({ message: error.message });
  }
});

// Filtrar histórico por data
router.get("/historico/data/:startDate/:endDate", async (req, res) => {
  try {
    const { startDate, endDate } = req.params;

    const movimentacoes = await MovimentacaoEstoque.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("estoque")
      .sort({ timestamp: -1 });

    res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao buscar histórico por data:", error);
    res.status(500).json({ message: error.message });
  }
});

// Estatísticas de estoque
router.get("/stats/resumo", async (req, res) => {
  try {
    const totalItens = await Estoque.countDocuments();
    const totalValue = await Estoque.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ["$quantity", "$cost"] },
          },
        },
      },
    ]);

    const lowStockItems = await Estoque.countDocuments({
      status: "Estoque Baixo",
    });

    const totalLocations = await Estoque.distinct("location");

    res.json({
      totalItens,
      totalValue: totalValue[0]?.total || 0,
      lowStockCount: lowStockItems,
      totalLocations: totalLocations.length,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
