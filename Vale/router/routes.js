import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendEmail, { sendInviteEmail } from "../utils/send-email.js";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";
import ProjectEvent from "../models/ProjectEvent.js";
import FinancialTransaction from "../models/FinancialTransaction.js";
import Invite from "../models/Invite.js";
import TeamMember from "../models/TeamMember.js";
import cloudinary, { uploadImagem, uploadDocumento } from "../../cloudinary.js";

const router = express.Router();

// --- Existing Routes ---
router.post("/send-quote", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    await sendEmail({ name, email, phone, message });
    return res
      .status(200)
      .json({ success: true, message: "Cotação solicitada com sucesso!" });
  } catch (error) {
    console.error("Erro na rota /send-quote:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/test", async (req, res) => {
  try {
    const testData = {
      name: "Teste de Verificação API",
      email: "teste@valegnss.com",
      phone: "(00) 0000-0000",
      message:
        "Este é um teste automático para validar a configuração de envio de e-mails da API Vale.",
    };
    await sendEmail(testData);
    return res.status(200).json({
      success: true,
      message: "Teste realizado com sucesso! Verifique sua caixa de entrada.",
    });
  } catch (error) {
    console.error("Erro na rota de teste:", error.message);
    return res.status(500).json({
      success: false,
      message: "Erro ao enviar email de teste",
      error: error.message,
    });
  }
});

// --- New Routes ---

// 1. Auth
router.post(
  "/api/auth/register",
  uploadImagem.single("avatar"),
  async (req, res) => {
    try {
      const { name, email, password, role, phone } = req.body;
      let avatar = req.body.avatar;
      let avatarPublicId = null;

      if (req.file) {
        avatar = req.file.path;
        avatarPublicId = req.file.public_id;
      }

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name,
        email,
        password: hashedPassword,
        role: role || "ENGINEER",
        phone,
        avatar,
        avatarPublicId,
      });

      await user.save();

      res.status(201).json({
        message: "Usuário criado com sucesso.",
        user: user.toJSON(),
      });
    } catch (error) {
      console.error("Erro em /api/auth/register:", error);
      res
        .status(500)
        .json({ message: "Erro ao criar usuário.", error: error.message });
    }
  }
);

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    res.status(200).json({
      message: "Login realizado com sucesso.",
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Erro em /api/auth/login:", error);
    res.status(500).json({ message: "Erro no login.", error: error.message });
  }
});

router.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("name email _id");
    res.json(users);
  } catch (error) {
    console.error("Erro em GET /api/users:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar usuários.", error: error.message });
  }
});

router.get("/api/clients", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { document: { $regex: search, $options: "i" } },
      ];
    }

    const clients = await Client.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const count = await Client.countDocuments(query);

    res.json({
      clients,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalClients: count,
    });
  } catch (error) {
    console.error("Erro em /api/clients:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar clientes.", error: error.message });
  }
});

router.post("/api/clients", async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    console.error("Erro em POST /api/clients:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar cliente.", error: error.message });
  }
});

router.get("/api/clients/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate("userId");
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    // Recent projects
    const recentProjects = await Project.find({ clientId: client._id })
      .sort({ startDate: -1 })
      .limit(5);

    res.json({ client, recentProjects });
  } catch (error) {
    console.error("Erro em GET /api/clients/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar cliente.", error: error.message });
  }
});

router.put("/api/clients/:id", async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });
    res.json(client);
  } catch (error) {
    console.error("Erro em PUT /api/clients/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar cliente.", error: error.message });
  }
});

router.delete("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }

    // Se o cliente tiver um usuário vinculado, remove o usuário também
    if (client.userId) {
      await User.findByIdAndDelete(client.userId);
    }

    // Delete documents from Cloudinary
    if (client.documents && client.documents.length > 0) {
      for (const doc of client.documents) {
        if (doc.publicId) {
          await cloudinary.uploader.destroy(doc.publicId);
        }
      }
    }

    await Client.findByIdAndDelete(id);

    res.json({ message: "Cliente e usuário removidos com sucesso." });
  } catch (error) {
    console.error("Erro em DELETE /api/clients/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir cliente.", error: error.message });
  }
});

router.post("/api/clients/:id/invite", async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    // Generate code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

    const invite = new Invite({
      code,
      email: client.email,
      clientId: client._id,
      expiresAt,
    });
    await invite.save();

    // Enviar e-mail de convite
    await sendInviteEmail(client, code);

    // Opcional: Atualizar status do cliente para 'invited' se houver esse campo
    // Se não houver, ignore ou adicione ao schema se necessário.
    client.status = "invited";
    await client.save();

    res.json({
      message: "Convite enviado com sucesso por e-mail",
      link: `/auth/cliente/cadastro?code=${code}&email=${encodeURIComponent(
        client.email
      )}`,
      code,
    });
  } catch (error) {
    console.error("Erro em POST /api/clients/:id/invite:", error);
    res
      .status(500)
      .json({ message: "Erro ao enviar convite.", error: error.message });
  }
});

router.get("/api/projects", async (req, res) => {
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
    console.error("Erro em GET /api/projects:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar projetos.", error: error.message });
  }
});

router.post(
  "/api/projects",
  uploadImagem.single("imagem"),
  async (req, res) => {
    try {
      let imagem = null;
      let imagemPublicId = null;

      if (req.file) {
        imagem = req.file.path;
        imagemPublicId = req.file.public_id;
      }

      // Parse req.body fields if they are strings (FormData)
      const body = { ...req.body };
      if (typeof body.budget === "string")
        body.budget = parseFloat(body.budget);
      if (typeof body.latitude === "string")
        body.latitude = parseFloat(body.latitude);
      if (typeof body.longitude === "string")
        body.longitude = parseFloat(body.longitude);

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
      console.error("Erro em POST /api/projects:", error);
      res
        .status(500)
        .json({ message: "Erro ao criar projeto.", error: error.message });
    }
  }
);

router.get("/api/projects/:id", async (req, res) => {
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
    console.error("Erro em GET /api/projects/:id:", error);
    res.status(500).json({
      message: "Erro ao buscar detalhes do projeto.",
      error: error.message,
    });
  }
});

router.put(
  "/api/projects/:id",
  uploadImagem.single("imagem"),
  async (req, res) => {
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

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
        }
      );
      if (!project)
        return res.status(404).json({ message: "Projeto não encontrado" });
      res.json(project);
    } catch (error) {
      console.error("Erro em PUT /api/projects/:id:", error);
      res
        .status(500)
        .json({ message: "Erro ao atualizar projeto.", error: error.message });
    }
  }
);

router.delete("/api/projects/:id", async (req, res) => {
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
    console.error("Erro em DELETE /api/projects/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir projeto.", error: error.message });
  }
});

// Timeline Routes
router.post("/api/projects/:id/timeline", async (req, res) => {
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
    console.error("Erro em POST /api/projects/:id/timeline:", error);
    res
      .status(500)
      .json({ message: "Erro ao adicionar etapa.", error: error.message });
  }
});

router.put("/api/projects/:id/timeline/:stageId", async (req, res) => {
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
    console.error("Erro em PUT /api/projects/:id/timeline/:stageId:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar etapa.", error: error.message });
  }
});

router.delete("/api/projects/:id/timeline/:stageId", async (req, res) => {
  try {
    const { id, stageId } = req.params;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    project.timeline.pull(stageId);
    await project.save();

    res.json(project);
  } catch (error) {
    console.error("Erro em DELETE /api/projects/:id/timeline/:stageId:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover etapa.", error: error.message });
  }
});

router.get("/api/portal/projects", async (req, res) => {
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
    console.error("Erro em /api/portal/projects:", error);
    res.status(500).json({
      message: "Erro ao buscar projetos do portal.",
      error: error.message,
    });
  }
});

router.get("/api/portal/projects/:id", async (req, res) => {
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
    console.error("Erro em /api/portal/projects/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar projeto", error: error.message });
  }
});

router.get("/api/portal/profile", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const client = await Client.findOne({ userId }).populate(
      "userId",
      "name email role"
    );
    if (!client)
      return res.status(404).json({ message: "Perfil não encontrado" });

    res.json(client);
  } catch (error) {
    console.error("Erro em /api/portal/profile:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar perfil", error: error.message });
  }
});

router.post("/api/portal/activate", async (req, res) => {
  try {
    const { code, name, email, password } = req.body;

    const invite = await Invite.findOne({ code, used: false });
    if (!invite)
      return res
        .status(400)
        .json({ message: "Convite inválido ou já utilizado." });

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ message: "Convite expirado." });
    }

    if (email !== invite.email) {
      return res
        .status(400)
        .json({ message: "Email não corresponde ao convite." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Usuário já existe. Faça login." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "CLIENT",
    });
    await newUser.save();

    await Client.findByIdAndUpdate(invite.clientId, {
      userId: newUser._id,
      status: "active",
    });

    invite.used = true;
    await invite.save();

    res
      .status(200)
      .json({ message: "Conta ativada com sucesso!", user: newUser.toJSON() });
  } catch (error) {
    console.error("Erro em /api/portal/activate:", error);
    res
      .status(500)
      .json({ message: "Erro na ativação.", error: error.message });
  }
});

// 5. Financials
router.get("/api/transactions", async (req, res) => {
  try {
    const transactions = await FinancialTransaction.find()
      .populate("projectId", "name code")
      .sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    console.error("Erro em GET /api/transactions:", error);
    res.status(500).json({
      message: "Erro ao listar transações.",
      error: error.message,
    });
  }
});

// 4. Team Management
router.get("/api/team", async (req, res) => {
  try {
    const team = await TeamMember.find().sort({ name: 1 });
    // Optional: Calculate active projects count if connected
    // For now returning basic data
    const teamWithStats = await Promise.all(
      team.map(async (member) => {
        // Example: count projects where this member is technical lead (by name)
        const projectCount = await Project.countDocuments({
          technicalLead: member.name,
        });
        return {
          ...member.toObject(),
          projects: projectCount,
        };
      })
    );

    res.json(teamWithStats);
  } catch (error) {
    console.error("Erro em GET /api/team:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar equipe.", error: error.message });
  }
});

router.post("/api/team", uploadImagem.single("avatar"), async (req, res) => {
  try {
    const existing = await TeamMember.findOne({ email: req.body.email });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Email já cadastrado na equipe." });
    }

    let avatar = req.body.name.charAt(0).toUpperCase();
    let avatarPublicId = null;

    if (req.file) {
      avatar = req.file.path;
      avatarPublicId = req.file.public_id;
    }

    const member = new TeamMember({
      ...req.body,
      avatar,
      avatarPublicId,
    });
    await member.save();
    res.status(201).json(member);
  } catch (error) {
    console.error("Erro em POST /api/team:", error);
    res
      .status(500)
      .json({ message: "Erro ao adicionar membro.", error: error.message });
  }
});

router.put("/api/team/:id", uploadImagem.single("avatar"), async (req, res) => {
  try {
    const existingMember = await TeamMember.findById(req.params.id);
    if (!existingMember)
      return res.status(404).json({ message: "Membro não encontrado" });

    const updateData = { ...req.body };

    if (req.file) {
      // Delete old avatar if it exists
      if (existingMember.avatarPublicId) {
        await cloudinary.uploader.destroy(existingMember.avatarPublicId);
      }
      updateData.avatar = req.file.path;
      updateData.avatarPublicId = req.file.public_id;
    }

    const member = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
      }
    );
    if (!member)
      return res.status(404).json({ message: "Membro não encontrado" });
    res.json(member);
  } catch (error) {
    console.error("Erro em PUT /api/team/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar membro.", error: error.message });
  }
});

router.delete("/api/team/:id", async (req, res) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member)
      return res.status(404).json({ message: "Membro não encontrado" });

    // Delete avatar from Cloudinary if it exists
    if (member.avatarPublicId) {
      await cloudinary.uploader.destroy(member.avatarPublicId);
    }

    res.json({ message: "Membro removido com sucesso." });
  } catch (error) {
    console.error("Erro em DELETE /api/team/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover membro.", error: error.message });
  }
});

// --- Document Management ---

// 6. Project Documents
router.post(
  "/api/projects/:id/documents",
  uploadDocumento.array("files"),
  async (req, res) => {
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
  }
);

router.delete("/api/projects/:id/documents/:docId", async (req, res) => {
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
});

// 7. Transaction Attachments
router.post(
  "/api/transactions/:id/attachments",
  uploadDocumento.array("files"),
  async (req, res) => {
    try {
      const transaction = await FinancialTransaction.findById(req.params.id);
      if (!transaction)
        return res.status(404).json({ message: "Transação não encontrada" });

      const newAttachments = req.files.map((file) => ({
        name: file.originalname,
        url: file.path,
        publicId: file.public_id,
        type: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      }));

      transaction.attachments.push(...newAttachments);
      await transaction.save();

      res.status(200).json(transaction.attachments);
    } catch (error) {
      console.error("Erro ao fazer upload de anexos:", error);
      res.status(500).json({
        message: "Erro ao fazer upload de anexos",
        error: error.message,
      });
    }
  }
);

router.delete(
  "/api/transactions/:id/attachments/:attachmentId",
  async (req, res) => {
    try {
      const transaction = await FinancialTransaction.findById(req.params.id);
      if (!transaction)
        return res.status(404).json({ message: "Transação não encontrada" });

      const attachment = transaction.attachments.id(req.params.attachmentId);
      if (!attachment)
        return res.status(404).json({ message: "Anexo não encontrado" });

      // Delete from Cloudinary
      if (attachment.publicId) {
        await cloudinary.uploader.destroy(attachment.publicId);
      }

      transaction.attachments.pull(req.params.attachmentId);
      await transaction.save();

      res.json({ message: "Anexo removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover anexo:", error);
      res
        .status(500)
        .json({ message: "Erro ao remover anexo", error: error.message });
    }
  }
);

// 8. Client Documents
router.post(
  "/api/clients/:id/documents",
  uploadDocumento.array("files"),
  async (req, res) => {
    try {
      const client = await Client.findById(req.params.id);
      if (!client)
        return res.status(404).json({ message: "Cliente não encontrado" });

      const newDocuments = req.files.map((file) => ({
        name: file.originalname,
        url: file.path,
        publicId: file.public_id,
        type: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      }));

      client.documents.push(...newDocuments);
      await client.save();

      res.status(200).json(client.documents);
    } catch (error) {
      console.error("Erro ao fazer upload de documentos do cliente:", error);
      res.status(500).json({
        message: "Erro ao fazer upload de documentos",
        error: error.message,
      });
    }
  }
);

router.delete("/api/clients/:id/documents/:docId", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    const doc = client.documents.id(req.params.docId);
    if (!doc)
      return res.status(404).json({ message: "Documento não encontrado" });

    // Delete from Cloudinary
    if (doc.publicId) {
      await cloudinary.uploader.destroy(doc.publicId);
    }

    client.documents.pull(req.params.docId);
    await client.save();

    res.json({ message: "Documento removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover documento do cliente:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover documento", error: error.message });
  }
});

export default router;
