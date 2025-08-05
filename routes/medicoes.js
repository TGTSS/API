import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import Medicao from "../models/Medicao.js";
import Obra from "../models/Obra.js";

// 1. Importa os serviços de upload e delete do Cloudinary
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../services/uploadService.js";

const router = express.Router();

// 2. Configuração UNIFICADA do Multer. Usaremos este para todas as rotas.
// Ele processa os arquivos em memória, sem salvar no disco local.
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limite de 50MB por arquivo
});

// --- ROTAS DE LEITURA (GET) ---
// Estas rotas não mudam, pois apenas leem dados do banco.
router.get("/", async (req, res) => {
  /* ... seu código original aqui, sem alterações ... */
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
    if (obraId) filter.obraId = obraId;
    if (status) filter.status = status;
    if (responsavel)
      filter.responsavel = { $regex: responsavel, $options: "i" };
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

router.get("/:id", async (req, res) => {
  /* ... seu código original aqui, sem alterações ... */
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

// --- ROTA DE CRIAÇÃO (POST) ---
// Totalmente refatorada para usar Cloudinary
router.post("/", upload.array("files", 20), async (req, res) => {
  try {
    const { obraId, date, responsavel, groups, comments, createdBy } = req.body;

    if (!obraId || !responsavel) {
      return res
        .status(400)
        .json({ message: "obraId e responsavel são obrigatórios" });
    }

    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const media = [];
    const attachments = [];

    // Se houver arquivos, faz o upload para a Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) => {
        const isMedia = /image|video/.test(file.mimetype);
        const folder = isMedia ? "medicoes/media" : "medicoes/attachments";
        return uploadToCloudinary(file.buffer, folder).then((result) => ({
          ...result,
          originalName: file.originalname,
          isMedia: isMedia,
        }));
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      uploadedFiles.forEach((uploadedFile) => {
        const fileData = {
          name: uploadedFile.originalName,
          url: uploadedFile.secure_url,
          public_id: uploadedFile.public_id, // Essencial para deletar
          type: uploadedFile.format || file.mimetype,
          size: uploadedFile.bytes,
        };

        if (uploadedFile.isMedia) {
          media.push(fileData);
        } else {
          attachments.push(fileData);
        }
      });
    }

    const medicao = new Medicao({
      obraId,
      date: date ? new Date(date) : new Date(),
      responsavel,
      groups: JSON.parse(groups || "[]"),
      comments,
      media, // Array com dados da Cloudinary
      attachments, // Array com dados da Cloudinary
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

// --- ROTA DE ATUALIZAÇÃO (PUT) ---
// Refatorada para adicionar novos arquivos à Cloudinary
router.put("/:id", upload.array("newAttachments", 10), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // Processar novos anexos, se houver
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, "medicoes/attachments")
      );

      const uploadedResults = await Promise.all(uploadPromises);

      const newAttachments = uploadedResults.map((result) => ({
        name: result.original_filename || "anexo",
        url: result.secure_url,
        public_id: result.public_id,
        type: result.format,
        size: result.bytes,
      }));

      // Adiciona os novos anexos aos existentes
      medicao.attachments.push(...newAttachments);
    }

    // Atualiza outros campos do corpo da requisição
    if (updateData.groups) {
      updateData.groups = JSON.parse(updateData.groups);
    }
    Object.assign(medicao, updateData);

    medicao.calculateTotalMedido();
    medicao.calculateProgress();

    await medicao.save();

    const populatedMedicao = await Medicao.findById(id)
      .populate("obraId", "nome codigo")
      .populate("createdBy", "nome email")
      .populate("updatedBy", "nome email");

    res.json(populatedMedicao);
  } catch (error) {
    console.error("Erro ao atualizar medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// --- ROTA DE EXCLUSÃO (DELETE) ---
// Refatorada para excluir arquivos da Cloudinary antes de excluir do DB
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const medicao = await Medicao.findById(id);
    if (!medicao) {
      return res.status(404).json({ message: "Medição não encontrada" });
    }

    // 1. Coletar todos os public_ids para deletar da Cloudinary
    const publicIdsToDelete = [];
    medicao.media?.forEach((file) => {
      if (file.public_id) publicIdsToDelete.push(file.public_id);
    });
    medicao.attachments?.forEach((file) => {
      if (file.public_id) publicIdsToDelete.push(file.public_id);
    });
    // Adicionar lógica para arquivos dentro de 'groups' se necessário

    // 2. Deletar os arquivos da Cloudinary
    if (publicIdsToDelete.length > 0) {
      console.log(
        `Excluindo ${publicIdsToDelete.length} arquivos da Cloudinary.`
      );
      const deletePromises = publicIdsToDelete.map((pid) =>
        deleteFromCloudinary(pid)
      );
      // Usamos allSettled para continuar mesmo que um arquivo falhe ao deletar
      await Promise.allSettled(deletePromises);
    }

    // 3. Remover a referência da medição na obra
    await Obra.findByIdAndUpdate(medicao.obraId, { $pull: { medicoes: id } });

    // 4. Deletar o documento da medição do MongoDB
    await Medicao.findByIdAndDelete(id);

    res.json({
      message: "Medição e arquivos associados excluídos com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir medição:", error);
    res.status(500).json({ message: error.message });
  }
});

// Exporta o router com as rotas atualizadas
export default router;
