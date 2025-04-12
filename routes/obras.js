import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";
import StatusObra from "../models/StatusObra.js";
import TipoObra from "../models/TipoObra.js";
import QuemPaga from "../models/QuemPaga.js";
import Conta from "../models/Conta.js";
import Etapa from "../models/Etapa.js"; // Adicionado
import RegistroDiario from "../models/RegistroDiario.js"; // Adicionado
import Galeria from "../models/Galeria.js"; // Adicionado
import Documento from "../models/Documento.js"; // Adicionado
import Medicao from "../models/Medicao.js"; // Adicionado
import multer from "multer";
import path from "path";
import fs from "fs";

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

// Rota para obter o último código de obra
router.get("/ultimo-codigo", async (req, res) => {
  try {
    const ultimaObra = await Obra.findOne()
      .sort({ codigo: -1 })
      .select("codigo");
    const ultimoCodigo = ultimaObra
      ? parseInt(ultimaObra.codigo.split("-")[1])
      : 0;
    res.json({ ultimoCodigo });
  } catch (error) {
    console.error("Erro ao obter o último código de obra:", error);
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
      visivelPara,
      contatoPrincipal,
      documentos,
      dataInicio,
      previsaoTermino,
      imagem,
      ...rest
    } = req.body;

    // Converter valores numéricos
    let areaConstruidaNumber;
    if (typeof areaConstruida === "string") {
      areaConstruidaNumber = parseFloat(areaConstruida.replace(",", "."));
    } else {
      areaConstruidaNumber = areaConstruida;
    }

    if (isNaN(areaConstruidaNumber)) {
      return res
        .status(400)
        .json({ message: "Valor de área construída inválido" });
    }

    // Converter datas de string para Date
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) return dateStr;
      const [day, month, year] = dateStr.split("/");
      return new Date(year, month - 1, day);
    };

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
      contatos: Array.isArray(contatos)
        ? contatos.map((contato) => ({
            nome: contato.nome,
            telefone: contato.telefone,
            cargo: contato.cargo,
            email: contato.email,
          }))
        : [],
      mapPosition: mapPosition,
      visivelPara,
      contatoPrincipal,
      documentos: Array.isArray(documentos)
        ? documentos.map((doc) => ({
            nome: doc.nome,
            arquivo: doc.arquivo,
          }))
        : [],
      dataInicio: formatDate(dataInicio),
      previsaoTermino: formatDate(previsaoTermino),
      imagem,
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

// Rota para listar todas as etapas de uma obra
router.get("/:id/etapas", async (req, res) => {
  try {
    const { id } = req.params;
    const etapas = await Etapa.find({ obra: id });
    res.json(etapas);
  } catch (error) {
    console.error("Erro ao buscar etapas da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os registros diários de uma obra
router.get("/:id/registros", async (req, res) => {
  try {
    const { id } = req.params;
    const registros = await RegistroDiario.find({ obra: id });
    res.json(registros);
  } catch (error) {
    console.error("Erro ao buscar registros diários da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todas as fotos da galeria de uma obra
router.get("/:id/galeria", async (req, res) => {
  try {
    const { id } = req.params;
    const fotos = await Galeria.find({ obra: id });
    res.json(fotos);
  } catch (error) {
    console.error("Erro ao buscar galeria de fotos da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os documentos de uma obra
router.get("/:id/documentos", async (req, res) => {
  try {
    const { id } = req.params;
    const documentos = await Documento.find({ obra: id });
    res.json(documentos);
  } catch (error) {
    console.error("Erro ao buscar documentos da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo registro diário
router.post("/:id/registros", async (req, res) => {
  try {
    const { id } = req.params;
    const registro = new RegistroDiario({ ...req.body, obra: id });
    const savedRegistro = await registro.save();
    res.status(201).json(savedRegistro);
  } catch (error) {
    console.error("Erro ao criar registro diário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova etapa
router.post("/:id/etapas", async (req, res) => {
  try {
    const { id } = req.params;
    const etapa = new Etapa({ ...req.body, obra: id });
    const savedEtapa = await etapa.save();
    res.status(201).json(savedEtapa);
  } catch (error) {
    console.error("Erro ao criar etapa:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar fotos à galeria
router.post("/:_id/galeria", async (req, res) => {
  try {
    const { id } = req.params;
    const fotos = req.body.fotos.map((foto) => ({ ...foto, obra: id }));
    const savedFotos = await Galeria.insertMany(fotos);
    res.status(201).json(savedFotos);
  } catch (error) {
    console.error("Erro ao adicionar fotos à galeria:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar documentos
router.post("/:id/documentos", upload.single("arquivo"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Arquivo não enviado" });
    }

    const documento = new Documento({
      nome,
      arquivo: {
        nome: req.file.originalname,
        tipo: req.file.mimetype,
        tamanho: req.file.size,
        caminho: req.file.path,
      },
      obra: id,
    });

    const savedDocumento = await documento.save();
    res.status(201).json(savedDocumento);
  } catch (error) {
    console.error("Erro ao adicionar documento:", error);
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
      tipo,
      cliente,
      codigoObras,
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
      contatos,
      mapPosition,
      contatoPrincipal,
      documentos,
      dataInicio,
      previsaoTermino,
      imagem,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Validar mapPosition
    if (mapPosition && mapPosition.some((value) => value === null)) {
      return res.status(400).json({
        message: "mapPosition deve conter exatamente dois números válidos.",
      });
    }

    const updatedObra = await Obra.findByIdAndUpdate(
      id,
      {
        nome,
        status,
        tipo,
        cliente,
        codigoObras,
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
        contatos,
        mapPosition,
        contatoPrincipal,
        documentos,
        dataInicio,
        previsaoTermino,
        imagem,
      },
      { new: true }
    );

    if (!updatedObra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(updatedObra);
  } catch (error) {
    console.error("Erro ao atualizar obra:", error);
    res.status(500).json({ message: "Erro interno ao atualizar obra" });
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

// Rota para obter o orçamento de uma obra específica
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

router.post("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { stages, globalBdi, dataCriacao } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ message: "Stages deve ser um array" });
    }

    const orcamentoData = {
      stages: stages.map((stage) => ({
        ...stage,
        subStages: (stage.subStages || []).map((subStage) => ({
          ...subStage,
          items: (subStage.items || []).map((item) => ({
            ...item,
            custoTotal: item.quantity * item.unitPrice,
            precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
            precoTotal:
              item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
            _id: undefined, // Remover _id
          })),
          _id: undefined, // Remover _id
        })),
        items: (stage.items || []).map((item) => ({
          ...item,
          custoTotal: item.quantity * item.unitPrice,
          precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
          precoTotal:
            item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
          _id: undefined, // Remover _id
        })),
        _id: undefined, // Remover _id
      })),
      globalBdi,
      dataCriacao: dataCriacao || new Date(),
      dataAtualizacao: new Date(),
    };

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $set: { orcamento: orcamentoData } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar ou atualizar o orçamento de uma obra
router.put("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { stages, globalBdi, dataCriacao } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ message: "Stages deve ser um array" });
    }

    const orcamentoData = {
      stages: stages.map((stage) => ({
        ...stage,
        subStages: (stage.subStages || []).map((subStage) => ({
          ...subStage,
          items: (subStage.items || []).map((item) => ({
            ...item,
            custoTotal: item.quantity * item.unitPrice,
            precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
            precoTotal:
              item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
            _id: undefined, // Remover _id
          })),
          _id: undefined, // Remover _id
        })),
        items: (stage.items || []).map((item) => ({
          ...item,
          custoTotal: item.quantity * item.unitPrice,
          precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
          precoTotal:
            item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
          _id: undefined, // Remover _id
        })),
        _id: undefined, // Remover _id
      })),
      globalBdi,
      dataCriacao: dataCriacao || new Date(),
      dataAtualizacao: new Date(),
    };

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $set: { orcamento: orcamentoData } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar ou atualizar o orçamento de uma obra (POST)
router.post("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { stages, globalBdi, dataCriacao } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ message: "Stages deve ser um array" });
    }

    const orcamentoData = {
      stages: stages.map((stage) => ({
        ...stage,
        subStages: (stage.subStages || []).map((subStage) => ({
          ...subStage,
          items: (subStage.items || []).map((item) => ({
            ...item,
            custoTotal: item.quantity * item.unitPrice,
            precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
            precoTotal:
              item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
            _id: undefined, // Remover _id
          })),
          _id: undefined, // Remover _id
        })),
        items: (stage.items || []).map((item) => ({
          ...item,
          custoTotal: item.quantity * item.unitPrice,
          precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
          precoTotal:
            item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
          _id: undefined, // Remover _id
        })),
        _id: undefined, // Remover _id
      })),
      globalBdi,
      dataCriacao: dataCriacao || new Date(),
      dataAtualizacao: new Date(),
    };

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $set: { orcamento: orcamentoData } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar apenas o BDI global do orçamento
router.patch("/:id/orcamento/bdi", async (req, res) => {
  try {
    const { id } = req.params;
    const { globalBdi } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,
      {
        $set: {
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
    console.error("Erro ao atualizar BDI global:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir o orçamento de uma obra
router.delete("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $unset: { orcamento: 1 } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json({ message: "Orçamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o progresso de uma etapa
router.patch("/:obraId/etapas/:etapaId/progresso", async (req, res) => {
  try {
    const { obraId, etapaId } = req.params;
    const { progresso, subetapas } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(obraId) ||
      !mongoose.Types.ObjectId.isValid(etapaId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const etapa = await Etapa.findOneAndUpdate(
      { _id: etapaId, obra: obraId },
      { $set: { progresso, subetapas } },
      { new: true }
    );

    if (!etapa) {
      return res.status(404).json({ message: "Etapa não encontrada" });
    }

    res.json(etapa);
  } catch (error) {
    console.error("Erro ao atualizar progresso da etapa:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo registro diário
router.post("/:id/registros-diarios", async (req, res) => {
  try {
    const { id } = req.params;
    const { registro } = req.body;

    // Validate ID and check if obra exists
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Validate required fields in registro
    if (!registro || !registro.data || !registro.titulo) {
      return res.status(400).json({
        message: "Dados incompletos. Data e título são obrigatórios",
      });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Sanitize and structure the registro data
    const sanitizedRegistro = {
      ...registro,
      data: new Date(registro.data),
      clima: registro.clima || "não informado",
      fotos: registro.fotos || [],
      etapas: registro.etapas || [],
    };

    // Update stages progress
    obra.orcamento.stages.forEach((stage) => {
      const updatedStage = sanitizedRegistro.etapas.find(
        (e) => e.id === stage.id
      );
      if (updatedStage) {
        // Ensure progress is between 0 and 100
        stage.progresso = Math.min(Math.max(updatedStage.progresso, 0), 100);

        // Update substages
        if (stage.subStages && stage.subStages.length > 0) {
          stage.subStages.forEach((subStage) => {
            const updatedSubStage = updatedStage.subetapas?.find(
              (se) => se.nome === subStage.nome
            );
            if (updatedSubStage) {
              subStage.progresso = Math.min(
                Math.max(updatedSubStage.progresso, 0),
                100
              );
            }
          });
        }
      }
    });

    // Add the daily record
    obra.registrosDiarios.push(sanitizedRegistro);

    // Save changes
    const savedObra = await obra.save();
    if (!savedObra) {
      throw new Error("Erro ao salvar as alterações");
    }

    res.status(201).json({
      message: "Registro diário criado com sucesso",
      registro:
        savedObra.registrosDiarios[savedObra.registrosDiarios.length - 1],
    });
  } catch (error) {
    console.error("Erro ao criar registro diário:", error);
    res.status(500).json({
      message: "Erro interno do servidor ao criar registro diário",
      error: error.message,
    });
  }
});

// Rota para listar todos os registros diários de uma obra
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

// Rota para obter etapas e subetapas do orçamento de uma obra
router.get("/:id/orcamento/etapas", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("orcamento.stages");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.orcamento.stages);
  } catch (error) {
    console.error("Erro ao buscar etapas do orçamento:", error);
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

// Rota para criar uma nova receita
router.post("/:id/receitas", async (req, res) => {
  try {
    const { id } = req.params;
    const novaReceita = {
      ...req.body,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
    };

    if (req.files) {
      novaReceita.anexos = req.files.map((file) => ({
        nome: file.originalname,
        tipo: file.mimetype,
        tamanho: file.size,
        caminho: file.path,
      }));
    }

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $push: { receitas: novaReceita } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(201).json(novaReceita);
  } catch (error) {
    console.error("Erro ao criar receita:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo pagamento
router.post("/:id/pagamentos", async (req, res) => {
  try {
    const { id } = req.params;
    const novoPagamento = {
      ...req.body,
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
    };

    if (req.files) {
      novoPagamento.anexos = req.files.map((file) => ({
        nome: file.originalname,
        tipo: file.mimetype,
        tamanho: file.size,
        caminho: file.path,
      }));
    }

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $push: { pagamentos: novoPagamento } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(201).json(novoPagamento);
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para editar uma receita
router.put("/:id/receitas/:receitaId", async (req, res) => {
  try {
    const { id, receitaId } = req.params;
    const receitaAtualizada = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(receitaId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findOneAndUpdate(
      { _id: id, "receitas._id": receitaId },
      { $set: { "receitas.$": receitaAtualizada } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Receita não encontrada" });
    }

    res.status(200).json(receitaAtualizada);
  } catch (error) {
    console.error("Erro ao editar receita:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para editar um pagamento
router.put("/:id/pagamentos/:pagamentoId", async (req, res) => {
  try {
    const { id, pagamentoId } = req.params;
    const pagamentoAtualizado = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(pagamentoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findOneAndUpdate(
      { _id: id, "pagamentos._id": pagamentoId },
      { $set: { "pagamentos.$": pagamentoAtualizado } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    res.status(200).json(pagamentoAtualizado);
  } catch (error) {
    console.error("Erro ao editar pagamento:", error);
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

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $pull: { receitas: { _id: receitaId } } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Receita não encontrada" });
    }

    res.status(200).json({ message: "Receita excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir receita:", error);
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

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $pull: { pagamentos: { _id: pagamentoId } } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    res.status(200).json({ message: "Pagamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo registro diário
router.post("/:id/registros-diarios", async (req, res) => {
  try {
    const { id } = req.params;
    const { registro } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const novoRegistro = {
      data: registro.data,
      clima: registro.clima,
      titulo: registro.titulo,
      descricao: registro.descricao,
      fotos: registro.fotos || [],
      etapas: registro.etapas || [],
      maoDeObra: registro.maoDeObra || [],
      equipamentos: registro.equipamentos || [],
      ocorrencias: {
        descricao: registro.ocorrencias?.descricao || "",
        tipo: registro.ocorrencias?.tipo || "",
        gravidade: registro.ocorrencias?.gravidade || "",
      },
    };

    obra.registrosDiarios.push(novoRegistro);

    const savedObra = await obra.save();
    res.status(201).json({
      message: "Registro diário criado com sucesso",
      registro:
        savedObra.registrosDiarios[savedObra.registrosDiarios.length - 1],
    });
  } catch (error) {
    console.error("Erro ao criar registro diário:", error);
    res.status(500).json({ message: "Erro interno ao criar registro diário" });
  }
});

// Rota para remover um documento
router.delete("/:id/documentos/:documentoId", async (req, res) => {
  try {
    const { id, documentoId } = req.params;

    const documento = await Documento.findOne({ _id: documentoId, obra: id });
    if (!documento) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    // Remove o arquivo físico
    if (documento.arquivo && documento.arquivo.caminho) {
      fs.unlinkSync(documento.arquivo.caminho);
    }

    await Documento.findByIdAndDelete(documentoId);
    res.status(200).json({ message: "Documento removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover documento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova medição
router.post("/:id/medicoes", async (req, res) => {
  try {
    const { id } = req.params;
    const medicaoData = req.body;

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Transforma os grupos em items e groups conforme o schema
    const transformedData = {
      ...medicaoData,
      obraId: new mongoose.Types.ObjectId(id),
      date: new Date(medicaoData.date),
      items: medicaoData.groups
        ? medicaoData.groups.flatMap((group) =>
            group.items.map((item) => ({
              ...item,
              groupId: group.id,
              groupTitle: group.title,
            }))
          )
        : [],
      groups: medicaoData.groups
        ? medicaoData.groups.map((group) => ({
            id: group.id,
            title: group.title,
            items: group.items,
          }))
        : [],
    };

    const medicao = new Medicao(transformedData);
    await medicao.save();

    // Adiciona a medição à obra
    obra.medicoes.push(medicao._id);
    await obra.save();

    res.status(201).json(medicao);
  } catch (error) {
    console.error("Erro ao salvar medição:", error);
    res
      .status(500)
      .json({ message: "Erro ao salvar medição", error: error.message });
  }
});

// Rota para atualizar um item's status
router.put("/:id/etapas/:etapaId/itens/:itemId", async (req, res) => {
  try {
    const obra = await Obra.findById(req.params.id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const etapa = obra.etapas.id(req.params.etapaId);
    if (!etapa) {
      return res.status(404).json({ message: "Etapa não encontrada" });
    }

    const item = etapa.itens.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    item.status = req.body.status;
    if (req.body.comentarios) {
      item.historico.push({
        data: new Date(),
        quantidade: item.quantidadeExecutada,
        valor: item.valorUnitario * item.quantidadeExecutada,
        porcentagem: (item.quantidadeExecutada / item.quantidade) * 100,
        status: req.body.status,
        comentarios: req.body.comentarios,
        anexos: req.body.anexos || [],
      });
    }

    const updatedObra = await obra.save();
    res.json(updatedObra);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Rota para listar todas as medições de uma obra
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

    // Ordena as medições por data (mais recente primeiro)
    const medicoesOrdenadas = obra.medicoes.sort((a, b) => b.date - a.date);

    res.json(medicoesOrdenadas);
  } catch (error) {
    console.error("Erro ao buscar medições:", error);
    res.status(500).json({ message: error.message });
  }
});

// routes/obras.js
router.post("/:obraId/medicao/save", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { date, responsavel, totalMedido, progressoGeral, status, groups } =
      req.body;

    // Validação básica dos dados
    if (!groups || !Array.isArray(groups)) {
      return res.status(400).json({
        message: "Dados de medição inválidos: grupos não encontrados",
      });
    }

    // Cria a nova medição
    const novaMedicao = new Medicao({
      obraId,
      date: new Date(date),
      responsavel,
      totalMedido,
      progressoGeral,
      status,
      groups,
      createdBy: req.user._id, // Se estiver usando autenticação
    });

    // Salva no banco de dados
    await novaMedicao.save();

    // Atualiza o progresso da obra
    await Obra.findByIdAndUpdate(obraId, {
      $set: {
        ultimaMedicao: novaMedicao._id,
        progressoGeral: progressoGeral,
      },
    });

    res.status(201).json({
      message: "Medição salva com sucesso",
      medicao: novaMedicao,
    });
  } catch (error) {
    console.error("Erro detalhado ao salvar medição:", error);
    res.status(500).json({
      message: "Erro ao salvar medição",
      error: error.message,
    });
  }
});

// Rota para atualizar um item específico da medição
router.post("/:id/medicao", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemId,
      field,
      value,
      executedQuantity,
      executedValue,
      percentage,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Encontra a medição mais recente
    const ultimaMedicao = obra.medicoes[obra.medicoes.length - 1];
    if (!ultimaMedicao) {
      return res.status(404).json({ message: "Nenhuma medição encontrada" });
    }

    // Atualiza o item específico
    const item = ultimaMedicao.itens.find((item) => item.id === itemId);
    if (item) {
      item[field] = value;
      if (executedQuantity !== undefined)
        item.executedQuantity = executedQuantity;
      if (executedValue !== undefined) item.executedValue = executedValue;
      if (percentage !== undefined) item.percentage = percentage;

      // Adiciona ao histórico
      item.history.push({
        date: new Date(),
        quantity: item.executedQuantity,
        value: item.executedValue,
        percentage: item.percentage,
        status: item.status,
        comments: `Atualização de ${field}`,
      });
    }

    await obra.save();
    res.status(200).json(ultimaMedicao);
  } catch (error) {
    console.error("Erro ao atualizar medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar uma etapa inteira da medição
router.post("/:id/medicao/stage", async (req, res) => {
  try {
    const { id } = req.params;
    const { stageId, percentage, items } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Encontra a medição mais recente
    const ultimaMedicao = obra.medicoes[obra.medicoes.length - 1];
    if (!ultimaMedicao) {
      return res.status(404).json({ message: "Nenhuma medição encontrada" });
    }

    // Atualiza todos os itens da etapa
    items.forEach((updatedItem) => {
      const item = ultimaMedicao.itens.find(
        (item) => item.id === updatedItem.id
      );
      if (item) {
        Object.assign(item, updatedItem);
        item.history.push({
          date: new Date(),
          quantity: item.executedQuantity,
          value: item.executedValue,
          percentage: item.percentage,
          status: item.status,
          comments: `Atualização em lote da etapa ${stageId}`,
        });
      }
    });

    await obra.save();
    res.status(200).json(ultimaMedicao);
  } catch (error) {
    console.error("Erro ao atualizar etapa da medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma medição específica
router.delete("/:id/medicoes/:medicaoId", async (req, res) => {
  try {
    const { id, medicaoId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(medicaoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Encontra o índice da medição a ser removida
    const medicaoIndex = obra.medicoes.findIndex(
      (medicao) => medicao._id.toString() === medicaoId
    );

    if (medicaoIndex === -1) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Remove a medição do array
    obra.medicoes.splice(medicaoIndex, 1);
    await obra.save();

    res.status(200).json({ message: "Medição excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter uma medição específica
router.get("/:id/medicao/:medicaoId", async (req, res) => {
  try {
    const { id, medicaoId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(medicaoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Encontra a medição específica
    const medicao = obra.medicoes.find((m) => m._id.toString() === medicaoId);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Transforma os dados para o formato esperado pelo frontend
    const transformedMedicao = {
      ...medicao,
      groups: medicao.groups.map((group) => ({
        id: group.id,
        title: group.title,
        totalOrcado: group.totalOrcado,
        totalMedido: group.totalMedido,
        saldoAtualizado: group.saldoAtualizado,
        progresso: group.progresso,
        items: group.items.map((item) => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          plannedQuantity: item.plannedQuantity,
          value: item.value,
          executedQuantity: item.executedQuantity,
          executedValue: item.executedValue,
          percentage: item.percentage,
          status: item.status,
          totalOrcado: item.totalOrcado,
          totalMedido: item.totalMedido,
          saldoAtualizado: item.saldoAtualizado,
        })),
      })),
    };

    res.json(transformedMedicao);
  } catch (error) {
    console.error("Erro ao buscar medição:", error);
    res.status(500).json({
      message: "Erro ao buscar medição",
      error: error.message,
      stack: error.stack,
    });
  }
});

export default router;
