import express from "express";
import OrdemCompra from "../models/OrdemCompra.js";

const router = express.Router();

// Rota para criar uma nova ordem de compra
router.post("/", async (req, res) => {
  try {
    const { cotacaoId, fornecedorId, itens, total, status, dataCriacao, obra } =
      req.body;

    if (!cotacaoId || !fornecedorId || !itens || !total) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    // Gerar número sequencial para a ordem de compra
    const ultimaOrdem = await OrdemCompra.findOne().sort({ numero: -1 });
    const numero = ultimaOrdem ? ultimaOrdem.numero + 1 : 1;

    const novaOrdemCompra = new OrdemCompra({
      cotacaoId,
      fornecedorId,
      itens,
      total,
      status,
      dataCriacao,
      obra,
      numero, // Adicionado
      data: new Date(), // Adicionado
      valorTotal: total, // Adicionado
    });

    const savedOrdemCompra = await novaOrdemCompra.save();
    res.status(201).json(savedOrdemCompra);
  } catch (error) {
    console.error("Erro ao criar ordem de compra:", error);
    res.status(500).json({ message: "Erro ao criar ordem de compra" });
  }
});

// Rota para listar todas as ordens de compra
router.get("/", async (req, res) => {
  try {
    const ordensCompra = await OrdemCompra.find()
      .populate("cotacaoId", "nome")
      .populate("fornecedorId", "nome")
      .lean();
    res.json(ordensCompra);
  } catch (error) {
    console.error("Erro ao buscar ordens de compra:", error);
    res.status(500).json({ message: "Erro ao buscar ordens de compra" });
  }
});

// Rota para obter uma ordem de compra específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ordemCompra = await OrdemCompra.findById(id)
      .populate("cotacaoId", "nome")
      .populate("fornecedorId", "nome")
      .lean();

    if (!ordemCompra) {
      return res
        .status(404)
        .json({ message: "Ordem de compra não encontrada" });
    }

    res.json(ordemCompra);
  } catch (error) {
    console.error("Erro ao buscar ordem de compra:", error);
    res.status(500).json({ message: "Erro ao buscar ordem de compra" });
  }
});

// Rota para atualizar uma ordem de compra
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ordemCompraData = req.body;

    const updatedOrdemCompra = await OrdemCompra.findByIdAndUpdate(
      id,
      ordemCompraData,
      { new: true, runValidators: true }
    );

    if (!updatedOrdemCompra) {
      return res
        .status(404)
        .json({ message: "Ordem de compra não encontrada" });
    }

    res.json(updatedOrdemCompra);
  } catch (error) {
    console.error("Erro ao atualizar ordem de compra:", error);
    res.status(500).json({ message: "Erro ao atualizar ordem de compra" });
  }
});

// Rota para excluir uma ordem de compra
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedOrdemCompra = await OrdemCompra.findByIdAndDelete(id);
    if (!deletedOrdemCompra) {
      return res
        .status(404)
        .json({ message: "Ordem de compra não encontrada" });
    }

    res.status(200).json({ message: "Ordem de compra excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir ordem de compra:", error);
    res.status(500).json({ message: "Erro ao excluir ordem de compra" });
  }
});

export default router;
