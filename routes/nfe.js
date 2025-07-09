import express from "express";
import NFe from "../models/NFe.js";
import NFeRecentes from "../models/NFeRecentes.js";
import {
  buscarNotasRecentes,
  consultarStatusNSU,
} from "../controllers/nfeController.js";
import Certificado from "../models/Certificado.js";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { importarCertificadoPFX } from "../utils/certificateUtils.js";

dotenv.config();

const router = express.Router();

// Rotas de certificados com prefixo específico
const certificadosRouter = express.Router();

// Criar diretório de uploads se não existir
const uploadDir = "uploads/certificates";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer para processar o arquivo em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limite de 5MB
  },
  fileFilter: function (req, file, cb) {
    console.log("Arquivo recebido:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Aceitar tanto .pfx quanto .p12
    if (
      file.mimetype === "application/x-pkcs12" ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.toLowerCase().endsWith(".pfx") ||
      file.originalname.toLowerCase().endsWith(".p12")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos PFX/P12 são permitidos!"), false);
    }
  },
}).fields([
  { name: "certificado", maxCount: 1 },
  { name: "certificate", maxCount: 1 },
]);

// Registrar as rotas de certificados primeiro
router.use("/certificados", certificadosRouter);

// Listar todos os certificados
certificadosRouter.get("/", async (req, res) => {
  try {
    console.log("Iniciando busca de certificados...");
    const certificados = await Certificado.find(
      {},
      "-certificadoBase64 -senha"
    );
    console.log(`Certificados encontrados: ${certificados.length}`);
    res.json(certificados);
  } catch (error) {
    console.error("Erro detalhado ao listar certificados:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      message: "Erro ao listar certificados",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Cadastrar novo certificado
certificadosRouter.post("/", async (req, res) => {
  try {
    const { empresa, cnpj, ufAutor, certificadoBase64, senha, dataValidade } =
      req.body;

    const certificado = new Certificado({
      empresa,
      cnpj,
      ufAutor,
      certificadoBase64,
      senha,
      dataValidade: new Date(dataValidade),
    });

    await certificado.save();
    res.status(201).json(certificado);
  } catch (error) {
    console.error("Erro ao cadastrar certificado:", error);
    res.status(500).json({ message: error.message });
  }
});

// Obter certificado específico
certificadosRouter.get("/:id", async (req, res) => {
  try {
    const certificado = await Certificado.findById(
      req.params.id,
      "-certificadoBase64 -senha"
    );
    if (!certificado) {
      return res.status(404).json({ message: "Certificado não encontrado" });
    }
    res.json(certificado);
  } catch (error) {
    console.error("Erro ao buscar certificado:", error);
    res.status(500).json({ message: error.message });
  }
});

// Atualizar certificado
certificadosRouter.put("/:id", async (req, res) => {
  try {
    const { nome, cnpj, ufAutor, ativo, observacoes } = req.body;
    const certificado = await Certificado.findById(req.params.id);

    if (!certificado) {
      return res.status(404).json({ message: "Certificado não encontrado" });
    }

    if (nome) certificado.nome = nome;
    if (cnpj) certificado.cnpj = cnpj;
    if (ufAutor) certificado.ufAutor = ufAutor;
    if (typeof ativo === "boolean") certificado.ativo = ativo;
    if (observacoes !== undefined) certificado.observacoes = observacoes;

    await certificado.save();

    const certificadoResponse = certificado.toObject();
    delete certificadoResponse.certificadoBase64;
    delete certificadoResponse.senha;

    res.json(certificadoResponse);
  } catch (error) {
    console.error("Erro ao atualizar certificado:", error);
    res.status(500).json({ message: error.message });
  }
});

// Excluir certificado
certificadosRouter.delete("/:id", async (req, res) => {
  try {
    const certificado = await Certificado.findByIdAndDelete(req.params.id);
    if (!certificado) {
      return res.status(404).json({ message: "Certificado não encontrado" });
    }
    res.json({ message: "Certificado excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir certificado:", error);
    res.status(500).json({ message: error.message });
  }
});

// Importar certificado PFX
certificadosRouter.post("/importar-pfx", async (req, res) => {
  try {
    const { filePath, senha } = req.body;
    const certificado = await importarCertificadoPFX(filePath, senha);
    res.status(201).json(certificado);
  } catch (error) {
    console.error("Erro ao importar certificado PFX:", error);
    res.status(500).json({ message: error.message });
  }
});

// Consultar status do NSU de um certificado
router.get("/status-nsu/:certificadoId", consultarStatusNSU);

// Consultar notas fiscais recentes
router.get("/consultar-notas/:certificadoId", async (req, res) => {
  try {
    const { certificadoId } = req.params;
    console.log("Iniciando consulta de notas para certificado:", certificadoId);

    if (!mongoose.Types.ObjectId.isValid(certificadoId)) {
      console.error("ID de certificado inválido:", certificadoId);
      return res.status(400).json({
        message: "ID de certificado inválido",
        details: "O ID fornecido não é um ObjectId válido do MongoDB",
      });
    }

    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      console.error("Certificado não encontrado:", certificadoId);
      return res.status(404).json({
        message: "Certificado não encontrado",
        details: "Não foi encontrado um certificado com o ID fornecido",
      });
    }

    if (!certificado.ativo) {
      console.error("Certificado inativo:", certificadoId);
      return res.status(400).json({
        message: "Certificado está inativo",
        details: "O certificado existe mas está marcado como inativo",
      });
    }

    if (new Date() > certificado.dataValidade) {
      console.error("Certificado expirado:", certificadoId);
      return res.status(400).json({
        message: "Certificado expirado",
        details: `Data de validade: ${certificado.dataValidade}`,
      });
    }

    console.log("Certificado válido, iniciando consulta de notas...");
    // buscarNotasRecentes já envia a resposta, então não precisamos retornar nada
    await buscarNotasRecentes(req, res);
    console.log("Consulta de notas concluída com sucesso");
  } catch (error) {
    console.error("Erro detalhado ao consultar notas fiscais:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      message: "Erro ao consultar notas fiscais",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Listar todas as notas fiscais
router.get("/", async (req, res) => {
  try {
    const nfes = await NFe.find().sort({ dataEmissao: -1 });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

// ===== ROTAS PARA NFE RECENTES =====

// Rota principal para buscar NFe recentes
router.get("/recentes", async (req, res) => {
  try {
    console.log("=== DEBUG: Iniciando rota /recentes ===");

    const { certificadoId, status, limit = 100, page = 1 } = req.query;

    console.log("Parâmetros recebidos:", {
      certificadoId,
      status,
      limit,
      page,
    });

    // Construir query de filtros
    let query = {};

    if (certificadoId) {
      query.certificadoId = certificadoId;
      console.log("Filtro por certificadoId adicionado:", certificadoId);
    }

    if (status) {
      query.status = status;
      console.log("Filtro por status adicionado:", status);
    }

    console.log("Query final construída:", JSON.stringify(query, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log("Skip calculado:", skip, "Limit:", parseInt(limit));

    // Verificar se o modelo NFeRecentes está disponível
    console.log("Modelo NFeRecentes disponível:", !!NFeRecentes);
    console.log("Tentando executar consulta no banco...");

    // Verificar total de documentos na coleção (sem filtros)
    const totalGeral = await NFeRecentes.countDocuments({});
    console.log(
      "Total geral de documentos na coleção NFeRecentes:",
      totalGeral
    );

    // Executar consulta
    const nfesRecentes = await NFeRecentes.find(query)
      .sort({ dataConsulta: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("certificadoId", "empresa cnpj ufAutor");

    console.log("Consulta executada com sucesso");
    console.log("Número de NFe recentes encontradas:", nfesRecentes.length);

    const total = await NFeRecentes.countDocuments(query);
    console.log("Total de documentos no banco:", total);

    // Log detalhado dos dados encontrados
    if (nfesRecentes.length > 0) {
      console.log("Primeira NFe encontrada:", {
        _id: nfesRecentes[0]._id,
        chaveAcesso: nfesRecentes[0].chaveAcesso,
        nsu: nfesRecentes[0].nsu,
        status: nfesRecentes[0].status,
        dataConsulta: nfesRecentes[0].dataConsulta,
      });
    } else {
      console.log("Nenhuma NFe recente encontrada no banco");
    }

    const response = {
      success: true,
      data: {
        nfes: nfesRecentes,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };

    console.log("Resposta preparada:", {
      success: response.success,
      totalNfes: response.data.nfes.length,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
    });

    console.log("=== DEBUG: Finalizando rota /recentes ===");
    res.json(response);
  } catch (error) {
    console.error("=== ERRO na rota /recentes ===");
    console.error("Erro detalhado:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      success: false,
      message: "Erro ao buscar NFe recentes",
      error: error.message,
    });
  }
});

// Buscar uma nota fiscal específica
router.get("/:id", async (req, res) => {
  try {
    const nfe = await NFe.findById(req.params.id);
    if (!nfe) {
      return res.status(404).json({ message: "Nota fiscal não encontrada" });
    }
    res.json(nfe);
  } catch (error) {
    console.error("Erro ao buscar nota fiscal:", error);
    res.status(500).json({ message: "Erro ao buscar nota fiscal" });
  }
});

// Criar uma nova nota fiscal
router.post("/", async (req, res) => {
  try {
    // Verificar se já existe uma nota fiscal com a mesma chave de acesso
    const existingNFe = await NFe.findOne({
      chaveAcesso: req.body.chaveAcesso,
    });
    if (existingNFe) {
      return res.status(400).json({
        message: "Já existe uma nota fiscal com esta chave de acesso",
      });
    }

    const nfe = new NFe(req.body);
    const savedNFe = await nfe.save();
    res.status(201).json(savedNFe);
  } catch (error) {
    console.error("Erro ao criar nota fiscal:", error);
    res.status(500).json({ message: "Erro ao criar nota fiscal" });
  }
});

// Atualizar uma nota fiscal
router.put("/:id", async (req, res) => {
  try {
    const nfe = await NFe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!nfe) {
      return res.status(404).json({ message: "Nota fiscal não encontrada" });
    }
    res.json(nfe);
  } catch (error) {
    console.error("Erro ao atualizar nota fiscal:", error);
    res.status(500).json({ message: "Erro ao atualizar nota fiscal" });
  }
});

// Excluir uma nota fiscal
router.delete("/:id", async (req, res) => {
  try {
    const nfe = await NFe.findByIdAndDelete(req.params.id);
    if (!nfe) {
      return res.status(404).json({ message: "Nota fiscal não encontrada" });
    }
    res.json({ message: "Nota fiscal excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir nota fiscal:", error);
    res.status(500).json({ message: "Erro ao excluir nota fiscal" });
  }
});

// Buscar notas fiscais por status
router.get("/status/:status", async (req, res) => {
  try {
    const nfes = await NFe.find({ status: req.params.status }).sort({
      dataEmissao: -1,
    });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais por status:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

// Buscar notas fiscais por CNPJ do emissor
router.get("/emissor/:cnpj", async (req, res) => {
  try {
    const nfes = await NFe.find({ "issuer.cnpj": req.params.cnpj }).sort({
      dataEmissao: -1,
    });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais do emissor:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

// Buscar notas fiscais por CNPJ do destinatário
router.get("/destinatario/:cnpj", async (req, res) => {
  try {
    const nfes = await NFe.find({ "recipient.cnpj": req.params.cnpj }).sort({
      dataEmissao: -1,
    });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais do destinatário:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

export default router;
