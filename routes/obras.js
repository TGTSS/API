import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import TipoObra from "../models/TipoObra.js";
import QuemPaga from "../models/QuemPaga.js";
import Conta from "../models/Conta.js";

const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "documentos");
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

// Rota para listar todos os tipos de obra
router.get("/tipos", async (req, res) => {
  try {
    // Verificar conexão com o MongoDB
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Banco de dados não está conectado");
    }

    const tipos = await TipoObra.find().lean();
    res.json(tipos);
  } catch (error) {
    console.error("Erro ao buscar tipos de obra:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      connectionState: mongoose.connection.readyState,
    });
  }
});

// Rota para listar todos os quem paga
router.get("/quem-paga", async (req, res) => {
  try {
    // Verificar conexão com o MongoDB
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Banco de dados não está conectado");
    }

    const quemPaga = await QuemPaga.find().lean();
    res.json(quemPaga);
  } catch (error) {
    console.error("Erro ao buscar quem paga:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      connectionState: mongoose.connection.readyState,
    });
  }
});

// Rota para listar todas as contas
router.get("/contas", async (req, res) => {
  try {
    // Verificar conexão com o MongoDB
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Banco de dados não está conectado");
    }

    const contas = await Conta.find().lean();
    res.json(contas);
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      connectionState: mongoose.connection.readyState,
    });
  }
});

// Rota para listar todas as obras
router.get("/", async (req, res) => {
  try {
    // Verificar conexão com o MongoDB
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Banco de dados não está conectado");
    }

    // Buscar obras com população segura
    const obras = await Obra.find()
      .populate({
        path: "cliente",
        select: "nome cnpj cpf",
        options: { lean: true },
      })
      .populate({
        path: "tipo",
        select: "nome",
        options: { lean: true },
        model: "TipoObra", // Especificando o modelo explicitamente
      })
      .populate({
        path: "quemPaga",
        select: "nome",
        options: { lean: true },
      })
      .populate({
        path: "conta",
        select: "nome numero",
        options: { lean: true },
      })
      .lean();

    // Garantir que o tipo seja null se não existir
    obras.forEach((obra) => {
      if (!obra.tipo) {
        obra.tipo = null;
      }
    });

    res.json(obras);
  } catch (error) {
    console.error("Erro detalhado ao buscar obras:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      connectionState: mongoose.connection.readyState,
    });

    res.status(500).json({
      message: error.message,
      error: error.name,
      connectionState: mongoose.connection.readyState,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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

// Rota para criar uma nova obra
router.post("/", async (req, res) => {
  try {
    const {
      nome,
      status,
      codigoObras,
      tipo,
      art,
      responsavelTecnico,
      responsavelObra,
      arquiteto,
      ceiCno,
      areaConstruida,
      areaTerreno,
      numeroPavimentos,
      numeroUnidades,
      endereco,
      quemPaga,
      conta,
      comentario,
      visivelPara,
      cliente,
      contatos,
      mapPosition,
      contatoPrincipal,
      dataInicio,
      previsaoTermino,
      dataPrevisao,
      imagem,
      orcamento,
      receitas,
      pagamentos,
      registrosDiarios,
      medicoes,
    } = req.body;

    const obra = new Obra({
      nome,
      status,
      codigoObras,
      tipo: mongoose.Types.ObjectId.isValid(tipo)
        ? new mongoose.Types.ObjectId(tipo)
        : null,
      art,
      responsavelTecnico,
      responsavelObra,
      arquiteto,
      ceiCno,
      areaConstruida,
      areaTerreno,
      numeroPavimentos,
      numeroUnidades,
      endereco,
      quemPaga: mongoose.Types.ObjectId.isValid(quemPaga)
        ? new mongoose.Types.ObjectId(quemPaga)
        : null,
      conta: mongoose.Types.ObjectId.isValid(conta)
        ? new mongoose.Types.ObjectId(conta)
        : null,
      comentario,
      visivelPara,
      cliente: mongoose.Types.ObjectId.isValid(cliente)
        ? new mongoose.Types.ObjectId(cliente)
        : null,
      contatos,
      mapPosition,
      contatoPrincipal,
      dataInicio,
      previsaoTermino,
      dataPrevisao,
      imagem,
      orcamento,
      receitas,
      pagamentos,
      registrosDiarios,
      medicoes,
    });

    const savedObra = await obra.save();
    res.status(201).json(savedObra);
  } catch (error) {
    console.error("Erro ao criar obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar uma obra
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      status,
      codigoObras,
      tipo,
      art,
      responsavelTecnico,
      responsavelObra,
      arquiteto,
      ceiCno,
      areaConstruida,
      areaTerreno,
      numeroPavimentos,
      numeroUnidades,
      endereco,
      quemPaga,
      conta,
      comentario,
      visivelPara,
      cliente,
      contatos,
      mapPosition,
      contatoPrincipal,
      dataInicio,
      previsaoTermino,
      dataPrevisao,
      imagem,
      orcamento,
      receitas,
      pagamentos,
      registrosDiarios,
      medicoes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const updatedObra = await Obra.findByIdAndUpdate(
      id,
      {
        nome,
        status,
        codigoObras,
        tipo: mongoose.Types.ObjectId.isValid(tipo)
          ? new mongoose.Types.ObjectId(tipo)
          : null,
        art,
        responsavelTecnico,
        responsavelObra,
        arquiteto,
        ceiCno,
        areaConstruida,
        areaTerreno,
        numeroPavimentos,
        numeroUnidades,
        endereco,
        quemPaga: mongoose.Types.ObjectId.isValid(quemPaga)
          ? new mongoose.Types.ObjectId(quemPaga)
          : null,
        conta: mongoose.Types.ObjectId.isValid(conta)
          ? new mongoose.Types.ObjectId(conta)
          : null,
        comentario,
        visivelPara,
        cliente: mongoose.Types.ObjectId.isValid(cliente)
          ? new mongoose.Types.ObjectId(cliente)
          : null,
        contatos,
        mapPosition,
        contatoPrincipal,
        dataInicio,
        previsaoTermino,
        dataPrevisao,
        imagem,
        orcamento,
        receitas,
        pagamentos,
        registrosDiarios,
        medicoes,
      },
      { new: true }
    );

    if (!updatedObra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(updatedObra);
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

// Rota para listar receitas de uma obra
router.get("/:id/receitas", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("receitas");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.receitas);
  } catch (error) {
    console.error("Erro ao buscar receitas:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar uma receita
router.post("/:id/receitas", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const novaReceita = {
      ...req.body,
      id: new mongoose.Types.ObjectId(),
      data: req.body.data || new Date(),
      status: req.body.status || "pendente",
      valorRecebido: req.body.valorRecebido || 0,
    };

    obra.receitas.push(novaReceita);
    await obra.save();

    res.status(201).json(novaReceita);
  } catch (error) {
    console.error("Erro ao adicionar receita:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar uma receita
router.put("/:id/receitas/:receitaId", async (req, res) => {
  try {
    const { id, receitaId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(receitaId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const receitaIndex = obra.receitas.findIndex(
      (r) => r._id.toString() === receitaId
    );
    if (receitaIndex === -1) {
      return res.status(404).json({ message: "Receita não encontrada" });
    }

    obra.receitas[receitaIndex] = {
      ...obra.receitas[receitaIndex],
      ...req.body,
      _id: new mongoose.Types.ObjectId(receitaId),
    };

    await obra.save();
    res.json(obra.receitas[receitaIndex]);
  } catch (error) {
    console.error("Erro ao atualizar receita:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma receita
router.delete("/:id/receitas/:receitaId", async (req, res) => {
  try {
    const { id, receitaId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(receitaId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    obra.receitas = obra.receitas.filter((r) => r._id.toString() !== receitaId);
    await obra.save();

    res.json({ message: "Receita excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir receita:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar pagamentos de uma obra
router.get("/:id/pagamentos", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("pagamentos");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.pagamentos);
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar um pagamento
router.post("/:id/pagamentos", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const novoPagamento = {
      ...req.body,
      id: new mongoose.Types.ObjectId(),
      data: req.body.data || new Date(),
      status: req.body.status || "pendente",
      valorPago: req.body.valorPago || 0,
    };

    obra.pagamentos.push(novoPagamento);
    await obra.save();

    res.status(201).json(novoPagamento);
  } catch (error) {
    console.error("Erro ao adicionar pagamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um pagamento
router.put("/:id/pagamentos/:pagamentoId", async (req, res) => {
  try {
    const { id, pagamentoId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(pagamentoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const pagamentoIndex = obra.pagamentos.findIndex(
      (p) => p._id.toString() === pagamentoId
    );
    if (pagamentoIndex === -1) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    obra.pagamentos[pagamentoIndex] = {
      ...obra.pagamentos[pagamentoIndex],
      ...req.body,
      _id: new mongoose.Types.ObjectId(pagamentoId),
    };

    await obra.save();
    res.json(obra.pagamentos[pagamentoIndex]);
  } catch (error) {
    console.error("Erro ao atualizar pagamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um pagamento
router.delete("/:id/pagamentos/:pagamentoId", async (req, res) => {
  try {
    const { id, pagamentoId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(pagamentoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    obra.pagamentos = obra.pagamentos.filter(
      (p) => p._id.toString() !== pagamentoId
    );
    await obra.save();

    res.json({ message: "Pagamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar registros diários de uma obra
router.get("/:id/registros-diarios", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("registrosDiarios");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.registrosDiarios);
  } catch (error) {
    console.error("Erro ao buscar registros diários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar medições de uma obra
router.get("/:id/medicoes", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("medicoes");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.medicoes);
  } catch (error) {
    console.error("Erro ao buscar medições:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter o orçamento de uma obra
router.get("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("orcamento");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao buscar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o orçamento de uma obra
router.put("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    const { stages, globalBdi } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,
      {
        $set: {
          "orcamento.stages": stages,
          "orcamento.globalBdi": globalBdi,
          "orcamento.dataAtualizacao": new Date(),
        },
      },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
