import express from "express";
import NFe from "../models/NFe.js";
import { consultarNotasRecentes } from "../controllers/nfeController.js";
import Certificado from "../models/Certificado.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import Cliente from "../models/Cliente.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

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

// Rota para cadastrar um novo certificado
router.post("/certificados", async (req, res) => {
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

// Rota para listar todos os certificados
router.get("/certificados", async (req, res) => {
  try {
    const certificados = await Certificado.find(
      {},
      "-certificadoBase64 -senha"
    );
    res.json(certificados);
  } catch (error) {
    console.error("Erro ao listar certificados:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter um certificado específico
router.get("/certificados/:id", async (req, res) => {
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

// Rota para atualizar um certificado
router.put("/certificados/:id", async (req, res) => {
  try {
    const { nome, cnpj, ufAutor, ativo, observacoes } = req.body;
    const certificado = await Certificado.findById(req.params.id);

    if (!certificado) {
      return res.status(404).json({ message: "Certificado não encontrado" });
    }

    // Atualizar apenas os campos permitidos
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

// Rota para excluir um certificado
router.delete("/certificados/:id", async (req, res) => {
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

// Rota para consultar notas fiscais recentes usando um certificado específico
router.get("/consultar-notas/:certificadoId", async (req, res) => {
  try {
    const { certificadoId } = req.params;

    // Verificar se o certificado existe
    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      return res.status(404).json({ message: "Certificado não encontrado" });
    }

    // Verificar se o certificado está ativo
    if (!certificado.ativo) {
      return res.status(400).json({ message: "Certificado está inativo" });
    }

    // Consultar notas fiscais recentes
    const resultado = await consultarNotasRecentes(certificadoId);

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao consultar notas fiscais:", error);
    res.status(500).json({
      message: "Erro ao consultar notas fiscais",
      error: error.message,
    });
  }
});

// Rota para importar certificado PFX
router.post("/importar-certificado", (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      // Erro do Multer
      console.error("Erro do Multer:", err);
      return res.status(400).json({
        message: `Erro no upload do arquivo: ${err.message}`,
      });
    } else if (err) {
      // Outro erro
      console.error("Erro no upload:", err);
      return res.status(400).json({
        message: err.message,
      });
    }

    try {
      console.log("Iniciando importação do certificado...");
      console.log("Body recebido:", {
        ...req.body,
        senha: req.body.senha ? "***" : undefined,
        password: req.body.password ? "***" : undefined,
      });
      console.log(
        "Arquivo recebido:",
        req.files?.certificado?.[0] || req.files?.certificate?.[0]
          ? {
              fieldname:
                req.files?.certificado?.[0] ||
                req.files?.certificate?.[0].fieldname,
              originalname:
                req.files?.certificado?.[0] ||
                req.files?.certificate?.[0].originalname,
              size:
                req.files?.certificado?.[0] || req.files?.certificate?.[0].size,
              mimetype:
                req.files?.certificado?.[0] ||
                req.files?.certificate?.[0].mimetype,
            }
          : "Nenhum arquivo recebido"
      );

      const certificadoFile =
        req.files?.certificado?.[0] || req.files?.certificate?.[0];
      const senha =
        req.body.senha || req.body.password || process.env.CERTIFICATE_PASSWORD;

      if (!certificadoFile) {
        return res.status(400).json({
          message: "Arquivo do certificado é obrigatório",
        });
      }

      if (!senha) {
        return res.status(400).json({
          message: "Senha do certificado é obrigatória",
        });
      }

      // Extrair CNPJ do nome do arquivo ou usar do .env
      const cnpj =
        process.env.CNPJ_EMPRESA ||
        certificadoFile.originalname.match(/\d{14}/)?.[0];
      if (!cnpj) {
        return res.status(400).json({
          message:
            "CNPJ não encontrado no nome do arquivo e não configurado no .env",
        });
      }

      console.log("Convertendo arquivo para base64...");
      // Converter o buffer do arquivo para base64
      const certificadoBase64 = certificadoFile.buffer.toString("base64");
      console.log(
        "Arquivo convertido para base64. Tamanho:",
        certificadoBase64.length
      );

      console.log("Criando novo certificado no banco de dados...");
      // Criar novo certificado no banco de dados
      const certificado = new Certificado({
        nome: certificadoFile.originalname.split(".")[0], // Nome do arquivo sem extensão
        cnpj,
        ufAutor: process.env.UF_AUTOR || "24", // UF padrão do .env ou 24
        certificadoBase64,
        senha,
        dataValidade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano de validade
        ativo: true,
        ultimoNSU: 0,
        maxNSU: 0,
      });

      console.log("Salvando certificado no banco de dados...");
      // Salvar no banco de dados
      await certificado.save();
      console.log("Certificado salvo com sucesso. ID:", certificado._id);

      // Retornar o certificado sem os dados sensíveis
      const certificadoResponse = certificado.toObject();
      delete certificadoResponse.certificadoBase64;
      delete certificadoResponse.senha;

      res.status(201).json(certificadoResponse);
    } catch (error) {
      console.error("Erro detalhado ao importar certificado:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Verificar se é um erro de validação do Mongoose
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Erro de validação",
          details: Object.values(error.errors).map((err) => err.message),
        });
      }

      res.status(500).json({
        message: error.message,
        details: error.stack,
      });
    }
  });
});

export default router;
