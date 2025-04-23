import express from "express";
import TransacaoIndependente from "../models/TransacaoIndependente.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "documentos"
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(
      new Error(
        "Apenas arquivos PDF, DOC, DOCX, XLS, XLSX, JPEG e PNG são permitidos"
      )
    );
  },
});

// Get all independent transactions
router.get("/", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find()
      .populate("beneficiario")
      .sort({ data: -1 });
    res.status(200).json(transacoes);
  } catch (error) {
    console.error("Erro ao buscar transações independentes:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single independent transaction
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transacao = await TransacaoIndependente.findById(id).populate(
      "beneficiario"
    );
    if (!transacao) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    res.status(200).json(transacao);
  } catch (error) {
    console.error("Erro ao buscar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new independent transaction
router.post("/", upload.array("anexos", 5), async (req, res) => {
  try {
    // Processar anexos se existirem
    const anexos = req.files
      ? req.files.map((file) => ({
          nome: file.originalname,
          tipo: file.mimetype,
          tamanho: file.size,
          caminho: `/api/obras/uploads/documentos/${file.filename}`,
          dataUpload: new Date(),
        }))
      : [];

    const transacaoData = {
      ...req.body,
      valor: parseFloat(req.body.valor),
      valorPago: parseFloat(req.body.valorPago || 0),
      valorRecebido: parseFloat(req.body.valorRecebido || 0),
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: req.body.beneficiario
        ? new mongoose.Types.ObjectId(req.body.beneficiario)
        : null,
      anexos: anexos,
    };

    const transacao = new TransacaoIndependente(transacaoData);
    const novaTransacao = await transacao.save();
    res.status(201).json(novaTransacao);
  } catch (error) {
    console.error("Erro ao criar transação independente:", error);
    res.status(400).json({ message: error.message });
  }
});

// Update an independent transaction
router.put("/:id", upload.array("anexos", 5), async (req, res) => {
  try {
    const transacao = await TransacaoIndependente.findById(req.params.id);
    if (!transacao) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    // Processar anexos se existirem
    const anexos = req.files
      ? req.files.map((file) => ({
          nome: file.originalname,
          tipo: file.mimetype,
          tamanho: file.size,
          caminho: `/api/obras/uploads/documentos/${file.filename}`,
          dataUpload: new Date(),
        }))
      : [];

    // Se houver anexos existentes, mantê-los
    const anexosExistentes = transacao.anexos || [];
    const todosAnexos = [...anexosExistentes, ...anexos];

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (key !== "anexos") {
        transacao[key] = req.body[key];
      }
    });

    // Update valores específicos
    if (req.body.tipo === "pagamento") {
      transacao.valorPago = parseFloat(req.body.valorPago || 0);
      transacao.valorRecebido = 0;
    } else if (req.body.tipo === "receita") {
      transacao.valorRecebido = parseFloat(req.body.valorRecebido || 0);
      transacao.valorPago = 0;
    }

    // Atualizar anexos
    transacao.anexos = todosAnexos;

    const transacaoAtualizada = await transacao.save();
    res.json(transacaoAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar transação independente:", error);
    res.status(400).json({ message: error.message });
  }
});

// Delete an independent transaction
router.delete("/:id", async (req, res) => {
  try {
    const transacao = await TransacaoIndependente.findById(req.params.id);
    if (!transacao) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    await transacao.deleteOne();
    res.json({ message: "Transação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get transactions by date range
router.get("/periodo/:inicio/:fim", async (req, res) => {
  try {
    const inicio = new Date(req.params.inicio);
    const fim = new Date(req.params.fim);

    const transacoes = await TransacaoIndependente.find({
      data: {
        $gte: inicio,
        $lte: fim,
      },
    })
      .populate("beneficiario")
      .sort({ data: -1 });

    res.json(transacoes);
  } catch (error) {
    console.error("Erro ao buscar transações por período:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get transactions by status
router.get("/status/:status", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find({
      status: req.params.status,
    })
      .populate("beneficiario")
      .sort({ data: -1 });

    res.json(transacoes);
  } catch (error) {
    console.error("Erro ao buscar transações por status:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get transactions by type
router.get("/tipo/:tipo", async (req, res) => {
  try {
    const transacoes = await TransacaoIndependente.find({
      tipo: req.params.tipo,
    })
      .populate("beneficiario")
      .sort({ data: -1 });

    res.json(transacoes);
  } catch (error) {
    console.error("Erro ao buscar transações por tipo:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
