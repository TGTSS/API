import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import TransacaoBruta from "../models/TransacaoBruta.js";

const router = express.Router();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// Criar uma nova transação bruta
router.post("/duplicatas", upload.array("anexos"), async (req, res) => {
  try {
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
      return res.status(400).json({
        error: "Campos obrigatórios não preenchidos",
      });
    }

    // Processar anexos se houver
    const anexos = req.files
      ? req.files.map((file) => ({
          nome: file.originalname,
          tipo: file.mimetype,
          tamanho: file.size,
          caminho: file.path,
          dataUpload: new Date(),
        }))
      : [];

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
      anexos,
      numeroParcela: Number(numeroParcela),
      totalParcelas: Number(totalParcelas),
      nfeInfo: nfeInfo ? JSON.parse(nfeInfo) : null,
    });

    await transacaoBruta.save();

    res.status(201).json(transacaoBruta);
  } catch (error) {
    console.error("Erro ao criar transação bruta:", error);
    res.status(500).json({
      error: "Erro ao criar transação bruta",
      details: error.message,
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

export default router;
