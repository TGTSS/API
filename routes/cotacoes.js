import express from "express";
import Cotacao from "../models/Cotacao.js";
import Solicitacao from "../models/Solicitacao.js";
import mongoose from "mongoose";

const router = express.Router();

// Rota para criar uma nova cotação
router.post("/", async (req, res) => {
  try {
    const {
      solicitacaoId,
      nome,
      descricao,
      obraId,
      obraNome,
      prioridade,
      items,
      numero,
      etapa,
    } = req.body;

    const novaCotacao = new Cotacao({
      solicitacaoId,
      nome,
      descricao,
      obraId,
      obraNome,
      prioridade,
      items,
      numero,
      etapa,
    });

    const savedCotacao = await novaCotacao.save();

    // Atualizar status da solicitação para "Em cotação"
    await Solicitacao.findByIdAndUpdate(solicitacaoId, {
      status: "Em cotação",
    });

    res.status(201).json(savedCotacao);
  } catch (error) {
    console.error("Erro ao criar cotação:", error);
    res.status(500).json({ message: "Erro ao criar cotação" });
  }
});

// Rota para listar todas as cotações
router.get("/", async (req, res) => {
  try {
    const cotacoes = await Cotacao.find().lean();
    res.json(cotacoes);
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
    res.status(500).json({ message: "Erro ao buscar cotações" });
  }
});

// Rota para obter uma cotação específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o ID é válido
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const cotacao = await Cotacao.findById(id).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.json(cotacao);
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    res.status(500).json({ message: "Erro ao buscar cotação" });
  }
});

// Rota para atualizar uma cotação
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cotacaoData = req.body;
    const updatedCotacao = await Cotacao.findByIdAndUpdate(id, cotacaoData, {
      new: true,
    });
    if (!updatedCotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.json(updatedCotacao);
  } catch (error) {
    console.error("Erro ao atualizar cotação:", error);
    res.status(500).json({ message: "Erro ao atualizar cotação" });
  }
});

// Rota para excluir uma cotação
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCotacao = await Cotacao.findByIdAndDelete(id);
    if (!deletedCotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.status(200).json({ message: "Cotação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cotação:", error);
    res.status(500).json({ message: "Erro ao excluir cotação" });
  }
});

// Adicionar fornecedores à cotação
router.post("/:cotacaoId/fornecedores", async (req, res) => {
  try {
    const { fornecedores } = req.body;
    const cotacao = await Cotacao.findById(req.params.cotacaoId);

    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    cotacao.fornecedores = fornecedores.map((fornecedorId) => ({
      fornecedorId,
    }));

    await cotacao.save();
    res.status(200).json(cotacao.fornecedores);
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar fornecedores", error });
  }
});

router.get("/:cotacaoId/fornecedores", async (req, res) => {
  try {
    const cotacao = await Cotacao.findById(req.params.cotacaoId);

    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    res.status(200).json(cotacao.fornecedores);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar fornecedores", error });
  }
});

// Remover fornecedor da cotação
router.delete("/:cotacaoId/fornecedores/:fornecedorId", async (req, res) => {
  try {
    const { cotacaoId, fornecedorId } = req.params;

    // Verificar se o ID da cotação é válido
    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    // Verificar se o ID do fornecedor é válido
    if (!mongoose.Types.ObjectId.isValid(fornecedorId)) {
      return res.status(400).json({ message: "ID do fornecedor inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);

    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    // Verificar se o fornecedor existe na lista
    const fornecedorExiste = cotacao.fornecedores.some(
      (f) => f.fornecedorId.toString() === fornecedorId
    );

    if (!fornecedorExiste) {
      return res
        .status(404)
        .json({ message: "Fornecedor não encontrado na cotação" });
    }

    // Remover o fornecedor
    cotacao.fornecedores = cotacao.fornecedores.filter(
      (f) => f.fornecedorId.toString() !== fornecedorId
    );

    await cotacao.save();
    res
      .status(200)
      .json({
        message: "Fornecedor removido com sucesso",
        fornecedores: cotacao.fornecedores,
      });
  } catch (error) {
    console.error("Erro ao remover fornecedor:", error);
    res.status(500).json({ message: "Erro ao remover fornecedor", error });
  }
});

// Adicionar itens enviados por um fornecedor
router.post("/:cotacaoId/fornecedor/:fornecedorId", async (req, res) => {
  try {
    const { itens, prazoPagamento } = req.body;
    const cotacao = await Cotacao.findById(req.params.cotacaoId);

    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    const fornecedorIndex = cotacao.itensFornecedor.findIndex(
      (f) => f.fornecedorId.toString() === req.params.fornecedorId
    );

    if (fornecedorIndex !== -1) {
      cotacao.itensFornecedor[fornecedorIndex].itens = itens;
      cotacao.itensFornecedor[fornecedorIndex].prazoPagamento = prazoPagamento;
    } else {
      cotacao.itensFornecedor.push({
        fornecedorId: req.params.fornecedorId,
        itens,
        prazoPagamento,
      });
    }

    await cotacao.save();
    res.status(200).json(cotacao.itensFornecedor);
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar itens", error });
  }
});

export default router;
