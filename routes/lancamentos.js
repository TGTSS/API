import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
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

    const novoLancamento = {
      ...req.body,
      id: new mongoose.Types.ObjectId(),
      tipo: tipo,
      valor: parseFloat(req.body.valor),
      valorRecebido:
        tipo === "receita"
          ? parseFloat(req.body.valorRecebido || 0)
          : undefined,
      valorPago:
        tipo === "pagamento" ? parseFloat(req.body.valorPago || 0) : undefined,
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : undefined,
      anexos: req.files
        ? req.files.map((file) => ({
            nome: file.originalname,
            tipo: file.mimetype,
            tamanho: file.size,
            caminho: file.path,
          }))
        : [],
    };

    if (tipo === "receita") {
      obra.receitas.push(novoLancamento);
    } else if (tipo === "pagamento") {
      obra.pagamentos.push(novoLancamento);
    } else {
      return res.status(400).json({ message: "Tipo de lançamento inválido" });
    }

    await obra.save();
    res.status(201).json(novoLancamento);
  } catch (error) {
    console.error("Erro ao adicionar lançamento:", error);
    res.status(500).json({ message: error.message });
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

      const lancamentoEditado = {
        ...req.body,
        valor: parseFloat(req.body.valor),
        valorRecebido:
          tipo === "receita"
            ? parseFloat(req.body.valorRecebido || 0)
            : undefined,
        valorPago:
          tipo === "pagamento"
            ? parseFloat(req.body.valorPago || 0)
            : undefined,
        data: new Date(req.body.data),
        dataVencimento: req.body.dataVencimento
          ? new Date(req.body.dataVencimento)
          : undefined,
        anexos: req.files
          ? req.files.map((file) => ({
              nome: file.originalname,
              tipo: file.mimetype,
              tamanho: file.size,
              caminho: file.path,
            }))
          : [],
      };

      let lancamentoIndex;
      if (tipo === "receita") {
        lancamentoIndex = obra.receitas.findIndex(
          (item) => item.id.toString() === lancamentoId
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
          (item) => item.id.toString() === lancamentoId
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
        (item) => item.id.toString() === id
      );
      const pagamentoIndex = obra.pagamentos.findIndex(
        (item) => item.id.toString() === id
      );

      if (receitaIndex !== -1) {
        const lancamentoRemovido = obra.receitas.splice(receitaIndex, 1);
        await obra.save();
        return res.status(200).json({
          message: "Lançamento excluído com sucesso",
          lancamento: lancamentoRemovido,
        });
      }

      if (pagamentoIndex !== -1) {
        const lancamentoRemovido = obra.pagamentos.splice(pagamentoIndex, 1);
        await obra.save();
        return res.status(200).json({
          message: "Lançamento excluído com sucesso",
          lancamento: lancamentoRemovido,
        });
      }

      return res.status(404).json({ message: "Lançamento não encontrado" });
    }

    // Se tiver tipo e lancamentoId, usa a lógica original
    let lancamentoRemovido;
    if (tipo === "receita") {
      const index = obra.receitas.findIndex(
        (item) => item.id.toString() === lancamentoId
      );
      if (index === -1) {
        return res.status(404).json({ message: "Lançamento não encontrado" });
      }
      lancamentoRemovido = obra.receitas.splice(index, 1);
    } else if (tipo === "pagamento") {
      const index = obra.pagamentos.findIndex(
        (item) => item.id.toString() === lancamentoId
      );
      if (index === -1) {
        return res.status(404).json({ message: "Lançamento não encontrado" });
      }
      lancamentoRemovido = obra.pagamentos.splice(index, 1);
    } else {
      return res.status(400).json({ message: "Tipo de lançamento inválido" });
    }

    await obra.save();
    res.status(200).json({
      message: "Lançamento excluído com sucesso",
      lancamento: lancamentoRemovido,
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
