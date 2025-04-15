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
      console.error("ID inválido:", id);
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("receitas");
    if (!obra) {
      console.error("Obra não encontrada com ID:", id);
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

    // Validar campos obrigatórios
    const camposObrigatorios = {
      descricao: "Descrição é obrigatória",
      valor: "Valor é obrigatório",
      valorConvertido: "Valor convertido é obrigatório",
      categoria: "Categoria é obrigatória",
      centroCusto: "Centro de custo é obrigatório",
      formaPagamento: "Forma de pagamento é obrigatória",
      beneficiario: "Beneficiário é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!req.body[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    // Validar valores monetários
    if (isNaN(req.body.valor) || req.body.valor <= 0) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    if (isNaN(req.body.valorConvertido) || req.body.valorConvertido <= 0) {
      return res.status(400).json({ message: "Valor convertido inválido" });
    }

    if (
      req.body.valorRecebido &&
      (isNaN(req.body.valorRecebido) || req.body.valorRecebido < 0)
    ) {
      return res.status(400).json({ message: "Valor recebido inválido" });
    }

    if (
      req.body.valorRecebidoConvertido &&
      (isNaN(req.body.valorRecebidoConvertido) ||
        req.body.valorRecebidoConvertido < 0)
    ) {
      return res
        .status(400)
        .json({ message: "Valor recebido convertido inválido" });
    }

    // Validar datas
    if (isNaN(new Date(req.body.data).getTime())) {
      return res.status(400).json({ message: "Data inválida" });
    }

    if (
      req.body.dataVencimento &&
      isNaN(new Date(req.body.dataVencimento).getTime())
    ) {
      return res.status(400).json({ message: "Data de vencimento inválida" });
    }

    const novaReceita = {
      ...req.body,
      id: new mongoose.Types.ObjectId(),
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: new mongoose.Types.ObjectId(req.body.beneficiario),
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
      console.error("ID inválido:", id);
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("pagamentos");
    if (!obra) {
      console.error("Obra não encontrada com ID:", id);
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

    // Validar campos obrigatórios
    const camposObrigatorios = {
      descricao: "Descrição é obrigatória",
      valor: "Valor é obrigatório",
      valorConvertido: "Valor convertido é obrigatório",
      categoria: "Categoria é obrigatória",
      centroCusto: "Centro de custo é obrigatório",
      formaPagamento: "Forma de pagamento é obrigatória",
      beneficiario: "Beneficiário é obrigatório",
      beneficiarioTipo: "Tipo de beneficiário é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!req.body[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    // Validar valores monetários
    if (isNaN(req.body.valor) || req.body.valor <= 0) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    if (isNaN(req.body.valorConvertido) || req.body.valorConvertido <= 0) {
      return res.status(400).json({ message: "Valor convertido inválido" });
    }

    if (
      req.body.valorPago &&
      (isNaN(req.body.valorPago) || req.body.valorPago < 0)
    ) {
      return res.status(400).json({ message: "Valor pago inválido" });
    }

    if (
      req.body.valorPagoConvertido &&
      (isNaN(req.body.valorPagoConvertido) || req.body.valorPagoConvertido < 0)
    ) {
      return res
        .status(400)
        .json({ message: "Valor pago convertido inválido" });
    }

    // Validar datas
    if (isNaN(new Date(req.body.data).getTime())) {
      return res.status(400).json({ message: "Data inválida" });
    }

    if (
      req.body.dataVencimento &&
      isNaN(new Date(req.body.dataVencimento).getTime())
    ) {
      return res.status(400).json({ message: "Data de vencimento inválida" });
    }

    // Validar beneficiarioTipo
    if (!["Fornecedor", "Funcionario"].includes(req.body.beneficiarioTipo)) {
      return res.status(400).json({ message: "Tipo de beneficiário inválido" });
    }

    const novoPagamento = {
      ...req.body,
      id: new mongoose.Types.ObjectId(),
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: new mongoose.Types.ObjectId(req.body.beneficiario),
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

// Rota para listar todas as transações
router.get("/lancamentos/todos", async (req, res) => {
  try {
    // Buscar todas as obras com seus pagamentos e receitas
    const obras = await Obra.find().select("nome pagamentos receitas").lean();

    // Transformar os dados para um formato mais amigável
    const lancamentos = obras.flatMap((obra) => {
      const pagamentos = obra.pagamentos.map((pagamento) => ({
        ...pagamento,
        obraId: obra._id,
        obraNome: obra.nome,
        tipo: "despesa",
      }));

      const receitas = obra.receitas.map((receita) => ({
        ...receita,
        obraId: obra._id,
        obraNome: obra.nome,
        tipo: "receita",
      }));

      return [...pagamentos, ...receitas];
    });

    // Ordenar por data (mais recente primeiro)
    lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json(lancamentos);
  } catch (error) {
    console.error("Erro ao buscar lançamentos:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar transações independentes
router.get("/lancamentos/independentes", async (req, res) => {
  try {
    // Buscar todas as obras com transações independentes
    const obras = await Obra.find().select("nome pagamentos receitas").lean();

    // Filtrar apenas transações independentes (centroCusto = "Empresa")
    const transacoesIndependentes = obras.flatMap((obra) => {
      const pagamentos = obra.pagamentos
        .filter((p) => p.centroCusto === "Empresa")
        .map((pagamento) => ({
          ...pagamento,
          obraId: obra._id,
          obraNome: obra.nome,
          tipo: "despesa",
        }));

      const receitas = obra.receitas
        .filter((r) => r.centroCusto === "Empresa")
        .map((receita) => ({
          ...receita,
          obraId: obra._id,
          obraNome: obra.nome,
          tipo: "receita",
        }));

      return [...pagamentos, ...receitas];
    });

    // Ordenar por data (mais recente primeiro)
    transacoesIndependentes.sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json(transacoesIndependentes);
  } catch (error) {
    console.error("Erro ao buscar transações independentes:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma transação independente
router.post("/lancamentos/independentes", async (req, res) => {
  try {
    const {
      descricao,
      valor,
      tipo,
      data,
      status,
      categoria,
      categoriaOutros,
      centroCusto,
      dataVencimento,
      formaPagamento,
      beneficiario,
      documento,
    } = req.body;

    // Validar campos obrigatórios
    const camposObrigatorios = {
      descricao: "Descrição é obrigatória",
      valor: "Valor é obrigatório",
      tipo: "Tipo é obrigatório",
      data: "Data é obrigatória",
      status: "Status é obrigatório",
      categoria: "Categoria é obrigatória",
      beneficiario: "Beneficiário é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!req.body[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    // Transformar os dados recebidos
    const transacaoData = {
      ...req.body,
      valor:
        typeof req.body.valor === "string"
          ? parseFloat(
              req.body.valor.replace("R$", "").replace(",", ".").trim()
            )
          : req.body.valor,
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: req.body.beneficiario
        ? new mongoose.Types.ObjectId(req.body.beneficiario)
        : null,
      status: req.body.status || "pendente",
      categoria: req.body.categoria || "Outros",
      formaPagamento: req.body.formaPagamento || "Não especificado",
      documento: req.body.documento || "",
      centroCusto: "Empresa", // Forçar centro de custo como "Empresa" para transações independentes
    };

    // Validar valores monetários
    if (isNaN(transacaoData.valor) || transacaoData.valor <= 0) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    // Validar datas
    if (isNaN(transacaoData.data.getTime())) {
      return res.status(400).json({ message: "Data inválida" });
    }

    if (
      transacaoData.dataVencimento &&
      isNaN(transacaoData.dataVencimento.getTime())
    ) {
      return res.status(400).json({ message: "Data de vencimento inválida" });
    }

    // Criar uma nova obra para transações independentes se não existir
    let obraIndependente = await Obra.findOne({
      nome: "Transações Independentes",
    });

    if (!obraIndependente) {
      obraIndependente = new Obra({
        nome: "Transações Independentes",
        status: "Ativo",
        centroCusto: "Empresa",
      });
      await obraIndependente.save();
    }

    // Adicionar a transação à obra
    if (tipo === "receita") {
      obraIndependente.receitas.push(transacaoData);
    } else {
      obraIndependente.pagamentos.push(transacaoData);
    }

    await obraIndependente.save();

    res.status(201).json(transacaoData);
  } catch (error) {
    console.error("Erro ao criar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar uma transação independente
router.put("/lancamentos/independentes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findOne({ nome: "Transações Independentes" });

    if (!obra) {
      return res
        .status(404)
        .json({ message: "Obra de transações independentes não encontrada" });
    }

    // Procurar a transação em receitas ou pagamentos
    let transacao = obra.receitas.id(id) || obra.pagamentos.id(id);

    if (!transacao) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    // Atualizar os campos da transação
    Object.assign(transacao, req.body);

    // Validar e transformar valores
    if (req.body.valor) {
      transacao.valor =
        typeof req.body.valor === "string"
          ? parseFloat(
              req.body.valor.replace("R$", "").replace(",", ".").trim()
            )
          : req.body.valor;
    }

    if (req.body.data) {
      transacao.data = new Date(req.body.data);
    }

    if (req.body.dataVencimento) {
      transacao.dataVencimento = new Date(req.body.dataVencimento);
    }

    if (req.body.beneficiario) {
      transacao.beneficiario = new mongoose.Types.ObjectId(
        req.body.beneficiario
      );
    }

    await obra.save();

    res.json(transacao);
  } catch (error) {
    console.error("Erro ao atualizar transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma transação independente
router.delete("/lancamentos/independentes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findOne({ nome: "Transações Independentes" });

    if (!obra) {
      return res
        .status(404)
        .json({ message: "Obra de transações independentes não encontrada" });
    }

    // Tentar remover de receitas
    const receitaIndex = obra.receitas.findIndex(
      (r) => r._id.toString() === id
    );
    if (receitaIndex !== -1) {
      obra.receitas.splice(receitaIndex, 1);
    }

    // Tentar remover de pagamentos
    const pagamentoIndex = obra.pagamentos.findIndex(
      (p) => p._id.toString() === id
    );
    if (pagamentoIndex !== -1) {
      obra.pagamentos.splice(pagamentoIndex, 1);
    }

    if (receitaIndex === -1 && pagamentoIndex === -1) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    await obra.save();

    res.json({ message: "Transação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir transação independente:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
