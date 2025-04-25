import express from "express";
import axios from "axios";
import cors from "cors";
import mongoose from "mongoose";
import Fornecedor from "../models/Fornecedor.js"; // Importar o modelo Fornecedor

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Função para fazer a consulta com retry
async function consultaCNPJComRetry(cnpj, maxRetries = 3, initialDelay = 1000) {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      const response = await axios.get(
        `https://www.receitaws.com.br/v1/cnpj/${cnpj}`
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // Se atingiu o limite de requisições, espera e tenta novamente
        console.log(
          `Rate limit atingido. Tentativa ${
            retries + 1
          } de ${maxRetries}. Aguardando ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Aumenta o delay exponencialmente
        retries++;
      } else {
        throw error; // Propaga outros erros
      }
    }
  }
  throw new Error("Número máximo de tentativas atingido");
}

app.post("/api/fornecedores", async (req, res) => {
  const fornecedor = new Fornecedor(req.body);
  try {
    const savedFornecedor = await fornecedor.save();
    res.status(201).json({
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
    const data = await consultaCNPJComRetry(cnpj);
    const {
      nome,
      fantasia,
      cnpj: cnpjRetornado,
      logradouro,
      numero,
      municipio,
      bairro,
      uf,
      cep,
      email,
      telefone,
    } = data;

    const filteredData = {
      nome,
      fantasia,
      cnpj: cnpjRetornado,
      endereco: {
        logradouro,
        numero,
        municipio,
        bairro,
        uf,
        cep,
      },
      email,
      telefone,
    };
    res.json(filteredData);
  } catch (error) {
    console.error("Erro ao consultar o CNPJ:", error.message);
    if (error.message === "Número máximo de tentativas atingido") {
      res.status(429).json({
        error:
          "Limite de consultas atingido. Por favor, tente novamente mais tarde.",
      });
    } else {
      res.status(500).json({ error: "Erro ao consultar o CNPJ" });
    }
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
