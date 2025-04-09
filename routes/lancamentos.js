import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";

const router = express.Router();

// Rota para adicionar um novo lançamento de receita ou pagamento
router.post("/:id/:tipo", async (req, res) => {
  try {
    const { id, tipo } = req.params;
    const novoLancamento = req.body;

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    novoLancamento.id = new mongoose.Types.ObjectId(); // Gerar um novo ID para o lançamento
    novoLancamento.dataCriacao = new Date();
    novoLancamento.dataAtualizacao = new Date();

    if (req.files) {
      novoLancamento.anexos = req.files.map((file) => ({
        nome: file.originalname,
        tipo: file.mimetype,
        tamanho: file.size,
        caminho: file.path,
      }));
    }

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
router.put("/:id/:tipo/:lancamentoId", async (req, res) => {
  try {
    const { id, tipo, lancamentoId } = req.params;
    const lancamentoEditado = req.body;

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

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
        dataAtualizacao: new Date(),
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
        dataAtualizacao: new Date(),
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
});

// Rota para excluir um lançamento de receita ou pagamento
router.delete("/:id/:tipo/:lancamentoId", async (req, res) => {
  try {
    const { id, tipo, lancamentoId } = req.params;

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    if (tipo === "receita") {
      obra.receitas = obra.receitas.filter(
        (item) => item.id.toString() !== lancamentoId
      );
    } else if (tipo === "pagamento") {
      obra.pagamentos = obra.pagamentos.filter(
        (item) => item.id.toString() !== lancamentoId
      );
    } else {
      return res.status(400).json({ message: "Tipo de lançamento inválido" });
    }

    await obra.save();
    res.status(200).json({ message: "Lançamento excluído com sucesso" });
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
