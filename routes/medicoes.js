import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import Medicao from "../models/Medicao.js";
import Obra from "../models/Obra.js";

const router = express.Router();

// Configuração do multer para upload de imagens
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/medicoes/images";
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

// Upload de imagens (apenas imagens)
const uploadImages = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB para imagens
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de imagem são permitidos"));
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

// Upload misto (imagens + anexos)
const uploadMixed = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const isImage = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
      const uploadDir = isImage
        ? "public/uploads/medicoes/images"
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
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error("Apenas arquivos de imagem, PDF e documentos são permitidos")
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

    // Separar imagens de anexos
    const images = [];
    const attachments = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const isImage = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
        const fileData = {
          name: file.originalname,
          url: isImage
            ? `/api/uploads/medicoes/images/${file.filename}`
            : `/api/uploads/medicoes/attachments/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        };

        if (isImage) {
          images.push(fileData);
        } else {
          attachments.push(fileData);
        }
      });
    }

    // Verificar se há pelo menos uma imagem
    if (images.length === 0) {
      return res.status(400).json({
        message: "É obrigatório enviar pelo menos uma imagem da medição",
      });
    }

    // Criar nova medição
    const medicao = new Medicao({
      obraId,
      date: date ? new Date(date) : new Date(),
      responsavel,
      groups: JSON.parse(groups || "[]"),
      comments,
      images,
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

// GET /api/medicoes/images/all - Buscar todas as imagens de todas as medições
router.get("/images/all", async (req, res) => {
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

    const allImages = [];
    medicoes.forEach((medicao) => {
      // Imagens da medição
      if (medicao.images && medicao.images.length > 0) {
        medicao.images.forEach((img) => {
          allImages.push({
            ...img.toObject(),
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

      // Imagens dos itens
      if (medicao.groups && medicao.groups.length > 0) {
        medicao.groups.forEach((group) => {
          if (group.items && group.items.length > 0) {
            group.items.forEach((item) => {
              if (item.images && item.images.length > 0) {
                item.images.forEach((img) => {
                  allImages.push({
                    ...img.toObject(),
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
      images: allImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar imagens:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/:id/images - Buscar todas as imagens de uma medição específica
router.get("/:id/images", async (req, res) => {
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

    const allImages = medicao.getAllImages();

    res.json({
      medicaoId: medicao._id,
      medicaoDate: medicao.date,
      responsavel: medicao.responsavel,
      obraNome: medicao.obraId.nome,
      obraCodigo: medicao.obraId.codigo,
      images: allImages,
      totalImages: allImages.length,
    });
  } catch (error) {
    console.error("Erro ao buscar imagens da medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/medicoes/images/obra/:obraId - Buscar todas as imagens de uma obra
router.get("/images/obra/:obraId", async (req, res) => {
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

    const allImages = [];
    medicoes.forEach((medicao) => {
      // Imagens da medição
      if (medicao.images && medicao.images.length > 0) {
        medicao.images.forEach((img) => {
          allImages.push({
            ...img.toObject(),
            medicaoId: medicao._id,
            medicaoDate: medicao.date,
            responsavel: medicao.responsavel,
            source: "medicao",
            sourceType: "medicao",
          });
        });
      }

      // Imagens dos itens
      if (medicao.groups && medicao.groups.length > 0) {
        medicao.groups.forEach((group) => {
          if (group.items && group.items.length > 0) {
            group.items.forEach((item) => {
              if (item.images && item.images.length > 0) {
                item.images.forEach((img) => {
                  allImages.push({
                    ...img.toObject(),
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
      images: allImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar imagens da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/medicoes/:id/images - Adicionar imagens a uma medição
router.post(
  "/:id/images",
  uploadImages.array("images", 10),
  async (req, res) => {
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
        return res.status(400).json({ message: "Nenhuma imagem foi enviada" });
      }

      // Processar imagens
      req.files.forEach((file, index) => {
        const imageData = {
          name: file.originalname,
          url: `/api/uploads/medicoes/images/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          description: description || `Imagem ${index + 1} da medição`,
          isMain: isMain === "true" && index === 0, // Apenas a primeira imagem pode ser principal
        };

        medicao.addImage(imageData);
      });

      await medicao.save();

      const updatedMedicao = await Medicao.findById(id)
        .populate("obraId", "nome codigo")
        .populate("createdBy", "nome email");

      res.json(updatedMedicao);
    } catch (error) {
      console.error("Erro ao adicionar imagens:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/medicoes/:id/items/:groupId/:itemId/images - Adicionar imagens a um item
router.post(
  "/:id/items/:groupId/:itemId/images",
  uploadImages.array("images", 5),
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
        return res.status(400).json({ message: "Nenhuma imagem foi enviada" });
      }

      // Processar imagens
      req.files.forEach((file, index) => {
        const imageData = {
          name: file.originalname,
          url: `/api/uploads/medicoes/images/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          description: description || `Imagem ${index + 1} do item`,
          isMain: isMain === "true" && index === 0, // Apenas a primeira imagem pode ser principal
        };

        medicao.addItemImage(groupId, itemId, imageData);
      });

      await medicao.save();

      const updatedMedicao = await Medicao.findById(id)
        .populate("obraId", "nome codigo")
        .populate("createdBy", "nome email");

      res.json(updatedMedicao);
    } catch (error) {
      console.error("Erro ao adicionar imagens ao item:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/medicoes/:id/images/:imageId/main - Definir imagem principal
router.put("/:id/images/:imageId/main", async (req, res) => {
  try {
    const { id, imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    medicao.setMainImage(imageId);
    await medicao.save();

    const updatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email");

    res.json(updatedMedicao);
  } catch (error) {
    console.error("Erro ao definir imagem principal:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/medicoes/:id/images/:imageId - Excluir imagem
router.delete("/:id/images/:imageId", async (req, res) => {
  try {
    const { id, imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Verificar se é a última imagem
    if (medicao.images.length <= 1) {
      return res.status(400).json({
        message: "Não é possível excluir a última imagem da medição",
      });
    }

    // Encontrar e remover a imagem
    const imageIndex = medicao.images.findIndex(
      (img) => img._id.toString() === imageId
    );
    if (imageIndex === -1) {
      return res.status(404).json({ message: "Imagem não encontrada" });
    }

    const image = medicao.images[imageIndex];

    // Excluir arquivo físico
    const filePath = path.join(
      "public",
      image.url.replace("/api/uploads/", "uploads/")
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remover da array
    medicao.images.splice(imageIndex, 1);

    // Se a imagem removida era principal, definir a primeira como principal
    if (image.isMain && medicao.images.length > 0) {
      medicao.images[0].isMain = true;
    }

    await medicao.save();

    const updatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email");

    res.json(updatedMedicao);
  } catch (error) {
    console.error("Erro ao excluir imagem:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
