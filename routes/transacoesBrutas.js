import express from "express";
import mongoose from "mongoose";
// import multer from "multer"; // Removido
import path from "path";
import TransacaoBruta from "../models/TransacaoBruta.js";

const router = express.Router();

// Removido multer. Agora espera-se que os anexos sejam enviados em base64 no corpo da requisição.

// Criar uma nova transação bruta
router.post("/duplicatas", async (req, res) => {
  try {
    console.log("Dados recebidos:", req.body);

    const {
      descricao,
      valor,
      valorPago,
      tipo,
      data,
      dataPagamentoRecebimento,
      status,
      categoria,
      categoriaOutros,
      centroCusto,
      dataVencimento,
      formaPagamento,
      beneficiario,
      beneficiarioTipo,
      documento,
      numeroParcela,
      totalParcelas,
      nfeInfo,
    } = req.body;

    // Validação dos campos obrigatórios
    if (
      !descricao ||
      !valor ||
      !categoria ||
      !centroCusto ||
      !dataVencimento ||
      !formaPagamento ||
      !beneficiario ||
      !beneficiarioTipo ||
      !numeroParcela ||
      !totalParcelas
    ) {
      console.log("Campos faltando:", {
        descricao: !descricao,
        valor: !valor,
        categoria: !categoria,
        centroCusto: !centroCusto,
        dataVencimento: !dataVencimento,
        formaPagamento: !formaPagamento,
        beneficiario: !beneficiario,
        beneficiarioTipo: !beneficiarioTipo,
        numeroParcela: !numeroParcela,
        totalParcelas: !totalParcelas,
      });
      return res.status(400).json({
        error: "Campos obrigatórios não preenchidos",
        camposFaltantes: {
          descricao: !descricao,
          valor: !valor,
          categoria: !categoria,
          centroCusto: !centroCusto,
          dataVencimento: !dataVencimento,
          formaPagamento: !formaPagamento,
          beneficiario: !beneficiario,
          beneficiarioTipo: !beneficiarioTipo,
          numeroParcela: !numeroParcela,
          totalParcelas: !totalParcelas,
        },
      });
    }

    try {
      // Criar a transação bruta
      const transacaoBruta = new TransacaoBruta({
        descricao,
        valor: Number(valor),
        valorPago: Number(valorPago) || 0,
        tipo,
        data: data ? new Date(data) : new Date(),
        dataPagamentoRecebimento: dataPagamentoRecebimento
          ? new Date(dataPagamentoRecebimento)
          : null,
        status,
        categoria,
        categoriaOutros,
        centroCusto,
        dataVencimento: new Date(dataVencimento),
        formaPagamento,
        beneficiario: new mongoose.Types.ObjectId(beneficiario),
        beneficiarioTipo,
        documento,
        anexos:
          req.body.anexos && Array.isArray(req.body.anexos)
            ? req.body.anexos.map((anexo) => ({
                nome: anexo.nome,
                tipo: anexo.tipo,
                tamanho: anexo.tamanho,
                base64: anexo.base64,
                dataUpload: new Date(),
              }))
            : [],
        numeroParcela: Number(numeroParcela),
        totalParcelas: Number(totalParcelas),
        nfeInfo: nfeInfo || null,
      });

      console.log("Transação bruta criada:", transacaoBruta);
      await transacaoBruta.save();
      console.log("Transação bruta salva com sucesso");

      res.status(201).json(transacaoBruta);
    } catch (error) {
      console.error("Erro ao criar transação bruta:", error);
      res.status(500).json({
        error: "Erro ao criar transação bruta",
        details: error.message,
        stack: error.stack,
      });
    }
  } catch (error) {
    console.error("Erro geral:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
      stack: error.stack,
    });
  }
});

// Obter todas as transações brutas
router.get("/duplicatas", async (req, res) => {
  try {
    const transacoes = await TransacaoBruta.find()
      .populate("beneficiario")
      .sort({ createdAt: -1 });
    res.json(transacoes);
  } catch (error) {
    console.error("Erro ao buscar transações brutas:", error);
    res.status(500).json({
      error: "Erro ao buscar transações brutas",
      details: error.message,
    });
  }
});

// Obter uma transação bruta específica
router.get("/duplicatas/:id", async (req, res) => {
  try {
    const transacao = await TransacaoBruta.findById(req.params.id).populate(
      "beneficiario"
    );
    if (!transacao) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }
    res.json(transacao);
  } catch (error) {
    console.error("Erro ao buscar transação bruta:", error);
    res.status(500).json({
      error: "Erro ao buscar transação bruta",
      details: error.message,
    });
  }
});

// Atualizar uma transação bruta
router.put("/duplicatas/:id", async (req, res) => {
  try {
    const {
      descricao,
      valor,
      valorPago,
      status,
      categoria,
      categoriaOutros,
      centroCusto,
      dataVencimento,
      formaPagamento,
      dataPagamentoRecebimento,
    } = req.body;

    const transacao = await TransacaoBruta.findById(req.params.id);
    if (!transacao) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    // Atualizar apenas os campos fornecidos
    if (descricao) transacao.descricao = descricao;
    if (valor) transacao.valor = Number(valor);
    if (valorPago !== undefined) transacao.valorPago = Number(valorPago);
    if (status) transacao.status = status;
    if (categoria) transacao.categoria = categoria;
    if (categoriaOutros !== undefined)
      transacao.categoriaOutros = categoriaOutros;
    if (centroCusto) transacao.centroCusto = centroCusto;
    if (dataVencimento) transacao.dataVencimento = new Date(dataVencimento);
    if (formaPagamento) transacao.formaPagamento = formaPagamento;
    if (dataPagamentoRecebimento) {
      transacao.dataPagamentoRecebimento = new Date(dataPagamentoRecebimento);
    }

    await transacao.save();
    res.json(transacao);
  } catch (error) {
    console.error("Erro ao atualizar transação bruta:", error);
    res.status(500).json({
      error: "Erro ao atualizar transação bruta",
      details: error.message,
    });
  }
});

// Atualizar parcialmente uma transação bruta
router.patch("/duplicatas/:id", async (req, res) => {
  try {
    const transacao = await TransacaoBruta.findById(req.params.id);
    if (!transacao) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    // Atualizar os campos fornecidos
    Object.keys(req.body).forEach((key) => {
      if (key === "valor" || key === "valorPago") {
        transacao[key] = Number(req.body[key]);
      } else if (
        key === "dataVencimento" ||
        key === "dataPagamentoRecebimento"
      ) {
        transacao[key] = new Date(req.body[key]);
      } else {
        transacao[key] = req.body[key];
      }
    });

    await transacao.save();
    res.json(transacao);
  } catch (error) {
    console.error("Erro ao atualizar transação bruta:", error);
    res.status(500).json({
      error: "Erro ao atualizar transação bruta",
      details: error.message,
    });
  }
});

// Excluir uma transação bruta
router.delete("/duplicatas/:id", async (req, res) => {
  try {
    const transacao = await TransacaoBruta.findById(req.params.id);
    if (!transacao) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    await transacao.deleteOne();
    res.json({ message: "Transação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir transação bruta:", error);
    res.status(500).json({
      error: "Erro ao excluir transação bruta",
      details: error.message,
    });
  }
});

// Adicionar nfeInfo a uma transação bruta
router.patch("/:id/nfe", async (req, res) => {
  try {
    const { numero, serie, dataEmissao, chaveAcesso } = req.body;

    // Validação dos campos obrigatórios
    if (!numero || !serie || !dataEmissao || !chaveAcesso) {
      return res.status(400).json({
        error: "Campos obrigatórios não preenchidos",
        camposFaltantes: {
          numero: !numero,
          serie: !serie,
          dataEmissao: !dataEmissao,
          chaveAcesso: !chaveAcesso,
        },
      });
    }

    // Criar o novo objeto nfeInfo
    const novaNfeInfo = {
      numero,
      serie,
      dataEmissao: new Date(dataEmissao),
      chaveAcesso,
    };

    // Primeiro, buscar a transação atual
    const transacaoAtual = await TransacaoBruta.findById(req.params.id);
    if (!transacaoAtual) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    // Preparar o array nfeInfo
    let nfeInfoArray = [];
    if (transacaoAtual.nfeInfo) {
      // Se nfeInfo for um objeto, converte para array
      nfeInfoArray = Array.isArray(transacaoAtual.nfeInfo)
        ? [...transacaoAtual.nfeInfo]
        : [transacaoAtual.nfeInfo];
    }

    // Verificar se a NF-e já existe
    const nfeJaExiste = nfeInfoArray.some(
      (nfe) => nfe.numero === numero && nfe.serie === serie
    );

    // Se a NF-e não existir, adiciona ao array
    if (!nfeJaExiste) {
      nfeInfoArray.push(novaNfeInfo);
    }

    // Atualizar a transação usando findOneAndUpdate
    const transacaoAtualizada = await TransacaoBruta.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { nfeInfo: nfeInfoArray } },
      { new: true, runValidators: true }
    );

    res.json(transacaoAtualizada);
  } catch (error) {
    console.error("Erro ao adicionar nfeInfo:", error);
    res.status(500).json({
      error: "Erro ao adicionar nfeInfo",
      details: error.message,
    });
  }
});

export default router;
