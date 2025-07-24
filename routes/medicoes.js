import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import Medicao from "../models/Medicao.js";
import Obra from "../models/Obra.js";

const router = express.Router();

// Configuração do multer para upload de mídias (imagens e vídeos)
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/medicoes/media";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Configuração do multer para upload de anexos
const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/medicoes/attachments";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Upload de mídias (imagens e vídeos)
const uploadMedia = multer({
  storage: mediaStorage,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB para vídeos
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de imagem e vídeo são permitidos"));
    }
  },
});

// Upload de anexos (documentos, PDFs, etc.)
const uploadAttachments = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para anexos
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Apenas arquivos PDF e documentos são permitidos"));
    }
  },
});

// Upload misto (mídias + anexos)
const uploadMixed = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const isMedia = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/.test(
        file.mimetype
      );
      const uploadDir = isMedia
        ? "public/uploads/medicoes/media"
        : "public/uploads/medicoes/attachments";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB para vídeos
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes =
      /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Apenas arquivos de mídia (imagens/vídeos), PDF e documentos são permitidos"
        )
      );
    }
  },
});

// GET /api/medicoes - Listar todas as medições
router.get("/", async (req, res) => {
  try {
    const {
      obraId,
      status,
      responsavel,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (obraId) {
      filter.obraId = obraId;
    }

    if (status) {
      filter.status = status;
    }

    if (responsavel) {
      filter.responsavel = { $regex: responsavel, $options: "i" };
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const medicoes = await Medicao.find(filter)
      .populate("obraId", "nome codigo")
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
    console.error("Erro ao listar medições:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/:id - Obter uma medição específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo cliente responsavelObra")
      .populate("createdBy", "nome email")
      .populate("updatedBy", "nome email");

    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    res.json(medicao);
  } catch (error) {
    console.error("Erro ao buscar medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/medicoes - Criar uma nova medição
router.post("/", uploadMixed.array("files", 20), async (req, res) => {
  try {
    const { obraId, date, responsavel, groups, comments, createdBy } = req.body;

    if (!obraId || !responsavel) {
      return res.status(400).json({
        message: "obraId e responsavel são obrigatórios",
      });
    }

    // Verificar se a obra existe
    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Separar mídias de anexos
    const media = [];
    const attachments = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const isMedia = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/.test(
          file.mimetype
        );
        const fileData = {
          name: file.originalname,
          url: isMedia
            ? `/api/uploads/medicoes/media/${file.filename}`
            : `/api/uploads/medicoes/attachments/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        };

        if (isMedia) {
          media.push(fileData);
        } else {
          attachments.push(fileData);
        }
      });
    }

    // Verificar se há pelo menos uma mídia
    if (media.length === 0) {
      return res.status(400).json({
        message:
          "É obrigatório enviar pelo menos uma mídia (imagem ou vídeo) da medição",
      });
    }

    // Criar nova medição
    const medicao = new Medicao({
      obraId,
      date: date ? new Date(date) : new Date(),
      responsavel,
      groups: JSON.parse(groups || "[]"),
      comments,
      media,
      attachments,
      createdBy,
    });

    // Calcular totais
    medicao.calculateTotalMedido();
    medicao.calculateProgress();

    await medicao.save();

    // Adicionar a medição à obra
    obra.medicoes.push(medicao._id);
    await obra.save();

    const populatedMedicao = await Medicao.findById(medicao._id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email");

    res.status(201).json(populatedMedicao);
  } catch (error) {
    console.error("Erro ao criar medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/obras/:obraId/medicoes - Criar medição para uma obra específica
router.post(
  "/obras/:obraId/medicoes",
  uploadMixed.array("files", 20),
  async (req, res) => {
    try {
      const { obraId } = req.params;
      const { date, responsavel, groups, comments, createdBy } = req.body;

      // Validação inicial
      if (!obraId || !responsavel || !groups) {
        return res.status(400).json({
          message: "Os campos obraId, responsavel e groups são obrigatórios.",
        });
      }

      const obra = await Obra.findById(obraId);
      if (!obra) {
        return res.status(404).json({ message: "Obra não encontrada" });
      }

      // 1. Parse dos dados JSON
      let parsedGroups = JSON.parse(groups);

      // 2. Mapeamento dos arquivos físicos enviados por mediaId
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message:
            "É obrigatório enviar pelo menos uma mídia (imagem ou vídeo) da medição.",
        });
      }

      // Crie um mapa de arquivos por mediaId
      const fileByMediaId = {};
      req.files.forEach((file) => {
        // Espera que o campo seja 'media-item-<mediaId>'
        const match = file.fieldname.match(/^media-item-(.+)$/);
        if (match) {
          const mediaId = match[1];
          fileByMediaId[mediaId] = {
            name: file.originalname,
            url: `/uploads/medicoes/media/${file.filename}`,
            type: file.mimetype,
            size: file.size,
          };
        }
      });

      // Atualiza os objetos de mídia dos itens usando o mediaId
      parsedGroups.forEach((group) => {
        if (group.items) {
          group.items.forEach((item) => {
            // Suporte tanto para item.images quanto item.media
            const medias = item.media || item.images;
            if (medias && medias.length > 0) {
              medias.forEach((mediaObj) => {
                if (mediaObj.mediaId && fileByMediaId[mediaObj.mediaId]) {
                  mediaObj.url = fileByMediaId[mediaObj.mediaId].url;
                  mediaObj.type = fileByMediaId[mediaObj.mediaId].type;
                  mediaObj.size = fileByMediaId[mediaObj.mediaId].size;
                  mediaObj.name = fileByMediaId[mediaObj.mediaId].name;
                }
              });
              // Se veio em item.images, copia para item.media
              if (!item.media && item.images) {
                item.media = item.images;
              }
            }
          });
        }
      });

      // 3. Criação do documento Medicao com os dados consistentes
      const medicao = new Medicao({
        obraId,
        date: date ? new Date(date) : new Date(),
        responsavel,
        groups: parsedGroups,
        comments,
        // Define a mídia principal da medição como a primeira encontrada
        media:
          Object.values(fileByMediaId).length > 0
            ? [Object.values(fileByMediaId)[0]]
            : [],
        createdBy,
      });

      // 4. Execução dos métodos e salvamento
      medicao.calculateTotalMedido();
      medicao.calculateProgress();

      await medicao.save();

      obra.medicoes.push(medicao._id);
      await obra.save();

      const populatedMedicao = await Medicao.findById(medicao._id)
        .populate("obraId", "nome codigo")
        .populate("createdBy", "nome email");

      res.status(201).json(populatedMedicao);
    } catch (error) {
      // Log detalhado do erro
      console.error("[ERRO] Falha ao criar medição:");
      console.error("Mensagem:", error.message);
      if (error.stack) {
        console.error("Stack:", error.stack);
      }
      if (error.errors) {
        // Erros de validação do Mongoose
        Object.keys(error.errors).forEach((key) => {
          console.error(
            `[Mongoose] Campo: ${key} - ${error.errors[key].message}`
          );
        });
      }
      if (error.body) {
        console.error("Body recebido:", error.body);
      }
      if (req && req.body) {
        console.error("Body da requisição:", req.body);
      }
      if (req && req.files) {
        console.error("Arquivos recebidos:", req.files);
      }
      // Log extra para debug do payload
      try {
        console.error("parsedGroups:", JSON.stringify(parsedGroups, null, 2));
        console.error("fileByMediaId:", JSON.stringify(fileByMediaId, null, 2));
      } catch (e) {
        console.error("Erro ao logar parsedGroups/fileByMediaId:", e);
      }
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/obras/:obraId/medicoes - Listar medições de uma obra específica
router.get("/obras/:obraId/medicoes", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(obraId)) {
      return res.status(400).json({ message: "ID da obra inválido" });
    }

    const filter = { obraId };
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
    console.error("Erro ao listar medições da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/medicoes/:id - Atualizar uma medição
router.put("/:id", uploadMixed.array("attachments", 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { date, responsavel, groups, comments, status, updatedBy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Processar novos anexos
    const newAttachments = req.files
      ? req.files.map((file) => ({
          name: file.originalname,
          url: `/api/uploads/medicoes/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        }))
      : [];

    // Atualizar campos
    if (date) medicao.date = new Date(date);
    if (responsavel) medicao.responsavel = responsavel;
    if (groups) medicao.groups = JSON.parse(groups);
    if (comments !== undefined) medicao.comments = comments;
    if (status) medicao.status = status;
    if (updatedBy) medicao.updatedBy = updatedBy;

    // Adicionar novos anexos
    if (newAttachments.length > 0) {
      medicao.attachments.push(...newAttachments);
    }

    // Recalcular totais
    medicao.calculateTotalMedido();
    medicao.calculateProgress();

    await medicao.save();

    const updatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email")
      .populate("updatedBy", "nome email");

    res.json(updatedMedicao);
  } catch (error) {
    console.error("Erro ao atualizar medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/obras/:obraId/medicoes/:medicaoId - Atualizar uma medição específica de uma obra
router.put(
  "/obras/:obraId/medicoes/:medicaoId",
  uploadMixed.array("attachments", 10),
  async (req, res) => {
    try {
      const { obraId, medicaoId } = req.params;
      const { date, responsavel, groups, comments, status, updatedBy } =
        req.body;

      if (
        !mongoose.Types.ObjectId.isValid(obraId) ||
        !mongoose.Types.ObjectId.isValid(medicaoId)
      ) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const medicao = await Medicao.findOne({ _id: medicaoId, obraId });
      if (!medicao) {
        return res
          .status(404)
          .json({ message: "Medição não encontrada para esta obra" });
      }

      // Processar novos anexos
      const newAttachments = req.files
        ? req.files.map((file) => ({
            name: file.originalname,
            url: `/api/uploads/medicoes/${file.filename}`,
            type: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
          }))
        : [];

      // Atualizar campos
      if (date) medicao.date = new Date(date);
      if (responsavel) medicao.responsavel = responsavel;
      if (groups) medicao.groups = JSON.parse(groups);
      if (comments !== undefined) medicao.comments = comments;
      if (status) medicao.status = status;
      if (updatedBy) medicao.updatedBy = updatedBy;

      // Adicionar novos anexos
      if (newAttachments.length > 0) {
        medicao.attachments.push(...newAttachments);
      }

      // Recalcular totais
      medicao.calculateTotalMedido();
      medicao.calculateProgress();

      await medicao.save();

      const updatedMedicao = await Medicao.findById(medicaoId)
        .populate("obraId", "nome codigo")
        .populate("createdBy", "nome email")
        .populate("updatedBy", "nome email");

      res.json(updatedMedicao);
    } catch (error) {
      console.error("Erro ao atualizar medição:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// DELETE /api/medicoes/:id - Excluir uma medição
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Remover da obra
    await Obra.findByIdAndUpdate(medicao.obraId, {
      $pull: { medicoes: id },
    });

    // Excluir anexos
    if (medicao.attachments && medicao.attachments.length > 0) {
      medicao.attachments.forEach((attachment) => {
        const filePath = path.join(
          "public",
          attachment.url.replace("/api/uploads/", "uploads/")
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await Medicao.findByIdAndDelete(id);

    res.json({ message: "Medição excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/medicoes/:id/items/:groupId/:itemId/measurement - Adicionar medição a um item
router.post(
  "/:id/items/:groupId/:itemId/measurement",
  uploadMixed.array("attachments", 5),
  async (req, res) => {
    try {
      const { id, groupId, itemId } = req.params;
      const { quantity, value, percentage, status, comments, responsavel } =
        req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const medicao = await Medicao.findById(id);
      if (!medicao) {
        return res.status(404).json({ message: "Medição não encontrada" });
      }

      // Processar anexos
      const attachments = req.files
        ? req.files.map((file) => ({
            name: file.originalname,
            url: `/api/uploads/medicoes/${file.filename}`,
            type: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
          }))
        : [];

      // Adicionar medição ao item
      medicao.addItemMeasurement(groupId, itemId, {
        quantity: parseFloat(quantity) || 0,
        value: parseFloat(value) || 0,
        percentage: parseFloat(percentage) || 0,
        status: status || "Em revisão",
        comments,
        responsavel: responsavel || medicao.responsavel,
        attachments,
      });

      await medicao.save();

      const updatedMedicao = await Medicao.findById(id)
        .populate("obraId", "nome codigo")
        .populate("createdBy", "nome email");

      res.json(updatedMedicao);
    } catch (error) {
      console.error("Erro ao adicionar medição ao item:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/medicoes/:id/stages/:groupId/fill - Preencher etapa por porcentagem
router.post("/:id/stages/:groupId/fill", async (req, res) => {
  try {
    const { id, groupId } = req.params;
    const { percentage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (!percentage || percentage < 0 || percentage > 100) {
      return res
        .status(400)
        .json({ message: "Porcentagem deve estar entre 0 e 100" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Preencher etapa por porcentagem
    medicao.fillStageByPercentage(groupId, parseFloat(percentage));

    await medicao.save();

    const updatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email");

    res.json(updatedMedicao);
  } catch (error) {
    console.error("Erro ao preencher etapa:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/:id/report - Gerar relatório da medição
router.get("/:id/report", async (req, res) => {
  try {
    const { id } = req.params;
    const { format = "json" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo cliente responsavelObra")
      .populate("createdBy", "nome email");

    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    if (format === "pdf") {
      // TODO: Implementar geração de PDF
      res.json({ message: "Geração de PDF será implementada em breve" });
    } else {
      // Retornar dados para relatório
      const report = {
        medicao: {
          id: medicao._id,
          date: medicao.date,
          responsavel: medicao.responsavel,
          totalMedido: medicao.totalMedido,
          progressoGeral: medicao.progressoGeral,
          status: medicao.status,
          comments: medicao.comments,
        },
        obra: {
          nome: medicao.obraId.nome,
          codigo: medicao.obraId.codigo,
          cliente: medicao.obraId.cliente,
          responsavelObra: medicao.obraId.responsavelObra,
        },
        groups: medicao.groups,
        summary: {
          totalGroups: medicao.groups.length,
          totalItems: medicao.groups.reduce(
            (acc, group) => acc + group.items.length,
            0
          ),
          totalPlannedValue: medicao.groups.reduce(
            (acc, group) =>
              acc +
              group.items.reduce(
                (groupAcc, item) =>
                  groupAcc + item.plannedQuantity * item.value,
                0
              ),
            0
          ),
          totalExecutedValue: medicao.totalMedido,
          remainingValue: medicao.groups.reduce(
            (acc, group) =>
              acc +
              group.items.reduce(
                (groupAcc, item) =>
                  groupAcc +
                  (item.plannedQuantity * item.value - item.executedValue),
                0
              ),
            0
          ),
        },
        generatedAt: new Date(),
      };

      res.json(report);
    }
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/obra/:obraId - Listar medições de uma obra específica
router.get("/obra/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(obraId)) {
      return res.status(400).json({ message: "ID da obra inválido" });
    }

    const filter = { obraId };
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
    console.error("Erro ao listar medições da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/statistics - Estatísticas das medições
router.get("/statistics/overview", async (req, res) => {
  try {
    const { obraId, startDate, endDate } = req.query;

    const filter = {};
    if (obraId) filter.obraId = obraId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [
      totalMedicoes,
      medicoesAprovadas,
      medicoesEmRevisao,
      medicoesPendentes,
      totalValorMedido,
      progressoMedio,
    ] = await Promise.all([
      Medicao.countDocuments(filter),
      Medicao.countDocuments({ ...filter, status: "Aprovado" }),
      Medicao.countDocuments({ ...filter, status: "Em revisão" }),
      Medicao.countDocuments({ ...filter, status: "Pendente" }),
      Medicao.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$totalMedido" } } },
      ]),
      Medicao.aggregate([
        { $match: filter },
        { $group: { _id: null, avg: { $avg: "$progressoGeral" } } },
      ]),
    ]);

    const statistics = {
      totalMedicoes,
      statusBreakdown: {
        aprovadas: medicoesAprovadas,
        emRevisao: medicoesEmRevisao,
        pendentes: medicoesPendentes,
      },
      totalValorMedido: totalValorMedido[0]?.total || 0,
      progressoMedio: progressoMedio[0]?.avg || 0,
      periodo: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    res.json(statistics);
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/media/all - Buscar todas as mídias de todas as medições
router.get("/media/all", async (req, res) => {
  try {
    const { obraId, page = 1, limit = 20, startDate, endDate } = req.query;

    const filter = {};
    if (obraId) filter.obraId = obraId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const medicoes = await Medicao.find(filter)
      .populate("obraId", "nome codigo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const allMedia = [];
    medicoes.forEach((medicao) => {
      // Mídias da medição
      if (medicao.media && medicao.media.length > 0) {
        medicao.media.forEach((media) => {
          allMedia.push({
            ...media.toObject(),
            medicaoId: medicao._id,
            medicaoDate: medicao.date,
            responsavel: medicao.responsavel,
            obraNome: medicao.obraId.nome,
            obraCodigo: medicao.obraId.codigo,
            source: "medicao",
            sourceType: "medicao",
          });
        });
      }

      // Mídias dos itens
      if (medicao.groups && medicao.groups.length > 0) {
        medicao.groups.forEach((group) => {
          if (group.items && group.items.length > 0) {
            group.items.forEach((item) => {
              if (item.media && item.media.length > 0) {
                item.media.forEach((media) => {
                  allMedia.push({
                    ...media.toObject(),
                    medicaoId: medicao._id,
                    medicaoDate: medicao.date,
                    responsavel: medicao.responsavel,
                    obraNome: medicao.obraId.nome,
                    obraCodigo: medicao.obraId.codigo,
                    source: "item",
                    sourceType: "item",
                    itemDescription: item.description,
                    groupTitle: group.title,
                  });
                });
              }
            });
          }
        });
      }
    });

    const total = await Medicao.countDocuments(filter);

    res.json({
      media: allMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar mídias:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/:id/media - Buscar todas as mídias de uma medição específica
router.get("/:id/media", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id).populate(
      "obraId",
      "nome codigo"
    );

    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    const allMedia = medicao.getAllMedia();

    res.json({
      medicaoId: medicao._id,
      medicaoDate: medicao.date,
      responsavel: medicao.responsavel,
      obraNome: medicao.obraId.nome,
      obraCodigo: medicao.obraId.codigo,
      media: allMedia,
      totalMedia: allMedia.length,
    });
  } catch (error) {
    console.error("Erro ao buscar mídias da medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/media/obra/:obraId - Buscar todas as mídias de uma obra
router.get("/media/obra/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(obraId)) {
      return res.status(400).json({ message: "ID da obra inválido" });
    }

    const filter = { obraId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const medicoes = await Medicao.find(filter)
      .populate("obraId", "nome codigo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const allMedia = [];
    medicoes.forEach((medicao) => {
      // Mídias da medição
      if (medicao.media && medicao.media.length > 0) {
        medicao.media.forEach((media) => {
          allMedia.push({
            ...media.toObject(),
            medicaoId: medicao._id,
            medicaoDate: medicao.date,
            responsavel: medicao.responsavel,
            source: "medicao",
            sourceType: "medicao",
          });
        });
      }

      // Mídias dos itens
      if (medicao.groups && medicao.groups.length > 0) {
        medicao.groups.forEach((group) => {
          if (group.items && group.items.length > 0) {
            group.items.forEach((item) => {
              if (item.media && item.media.length > 0) {
                item.media.forEach((media) => {
                  allMedia.push({
                    ...media.toObject(),
                    medicaoId: medicao._id,
                    medicaoDate: medicao.date,
                    responsavel: medicao.responsavel,
                    source: "item",
                    sourceType: "item",
                    itemDescription: item.description,
                    groupTitle: group.title,
                  });
                });
              }
            });
          }
        });
      }
    });

    const total = await Medicao.countDocuments(filter);

    res.json({
      obraId,
      obraNome: medicoes[0]?.obraId?.nome || "Obra não encontrada",
      obraCodigo: medicoes[0]?.obraId?.codigo || "",
      media: allMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar mídias da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/medicoes/:id/media - Adicionar mídias a uma medição
router.post("/:id/media", uploadMedia.array("media", 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, isMain } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Nenhuma mídia foi enviada" });
    }

    // Processar mídias
    req.files.forEach((file, index) => {
      const mediaData = {
        name: file.originalname,
        url: `/api/uploads/medicoes/media/${file.filename}`,
        type: file.mimetype,
        size: file.size,
        description: description || `Mídia ${index + 1} da medição`,
        isMain: isMain === "true" && index === 0, // Apenas a primeira mídia pode ser principal
      };

      medicao.addMedia(mediaData);
    });

    await medicao.save();

    const updatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email");

    res.json(updatedMedicao);
  } catch (error) {
    console.error("Erro ao adicionar mídias:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/medicoes/:id/items/:groupId/:itemId/media - Adicionar mídias a um item
router.post(
  "/:id/items/:groupId/:itemId/media",
  uploadMedia.array("media", 5),
  async (req, res) => {
    try {
      const { id, groupId, itemId } = req.params;
      const { description, isMain } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const medicao = await Medicao.findById(id);
      if (!medicao) {
        return res.status(404).json({ message: "Medição não encontrada" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "Nenhuma mídia foi enviada" });
      }

      // Processar mídias
      req.files.forEach((file, index) => {
        const mediaData = {
          name: file.originalname,
          url: `/api/uploads/medicoes/media/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          description: description || `Mídia ${index + 1} do item`,
          isMain: isMain === "true" && index === 0, // Apenas a primeira mídia pode ser principal
        };

        medicao.addItemMedia(groupId, itemId, mediaData);
      });

      await medicao.save();

      const updatedMedicao = await Medicao.findById(id)
        .populate("obraId", "nome codigo")
        .populate("createdBy", "nome email");

      res.json(updatedMedicao);
    } catch (error) {
      console.error("Erro ao adicionar mídias ao item:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/medicoes/:id/media/:mediaId/main - Definir mídia principal
router.put("/:id/media/:mediaId/main", async (req, res) => {
  try {
    const { id, mediaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    medicao.setMainMedia(mediaId);
    await medicao.save();

    const updatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email");

    res.json(updatedMedicao);
  } catch (error) {
    console.error("Erro ao definir mídia principal:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/medicoes/:id/media/:mediaId - Excluir mídia
router.delete("/:id/media/:mediaId", async (req, res) => {
  try {
    const { id, mediaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Verificar se é a última mídia
    if (medicao.media.length <= 1) {
      return res.status(400).json({
        message: "Não é possível excluir a última mídia da medição",
      });
    }

    // Encontrar e remover a mídia
    const mediaIndex = medicao.media.findIndex(
      (media) => media._id.toString() === mediaId
    );
    if (mediaIndex === -1) {
      return res.status(404).json({ message: "Mídia não encontrada" });
    }

    const media = medicao.media[mediaIndex];

    // Excluir arquivo físico
    const filePath = path.join(
      "public",
      media.url.replace("/api/uploads/", "uploads/")
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remover da array
    medicao.media.splice(mediaIndex, 1);

    // Se a mídia removida era principal, definir a primeira como principal
    if (media.isMain && medicao.media.length > 0) {
      medicao.media[0].isMain = true;
    }

    await medicao.save();

    const updatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email");

    res.json(updatedMedicao);
  } catch (error) {
    console.error("Erro ao excluir mídia:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
