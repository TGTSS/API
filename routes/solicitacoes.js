import express from "express";
import Solicitacao from "../models/Solicitacao.js";
import Obra from "../models/Obra.js";

const router = express.Router();

// Get all solicitacoes
router.get("/", async (req, res) => {
  try {
    const solicitacoes = await Solicitacao.find()
      .populate("obras", "nome")
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
    const solicitacoes = await Solicitacao.find({ obras: req.params.obraId })
      .populate("obras", "nome")
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
    const lastSolicitacao = await Solicitacao.findOne({ obras: obraId }).sort({
      numeroSequencial: -1,
    });

    const numeroSequencial = lastSolicitacao
      ? lastSolicitacao.numeroSequencial + 1
      : 1;

    // Process items to ensure all required fields are present
    const processedItems = req.body.items.map((item) => ({
      ...item,
      custoUnitario: item.custoUnitario || 0,
      unidade: item.unidade || "UN",
      descricao:
        item.descricao || item.insumoId?.descricao || "Item sem descrição",
      quantidade: item.quantidade || 1,
    }));

    // Calculate total value from items
    const valor = processedItems.reduce((total, item) => {
      return total + item.quantidade * (item.custoUnitario || 0);
    }, 0);

    const solicitacao = new Solicitacao({
      ...req.body,
      obras: [obraId], // Ensure it's an array
      obrasNomes: [obra.nome], // Ensure it's an array
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
      .populate("obras", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.status(201).json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    res.status(400).json({
      message: "Erro ao criar solicitação",
      error: error.message,
      details: error.errors,
    });
  }
});

// Get single solicitacao
router.get("/:id", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id)
      .populate("obras", "nome")
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
      .populate("obras", "nome")
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
      .populate("obras", "nome")
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
      .populate("obras", "nome")
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
      .populate("obras", "nome")
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

// Create solicitacoes for multiple obras
router.post("/multiple-obras", async (req, res) => {
  try {
    const { obras, obrasNomes, ...solicitacaoData } = req.body;

    if (!Array.isArray(obras) || obras.length === 0) {
      return res
        .status(400)
        .json({ message: "É necessário fornecer pelo menos uma obra" });
    }

    // Verificar se todas as obras existem e obter o último numeroSequencial para cada obra
    const obrasInfo = await Promise.all(
      obras.map(async (obraId) => {
        const obra = await Obra.findById(obraId);
        if (!obra) {
          throw new Error(`Obra com ID ${obraId} não encontrada`);
        }

        // Get the last numeroSequencial for this obra
        const lastSolicitacao = await Solicitacao.findOne({
          obras: obraId,
        }).sort({
          numeroSequencial: -1,
        });

        const numeroSequencial = lastSolicitacao
          ? lastSolicitacao.numeroSequencial + 1
          : 1;

        return {
          obraId,
          obraNome: obra.nome,
          numeroSequencial,
        };
      })
    );

    // Process items to ensure all required fields are present
    const processedItems = solicitacaoData.items.map((item) => ({
      ...item,
      custoUnitario: item.custoUnitario || 0,
      unidade: item.unidade || "UN",
      descricao:
        item.descricao || item.insumoId?.descricao || "Item sem descrição",
      quantidade: item.quantidade || 1,
      isManual: item.isManual || false,
      obraId: item.obraId || undefined, // Tratar campo vazio como undefined
    }));

    // Calculate total value from items
    const valor = processedItems.reduce((total, item) => {
      return total + item.quantidade * (item.custoUnitario || 0);
    }, 0);

    // Ensure descricao is not empty
    const descricao = solicitacaoData.descricao || "Solicitação sem descrição";

    // Criar a solicitação com os arrays de obras e nomes
    const solicitacao = new Solicitacao({
      ...solicitacaoData,
      nome: solicitacaoData.nome,
      descricao, // Use the processed descricao
      obras: obras,
      obrasNomes: obrasNomes,
      valor,
      items: processedItems,
      solicitante: solicitacaoData.solicitante || "Usuário",
      status: "Pendente",
      data: new Date(),
      numeroSequencial: obrasInfo[0].numeroSequencial, // Use the first obra's numeroSequencial
    });

    const newSolicitacao = await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(newSolicitacao._id)
      .populate("obras", "nome")
      .populate("fornecedores", "nome");

    res.status(201).json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao criar solicitações:", error);
    res.status(400).json({
      message: "Erro ao criar solicitações",
      error: error.message,
      details: error.errors,
    });
  }
});

// Update item in solicitacao
router.patch("/:id/items/:itemId", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    const item = solicitacao.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    Object.assign(item, req.body);
    const updatedSolicitacao = await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(
      updatedSolicitacao._id
    )
      .populate("obras", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res.status(400).json({
      message: "Erro ao atualizar item",
      error: error.message,
    });
  }
});

// Adicionar rota para deletar item de uma solicitacao
router.delete("/:id/items/:itemId", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    // Use pull() instead of remove()
    solicitacao.items.pull(req.params.itemId);

    // Recalculate total value after removing the item
    solicitacao.valor = solicitacao.items.reduce((total, item) => {
      return total + (item.quantidade || 1) * (item.custoUnitario || 0);
    }, 0);

    await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(solicitacao._id)
      .populate("obras", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao excluir item:", error);
    res.status(400).json({
      message: "Erro ao excluir item",
      error: error.message,
    });
  }
});

// Adicionar rota para adicionar item a uma solicitacao
router.post("/:id/items", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    const itemData = req.body;
    // Garantir campos obrigatórios e defaults
    const novoItem = {
      descricao: itemData.descricao || "Item sem descrição",
      unidade: itemData.unidade || "UN",
      custoUnitario: itemData.custoUnitario || 0,
      quantidade: itemData.quantidade || 1,
      etapa: itemData.etapa || "Padrão",
      insumoId: itemData.insumoId || undefined,
      obraId: itemData.obraId || solicitacao.obra || undefined,
      obraNome: itemData.obraNome || solicitacao.obraNome || undefined,
    };
    solicitacao.items.push(novoItem);
    // Atualizar valor total
    solicitacao.valor = solicitacao.items.reduce((total, item) => {
      return total + (item.quantidade || 1) * (item.custoUnitario || 0);
    }, 0);
    await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(solicitacao._id)
      .populate("obras", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.status(201).json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    res.status(400).json({
      message: "Erro ao adicionar item",
      error: error.message,
    });
  }
});

// Delete all items from a solicitação
router.delete("/:id/items", async (req, res) => {
  try {
    const solicitacao = await Solicitacao.findById(req.params.id);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    // Remove all items
    solicitacao.items = [];
    // Reset the total value since all items are removed
    solicitacao.valor = 0;

    await solicitacao.save();

    // Populate the response
    const populatedSolicitacao = await Solicitacao.findById(solicitacao._id)
      .populate("obras", "nome")
      .populate("fornecedores", "nome")
      .populate("items.insumoId");

    res.json(populatedSolicitacao);
  } catch (error) {
    console.error("Erro ao excluir todos os itens:", error);
    res.status(500).json({
      message: "Erro ao excluir todos os itens",
      error: error.message,
    });
  }
});

export default router;
