import express from "express";
import axios from "axios";
import cors from "cors";
import mongoose from "mongoose";
import Fornecedor from "../models/Fornecedor.js"; // Importar o modelo Fornecedor

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/fornecedores", async (req, res) => {
  const fornecedor = new Fornecedor(req.body);
  try {
    const savedFornecedor = await fornecedor.save();
    res
      .status(201)
      .json({
        message: "Fornecedor cadastrado com sucesso",
        fornecedor: savedFornecedor,
      });
  } catch (error) {
    console.error("Erro ao cadastrar fornecedor:", error.message);
    res.status(500).json({ error: "Erro ao cadastrar fornecedor" });
  }
});

app.get("/consulta/:cnpj", async (req, res) => {
  const cnpj = req.params.cnpj;
  try {
    const response = await axios.get(`https://api-urh2.onrender.com/consulta/${cnpj}`);
    res.json(response.data);
  } catch (error) {
    console.error("Erro ao consultar o CNPJ:", error.message);
    res.status(500).json({ error: "Erro ao consultar o CNPJ" });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
