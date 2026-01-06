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
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("name email _id");
    res.json(users);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
