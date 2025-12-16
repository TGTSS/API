import express from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { uploadMedicao, deleteFile } from "../cloudinary.js";
import Medicao from "../models/Medicao.js";
import Obra from "../models/Obra.js";

const router = express.Router();

// Rota de teste para verificar se as rotas estão funcionando
router.get("/test", (req, res) => {
  res.json({ message: "Rotas de medições funcionando!", timestamp: new Date() });
});

router.get("/teste-cloudinary", (req, res) => {
  console.log("Testando Cloudinary em Medições");
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

router.post("/", uploadMedicao.any(), async (req, res) => {
  try {
    const { obraId, date, responsavel, groups, comments, createdBy } = req.body;

    if (!obraId || !responsavel) {
      return res.status(400).json({
        message: "obraId e responsavel são obrigatórios",
      });
    } // Verificar se a obra existe

    const obra = await Obra.findById(obraId);

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    } // Separar mídias de anexos

    const media = [];
    const attachments = [];

    // Processar arquivos enviados via multer-storage-cloudinary
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const fileData = {
          name: file.originalname,
          url: file.path,
          public_id: file.public_id,
          type: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        };

        if (file.fieldname === "media") {
          media.push(fileData);
        } else if (file.fieldname === "attachments") {
          attachments.push(fileData);
        }
      });
    }

    // Verificar se há pelo menos uma mídia
    if (media.length === 0) {
    }

    if (media.length === 0 && (!req.body.media || req.body.media.length === 0)) {
       return res.status(400).json({
        message:
          "É obrigatório enviar pelo menos uma mídia (imagem ou vídeo) da medição",
      });
    }

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
    console.error("Erro ao criar medição:", error);

    res.status(500).json({ message: error.message });
  }
});

// POST /api/obras/:obraId/medicoes - Criar medição para uma obra específica

router.post("/obras/:obraId/medicoes", async (req, res) => {
  try {
    const { obraId } = req.params;

    const { date, responsavel, groups, comments, createdBy } = req.body; 
    
    // LOG DETALHADO PARA DEBUG DE ARQUIVOS
    console.log("=== INÍCIO DO UPLOAD DE MEDIÇÃO ===");
    console.log("Obra ID:", obraId);
    console.log("Arquivos recebidos:", req.files ? req.files.length : 0);
    if (req.files) {
      req.files.forEach((f, i) => console.log(`Arquivo ${i}: field=${f.fieldname}, original=${f.originalname}, public_id=${f.public_id}`));
    }
    console.log("Groups recebido (raw):", groups ? groups.substring(0, 200) + "..." : "null");
    // FIM DO LOG

    // Validação inicial

    if (!obraId || !responsavel || !groups) {
      return res.status(400).json({
        message: "Os campos obraId, responsavel e groups são obrigatórios.",
      });
    }

    const obra = await Obra.findById(obraId);

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    } // 1. Parse dos dados JSON

    // 1. Processar groups (já vem com base64 se enviado como JSON)
    let parsedGroups = groups;
    if (typeof groups === 'string') {
        try {
            parsedGroups = JSON.parse(groups);
        } catch (e) {
            console.error("Erro ao fazer parse de groups:", e);
        }
    }

    if (parsedGroups) {
      parsedGroups.forEach((group) => {
      if (group.items) {
        group.items.forEach((item) => {
          // status do item
          if (item.status === "pending") item.status = "Aprovação";
          if (item.status === "Em Andamento") item.status = "Em andamento"; 

          // status do lastMeasurement
          if (item.lastMeasurement && item.lastMeasurement.status) {
            if (item.lastMeasurement.status === "Em Andamento")
              item.lastMeasurement.status = "Em andamento";
            if (item.lastMeasurement.status === "pending")
              item.lastMeasurement.status = "A iniciar";
          } 
          
          // status do history
          if (item.history && item.history.length > 0) {
            item.history.forEach((h) => {
              if (h.status === "Em Andamento") h.status = "Em andamento";
              if (h.status === "pending") h.status = "A iniciar";
            });
          }
          
           // Normalização de media/images
           if (!item.media && item.images) {
              item.media = item.images;
           }
        });
      }
    });
    } // 3. Criação do documento Medicao com os dados consistentes

    const medicao = new Medicao({
      obraId,

      date: date ? new Date(date) : new Date(),

      responsavel,

      groups: parsedGroups,

      comments, // Define a mídia principal da medição como a primeira encontrada

      media:
        Object.values(fileByMediaId).length > 0
          ? [Object.values(fileByMediaId)[0]]
          : [],

      createdBy,
    }); // 4. Execução dos métodos e salvamento

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
    } // Log extra para debug do payload

    try {
      if (typeof parsedGroups !== "undefined") {
        console.error("parsedGroups:", JSON.stringify(parsedGroups, null, 2));
      }

      if (typeof fileByMediaId !== "undefined") {
        console.error("fileByMediaId:", JSON.stringify(fileByMediaId, null, 2));
      }
    } catch (e) {
      console.error("Erro ao logar parsedGroups/fileByMediaId:", e);
    }

    res.status(500).json({ message: error.message });
  }
});

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

router.put("/:id", uploadMedicao.any(), async (req, res) => {
  try {
    const { id } = req.params;

    const { date, responsavel, groups, comments, status, updatedBy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const medicao = await Medicao.findById(id);

    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    } // Processar novos anexos

    // Processar novos anexos genéricos
    const newAttachments = req.files
      ? req.files
          .filter((file) => file.fieldname === "attachments" || !file.fieldname.startsWith("media-item-"))
          .map((file) => ({
            name: file.originalname,
            url: file.path,
            public_id: file.public_id,
            type: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
          }))
      : [];

    if (groups) {
      let parsedGroups = JSON.parse(groups);
      
      const fileByMediaId = {};

      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          const match = file.fieldname.match(/^media-item-(.+)$/);
          if (match) {
            const mediaId = match[1];
            fileByMediaId[mediaId] = {
              name: file.originalname,
              url: file.path,
              public_id: file.public_id,
              type: file.mimetype,
              size: file.size,
            };
          }
        });
      }

      parsedGroups.forEach((group) => {
        if (group.items) {
          group.items.forEach((item) => {
             // Padronização de status
             if (item.status === "pending") item.status = "Aprovação";
             if (item.status === "Em Andamento") item.status = "Em andamento";

            // Processamento de mídia
            const medias = item.media || item.images;
            if (medias && medias.length > 0) {
              medias.forEach((mediaObj) => {
                 console.log(`Processando media do item: mediaId=${mediaObj.mediaId}, temArquivo=${!!fileByMediaId[mediaObj.mediaId]}`);
                if (mediaObj.mediaId && fileByMediaId[mediaObj.mediaId]) {
                   // Atualiza com os dados do arquivo novo
                   Object.assign(mediaObj, fileByMediaId[mediaObj.mediaId]);
                }
              });
              if (!item.media && item.images) {
                item.media = item.images;
              }
            }
          });
        }
      });
      medicao.groups = parsedGroups;
    }

    if (comments !== undefined) medicao.comments = comments;

    if (status) medicao.status = status;

    if (updatedBy) medicao.updatedBy = updatedBy; // Adicionar novos anexos

    if (newAttachments.length > 0) {
      medicao.attachments.push(...newAttachments);
    } // Recalcular totais

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

      // LOG DETALHADO PARA DEBUG (PUT)
      console.log("=== INÍCIO DA ATUALIZAÇÃO DE MEDIÇÃO (BASE64) ===");
      console.log("Medição ID:", medicaoId);
      // FIM DO LOG

      const medicao = await Medicao.findOne({ _id: medicaoId, obraId });

      if (!medicao) {
        return res

          .status(404)

          .json({ message: "Medição não encontrada para esta obra" });
      } // Processar novos anexos

      if (date) medicao.date = new Date(date);

      if (responsavel) medicao.responsavel = responsavel;

    // Processar novos anexos genéricos
    const newAttachments = []; 

    if (groups) {
      let parsedGroups = groups;
      if (typeof groups === 'string') {
          try {
              parsedGroups = JSON.parse(groups);
          } catch(e) {
              console.error("Erro parsing groups PUT:", e);
          }
      }
      
      if(parsedGroups){
          parsedGroups.forEach((group) => {
            if (group.items) {
              group.items.forEach((item) => {
                 if (item.status === "pending") item.status = "Aprovação";
                 if (item.status === "Em Andamento") item.status = "Em andamento";
    
                 if (!item.media && item.images) {
                   item.media = item.images;
                 }
              });
            }
          });
          medicao.groups = parsedGroups;
      }
    }

      if (comments !== undefined) medicao.comments = comments;

      if (status) medicao.status = status;

      if (updatedBy) medicao.updatedBy = updatedBy; // Adicionar novos anexos

      if (newAttachments.length > 0) {
        medicao.attachments.push(...newAttachments);
      } // Recalcular totais

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
    } // Remover da obra

    await Obra.findByIdAndUpdate(medicao.obraId, {
      $pull: { medicoes: id },
    }); // Excluir anexos

    // Excluir anexos e mídias
    const builtFiles = [];
    if (medicao.attachments) builtFiles.push(...medicao.attachments);
    if (medicao.media) builtFiles.push(...medicao.media);

    for (const file of builtFiles) {
        if (file.public_id) {
            await deleteFile(file.public_id);
        } else if (file.url && file.url.includes("/api/uploads/")) {
             const filePath = path.join(
              "public",
              file.url.replace("/api/uploads/", "uploads/")
            );
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
        }
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

  uploadMedicao.any(),

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
      } // Processar anexos

      const attachments = req.files
        ? req.files.map((file) => ({
            name: file.originalname,

            url: file.path,

            public_id: file.public_id,

            type: file.mimetype,

            size: file.size,

            uploadedAt: new Date(),
          }))
        : []; // Adicionar medição ao item

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
    } // Preencher etapa por porcentagem

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
      } // Mídias dos itens

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
      } // Mídias dos itens

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

 router.post("/:id/media", uploadMedicao.any(), async (req, res) => {
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
     } // Processar mídias
 
     req.files.forEach((file, index) => {
       const mediaData = {
         name: file.originalname,
 
         url: file.path,

         public_id: file.filename,

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
 
   uploadMedicao.any(),
 
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
       } // Processar mídias
 
       req.files.forEach((file, index) => {
         const mediaData = {
           name: file.originalname,
 
           url: file.path,

           public_id: file.filename,

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

// DELETE /api/medicoes/:id/media/:mediaId - Excluir mídia (Geral ou de Item)
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

    let mediaFound = false;
    let mediaToDelete = null;

    // 1. Procurar na mídia principal da medição
    const mainMediaIndex = medicao.media.findIndex(
      (m) => m._id.toString() === mediaId
    );

    if (mainMediaIndex !== -1) {
      // Verificar se é a última mídia apenas se for da lista principal (regra de negócio pode variar)
      if (medicao.media.length <= 1) {
         return res.status(400).json({
          message: "Não é possível excluir a última mídia da medição",
        });
      }

      mediaToDelete = medicao.media[mainMediaIndex];
      medicao.media.splice(mainMediaIndex, 1);
      
      // Se a mídia removida era principal, definir a primeira como principal
      if (mediaToDelete.isMain && medicao.media.length > 0) {
        medicao.media[0].isMain = true;
      }
      mediaFound = true;
    }

    // 2. Se não encontrou na principal, procurar nos itens
    if (!mediaFound && medicao.groups) {
      for (const group of medicao.groups) {
        if (group.items) {
          for (const item of group.items) {
            if (item.media) {
              const itemMediaIndex = item.media.findIndex(
                (m) => m._id.toString() === mediaId
              );

              if (itemMediaIndex !== -1) {
                mediaToDelete = item.media[itemMediaIndex];
                item.media.splice(itemMediaIndex, 1);
                
                // Lógica de principal p/ item, se existir
                if (mediaToDelete.isMain && item.media.length > 0) {
                    item.media[0].isMain = true;
                }
                
                mediaFound = true;
                break; // Mídia encontrada e removida
              }
            }
          }
        }
        if (mediaFound) break;
      }
    }

    if (!mediaFound) {
      return res.status(404).json({ message: "Mídia não encontrada" });
    }

    // Excluir arquivo físico ou do Cloudinary
    if (mediaToDelete) {
        if (mediaToDelete.public_id) {
            try {
                await deleteFile(mediaToDelete.public_id);
            } catch (err) {
                console.error("Erro ao deletar do Cloudinary:", err);
            }
        } else if (mediaToDelete.url && mediaToDelete.url.includes("/api/uploads/")) {
            const filePath = path.join(
              "public",
              mediaToDelete.url.replace("/api/uploads/", "uploads/")
            );
        
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
        }
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

const handleSaveMedicao = async () => {
  try {
    setIsSaving(true); // Validação de campos obrigatórios

    if (!obraId) throw new Error("ID da obra não encontrado");

    if (!data || data.length === 0) throw new Error("Não há dados para salvar"); // Adiciona uuid em cada imagem antes de enviar

    const dataWithMediaIds = data.map((group) => ({
      ...group,

      items: group.items.map((item) => ({
        ...item,

        images: (item.images || []).map((img) => ({
          ...img,

          mediaId: img.mediaId || generateUUID(),
        })),
      })),
    })); // Validação dos campos dos grupos e itens

    for (const group of dataWithMediaIds) {
      if (!group.id || !group.title) {
        throw new Error("Grupo com id ou título ausente");
      }
      for (const item of group.items) {
        if (
          item.id == null ||
          item.description == null ||
          item.unit == null ||
          item.plannedQuantity == null ||
          item.value == null
        ) {
          throw new Error(
            `Item obrigatório ausente ou inválido: ${
              item.description || item.id
            }`
          );
        }
      }
    } // Validação do campo responsavel

    const responsavelValido =
      responsavel && responsavel !== "Não informado"
        ? responsavel
        : "Não especificado"; // Validação: exige pelo menos uma mídia nova (com file)

    let arquivosNovos = 0;

    let logImagens = [];

    dataWithMediaIds.forEach((group, gIdx) => {
      group.items.forEach((item, iIdx) => {
        (item.images || []).forEach((img, imgIdx) => {
          if (!img.mediaId) throw new Error("Imagem sem mediaId detectada");

          logImagens.push({
            groupIdx: gIdx,

            itemIdx: iIdx,

            imgIdx,

            mediaId: img.mediaId,

            hasFile: !!img.file,

            fileType: img.file ? img.file.type : null,

            fileName: img.file ? img.file.name : null,

            fileInstance: img.file instanceof File,
          });

          if (img.file && img.file instanceof File) {
            arquivosNovos++;
          }
        });
      });
    });

    console.log("[DEBUG] Imagens encontradas:", logImagens);

    console.log("[DEBUG] Total de arquivos novos:", arquivosNovos);

    if (arquivosNovos === 0) {
      throw new Error(
        "É obrigatório anexar pelo menos uma nova mídia (imagem ou vídeo) para salvar a medição."
      );
    } // Prepara os campos para envio conforme o backend espera

    const formData = new FormData();

    formData.append("obraId", obraId);

    formData.append("responsavel", responsavelValido);

    formData.append("date", new Date(medicaoDate).toISOString());

    formData.append("status", "Em Andamento");

    formData.append("groups", JSON.stringify(dataWithMediaIds));

    formData.append("comments", ""); // Adiciona apenas arquivos de mídia novos (que têm file)

    let arquivosFormData = [];

    dataWithMediaIds.forEach((group, gIdx) => {
      group.items.forEach((item, iIdx) => {
        (item.images || []).forEach((img, imgIdx) => {
          if (img.file && img.file instanceof File) {
            arquivosFormData.push({
              groupIdx: gIdx,

              itemIdx: iIdx,

              imgIdx,

              mediaId: img.mediaId,
              fileName: img.file.name,
              fileType: img.file.type,
            }); // Troca o nome do campo para 'media' (sem colchetes)
            formData.append("media", img.file, img.file.name);
          }
        });
      });
    });
    console.log("[DEBUG] Arquivos adicionados ao FormData:", arquivosFormData); // Log detalhado do conteúdo do FormData

    if (formData && window && typeof window.FormData === "function") {
      console.log("[DEBUG] Conteúdo do FormData antes do envio:");
      for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log(
            `Campo: ${pair[0]} | File: ${pair[1].name} | Tipo: ${pair[1].type} | Tamanho: ${pair[1].size}`
          );
        } else {
          console.log(`Campo: ${pair[0]} | Valor: ${pair[1]}`);
        }
      }
    } // Enviar via Axios (sem header manual)

    const response = await axios.post(
      `${API_URL}/api/medicoes/obras/${obraId}/medicoes`,
      formData
    );
    if (response.status === 201 || response.status === 200) {
      setMeasurements((prev) => [...prev, response.data]);
      showSuccessMessage("Medição salva com sucesso!");
      setShowTable(false);
      if (onUpdate) {
        onUpdate();
      }
    } else {
      throw new Error("Erro ao salvar medição na API");
    }
  } catch (error) {
    let mensagemErro = error.message;
    if (error.response && error.response.data) {
      mensagemErro += ` | Detalhe: ${JSON.stringify(error.response.data)}`;
    }
    console.error("Erro detalhado no salvamento:", error);
    showErrorMessage(`Erro ao salvar medição: ${mensagemErro}`);
  } finally {
    setIsSaving(false);
  }
};
