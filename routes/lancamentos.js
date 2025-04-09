import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Criar diretório uploads se não existir
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Apenas arquivos PDF, JPEG e PNG são permitidos"));
  },
});

// Rota para adicionar um novo lançamento de receita ou pagamento
router.post("/:id/:tipo", upload.array("anexos"), async (req, res) => {
  try {
    const { id, tipo } = req.params;
    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Função para converter valor monetário para número
    const parseValorMonetario = (valor) => {
      if (!valor) return 0;
      if (typeof valor === "string") {
        // Remove R$, pontos e espaços, substitui vírgula por ponto
        return parseFloat(
          valor.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
        );
      }
      return parseFloat(valor);
    };

    // Extrair valores do FormData
    const {
      descricao,
      valor,
      data,
      status,
      categoria,
      centroCusto,
      dataVencimento,
      formaPagamento,
      beneficiario,
      beneficiarioTipo,
      documento,
    } = req.body;

    const novoLancamento = {
      id: new mongoose.Types.ObjectId(),
      descricao,
      valor: parseValorMonetario(valor),
      tipo,
      data: new Date(data),
      status: status || "pendente",
      categoria,
      centroCusto,
      dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
      formaPagamento,
      documento,
      anexos: req.files
        ? req.files.map((file) => ({
            nome: file.originalname,
            tipo: file.mimetype,
            tamanho: file.size,
            caminho: file.path,
          }))
        : [],
    };

    // Campos específicos para cada tipo
    if (tipo === "receita") {
      novoLancamento.valorRecebido = 0;
      novoLancamento.beneficiario = beneficiario
        ? new mongoose.Types.ObjectId(beneficiario)
        : undefined;
    } else if (tipo === "pagamento") {
      novoLancamento.valorPago = 0;
      novoLancamento.beneficiario = beneficiario
        ? new mongoose.Types.ObjectId(beneficiario)
        : undefined;
      novoLancamento.beneficiarioTipo = beneficiarioTipo;
    } else {
      return res.status(400).json({ message: "Tipo de lançamento inválido" });
    }

    // Validar campos obrigatórios
    if (
      !novoLancamento.descricao ||
      !novoLancamento.valor ||
      !novoLancamento.data
    ) {
      return res.status(400).json({
        message: "Campos obrigatórios não preenchidos",
        details: {
          descricao: !novoLancamento.descricao,
          valor: !novoLancamento.valor,
          data: !novoLancamento.data,
        },
      });
    }

    if (tipo === "receita") {
      obra.receitas.push(novoLancamento);
    } else if (tipo === "pagamento") {
      obra.pagamentos.push(novoLancamento);
    }

    await obra.save();
    res.status(201).json(novoLancamento);
  } catch (error) {
    console.error("Erro ao adicionar lançamento:", error);
    res.status(500).json({
      message: error.message,
      details: error,
    });
  }
});

// Rota para editar um lançamento de receita ou pagamento
router.put(
  "/:id/:tipo/:lancamentoId",
  upload.array("anexos"),
  async (req, res) => {
    try {
      const { id, tipo, lancamentoId } = req.params;
      const obra = await Obra.findById(id);
      if (!obra) {
        return res.status(404).json({ message: "Obra não encontrada" });
      }

      // Função para converter valor monetário para número
      const parseValorMonetario = (valor) => {
        if (typeof valor === "string") {
          // Remove R$, pontos e espaços, substitui vírgula por ponto
          return parseFloat(
            valor.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
          );
        }
        return parseFloat(valor);
      };

      const lancamentoEditado = {
        descricao: req.body.descricao,
        valor: parseValorMonetario(req.body.valorNumerico || req.body.valor),
        data: new Date(req.body.data),
        status: req.body.status,
        categoria: req.body.categoria,
        centroCusto: req.body.centroCusto,
        dataVencimento: req.body.dataVencimento
          ? new Date(req.body.dataVencimento)
          : undefined,
        formaPagamento: req.body.formaPagamento,
        documento: req.body.documento,
      };

      // Adicionar novos anexos se houver
      if (req.files && req.files.length > 0) {
        const novosAnexos = req.files.map((file) => ({
          nome: file.originalname,
          tipo: file.mimetype,
          tamanho: file.size,
          caminho: file.path,
        }));
        lancamentoEditado.anexos = novosAnexos;
      }

      // Campos específicos para cada tipo
      if (tipo === "receita") {
        lancamentoEditado.valorRecebido = parseValorMonetario(
          req.body.valorRecebido || 0
        );
        lancamentoEditado.beneficiario = req.body.beneficiario
          ? new mongoose.Types.ObjectId(req.body.beneficiario)
          : undefined;
      } else if (tipo === "pagamento") {
        lancamentoEditado.valorPago = parseValorMonetario(
          req.body.valorPago || 0
        );
        lancamentoEditado.beneficiario = req.body.beneficiario
          ? new mongoose.Types.ObjectId(req.body.beneficiario)
          : undefined;
        lancamentoEditado.beneficiarioTipo = req.body.beneficiarioTipo;
      }

      // Validar campos obrigatórios
      if (
        !lancamentoEditado.descricao ||
        !lancamentoEditado.valor ||
        !lancamentoEditado.data
      ) {
        return res
          .status(400)
          .json({ message: "Campos obrigatórios não preenchidos" });
      }

      let lancamentoIndex;
      if (tipo === "receita") {
        lancamentoIndex = obra.receitas.findIndex(
          (item) => item._id.toString() === lancamentoId
        );
        if (lancamentoIndex === -1) {
          return res.status(404).json({ message: "Lançamento não encontrado" });
        }
        obra.receitas[lancamentoIndex] = {
          ...obra.receitas[lancamentoIndex],
          ...lancamentoEditado,
        };
      } else if (tipo === "pagamento") {
        lancamentoIndex = obra.pagamentos.findIndex(
          (item) => item._id.toString() === lancamentoId
        );
        if (lancamentoIndex === -1) {
          return res.status(404).json({ message: "Lançamento não encontrado" });
        }
        obra.pagamentos[lancamentoIndex] = {
          ...obra.pagamentos[lancamentoIndex],
          ...lancamentoEditado,
        };
      } else {
        return res.status(400).json({ message: "Tipo de lançamento inválido" });
      }

      await obra.save();
      res.json(lancamentoEditado);
    } catch (error) {
      console.error("Erro ao editar lançamento:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Rota para excluir um lançamento de receita ou pagamento
router.delete("/:id/:tipo?/:lancamentoId?", async (req, res) => {
  try {
    const { id, tipo, lancamentoId } = req.params;
    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Se não tiver tipo e lancamentoId, assume que o id é o lancamentoId
    if (!tipo && !lancamentoId) {
      // Procura em receitas e pagamentos
      const receitaIndex = obra.receitas.findIndex(
        (item) => item._id.toString() === id
      );
      const pagamentoIndex = obra.pagamentos.findIndex(
        (item) => item._id.toString() === id
      );

      if (receitaIndex !== -1) {
        obra.receitas.splice(receitaIndex, 1);
        await obra.save({ validateBeforeSave: false });
        return res.status(200).json({
          message: "Lançamento excluído com sucesso",
        });
      }

      if (pagamentoIndex !== -1) {
        obra.pagamentos.splice(pagamentoIndex, 1);
        await obra.save({ validateBeforeSave: false });
        return res.status(200).json({
          message: "Lançamento excluído com sucesso",
        });
      }

      return res.status(404).json({ message: "Lançamento não encontrado" });
    }

    // Se tiver tipo e lancamentoId, usa a lógica original
    if (tipo === "receita") {
      const index = obra.receitas.findIndex(
        (item) => item._id.toString() === lancamentoId
      );
      if (index === -1) {
        return res.status(404).json({ message: "Lançamento não encontrado" });
      }
      obra.receitas.splice(index, 1);
    } else if (tipo === "pagamento") {
      const index = obra.pagamentos.findIndex(
        (item) => item._id.toString() === lancamentoId
      );
      if (index === -1) {
        return res.status(404).json({ message: "Lançamento não encontrado" });
      }
      obra.pagamentos.splice(index, 1);
    } else {
      return res.status(400).json({ message: "Tipo de lançamento inválido" });
    }

    await obra.save({ validateBeforeSave: false });
    res.status(200).json({
      message: "Lançamento excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir lançamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter todos os lançamentos de receita de uma obra
router.get("/:id/receitas", async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findById(id).lean();
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.json(obra.receitas);
  } catch (error) {
    console.error("Erro ao buscar receitas:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter todos os lançamentos de pagamento de uma obra
router.get("/:id/pagamentos", async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findById(id).lean();
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.json(obra.pagamentos);
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter todos os lançamentos (receitas e pagamentos) de uma obra
router.get("/:id/lancamentos", async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findById(id).lean();
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    const lancamentos = {
      receitas: obra.receitas,
      pagamentos: obra.pagamentos,
    };
    res.json(lancamentos);
  } catch (error) {
    console.error("Erro ao buscar lançamentos:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter todos os lançamentos (receitas e pagamentos) de todas as obras
router.get("/lancamentos", async (req, res) => {
  try {
    const obras = await Obra.find().lean();
    const todosLancamentos = obras.map((obra) => ({
      obraId: obra._id,
      receitas: obra.receitas,
      pagamentos: obra.pagamentos,
    }));
    res.json(todosLancamentos);
  } catch (error) {
    console.error("Erro ao buscar lançamentos de todas as obras:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
