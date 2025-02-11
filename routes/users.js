import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Rota para registrar um novo usuário
router.post("/register", async (req, res) => {
  try {
    console.log("Rota POST /api/users/register chamada");
    const { name, email, password } = req.body;
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
    res.json({ token });
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
router.put("/:id/permissao", async (req, res) => {
  try {
    console.log(`Rota PUT /api/users/${req.params.id}/permissao chamada`);
    const { id } = req.params;
    const { permissao } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { permissao },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar permissão do usuário:", error);
    res.status(500).json({ message: "Erro ao atualizar permissão do usuário" });
  }
});

export default router;
