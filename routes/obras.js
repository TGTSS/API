import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";
import StatusObra from "../models/StatusObra.js";
import TipoObra from "../models/TipoObra.js";
import QuemPaga from "../models/QuemPaga.js";
import Conta from "../models/Conta.js";

const router = express.Router();

// Rota para listar todos os status de obra
router.get("/status", async (req, res) => {
  try {
    const status = await StatusObra.find();
    res.json(status);
  } catch (error) {
    console.error("Erro ao buscar status de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo status de obra
router.post("/status", async (req, res) => {
  try {
    const status = new StatusObra(req.body);
    const savedStatus = await status.save();
    res.status(201).json(savedStatus);
  } catch (error) {
    console.error("Erro ao criar status de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os tipos de obra
router.get("/tipos", async (req, res) => {
  try {
    const tipos = await TipoObra.find();
    res.json(tipos);
  } catch (error) {
    console.error("Erro ao buscar tipos de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo tipo de obra
router.post("/tipos", async (req, res) => {
  try {
    const tipo = new TipoObra(req.body);
    const savedTipo = await tipo.save();
    res.status(201).json(savedTipo);
  } catch (error) {
    console.error("Erro ao criar tipo de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os quem paga
router.get("/quem-paga", async (req, res) => {
  try {
    const quemPaga = await QuemPaga.find();
    res.json(quemPaga);
  } catch (error) {
    console.error("Erro ao buscar quem paga:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo quem paga
router.post("/quem-paga", async (req, res) => {
  try {
    const quemPaga = new QuemPaga(req.body);
    const savedQuemPaga = await quemPaga.save();
    res.status(201).json(savedQuemPaga);
  } catch (error) {
    console.error("Erro ao criar quem paga:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todas as contas
router.get("/contas", async (req, res) => {
  try {
    const contas = await Conta.find();
    res.json(contas);
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova conta
router.post("/contas", async (req, res) => {
  try {
    const conta = new Conta(req.body);
    const savedConta = await conta.save();
    res.status(201).json(savedConta);
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova obra
router.post("/", async (req, res) => {
  try {
    const {
      status,
      tipo,
      quemPaga,
      conta,
      cliente,
      areaConstruida,
      contatos,
      mapPosition,
      ...rest
    } = req.body;

    // Converter valores numéricos
    const areaConstruidaNumber = parseFloat(areaConstruida.replace(",", "."));
    if (isNaN(areaConstruidaNumber)) {
      return res
        .status(400)
        .json({ message: "Valor de área construída inválido" });
    }

    const obra = new Obra({
      ...rest,
      areaConstruida: areaConstruidaNumber,
      status: mongoose.Types.ObjectId.isValid(status)
        ? new mongoose.Types.ObjectId(status)
        : null,
      tipo: mongoose.Types.ObjectId.isValid(tipo)
        ? new mongoose.Types.ObjectId(tipo)
        : null,
      quemPaga: mongoose.Types.ObjectId.isValid(quemPaga)
        ? new mongoose.Types.ObjectId(quemPaga)
        : null,
      conta: mongoose.Types.ObjectId.isValid(conta)
        ? new mongoose.Types.ObjectId(conta)
        : null,
      cliente: mongoose.Types.ObjectId.isValid(cliente)
        ? new mongoose.Types.ObjectId(cliente)
        : null,
      contatos: contatos.map((contato) => ({
        nome: contato.nome,
        telefone: contato.telefone,
        cargo: contato.cargo,
        email: contato.email,
      })),
      mapPosition: mapPosition,
    });

    const savedObra = await obra.save();
    res.status(201).json(savedObra);
  } catch (error) {
    console.error("Erro ao criar obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todas as obras
router.get("/", async (req, res) => {
  try {
    const obras = await Obra.find()
      .populate("cliente")
      .populate("status")
      .populate("tipo")
      .populate("quemPaga")
      .populate("conta");
    res.json(obras);
  } catch (error) {
    console.error("Erro ao buscar obras:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar uma obra específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    const obra = await Obra.findById(id)
      .populate("cliente")
      .populate("status")
      .populate("tipo")
      .populate("quemPaga")
      .populate("conta");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.json(obra);
  } catch (error) {
    console.error("Erro ao buscar obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar uma obra
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tipo, quemPaga, conta, cliente, mapPosition, ...rest } =
      req.body;

    const updatedObra = await Obra.findByIdAndUpdate(
      id,
      {
        ...rest,
        status: mongoose.Types.ObjectId.isValid(status)
          ? mongoose.Types.ObjectId(status)
          : null,
        tipo: mongoose.Types.ObjectId.isValid(tipo)
          ? mongoose.Types.ObjectId(tipo)
          : null,
        quemPaga: mongoose.Types.ObjectId.isValid(quemPaga)
          ? mongoose.Types.ObjectId(quemPaga)
          : null,
        conta: mongoose.Types.ObjectId.isValid(conta)
          ? mongoose.Types.ObjectId(conta)
          : null,
        cliente: mongoose.Types.ObjectId.isValid(cliente)
          ? mongoose.Types.ObjectId(cliente)
          : null,
        mapPosition: mapPosition,
      },
      { new: true }
    );

    if (!updatedObra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.json(updatedObra);
  } catch (error) {
    console.error("Erro ao atualizar obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma obra
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedObra = await Obra.findByIdAndDelete(id);
    if (!deletedObra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.status(200).json({ message: "Obra excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir obra:", error);
    res.status(500).json({ message: error.message });
  }
});

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
      obra.receitas[lancamentoIndex] = lancamentoEditado;
    } else if (tipo === "pagamento") {
      lancamentoIndex = obra.pagamentos.findIndex(
        (item) => item.id.toString() === lancamentoId
      );
      if (lancamentoIndex === -1) {
        return res.status(404).json({ message: "Lançamento não encontrado" });
      }
      obra.pagamentos[lancamentoIndex] = lancamentoEditado;
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

export default router;
