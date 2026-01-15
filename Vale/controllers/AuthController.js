import bcrypt from "bcrypt";
import User from "../models/User.js";
import { formatError } from "../utils/error-handler.js";

export const register = async (req, res) => {
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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const login = async (req, res) => {
  const startTime = Date.now();
  try {
    const { email, password } = req.body;

    // Log: Início da busca do usuário
    const dbStartTime = Date.now();

    // Busca otimizada: usando lean() para retorno mais rápido
    // Selecionando apenas os campos necessários para autenticação
    const user = await User.findOne({ email }).lean();

    const dbEndTime = Date.now();
    console.log(`[LOGIN] Busca no DB: ${dbEndTime - dbStartTime}ms`);

    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Log: Início da verificação de senha
    const bcryptStartTime = Date.now();

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    const bcryptEndTime = Date.now();
    console.log(
      `[LOGIN] Verificação bcrypt: ${bcryptEndTime - bcryptStartTime}ms`
    );

    if (!isMatch) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Remove password antes de enviar resposta
    const { password: _, ...userWithoutPassword } = user;

    const totalTime = Date.now() - startTime;
    console.log(`[LOGIN] Tempo total: ${totalTime}ms`);

    res.status(200).json({
      message: "Login realizado com sucesso.",
      user: userWithoutPassword,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(
      `[LOGIN ERROR] Tempo até erro: ${totalTime}ms`,
      error.message
    );
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select(
      "name email _id role phone createdAt"
    );
    res.json(users);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
