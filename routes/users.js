import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import nodemailer from "nodemailer";

const router = express.Router();

// Rota para registrar um novo usuário
router.post("/register", async (req, res) => {
  try {
    console.log("Rota POST /api/users/register chamada");
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email já está em uso" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "Usuário registrado com sucesso" });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).json({ message: "Erro ao registrar usuário" });
  }
});

// Rota para login de usuário
router.post("/login", async (req, res) => {
  try {
    console.log("Rota POST /api/users/login chamada");
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email ou senha incorretos" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Email ou senha incorretos" });
    }
    const token = jwt.sign({ userId: user._id }, "seu_segredo_jwt", {
      expiresIn: "1h",
    });
    res.json({ token, permissao: user.permissao }); // Inclua a permissão na resposta
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ message: "Erro ao fazer login" });
  }
});

// Rota para listar todos os usuários
router.get("/", async (req, res) => {
  try {
    console.log("Rota GET /api/users chamada");
    const users = await User.find().lean();
    res.json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ message: "Erro ao buscar usuários" });
  }
});

// Rota para atualizar a permissão de um usuário
router.put("/email/:email/permissao", async (req, res) => {
  try {
    console.log(
      `Rota PUT /api/users/email/${req.params.email}/permissao chamada`
    );
    const { email } = req.params;
    const { permissao, modulos } = req.body;

    const updateData = { permissao };
    if (modulos) {
      updateData.modulos = modulos;
    }

    const updatedUser = await User.findOneAndUpdate({ email }, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar permissão do usuário:", error);
    res.status(500).json({ message: "Erro ao atualizar permissão do usuário" });
  }
});

// Rota para solicitar redefinição de senha
router.post("/forgot-password", async (req, res) => {
  const { email, from, subject, message } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Configurar o transporte de email
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Enviar email
    await transporter.sendMail({
      from,
      to: email,
      subject,
      text: message,
    });

    res.status(200).json({ message: "Email de redefinição de senha enviado" });
  } catch (error) {
    console.error("Erro ao enviar email de redefinição de senha:", error);
    res
      .status(500)
      .json({ message: "Erro ao enviar email de redefinição de senha" });
  }
});

// Rota para redefinir a senha
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    res.status(500).json({ message: "Erro ao redefinir senha" });
  }
});

// Rota para deletar um usuário pelo email
router.delete("/email/:email", async (req, res) => {
  try {
    console.log(`Rota DELETE /api/users/email/${req.params.email} chamada`);
    const { email } = req.params;
    const deletedUser = await User.findOneAndDelete({ email });
    if (!deletedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({ message: "Erro ao deletar usuário" });
  }
});

export default router;
