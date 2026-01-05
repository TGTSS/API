import Project from "../models/Project.js";
import Client from "../models/Client.js";
import ProjectEvent from "../models/ProjectEvent.js";
import FinancialTransaction from "../models/FinancialTransaction.js";
import { SERVICE_STAGES } from "../constants/serviceTypes.js";
import cloudinary from "../../cloudinary.js";

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
    console.error("Erro em getProjects:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar projetos.", error: error.message });
  }
};

export const createProject = async (req, res) => {
  try {
    let imagem = null;
    let imagemPublicId = null;

    if (req.file) {
      imagem = req.file.path;
      imagemPublicId = req.file.public_id;
    }

    // Parse req.body fields if they are strings (FormData)
    const body = { ...req.body };
    if (typeof body.budget === "string") body.budget = parseFloat(body.budget);
    if (typeof body.latitude === "string")
      body.latitude = parseFloat(body.latitude);
    if (typeof body.longitude === "string")
      body.longitude = parseFloat(body.longitude);

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

    res.status(201).json(project);
  } catch (error) {
    console.error("Erro em createProject:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar projeto.", error: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .populate("clientId")
      .populate("technicalLead");
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const timeline = await ProjectEvent.find({ projectId: id }).sort({
      date: 1,
    });
    const financials = await FinancialTransaction.find({ projectId: id }).sort({
      date: -1,
    });

    res.json({ project, timeline, financials });
  } catch (error) {
    console.error("Erro em getProjectById:", error);
    res.status(500).json({
      message: "Erro ao buscar detalhes do projeto.",
      error: error.message,
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const existingProject = await Project.findById(req.params.id);
    if (!existingProject)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const updateData = { ...req.body };

    if (req.file) {
      // Delete old image if it exists
      if (existingProject.imagemPublicId) {
        await cloudinary.uploader.destroy(existingProject.imagemPublicId);
      }
      updateData.imagem = req.file.path;
      updateData.imagemPublicId = req.file.public_id;
    }

    const project = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });
    res.json(project);
  } catch (error) {
    console.error("Erro em updateProject:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar projeto.", error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
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

    res.json(project);
  } catch (error) {
    console.error("Erro em deleteProject:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir projeto.", error: error.message });
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
    console.error("Erro em addTimelineStep:", error);
    res
      .status(500)
      .json({ message: "Erro ao adicionar etapa.", error: error.message });
  }
};

export const updateTimelineStep = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const { title, date, status, assignedTo } = req.body;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const step = project.timeline.id(stageId);
    if (!step) return res.status(404).json({ message: "Etapa não encontrada" });

    if (title) step.title = title;
    if (date) step.date = date;
    if (assignedTo !== undefined) step.assignedTo = assignedTo;
    if (status) {
      step.status = status;
      if (status === "completed") {
        step.completedAt = new Date();
      }
    }

    await project.save();
    res.json(project);
  } catch (error) {
    console.error("Erro em updateTimelineStep:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar etapa.", error: error.message });
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
    console.error("Erro em deleteTimelineStep:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover etapa.", error: error.message });
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
    console.error("Erro em getPortalProjects:", error);
    res.status(500).json({
      message: "Erro ao buscar projetos do portal.",
      error: error.message,
    });
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
    console.error("Erro em getPortalProjectById:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar projeto", error: error.message });
  }
};

export const uploadDocuments = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const newDocuments = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.public_id,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    }));

    project.documents.push(...newDocuments);
    await project.save();

    res.status(200).json(project.documents);
  } catch (error) {
    console.error("Erro ao fazer upload de documentos:", error);
    res.status(500).json({
      message: "Erro ao fazer upload de documentos",
      error: error.message,
    });
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
    console.error("Erro ao remover documento:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover documento", error: error.message });
  }
};
