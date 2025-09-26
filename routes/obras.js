import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";
import Medicao from "../models/Medicao.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import TipoObra from "../models/TipoObra.js";
import QuemPaga from "../models/QuemPaga.js";
import Conta from "../models/Conta.js";
import cloudinary, { uploadDocumento, uploadImagem } from "../cloudinary.js";

const router = express.Router();

// Rota de teste para verificar se as rotas estão funcionando
router.get("/test", (req, res) => {
  res.json({ message: "Rotas de obras funcionando!", timestamp: new Date() });
});

router.get("teste-cloudinary", (req, res) => {
  console.log("Testando Cloudinaru");
  console.log("Cloudinary_cloud_name:", process.env.CLOUDINARY_CLOUD_NAME);
  console.log("Cloudinary_api_key:", process.env.CLOUDINARY_API_KEY);
  console.log("Cloudinary_api_secret:", process.env.CLOUDINARY_API_SECRET);

  res.json({
    cloudinary: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  });
});

// Rota de debug para verificar IDs de pagamentos
router.get("/:id/debug-pagamentos", async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findById(id).select("pagamentos");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const pagamentosDebug = obra.pagamentos.map((p, index) => ({
      index,
      _id: p._id.toString(),
      id: p.id ? p.id.toString() : null,
      descricao: p.descricao,
      anexosCount: p.anexos ? p.anexos.length : 0,
    }));

    res.json({
      obraId: id,
      totalPagamentos: obra.pagamentos.length,
      pagamentos: pagamentosDebug,
    });
  } catch (error) {
    console.error("Erro no debug:", error);
    res.status(500).json({ message: error.message });
  }
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "documentos"
    );

    // Criar o diretório se não existir
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

// Rota para servir arquivos
router.get("/uploads/documentos/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "documentos",
    filename
  );

  if (fs.existsSync(filePath)) {
    // Determinar o tipo MIME com base na extensão do arquivo
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".doc":
      case ".docx":
        contentType = "application/msword";
        break;
      case ".xls":
      case ".xlsx":
        contentType = "application/vnd.ms-excel";
        break;
    }

    // Definir os headers corretos
    res.setHeader("Content-Type", contentType);

    // Para imagens e PDFs, permitir visualização inline
    if (contentType.startsWith("image/") || contentType === "application/pdf") {
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    } else {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
    }

    // Enviar o arquivo
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "Arquivo não encontrado" });
  }
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
router.post("/", uploadImagem.single("imagem"), async (req, res) => {
  try {
    // Parse JSON strings from FormData
    const parseFormData = (value) => {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    };

    // ✅ MUDANÇA: Usar URL do Cloudinary
    let imagem = null;
    let imagemPublicId = null;
    if (req.file) {
      imagem = req.file.path; // URL do Cloudinary
      imagemPublicId = req.file.public_id; // ID para deletar depois
    }

    // Converter os dados do FormData
    const obraData = {
      nome: req.body.nome,
      status: req.body.status,
      codigoObras: req.body.codigoObras,
      tipo: mongoose.Types.ObjectId.isValid(req.body.tipo)
        ? new mongoose.Types.ObjectId(req.body.tipo)
        : null,
      art: req.body.art,
      responsavelTecnico: req.body.responsavelTecnico,
      responsavelObra: req.body.responsavelObra,
      arquiteto: req.body.arquiteto,
      ceiCno: req.body.ceiCno,
      areaConstruida: req.body.areaConstruida
        ? parseFloat(req.body.areaConstruida.replace(",", "."))
        : null,
      areaTerreno: req.body.areaTerreno
        ? parseFloat(req.body.areaTerreno.replace(",", "."))
        : null,
      numeroPavimentos: req.body.numeroPavimentos
        ? parseInt(req.body.numeroPavimentos)
        : null,
      numeroUnidades: req.body.numeroUnidades
        ? parseInt(req.body.numeroUnidades)
        : null,
      endereco: parseFormData(req.body.endereco),
      quemPaga: mongoose.Types.ObjectId.isValid(req.body.quemPaga)
        ? new mongoose.Types.ObjectId(req.body.quemPaga)
        : null,
      conta: mongoose.Types.ObjectId.isValid(req.body.conta)
        ? new mongoose.Types.ObjectId(req.body.conta)
        : null,
      comentario: req.body.comentario,
      visivelPara: req.body.visivelPara,
      cliente: mongoose.Types.ObjectId.isValid(req.body.cliente)
        ? new mongoose.Types.ObjectId(req.body.cliente)
        : null,
      contatos: parseFormData(req.body.contatos),
      mapPosition: parseFormData(req.body.mapPosition),
      contatoPrincipal: req.body.contatoPrincipal
        ? parseInt(req.body.contatoPrincipal)
        : null,
      dataInicio: new Date(req.body.dataInicio),
      previsaoTermino: req.body.previsaoTermino
        ? new Date(req.body.previsaoTermino)
        : null,
      dataPrevisao: req.body.dataPrevisao
        ? new Date(req.body.dataPrevisao)
        : null,
      imagem,
      imagemPublicId, // ✅ NOVO: Salvar public_id
    };

    // Validar campos obrigatórios
    if (!obraData.nome) {
      console.error("Erro: Nome é obrigatório");
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    if (!obraData.tipo) {
      console.error("Erro: Tipo é obrigatório");
      return res.status(400).json({ message: "Tipo é obrigatório" });
    }

    if (!obraData.cliente) {
      console.error("Erro: Cliente é obrigatório");
      return res.status(400).json({ message: "Cliente é obrigatório" });
    }

    if (!obraData.dataInicio) {
      console.error("Erro: Data de início é obrigatória");
      return res.status(400).json({ message: "Data de início é obrigatória" });
    }

    const obra = new Obra(obraData);

    const savedObra = await obra.save();

    res.status(201).json(savedObra);
  } catch (error) {
    console.error("Erro detalhado ao criar obra:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });

    res.status(500).json({
      message: error.message,
      error: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Rota para criar uma nova obra
router.post("/duplicar", async (req, res) => {
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

    // Validar campos obrigatórios
    if (!nome) {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    if (!tipo) {
      return res.status(400).json({ message: "Tipo é obrigatório" });
    }

    if (!cliente) {
      return res.status(400).json({ message: "Cliente é obrigatório" });
    }

    if (!dataInicio) {
      return res.status(400).json({ message: "Data de início é obrigatória" });
    }

    // Validar e formatar mapPosition
    let formattedMapPosition = null;
    if (mapPosition && Array.isArray(mapPosition)) {
      const [lat, lng] = mapPosition;
      if (
        typeof lat === "number" &&
        !isNaN(lat) &&
        typeof lng === "number" &&
        !isNaN(lng)
      ) {
        formattedMapPosition = [lat, lng];
      }
    }

    // Converter valores numéricos
    const obraData = {
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
      areaConstruida:
        typeof areaConstruida === "string"
          ? parseFloat(areaConstruida.replace(",", "."))
          : Number(areaConstruida),
      areaTerreno:
        typeof areaTerreno === "string"
          ? parseFloat(areaTerreno.replace(",", "."))
          : Number(areaTerreno),
      numeroPavimentos: numeroPavimentos ? parseInt(numeroPavimentos) : null,
      numeroUnidades: numeroUnidades ? parseInt(numeroUnidades) : null,
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
      mapPosition: formattedMapPosition,
      contatoPrincipal,
      dataInicio: new Date(dataInicio.split("/").reverse().join("-")),
      previsaoTermino: previsaoTermino
        ? new Date(previsaoTermino.split("/").reverse().join("-"))
        : null,
      dataPrevisao: dataPrevisao ? new Date(dataPrevisao) : null,
      imagem,
      orcamento: orcamento
        ? {
            ...orcamento,
            _id: undefined,
            dataCriacao: new Date(),
            dataAtualizacao: new Date(),
          }
        : null,
      receitas: receitas || [],
      pagamentos: pagamentos || [],
      registrosDiarios: registrosDiarios || [],
      medicoes: medicoes || [],
    };

    const obra = new Obra(obraData);
    const savedObra = await obra.save();
    res.status(201).json(savedObra);
  } catch (error) {
    console.error("Erro ao duplicar obra:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Rota para atualizar uma obra
router.put("/:id", upload.single("imagem"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Parse JSON strings from FormData
    const parseFormData = (value) => {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    };

    // Depois (Cloudinary):
    let imagem = null;
    let imagemPublicId = null;
    if (req.file) {
      imagem = req.file.path; // URL completa do Cloudinary
      imagemPublicId = req.file.public_id; // ID para deletar depois
    }

    // Converter os dados do FormData
    const updateData = {
      nome: req.body.nome,
      status: req.body.status,
      codigoObras: req.body.codigoObras,
      tipo: mongoose.Types.ObjectId.isValid(req.body.tipo)
        ? new mongoose.Types.ObjectId(req.body.tipo)
        : null,
      art: req.body.art,
      responsavelTecnico: req.body.responsavelTecnico,
      responsavelObra: req.body.responsavelObra,
      arquiteto: req.body.arquiteto,
      ceiCno: req.body.ceiCno,
      areaConstruida: req.body.areaConstruida
        ? parseFloat(req.body.areaConstruida.replace(",", "."))
        : null,
      areaTerreno: req.body.areaTerreno
        ? parseFloat(req.body.areaTerreno.replace(",", "."))
        : null,
      numeroPavimentos: req.body.numeroPavimentos
        ? parseInt(req.body.numeroPavimentos)
        : null,
      numeroUnidades: req.body.numeroUnidades
        ? parseInt(req.body.numeroUnidades)
        : null,
      endereco: parseFormData(req.body.endereco),
      quemPaga: mongoose.Types.ObjectId.isValid(req.body.quemPaga)
        ? new mongoose.Types.ObjectId(req.body.quemPaga)
        : null,
      conta: mongoose.Types.ObjectId.isValid(req.body.conta)
        ? new mongoose.Types.ObjectId(req.body.conta)
        : null,
      comentario: req.body.comentario,
      visivelPara: req.body.visivelPara,
      cliente: mongoose.Types.ObjectId.isValid(req.body.cliente)
        ? new mongoose.Types.ObjectId(req.body.cliente)
        : null,
      contatos: parseFormData(req.body.contatos),
      mapPosition: parseFormData(req.body.mapPosition),
      contatoPrincipal: req.body.contatoPrincipal
        ? parseInt(req.body.contatoPrincipal)
        : null,
      dataInicio: new Date(req.body.dataInicio),
      previsaoTermino: req.body.previsaoTermino
        ? new Date(req.body.previsaoTermino)
        : null,
      dataPrevisao: req.body.dataPrevisao
        ? new Date(req.body.dataPrevisao)
        : null,
    };

    // Adicionar imagem apenas se uma nova foi enviada
    if (imagem) {
      updateData.imagem = imagem;
    }

    // Remover campos undefined ou null que não devem ser atualizados
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    // Atualizar a obra
    const updatedObra = await Obra.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    );

    if (!updatedObra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Retornar a obra atualizada com os campos populados
    const populatedObra = await Obra.findById(updatedObra._id)
      .populate("tipo")
      .populate("cliente")
      .populate("quemPaga")
      .populate("conta");

    res.status(200).json({
      obra: populatedObra,
      mensagem: "Obra atualizada com sucesso",
      sucesso: true,
    });
  } catch (error) {
    console.error("Erro ao atualizar obra:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
      categoria: "Categoria é obrigatória",
      data: "Data é obrigatória",
      status: "Status é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!req.body[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    // Processar anexos em base64 se existirem
    const anexos = req.body.anexos
      ? JSON.parse(req.body.anexos).map((anexo) => ({
          nome: anexo.nome,
          tipo: anexo.tipo,
          tamanho: anexo.tamanho,
          caminho: anexo.caminho || "",
          conteudo: anexo.conteudo, // Conteúdo em base64
          dataUpload: new Date(),
        }))
      : [];

    // Processar associacaoOrcamento
    let associacaoOrcamento = null;
    if (req.body.associacaoOrcamento) {
      try {
        associacaoOrcamento =
          typeof req.body.associacaoOrcamento === "string"
            ? JSON.parse(req.body.associacaoOrcamento)
            : req.body.associacaoOrcamento;
      } catch (error) {
        console.error("Erro ao processar associacaoOrcamento:", error);
      }
    }

    const novaReceita = {
      // Campos vindos diretamente do body
      descricao: req.body.descricao,
      valor: req.body.valor,
      status: req.body.status,
      categoria: req.body.categoria,
      categoriaOutros: req.body.categoriaOutros,
      formaPagamento: req.body.formaPagamento,
      documento: req.body.documento,
      valorRecebido: req.body.valorRecebido
        ? parseFloat(req.body.valorRecebido)
        : 0,

      // Campos processados ou gerados
      id: new mongoose.Types.ObjectId(),
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: req.body.beneficiario
        ? new mongoose.Types.ObjectId(req.body.beneficiario)
        : null,
      centroCusto: obra.nome,
      associacaoOrcamento: associacaoOrcamento,
      isTransacaoMultipla: req.body.transacaoPrincipalId ? true : false,
      transacaoPrincipalId: req.body.transacaoPrincipalId
        ? new mongoose.Types.ObjectId(req.body.transacaoPrincipalId)
        : null,

      // Array de anexos processado
      anexos: anexos,
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

    // Validar campos obrigatórios
    const camposObrigatorios = {
      descricao: "Descrição é obrigatória",
      valor: "Valor é obrigatório",
      categoria: "Categoria é obrigatória",
      data: "Data é obrigatória",
      status: "Status é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!req.body[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    const receitaIndex = obra.receitas.findIndex(
      (r) => r._id.toString() === receitaId
    );
    if (receitaIndex === -1) {
      return res.status(404).json({ message: "Receita não encontrada" });
    }

    // Processar anexos em base64 se existirem
    const anexos = req.body.anexos
      ? JSON.parse(req.body.anexos).map((anexo) => ({
          nome: anexo.nome,
          tipo: anexo.tipo,
          tamanho: anexo.tamanho,
          caminho: anexo.caminho || "",
          conteudo: anexo.conteudo, // Conteúdo em base64
          dataUpload: new Date(),
        }))
      : [];

    // Se houver anexos existentes, mantê-los
    const anexosExistentes = obra.receitas[receitaIndex].anexos || [];
    const todosAnexos = [...anexosExistentes, ...anexos];

    // Processar associacaoOrcamento
    let associacaoOrcamento = null;
    if (req.body.associacaoOrcamento) {
      try {
        associacaoOrcamento =
          typeof req.body.associacaoOrcamento === "string"
            ? JSON.parse(req.body.associacaoOrcamento)
            : req.body.associacaoOrcamento;
      } catch (error) {
        console.error("Erro ao processar associacaoOrcamento:", error);
      }
    }

    const receitaAtualizada = {
      ...obra.receitas[receitaIndex],
      ...req.body,
      _id: new mongoose.Types.ObjectId(receitaId),
      anexos: todosAnexos,
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: req.body.beneficiario
        ? new mongoose.Types.ObjectId(req.body.beneficiario)
        : null,
      associacaoOrcamento: associacaoOrcamento,
      valorRecebido: req.body.valorRecebido
        ? parseFloat(req.body.valorRecebido)
        : 0,
      // Campos para transações múltiplas
      isTransacaoMultipla: req.body.transacaoPrincipalId ? true : false,
      transacaoPrincipalId: req.body.transacaoPrincipalId
        ? new mongoose.Types.ObjectId(req.body.transacaoPrincipalId)
        : null,
    };

    obra.receitas[receitaIndex] = receitaAtualizada;
    await obra.save();
    res.json(receitaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar receita:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir anexo de uma receita (DEVE VIR ANTES da rota de excluir receita)
router.delete(
  "/:id/receitas/:receitaId/anexos/:anexoIndex",
  async (req, res) => {
    try {
      const { id, receitaId, anexoIndex } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(receitaId)
      ) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const anexoIndexNum = parseInt(anexoIndex);
      if (isNaN(anexoIndexNum) || anexoIndexNum < 0) {
        return res.status(400).json({ message: "Índice do anexo inválido" });
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

      const receita = obra.receitas[receitaIndex];

      if (!receita.anexos || anexoIndexNum >= receita.anexos.length) {
        return res.status(404).json({ message: "Anexo não encontrado" });
      }

      // Remover o anexo do array
      receita.anexos.splice(anexoIndexNum, 1);
      await obra.save();

      res.json({
        message: "Anexo excluído com sucesso",
        anexosRestantes: receita.anexos.length,
      });
    } catch (error) {
      console.error("❌ Erro ao excluir anexo da receita:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

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

router.get("/:id/pagamentos/:pagamentoId", async (req, res) => {
  try {
    const { id, pagamentoId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(pagamentoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("pagamentos");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const pagamento = obra.pagamentos.id(pagamentoId);
    if (!pagamento) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    res.json(pagamento);
  } catch (error) {
    console.error("Erro ao buscar pagamento:", error);
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
      categoria: "Categoria é obrigatória",
      data: "Data é obrigatória",
      status: "Status é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!req.body[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    // Processar anexos em base64 se existirem
    const anexos = req.body.anexos
      ? JSON.parse(req.body.anexos).map((anexo) => ({
          nome: anexo.nome,
          tipo: anexo.tipo,
          tamanho: anexo.tamanho,
          caminho: anexo.caminho || "",
          conteudo: anexo.conteudo, // Conteúdo em base64
          dataUpload: new Date(),
        }))
      : [];

    // Processar associacaoOrcamento
    let associacaoOrcamento = null;
    if (req.body.associacaoOrcamento) {
      try {
        associacaoOrcamento =
          typeof req.body.associacaoOrcamento === "string"
            ? JSON.parse(req.body.associacaoOrcamento)
            : req.body.associacaoOrcamento;
      } catch (error) {
        console.error("Erro ao processar associacaoOrcamento:", error);
      }
    }

    const novoPagamento = {
      // Campos vindos diretamente do body
      descricao: req.body.descricao,
      valor: req.body.valor,
      status: req.body.status,
      categoria: req.body.categoria,
      categoriaOutros: req.body.categoriaOutros,
      formaPagamento: req.body.formaPagamento,
      documento: req.body.documento,
      valorPago: req.body.valorPago ? parseFloat(req.body.valorPago) : 0,

      // Campos processados ou gerados
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: req.body.beneficiario
        ? new mongoose.Types.ObjectId(req.body.beneficiario)
        : null,
      centroCusto: obra.nome,
      associacaoOrcamento: associacaoOrcamento,
      isTransacaoMultipla: req.body.transacaoPrincipalId ? true : false,
      transacaoPrincipalId: req.body.transacaoPrincipalId
        ? new mongoose.Types.ObjectId(req.body.transacaoPrincipalId)
        : null,

      // Array de anexos processado
      anexos: anexos,
    };

    obra.pagamentos.push(novoPagamento);
    await obra.save();

    const pagamentoSalvo = obra.pagamentos[obra.pagamentos.length - 1];

    res.status(201).json(pagamentoSalvo);
  } catch (error) {
    console.error("Erro ao adicionar pagamento:", error);
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/pagamentos/:pagamentoId/nfe", async (req, res) => {
  try {
    const { id, pagamentoId } = req.params;
    const nfeInfo = req.body; // { numero, serie, dataEmissao, chaveAcesso }

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

    const pagamento = obra.pagamentos.id(pagamentoId);
    if (!pagamento) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    // Adiciona ou atualiza as informações da NF-e no pagamento
    pagamento.nfeInfo = nfeInfo;

    await obra.save();
    res.status(200).json(pagamento);
  } catch (error) {
    console.error("Erro ao associar NF-e ao pagamento:", error);
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

    // Validar campos obrigatórios
    const camposObrigatorios = {
      descricao: "Descrição é obrigatória",
      valor: "Valor é obrigatório",
      categoria: "Categoria é obrigatória",
      data: "Data é obrigatória",
      status: "Status é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!req.body[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    const pagamentoIndex = obra.pagamentos.findIndex(
      (p) => p._id.toString() === pagamentoId
    );
    if (pagamentoIndex === -1) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    // Processar anexos em base64 se existirem
    const anexos = req.body.anexos
      ? JSON.parse(req.body.anexos).map((anexo) => ({
          nome: anexo.nome,
          tipo: anexo.tipo,
          tamanho: anexo.tamanho,
          caminho: anexo.caminho || "",
          conteudo: anexo.conteudo, // Conteúdo em base64
          dataUpload: new Date(),
        }))
      : [];

    // Se houver anexos existentes, mantê-los
    const anexosExistentes = obra.pagamentos[pagamentoIndex].anexos || [];
    const todosAnexos = [...anexosExistentes, ...anexos];

    // Processar associacaoOrcamento
    let associacaoOrcamento = null;
    if (req.body.associacaoOrcamento) {
      try {
        associacaoOrcamento =
          typeof req.body.associacaoOrcamento === "string"
            ? JSON.parse(req.body.associacaoOrcamento)
            : req.body.associacaoOrcamento;
      } catch (error) {
        console.error("Erro ao processar associacaoOrcamento:", error);
      }
    }

    const pagamentoAtualizado = {
      ...obra.pagamentos[pagamentoIndex],
      ...req.body,
      _id: new mongoose.Types.ObjectId(pagamentoId),
      anexos: todosAnexos,
      data: new Date(req.body.data),
      dataVencimento: req.body.dataVencimento
        ? new Date(req.body.dataVencimento)
        : null,
      beneficiario: req.body.beneficiario
        ? new mongoose.Types.ObjectId(req.body.beneficiario)
        : null,
      associacaoOrcamento: associacaoOrcamento,
      valorPago: req.body.valorPago ? parseFloat(req.body.valorPago) : 0,
      // Campos para transações múltiplas
      isTransacaoMultipla: req.body.transacaoPrincipalId ? true : false,
      transacaoPrincipalId: req.body.transacaoPrincipalId
        ? new mongoose.Types.ObjectId(req.body.transacaoPrincipalId)
        : null,
    };

    obra.pagamentos[pagamentoIndex] = pagamentoAtualizado;
    await obra.save();
    res.json(pagamentoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar pagamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir anexo de um pagamento (DEVE VIR ANTES da rota de excluir pagamento)
router.delete(
  "/:id/pagamentos/:pagamentoId/anexos/:anexoIndex",
  async (req, res) => {
    try {
      const { id, pagamentoId, anexoIndex } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(pagamentoId)
      ) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const anexoIndexNum = parseInt(anexoIndex);
      if (isNaN(anexoIndexNum) || anexoIndexNum < 0) {
        return res.status(400).json({ message: "Índice do anexo inválido" });
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

      const pagamento = obra.pagamentos[pagamentoIndex];

      if (!pagamento.anexos || anexoIndexNum >= pagamento.anexos.length) {
        return res.status(404).json({ message: "Anexo não encontrado" });
      }

      // Remover o anexo do array
      pagamento.anexos.splice(anexoIndexNum, 1);
      await obra.save();

      res.json({
        message: "Anexo excluído com sucesso",
        anexosRestantes: pagamento.anexos.length,
      });
    } catch (error) {
      console.error("❌ Erro ao excluir anexo do pagamento:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

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
    const { page = 1, limit = 10, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Verificar se a obra existe
    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Buscar medições usando o modelo Medicao
    const filter = { obraId: id };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const medicoes = await Medicao.find(filter)
      .populate("createdBy", "nome email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Medicao.countDocuments(filter);

    res.json({
      medicoes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
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
router.post(
  "/lancamentos/independentes",
  upload.array("anexos", 5),
  async (req, res) => {
    try {
      const transacoes = Array.isArray(req.body) ? req.body : [req.body];
      const resultados = [];

      for (const transacao of transacoes) {
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
          ...transacao,
          valor:
            typeof transacao.valor === "string"
              ? parseFloat(
                  transacao.valor.replace("R$", "").replace(",", ".").trim()
                )
              : transacao.valor,
          data: new Date(transacao.data),
          dataVencimento: transacao.dataVencimento
            ? new Date(transacao.dataVencimento)
            : null,
          beneficiario: transacao.beneficiario
            ? new mongoose.Types.ObjectId(transacao.beneficiario)
            : null,
          status: transacao.status || "pendente",
          categoria: transacao.categoria || "Outros",
          formaPagamento: transacao.formaPagamento || "Não especificado",
          documento: transacao.documento || "",
          centroCusto:
            transacao.centroCusto || (transacao.obraId ? obra.nome : "Empresa"),
          anexos: anexos,
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
          return res
            .status(400)
            .json({ message: "Data de vencimento inválida" });
        }

        let obra;
        if (transacao.obraId) {
          // Se uma obraId foi fornecida, buscar a obra específica
          obra = await Obra.findById(transacao.obraId);
          if (!obra) {
            return res.status(404).json({ message: "Obra não encontrada" });
          }
        } else {
          // Se não houver obraId, usar a obra de transações independentes
          obra = await Obra.findOne({
            nome: "Transações Independentes",
          });

          if (!obra) {
            obra = new Obra({
              nome: "Transações Independentes",
              status: "Ativo",
              centroCusto: "Empresa",
            });
            await obra.save();
          }
        }

        // Adicionar a transação à obra
        if (transacao.tipo === "receita") {
          obra.receitas.push(transacaoData);
        } else {
          obra.pagamentos.push(transacaoData);
        }

        await obra.save();
        resultados.push(transacaoData);
      }

      res.status(201).json(resultados);
    } catch (error) {
      console.error("Erro ao criar transação(ões) independente(s):", error);
      res.status(500).json({ message: error.message });
    }
  }
);

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

// Rota para excluir um registro diário específico de uma obra
router.delete("/:obraId/registros-diarios/:registroId", async (req, res) => {
  try {
    const { obraId, registroId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(obraId) ||
      !mongoose.Types.ObjectId.isValid(registroId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Encontrar o índice do registro diário
    const registroIndex = obra.registrosDiarios.findIndex(
      (registro) => registro._id.toString() === registroId
    );

    if (registroIndex === -1) {
      return res
        .status(404)
        .json({ message: "Registro diário não encontrado" });
    }

    // Remover o registro diário
    obra.registrosDiarios.splice(registroIndex, 1);
    await obra.save();

    res.status(200).json({ message: "Registro diário excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir registro diário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo registro diário
router.post(
  "/:obraId/registros-diarios",
  upload.array("fotos", 10),
  async (req, res) => {
    try {
      const { obraId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(obraId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const obra = await Obra.findById(obraId);
      if (!obra) {
        return res.status(404).json({ message: "Obra não encontrada" });
      }

      // Processar os dados do formulário
      const data = JSON.parse(req.body.data);

      // Validar e formatar a data
      if (!data.data) {
        return res.status(400).json({ message: "Data é obrigatória" });
      }

      // Converter a data para o formato correto
      const dataFormatada = new Date(data.data);
      if (isNaN(dataFormatada.getTime())) {
        return res.status(400).json({ message: "Data inválida" });
      }

      // Processar fotos se existirem
      const fotos = req.files
        ? req.files.map(
            (file) => `/api/obras/uploads/documentos/${file.filename}`
          )
        : [];

      const novoRegistro = {
        ...data,
        data: dataFormatada,
        fotos: fotos,
        timestamp: Date.now(),
        maoDeObra: {
          tercerizados: data.maoDeObra?.tercerizados || "nao",
          trabalhadores: data.maoDeObra?.trabalhadores || [],
          observacoes: data.maoDeObra?.observacoes || "",
        },
        equipamentos: {
          itens: data.equipamentos?.itens || [],
          observacoes: data.equipamentos?.observacoes || "",
        },
        ocorrencias: {
          descricao: data.ocorrencias?.descricao || "",
          tipo: data.ocorrencias?.tipo || "",
          gravidade: data.ocorrencias?.gravidade || "",
          grauReincidencia: data.ocorrencias?.grauReincidencia || "",
          numeroReincidencias: data.ocorrencias?.numeroReincidencias || 0,
        },
      };

      // Validar campos obrigatórios
      const camposObrigatorios = {
        clima: "Clima é obrigatório",
        titulo: "Título é obrigatório",
        descricao: "Descrição é obrigatória",
      };

      for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
        if (!novoRegistro[campo]) {
          return res.status(400).json({ message: mensagem });
        }
      }

      // Adicionar o registro à obra
      obra.registrosDiarios.push(novoRegistro);
      await obra.save();

      // Atualizar o progresso geral da obra
      if (novoRegistro.progressoGeral !== undefined) {
        obra.progressoGeral = novoRegistro.progressoGeral;
        await obra.save();
      }

      res.status(201).json(novoRegistro);
    } catch (error) {
      console.error("Erro ao criar registro diário:", error);
      res.status(500).json({
        message: error.message,
        error: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// Rota para atualizar o progresso de uma etapa
router.put("/:id/etapas/:etapaId/progresso", async (req, res) => {
  try {
    const { id, etapaId } = req.params;
    const { progresso } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Encontrar a etapa pelo id
    const etapa = obra.orcamento.stages.find(
      (stage) => stage.id === parseInt(etapaId)
    );
    if (!etapa) {
      return res.status(404).json({ message: "Etapa não encontrada" });
    }

    // Validar o valor do progresso
    if (typeof progresso !== "number" || progresso < 0 || progresso > 100) {
      return res
        .status(400)
        .json({ message: "Progresso deve ser um número entre 0 e 100" });
    }

    // Atualizar o progresso da etapa
    etapa.progresso = progresso;
    await obra.save();

    res.json({
      message: "Progresso atualizado com sucesso",
      etapa: etapa,
    });
  } catch (error) {
    console.error("Erro ao atualizar progresso:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar o último progresso da obra
router.get("/:id/ultimo-progresso", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Ordena os registros diários por data (mais recente primeiro)
    const registrosOrdenados = obra.registrosDiarios.sort((a, b) => {
      return new Date(b.data) - new Date(a.data);
    });

    // Pega o registro mais recente
    const ultimoRegistro = registrosOrdenados[0];

    if (!ultimoRegistro) {
      return res
        .status(404)
        .json({ message: "Nenhum registro de progresso encontrado" });
    }

    res.json([ultimoRegistro]);
  } catch (error) {
    console.error("Erro ao buscar último progresso:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar documentos a uma obra
router.post("/:id/documentos", upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }

    // Processar anexos
    const anexos = req.files.map((file) => ({
      nome: file.originalname,
      tipo: file.mimetype,
      tamanho: file.size,
      caminho: `/api/obras/uploads/documentos/${file.filename}`,
      dataUpload: new Date(),
    }));

    // Adicionar os documentos à obra
    if (!obra.documentos) {
      obra.documentos = [];
    }
    obra.documentos.push(...anexos);
    await obra.save();

    res.status(201).json(anexos);
  } catch (error) {
    console.error("Erro ao adicionar documentos:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Rota para excluir um documento de uma obra
router.delete("/:id/documentos/:documentoId", async (req, res) => {
  try {
    const { id, documentoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID da obra inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Encontrar o índice do documento
    const documentoIndex = obra.documentos.findIndex(
      (doc) => doc._id.toString() === documentoId
    );

    if (documentoIndex === -1) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    // Remover o documento
    obra.documentos.splice(documentoIndex, 1);
    await obra.save();

    res.status(200).json({ message: "Documento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir documento:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Rota para atualizar imagens de um registro diário
router.put(
  "/:obraId/registros-diarios/:registroId/imagens",
  upload.array("fotos", 10),
  async (req, res) => {
    try {
      const { obraId, registroId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(obraId) ||
        !mongoose.Types.ObjectId.isValid(registroId)
      ) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const obra = await Obra.findById(obraId);
      if (!obra) {
        return res.status(404).json({ message: "Obra não encontrada" });
      }

      // Encontrar o registro diário
      const registroIndex = obra.registrosDiarios.findIndex(
        (registro) => registro._id.toString() === registroId
      );

      if (registroIndex === -1) {
        return res
          .status(404)
          .json({ message: "Registro diário não encontrado" });
      }

      // Processar as novas fotos
      const novasFotos = req.files
        ? req.files.map(
            (file) => `/api/obras/uploads/documentos/${file.filename}`
          )
        : [];

      // Se houver fotos existentes e não foi solicitada a substituição total
      if (
        req.body.modo === "adicionar" &&
        obra.registrosDiarios[registroIndex].fotos
      ) {
        obra.registrosDiarios[registroIndex].fotos = [
          ...obra.registrosDiarios[registroIndex].fotos,
          ...novasFotos,
        ];
      } else {
        // Substituir todas as fotos
        obra.registrosDiarios[registroIndex].fotos = novasFotos;
      }

      // Se houver fotos para remover
      if (req.body.fotosParaRemover) {
        const fotosParaRemover = JSON.parse(req.body.fotosParaRemover);
        obra.registrosDiarios[registroIndex].fotos = obra.registrosDiarios[
          registroIndex
        ].fotos.filter((foto) => !fotosParaRemover.includes(foto));
      }

      await obra.save();

      res.json({
        message: "Imagens atualizadas com sucesso",
        registro: obra.registrosDiarios[registroIndex],
      });
    } catch (error) {
      console.error("Erro ao atualizar imagens:", error);
      res.status(500).json({
        message: error.message,
        error: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// Rota para buscar um registro diário específico
router.get("/:obraId/registros-diarios/:registroId", async (req, res) => {
  try {
    const { obraId, registroId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(obraId) ||
      !mongoose.Types.ObjectId.isValid(registroId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const registro = obra.registrosDiarios.id(registroId);
    if (!registro) {
      return res
        .status(404)
        .json({ message: "Registro diário não encontrado" });
    }

    res.json(registro);
  } catch (error) {
    console.error("Erro ao buscar registro diário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um registro diário
router.put("/:obraId/registros-diarios/:registroId", async (req, res) => {
  try {
    const { obraId, registroId } = req.params;
    const dadosAtualizados = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(obraId) ||
      !mongoose.Types.ObjectId.isValid(registroId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Validar campos obrigatórios
    const camposObrigatorios = {
      titulo: "Título é obrigatório",
      data: "Data é obrigatória",
      descricao: "Descrição é obrigatória",
      clima: "Clima é obrigatório",
    };

    for (const [campo, mensagem] of Object.entries(camposObrigatorios)) {
      if (!dadosAtualizados[campo]) {
        return res.status(400).json({ message: mensagem });
      }
    }

    // Converter a data para o formato correto
    if (dadosAtualizados.data) {
      dadosAtualizados.data = new Date(dadosAtualizados.data);
    }

    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const registroIndex = obra.registrosDiarios.findIndex(
      (registro) => registro._id.toString() === registroId
    );

    if (registroIndex === -1) {
      return res
        .status(404)
        .json({ message: "Registro diário não encontrado" });
    }

    // Atualizar o registro mantendo o _id original
    const registroAtualizado = {
      ...obra.registrosDiarios[registroIndex].toObject(),
      ...dadosAtualizados,
      _id: obra.registrosDiarios[registroIndex]._id,
    };

    // Atualizar o registro no array
    obra.registrosDiarios[registroIndex] = registroAtualizado;

    // Salvar as alterações
    await obra.save();

    res.json(registroAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar registro diário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar transações múltiplas
router.get("/lancamentos/multiplas", async (req, res) => {
  try {
    // Buscar todas as obras com transações múltiplas
    const obras = await Obra.find().select("nome pagamentos receitas").lean();

    // Filtrar apenas transações múltiplas
    const transacoesMultiplas = obras.flatMap((obra) => {
      const pagamentos = obra.pagamentos
        .filter((p) => p.isTransacaoMultipla)
        .map((pagamento) => ({
          ...pagamento,
          obraId: obra._id,
          obraNome: obra.nome,
          tipo: "despesa",
        }));

      const receitas = obra.receitas
        .filter((r) => r.isTransacaoMultipla)
        .map((receita) => ({
          ...receita,
          obraId: obra._id,
          obraNome: obra.nome,
          tipo: "receita",
        }));

      return [...pagamentos, ...receitas];
    });

    // Ordenar por data (mais recente primeiro)
    transacoesMultiplas.sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json(transacoesMultiplas);
  } catch (error) {
    console.error("Erro ao buscar transações múltiplas:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
