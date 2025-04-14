import express from "express";
import Lancamento from "../models/Lancamento.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/lancamentos";
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
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido"), false);
    }
  },
});

// Rota para criar um novo lançamento
router.post("/:obraId/:tipo", upload.array("anexos"), async (req, res) => {
  try {
    const { obraId, tipo } = req.params;
    const formData = req.body;

    // Extrair valores do FormData
    const {
      descricao,
      valor,
      valorNumerico,
      data,
      status,
      categoria,
      centroCusto,
      dataVencimento,
      formaPagamento,
      beneficiario,
      beneficiarioTipo,
      documento,
    } = formData;

    // Validar campos obrigatórios
    if (!descricao || !valorNumerico || !data) {
      return res.status(400).json({
        message: "Campos obrigatórios não preenchidos",
        details: {
          descricao: !descricao,
          valor: !valorNumerico,
          data: !data,
        },
      });
    }

    // Validar beneficiarioTipo para pagamentos
    if (tipo === "pagamento" && !beneficiarioTipo) {
      return res.status(400).json({
        message: "Tipo de beneficiário é obrigatório para pagamentos",
      });
    }

    // Processar arquivos anexados
    const anexos = req.files
      ? req.files.map((file) => ({
          nome: file.originalname,
          tipo: file.mimetype,
          tamanho: file.size,
          caminho: file.path,
        }))
      : [];

    const lancamento = new Lancamento({
      descricao,
      valor: parseFloat(valorNumerico || valor),
      tipo,
      obra: obraId,
      data: new Date(data),
      status: status || "pendente",
      categoria,
      centroCusto,
      dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
      formaPagamento,
      documento,
      anexos,
      valorRecebido: tipo === "receita" ? 0 : undefined,
      valorPago: tipo === "pagamento" ? 0 : undefined,
      beneficiario: beneficiario ? beneficiario : undefined,
      beneficiarioTipo: tipo === "pagamento" ? beneficiarioTipo : undefined,
    });

    await lancamento.save();
    res.status(201).json(lancamento);
  } catch (error) {
    console.error("Erro ao criar lançamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um lançamento
router.put("/:id", upload.array("anexos"), async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;

    // Processar arquivos anexados
    const anexos = req.files ? req.files.map((file) => file.path) : [];

    const lancamento = await Lancamento.findByIdAndUpdate(
      id,
      {
        ...formData,
        anexos,
        valor: parseFloat(formData.valor),
        valorRecebido: formData.valorRecebido
          ? parseFloat(formData.valorRecebido)
          : 0,
        valorPago: formData.valorPago ? parseFloat(formData.valorPago) : 0,
      },
      { new: true }
    );

    if (!lancamento) {
      return res.status(404).json({ message: "Lançamento não encontrado" });
    }

    res.json(lancamento);
  } catch (error) {
    console.error("Erro ao atualizar lançamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um lançamento
router.delete("/:obraId/:tipo/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lancamento = await Lancamento.findByIdAndDelete(id);

    if (!lancamento) {
      return res.status(404).json({ message: "Lançamento não encontrado" });
    }

    // Remover arquivos anexados
    if (lancamento.anexos && lancamento.anexos.length > 0) {
      lancamento.anexos.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.json({ message: "Lançamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir lançamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar receitas de uma obra
router.get("/:obraId/receitas", async (req, res) => {
  try {
    const { obraId } = req.params;
    const receitas = await Lancamento.find({
      obra: obraId,
      tipo: "receita",
    }).sort({ data: -1 });
    res.json(receitas);
  } catch (error) {
    console.error("Erro ao buscar receitas:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar despesas de uma obra
router.get("/:obraId/despesas", async (req, res) => {
  try {
    const { obraId } = req.params;
    const despesas = await Lancamento.find({
      obra: obraId,
      tipo: "despesa",
    }).sort({ data: -1 });
    res.json(despesas);
  } catch (error) {
    console.error("Erro ao buscar despesas:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar pagamentos de uma obra
router.get("/:obraId/pagamentos", async (req, res) => {
  try {
    const { obraId } = req.params;
    const pagamentos = await Lancamento.find({
      obra: obraId,
      tipo: "pagamento",
    }).sort({ data: -1 });
    res.json(pagamentos);
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
