import Project from "../models/Project.js";
import Client from "../models/Client.js";
import ProjectEvent from "../models/ProjectEvent.js";
import ProjectStatusLog from "../models/ProjectStatusLog.js";
import FinancialTransaction from "../models/FinancialTransaction.js";
import { SERVICE_STAGES } from "../constants/serviceTypes.js";
import cloudinary from "../../cloudinary.js";
import { formatError } from "../utils/error-handler.js";
import {
  updateProjectStatusFromTimeline,
  recalculateClientStatus,
} from "../utils/status-calculator.js";
import { addBusinessDays } from "../utils/business-days.js";
import RefusalReason from "../models/RefusalReason.js";

export const getProjects = async (req, res) => {
  try {
    const { status, clientId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;

    const projects = await Project.find(query)
      .populate("clientId", "name")
      .populate("technicalLead", "name");
    res.json(projects);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const createProject = async (req, res) => {
  try {
    let imagem = null;
    let imagemPublicId = null;

    if (req.file) {
      imagem = req.file.path;
      imagemPublicId = req.file.filename;
    }

    // Parse req.body fields if they are strings (FormData)
    const body = { ...req.body };
    if (typeof body.latitude === "string")
      body.latitude = parseFloat(body.latitude);
    if (typeof body.longitude === "string")
      body.longitude = parseFloat(body.longitude);
    if (typeof body.deliveryDays === "string")
      body.deliveryDays = parseInt(body.deliveryDays, 10);

    // Ajustar o parsing do technicalLead (pode vir como string ou array de strings)
    if (typeof body.technicalLead === "string") {
      try {
        body.technicalLead = JSON.parse(body.technicalLead);
      } catch (e) {
        // Se não for JSON, trata como um ID único
        body.technicalLead = [body.technicalLead];
      }
    }

    // Ajustar o parsing do timeline customizado (JSON)
    if (typeof body.timeline === "string" && body.timeline.trim() !== "") {
      try {
        body.timeline = JSON.parse(body.timeline);
      } catch (e) {
        console.error("Erro ao fazer parse do timeline:", e);
        body.timeline = [];
      }
    }

    // Verificar se o serviceType enviado possui etapas predefinidas.
    // Se o campo timeline vier vazio ou ausente na requisição, popular automaticamente com as etapas do SERVICE_STAGES.
    if (
      (!body.timeline ||
        (Array.isArray(body.timeline) && body.timeline.length === 0)) &&
      body.serviceType
    ) {
      const stages = SERVICE_STAGES[body.serviceType];
      if (stages) {
        body.timeline = stages.map((stage) => ({
          title: stage,
          status: "pending",
          date: new Date(),
        }));
      }
    }

    // Generate sequential code
    const lastProject = await Project.findOne().sort({ createdAt: -1 });
    let nextCode = "PROJ-01";

    if (lastProject && lastProject.code) {
      const parts = lastProject.code.split("-");
      if (parts.length === 2) {
        const lastNumber = parseInt(parts[1], 10);
        if (!isNaN(lastNumber)) {
          const nextNumber = lastNumber + 1;
          nextCode = `PROJ-${nextNumber.toString().padStart(2, "0")}`;
        }
      }
    }

    const project = new Project({
      ...body,
      code: nextCode,
      imagem,
      imagemPublicId,
    });
    await project.save();

    await Client.findByIdAndUpdate(project.clientId, {
      $push: { projects: project._id },
    });

    // Recalculate client status after adding a new project
    await recalculateClientStatus(project.clientId);

    res.status(201).json(project);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .populate("clientId")
      .populate("technicalLead")
      .lean();

    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    // Garantir que technicalLead venha como array no retorno mesmo se houver erro de populate ou dados antigos
    if (project.technicalLead && !Array.isArray(project.technicalLead)) {
      project.technicalLead = [project.technicalLead];
    }

    const timeline = await ProjectEvent.find({ projectId: id }).sort({
      date: 1,
    });
    const financials = await FinancialTransaction.find({ projectId: id }).sort({
      date: -1,
    });

    res.json({ project, timeline, financials });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getProjectByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const project = await Project.findOne({ code })
      .populate("clientId")
      .populate("technicalLead")
      .lean();

    if (!project)
      return res
        .status(404)
        .json({ message: "Projeto não encontrado com este código." });

    // Garantir que technicalLead venha como array
    if (project.technicalLead && !Array.isArray(project.technicalLead)) {
      project.technicalLead = [project.technicalLead];
    }

    const timeline = await ProjectEvent.find({ projectId: project._id }).sort({
      date: 1,
    });
    const financials = await FinancialTransaction.find({
      projectId: project._id,
    }).sort({
      date: -1,
    });

    res.json({ project, timeline, financials });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const updateProject = async (req, res) => {
  try {
    const existingProject = await Project.findById(req.params.id).lean();
    if (!existingProject)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const updateData = { ...req.body };

    // Prevent manual status override — status is auto-calculated from timeline
    delete updateData.status;

    if (typeof updateData.technicalLead === "string") {
      try {
        updateData.technicalLead = JSON.parse(updateData.technicalLead);
      } catch (e) {
        updateData.technicalLead = [updateData.technicalLead];
      }
    }

    if (req.file) {
      // Delete old image if it exists
      if (existingProject.imagemPublicId) {
        await cloudinary.uploader.destroy(existingProject.imagemPublicId);
      }
      updateData.imagem = req.file.path;
      updateData.imagemPublicId = req.file.filename;
    }

    // Se o documento no banco ainda for string, precisamos garantir a conversão
    if (!Array.isArray(existingProject.technicalLead)) {
      await Project.findByIdAndUpdate(req.params.id, {
        $set: {
          technicalLead: existingProject.technicalLead
            ? [existingProject.technicalLead]
            : [],
        },
      });
    }

    const project = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });
    res.json(project);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    // Remove o projeto do array projects do cliente
    await Client.findByIdAndUpdate(project.clientId, {
      $pull: { projects: project._id },
    });

    // Deleta a imagem do Cloudinary se existir
    if (project.imagemPublicId) {
      await cloudinary.uploader.destroy(project.imagemPublicId);
    }

    // Deleta o projeto
    await Project.findByIdAndDelete(req.params.id);

    // Recalculate client status after removing a project
    await recalculateClientStatus(project.clientId);

    res.json(project);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const addTimelineStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, status, assignedTo } = req.body;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    project.timeline.push({ title, date, status, assignedTo });
    await project.save();

    res.json(project);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const updateTimelineStep = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const { title, date, status, assignedTo, refusalReason } = req.body;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const step = project.timeline.id(stageId);
    if (!step) return res.status(404).json({ message: "Etapa não encontrada" });

    if (title !== undefined) step.title = title;
    if (date !== undefined) step.date = date;

    // Handle assignedTo - ensure it's either a valid string ID or null
    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === "" || assignedTo === "null") {
        step.assignedTo = undefined;
      } else if (typeof assignedTo === "string") {
        step.assignedTo = assignedTo;
      } else if (typeof assignedTo === "object" && assignedTo._id) {
        // If an object was passed (populated), extract the ID
        step.assignedTo = assignedTo._id;
      }
    }

    if (status !== undefined) {
      // Validate: "refused" is only valid for contract signing stage
      if (
        status === "refused" &&
        !step.title.toLowerCase().includes("contrato assinado")
      ) {
        return res.status(400).json({
          message:
            'O status "refused" só é válido para a etapa "Contrato assinado".',
        });
      }

      // refusalReason is required when status is "refused"
      if (status === "refused" && !refusalReason) {
        return res.status(400).json({
          message:
            'O campo "refusalReason" é obrigatório quando o status é "refused".',
        });
      }

      // Validate refusalReason exists in predefined options
      if (status === "refused") {
        const reasonExists = await RefusalReason.findOne({
          label: refusalReason,
          active: true,
        });
        if (!reasonExists) {
          return res.status(400).json({
            message:
              "Motivo de recusa inválido. Selecione um motivo predefinido.",
          });
        }
      }

      step.status = status;
      if (status === "completed") {
        step.completedAt = new Date();

        // Calcular deadline quando "Contrato assinado" é concluído
        if (
          step.title.toLowerCase().includes("contrato assinado") &&
          project.deliveryDays
        ) {
          project.startDate = new Date();
          project.deadline = addBusinessDays(new Date(), project.deliveryDays);
        }
      }
      if (status === "refused") {
        step.refusedAt = new Date();
        step.refusalReason = refusalReason;
      }
    }

    await project.save();

    // Auto-calculate project status from timeline and recalculate client status
    await updateProjectStatusFromTimeline(
      project,
      step.title,
      refusalReason
    );

    res.json(project);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteTimelineStep = async (req, res) => {
  try {
    const { id, stageId } = req.params;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    project.timeline.pull(stageId);
    await project.save();

    res.json(project);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Reordenar etapas do timeline
 * PUT /api/projects/:id/timeline/reorder
 */
export const reorderTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const { stageIds } = req.body; // Array de IDs na nova ordem

    if (!Array.isArray(stageIds)) {
      return res.status(400).json({ message: "stageIds deve ser um array" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }

    // Reordenar o timeline baseado na ordem dos IDs recebidos
    const reorderedTimeline = stageIds
      .map((stageId) => {
        const stageIdStr = String(stageId);
        return project.timeline.find(
          (stage) => stage._id.toString() === stageIdStr,
        );
      })
      .filter(Boolean);

    // Verificar se todos os IDs foram encontrados
    if (reorderedTimeline.length !== project.timeline.length) {
      return res.status(400).json({
        message: "Alguns IDs de etapas não foram encontrados no projeto",
      });
    }

    project.timeline = reorderedTimeline;
    await project.save();

    res.json({ project });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getPortalProjects = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const client = await Client.findOne({ userId });
    if (!client) {
      return res
        .status(403)
        .json({ message: "Usuário não é um cliente ou não está vinculado." });
    }

    const projects = await Project.find({ clientId: client._id });
    res.json(projects);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getPortalProjectById = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const client = await Client.findOne({ userId });
    if (!client) return res.status(403).json({ message: "Acesso negado" });

    const project = await Project.findOne({
      _id: req.params.id,
      clientId: client._id,
    }).populate("technicalLead", "name email phone");

    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    res.json(project);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const uploadDocuments = async (req, res) => {
  try {
    console.log("📁 Upload request for project:", req.params.id);
    console.log("📁 Files received:", req.files?.length || 0);

    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    console.log("📁 Current documents count:", project.documents?.length || 0);
    console.log(
      "📁 Current documents:",
      JSON.stringify(project.documents, null, 2),
    );

    const newDocuments = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.filename,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    }));

    console.log(
      "📁 New documents to add:",
      JSON.stringify(newDocuments, null, 2),
    );

    project.documents.push(...newDocuments);

    console.log("📁 Attempting to save project...");
    await project.save();
    console.log("📁 Project saved successfully!");

    res.status(200).json(project.documents);
  } catch (error) {
    console.error("📁 Upload error details:", error);
    console.error("📁 Error name:", error.name);
    console.error("📁 Error path:", error.path);
    console.error("📁 Error kind:", error.kind);
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const doc = project.documents.id(req.params.docId);
    if (!doc)
      return res.status(404).json({ message: "Documento não encontrado" });

    // Delete from Cloudinary
    if (doc.publicId) {
      await cloudinary.uploader.destroy(doc.publicId);
    }

    project.documents.pull(req.params.docId);
    await project.save();

    res.json({ message: "Documento removido com sucesso" });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const addTechnicalLeads = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicalLeads } = req.body; // Expecting an array of IDs

    if (!Array.isArray(technicalLeads)) {
      return res
        .status(400)
        .json({ message: "technicalLeads deve ser um array." });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado." });
    }

    // Preparar os leads atuais, garantindo que seja um array
    let currentLeads = Array.isArray(project.technicalLead)
      ? project.technicalLead
      : project.technicalLead
        ? [project.technicalLead]
        : [];

    // Adicionar apenas os que não existem
    technicalLeads.forEach((leadId) => {
      if (!currentLeads.includes(leadId)) {
        currentLeads.push(leadId);
      }
    });

    // Atualizar usando o MongoDB diretamente para garantir que o tipo mude no banco
    await Project.updateOne(
      { _id: id },
      { $set: { technicalLead: currentLeads } },
    );

    const populatedProject = await Project.findById(id).populate(
      "technicalLead",
      "name email",
    );

    res.json(populatedProject);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getProjectStatusHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const history = await ProjectStatusLog.find({ projectId: id }).sort({
      changedAt: -1,
    });
    res.json(history);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const removeTechnicalLead = async (req, res) => {
  try {
    const { id, leadId } = req.params;

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado." });
    }

    // Se o documento no banco ainda for string, precisamos garantir a conversão antes de remover
    let currentLeads = Array.isArray(project.technicalLead)
      ? project.technicalLead
      : project.technicalLead
        ? [project.technicalLead]
        : [];

    const updatedLeads = currentLeads.filter((id) => id !== leadId);

    await Project.updateOne(
      { _id: id },
      { $set: { technicalLead: updatedLeads } },
    );

    const populatedProject = await Project.findById(id).populate(
      "technicalLead",
      "name email",
    );

    res.json(populatedProject);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
