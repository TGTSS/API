import crypto from "crypto";
import bcrypt from "bcrypt";
import Client from "../models/Client.js";
import Project from "../models/Project.js";
import Invite from "../models/Invite.js";
import User from "../models/User.js";
import { sendInviteEmail } from "../utils/send-email.js";
import cloudinary from "../../cloudinary.js";
import { formatError } from "../utils/error-handler.js";

export const getClients = async (req, res) => {
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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const createClient = async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate("userId");
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    const recentProjects = await Project.find({ clientId: client._id })
      .sort({ startDate: -1 })
      .limit(5);

    res.json({ client, recentProjects });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });
    res.json(client);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }

    if (client.userId) {
      await User.findByIdAndDelete(client.userId);
    }

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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const inviteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = new Invite({
      code,
      email: client.email,
      clientId: client._id,
      expiresAt,
    });
    await invite.save();

    await sendInviteEmail(client, code);

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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getPortalProfile = async (req, res) => {
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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const activatePortalAccount = async (req, res) => {
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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const uploadDocuments = async (req, res) => {
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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteDocument = async (req, res) => {
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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
