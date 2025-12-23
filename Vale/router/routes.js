import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendEmail from "../utils/send-email.js";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";
import ProjectEvent from "../models/ProjectEvent.js";
import FinancialTransaction from "../models/FinancialTransaction.js";
import Invite from "../models/Invite.js";

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
router.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, avatar } = req.body;

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
});

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

// 2. Clients
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

    res.json({
      message: "Convite gerado",
      link: `/portal/activate?code=${code}`,
      code,
    });
  } catch (error) {
    console.error("Erro em POST /api/clients/:id/invite:", error);
    res
      .status(500)
      .json({ message: "Erro ao gerar convite.", error: error.message });
  }
});

router.get("/api/projects", async (req, res) => {
  try {
    const { status, clientId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;

    const projects = await Project.find(query).populate("clientId", "name");
    res.json(projects);
  } catch (error) {
    console.error("Erro em GET /api/projects:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar projetos.", error: error.message });
  }
});

router.post("/api/projects", async (req, res) => {
  try {
    const project = new Project(req.body);
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
});

router.get("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).populate("clientId");
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

router.put("/api/projects/:id", async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });
    res.json(project);
  } catch (error) {
    console.error("Erro em PUT /api/projects/:id:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar projeto.", error: error.message });
  }
});

// Timeline Routes
router.post("/api/projects/:id/timeline", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, status } = req.body;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    project.timeline.push({ title, date, status });
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
    const { title, date, status } = req.body;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Projeto não encontrado" });

    const step = project.timeline.id(stageId);
    if (!step) return res.status(404).json({ message: "Etapa não encontrada" });

    if (title) step.title = title;
    if (date) step.date = date;
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

    await Client.findByIdAndUpdate(invite.clientId, { userId: newUser._id });

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

export default router;
