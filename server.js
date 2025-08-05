import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import Record from "./models/Record.js";
import beneficiariosRouter from "./routes/beneficiarios.js";
import Beneficiario from "./models/Beneficiario.js";
import Counter from "./models/Counter.js";
import os from "os";
import axios from "axios";
import fornecedoresRouter from "./routes/fornecedores.js";
import clientesRouter from "./routes/clientes.js";
import Fornecedor from "./models/Fornecedor.js";
import Cliente from "./models/Cliente.js";
import funcionariosRouter from "./routes/funcionarios.js";
import Funcionario from "./models/Funcionario.js";
import Segmento from "./models/Segmento.js";
import segmentosRouter from "./routes/segmentos.js";
import Funcao from "./models/Funcao.js";
import FormaRemuneracao from "./models/FormaRemuneracao.js";
import insumosRouter from "./routes/insumos.js";
import Insumo from "./models/Insumo.js";
import composicoesRouter from "./routes/composicoes.js";
import usersRouter from "./routes/users.js";
import typesRouter from "./routes/types.js";
import unitsRouter from "./routes/units.js";
import dotenv from "dotenv";
import sendEmail from "./utils/sendEmail.js";
import { Server } from "socket.io";
import http from "http";
import obrasRouter from "./routes/obras.js";
import profissionaisRouter from "./routes/profissionais.js";
import diariosRouter from "./routes/diarios.js";
import orcamentosRouter from "./routes/orcamentos.js";
import Etapa from "./models/Etapa.js";
import Solicitacao from "./models/Solicitacao.js";
import cotacoesRouter from "./routes/cotacoes.js";
import ordensCompraRouter from "./routes/ordensCompra.js";
import transacoesIndependentesRoutes from "./routes/transacoesIndependentes.js";
import transacoesBrutasRoutes from "./routes/transacoesBrutas.js";
import Obra from "./models/Obra.js";
import TipoObra from "./models/TipoObra.js";
import QuemPaga from "./models/QuemPaga.js";
import Conta from "./models/Conta.js";
import solicitacoesRouter from "./routes/solicitacoes.js";
import nfeRouter from "./routes/nfe.js";
import inventarioRouter from "./routes/inventario.js";
import medicoesRouter from "./routes/medicoes.js";
import fs from "fs";
import path from "path";
import { initScheduler, runDailyReminders } from "./services/scheduler.js";

dotenv.config();

const app = express();

// Middlewares

const allowedOrigins = [
  "http://localhost:5173",

  "http://localhost:5174",

  "http://localhost:5175",

  "https://nexustecnologia.modernaedificacoes.com.br",

  "https://i9systemas.com.br",

  "https://api-urh2.onrender.com",
];

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
});

app.use(
  cors({
    origin: allowedOrigins,

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],

    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json({ limit: "50mb" })); // Aumentado para 50MB

app.use(express.json({ limit: "50mb" })); // Aumentado para 50MB

// Servir arquivos estáticos da pasta public

app.use("/uploads", express.static("public/uploads"));

// Rota para servir imagens das medições

app.get("/api/uploads/medicoes/images/:filename", (req, res) => {
  try {
    const { filename } = req.params;

    const filePath = path.join(
      process.cwd(),

      "public",

      "uploads",

      "medicoes",

      "images",

      filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Imagem não encontrada" });
    } // Determinar o tipo MIME baseado na extensão

    const ext = path.extname(filename).toLowerCase();

    let contentType = "image/jpeg";

    switch (ext) {
      case ".png":
        contentType = "image/png";

        break;

      case ".gif":
        contentType = "image/gif";

        break;

      case ".webp":
        contentType = "image/webp";

        break;

      case ".jpg":

      case ".jpeg":

      default:
        contentType = "image/jpeg";

        break;
    }

    res.setHeader("Content-Type", contentType);

    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache por 1 ano

    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);
  } catch (error) {
    console.error("Erro ao servir imagem:", error);

    res.status(500).json({ message: "Erro ao carregar imagem" });
  }
});

// Rota para servir anexos das medições

app.get("/api/uploads/medicoes/attachments/:filename", (req, res) => {
  try {
    const { filename } = req.params;

    const filePath = path.join(
      process.cwd(),

      "public",

      "uploads",

      "medicoes",

      "attachments",

      filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    } // Determinar o tipo MIME baseado na extensão

    const ext = path.extname(filename).toLowerCase();

    let contentType = "application/octet-stream";

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf";

        break;

      case ".doc":
        contentType = "application/msword";

        break;

      case ".docx":
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        break;

      case ".xls":
        contentType = "application/vnd.ms-excel";

        break;

      case ".xlsx":
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        break;

      case ".txt":
        contentType = "text/plain";

        break;
    }

    res.setHeader("Content-Type", contentType);

    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);
  } catch (error) {
    console.error("Erro ao servir anexo:", error);

    res.status(500).json({ message: "Erro ao carregar arquivo" });
  }
});

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");

  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Methods",

    "GET, POST, PUT, DELETE, PATCH"
  );

  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  next();
});

// Middleware para obter o endereço IP do cliente

app.use((req, res, next) => {
  let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  req.clientIp = ip;

  next();
});

const etapasPadrao = [
  { nome: "Fundação", progresso: 100 },

  { nome: "Estrutura", progresso: 85 },

  { nome: "Alvenaria", progresso: 70 },

  { nome: "Instalações Elétricas", progresso: 50 },

  { nome: "Instalações Hidráulicas", progresso: 45 },

  { nome: "Acabamento", progresso: 20 },

  { nome: "Pintura", progresso: 0 },
];

const inserirEtapasPadrao = async (obraId) => {
  try {
    const count = await Etapa.countDocuments({ obra: obraId });

    if (count === 0) {
      const etapasComObra = etapasPadrao.map((etapa) => ({
        ...etapa,

        obra: obraId,
      }));

      await Etapa.insertMany(etapasComObra);

      console.log("Etapas padrão inseridas com sucesso.");
    }
  } catch (error) {
    console.error("Erro ao inserir etapas padrão:", error);
  }
};

// Conexão ao MongoDB

mongoose

  .connect(
    "mongodb://Nexus_wayfallpan:84e7091321e8c8bbdd74986f5dadd8abf919018e@5f7qa.h.filess.io:27018/Nexus_wayfallpan",

    {
      useNewUrlParser: true,

      useUnifiedTopology: true,
    }
  )

  .then(() => {
    console.log("Conectado ao MongoDB");
  })

  .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

// Adicionar um beneficiário de exemplo ao banco de dados

app.post("/api/beneficiarios/exemplo", async (req, res) => {
  try {
    const exemploBeneficiario = new Beneficiario({
      name: "Beneficiário Exemplo",
    });

    const savedBeneficiario = await exemploBeneficiario.save();

    res.status(201).json(savedBeneficiario);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao adicionar beneficiário de exemplo:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para cadastrar um novo beneficiário

app.post("/api/beneficiarios", async (req, res) => {
  try {
    const beneficiario = new Beneficiario({
      ...req.body,

      endereco: req.body.endereco,
    });

    const savedBeneficiario = await beneficiario.save();

    res.status(201).json(savedBeneficiario);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao cadastrar beneficiário:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para cadastrar um novo cliente

app.post("/api/clientes", async (req, res) => {
  try {
    const cliente = new Cliente({
      ...req.body,
    });

    const savedCliente = await cliente.save();

    console.log("Cliente salvo:", savedCliente);

    res.status(201).json(savedCliente);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para importar clientes a partir de um arquivo JSON

app.post("/api/clientes/import", async (req, res) => {
  try {
    const clientes = req.body;

    if (!Array.isArray(clientes)) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const clientesToSave = clientes.map((cliente) => ({
      ...cliente,
    }));

    const savedClientes = await Cliente.insertMany(clientesToSave);

    console.log("Clientes salvos:", JSON.stringify(savedClientes, null, 2));

    res.status(201).json(savedClientes);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao importar clientes:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um registro

app.post("/records", async (req, res) => {
  try {
    const { beneficiario, fornecedor, date, services, totalValue } = req.body;

    if (!beneficiario || !fornecedor || !date || !services || !totalValue) {
      console.log("Campos obrigatórios ausentes");

      return res

        .status(400)

        .json({ message: "Todos os campos são obrigatórios" });
    }

    if (isNaN(Date.parse(date))) {
      console.log("Data inválida:", date);

      return res.status(400).json({ message: "Data inválida" });
    }

    const record = new Record({
      ...req.body,

      beneficiario: {
        ...beneficiario,

        endereco: beneficiario.endereco,
      },

      status: req.body.status || "pendente",

      ipAddress: req.clientIp,
    });

    const savedRecord = await record.save();

    res.status(201).json({ _id: savedRecord._id });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao salvar o registro:", error);

    res.status(400).json({ message: error.message });
  }
});

// Rota para listar todos os registros

app.get("/records", async (req, res) => {
  try {
    const records = await Record.find().lean();

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um registro específico

app.get("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`ID inválido: ${id}`);

      return res.status(400).json({ message: "ID inválido" });
    }

    const record = await Record.findById(id);

    if (!record) {
      console.log(`Registro não encontrado: ${id}`);

      return res.status(404).json({ message: "Registro não encontrado" });
    }

    res.json(record);
  } catch (error) {
    console.error("Erro ao buscar o registro:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um registro com assinatura

app.put("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { signature, signatureURL, status } = req.body;

    const record = await Record.findById(id);

    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }

    if (record.signature) {
      return res.status(400).json({ message: "Este recibo já foi assinado." });
    }

    record.signature = signature;

    record.signatureURL = signatureURL;

    record.status = status || record.status;

    const updatedRecord = await record.save();

    res.json(updatedRecord);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao atualizar o registro:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar a localização de um registro

app.put("/records/:id/location", async (req, res) => {
  try {
    const { id } = req.params;

    const { location } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return res

        .status(400)

        .json({ message: "Dados de localização inválidos" });
    }

    const updatedRecord = await Record.findByIdAndUpdate(
      id,

      { location },

      { new: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }

    res.json(updatedRecord);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao atualizar a localização do registro:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o status de um registro

app.patch("/records/:id/status", async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    const record = await Record.findById(id);

    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }

    record.status = status;

    const updatedRecord = await record.save();

    res.json(updatedRecord);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao atualizar o status do registro:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para listar registros por localização

app.get("/records/location/:location", async (req, res) => {
  try {
    const { location } = req.params;

    const records = await Record.find({ location });

    if (records.length === 0) {
      return res

        .status(404)

        .json({ message: "Nenhum registro encontrado para esta localização" });
    }

    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar registros por localização:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um registro

app.delete("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRecord = await Record.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }

    res.status(200).json({ message: "Registro excluído com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao excluir o registro:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir todos os beneficiários

app.delete("/api/beneficiarios", async (req, res) => {
  try {
    await Beneficiario.deleteMany({});

    res

      .status(200)

      .json({ message: "Todos os beneficiários foram excluídos com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao excluir todos os beneficiários:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um cliente

app.delete("/api/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCliente = await Cliente.findByIdAndDelete(id);

    if (!deletedCliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }

    res.status(200).json({ message: "Cliente excluído com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao excluir o cliente:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um fornecedor

app.delete("/api/fornecedores/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFornecedor = await Fornecedor.findByIdAndDelete(id);

    if (!deletedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }

    res.status(200).json({ message: "Fornecedor excluído com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao excluir o fornecedor:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os beneficiários

app.get("/api/beneficiarios", async (req, res) => {
  try {
    const beneficiarios = await Beneficiario.find().lean();

    console.log(
      "Beneficiários encontrados:",

      JSON.stringify(beneficiarios, null, 2)
    );

    res.json(beneficiarios);
  } catch (error) {
    console.error("Erro ao buscar beneficiários:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para listar recibos recusados

app.get("/records/recusados", async (req, res) => {
  try {
    const records = await Record.find({ status: "recusado" }).lean();

    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos recusados:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para listar recibos pendentes

app.get("/records/pendentes", async (req, res) => {
  try {
    const records = await Record.find({ status: "pendente" }).lean();

    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos pendentes:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para listar recibos aprovados

app.get("/records/aprovados", async (req, res) => {
  try {
    const records = await Record.find({ status: "aprovado" }).lean();

    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos aprovados:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para obter o próximo ID disponível

app.get("/records/nextId", async (req, res) => {
  try {
    const counter = await Counter.findById("recordId");

    const nextId = counter ? counter.seq + 1 : 1;

    res.json({ nextId });
  } catch (error) {
    console.error("Erro ao obter o próximo ID:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para obter o IP do banco de dados

app.get("/db/ip", (req, res) => {
  const dbUri = mongoose.connection.host;

  res.json({ dbIp: dbUri });
});

// Rota para obter a localização do banco de dados

app.get("/db/location", async (req, res) => {
  try {
    const dbUri = mongoose.connection.host;

    const locationResponse = await axios.get(`https://ipapi.co/${dbUri}/json/`);

    res.json({ dbLocation: locationResponse.data });
  } catch (error) {
    console.error("Erro ao obter a localização do banco de dados:", error);

    if (error.response && error.response.status === 429) {
      return res.status(429).json({
        message: "Muitas solicitações. Tente novamente mais tarde.",

        error: error.message,
      });
    }

    res.status(500).json({
      message: "Erro ao obter a localização do banco de dados",

      error: error.message,
    });
  }
});

// Rota para obter todos os recibos categorizados

app.get("/api/recibos", async (req, res) => {
  try {
    const recusados = await Record.find({ status: "recusado" })

      .sort({ _id: -1 })

      .limit(0);

    const pendentes = await Record.find({ status: "pendente" })

      .sort({ _id: -1 })

      .limit(0);

    const aprovados = await Record.find({ status: "aprovado" })

      .sort({ _id: -1 })

      .limit(0);

    res.json({ recusados, pendentes, aprovados });
  } catch (error) {
    console.error("Erro ao buscar recibos:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para assinar um recibo

app.post("/records/sign", async (req, res) => {
  try {
    const { id, ip, mac, location } = req.body;

    const record = await Record.findById(id);

    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }

    record.ipAddress = ip;

    record.macAddress = mac;

    record.status = "pendente";

    record.location = location;

    const updatedRecord = await record.save();

    res.json(updatedRecord);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao assinar o registro:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para receber dados do site e salvar no banco de dados

app.post("/api/recibos", async (req, res) => {
  try {
    const { formData } = req.body;

    if (
      !formData ||
      !formData.fornecedor ||
      !formData.beneficiario ||
      !formData.services
    ) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    const record = new Record({
      ...formData,

      date: formData.date?.date
        ? new Date(formData.date.date).toISOString()
        : null,

      ipAddress: req.clientIp,

      beneficiario: {
        ...formData.beneficiario,

        endereco: formData.beneficiario.endereco,
      },

      status: "pendente",
    });

    const savedRecord = await record.save();

    res.status(201).json({ _id: savedRecord._id });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao salvar o recibo:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para importar funcionários a partir de um arquivo JSON

app.post("/api/funcionarios/import", async (req, res) => {
  try {
    const funcionarios = req.body;

    if (!Array.isArray(funcionarios)) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const funcionariosToSave = funcionarios.map((funcionario) => {
      if (
        funcionario.dataNascimento &&
        isNaN(Date.parse(funcionario.dataNascimento))
      ) {
        funcionario.dataNascimento = null; // Definir como null se a data for inválida
      }

      return funcionario;
    });

    const savedFuncionarios = await Funcionario.insertMany(funcionariosToSave);

    console.log(
      "Funcionários salvos:",

      JSON.stringify(savedFuncionarios, null, 2)
    );

    res.status(201).json(savedFuncionarios);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao importar funcionários:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar um novo segmento

app.post("/api/segmentos", async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res

        .status(400)

        .json({ message: "Nome do segmento é obrigatório" });
    }

    const novoSegmento = new Segmento({ nome });

    await novoSegmento.save();

    res.status(201).json({ message: "Segmento adicionado com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao adicionar segmento:", error);

    res.status(500).json({ message: "Erro ao adicionar segmento" });
  }
});

// Rota para listar todos os segmentos

app.get("/api/segmentos", async (req, res) => {
  try {
    const segmentos = await Segmento.find().lean();

    res.json(segmentos);
  } catch (error) {
    console.error("Erro ao buscar segmentos:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar uma nova função

app.post("/api/funcoes", async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ message: "Nome da função é obrigatório" });
    }

    const novaFuncao = new Funcao({ nome });

    await novaFuncao.save();

    res.status(201).json({ message: "Função adicionada com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao adicionar função:", error);

    res.status(500).json({ message: "Erro ao adicionar função" });
  }
});

// Rota para adicionar uma nova forma de remuneração

app.post("/api/formasRemuneracao", async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res

        .status(400)

        .json({ message: "Nome da forma de remuneração é obrigatório" });
    }

    const novaFormaRemuneracao = new FormaRemuneracao({ nome });

    await novaFormaRemuneracao.save();

    res

      .status(201)

      .json({ message: "Forma de remuneração adicionada com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao adicionar forma de remuneração:", error);

    res.status(500).json({ message: "Erro ao adicionar forma de remuneração" });
  }
});

// Rota para listar todas as funções

app.get("/api/funcoes", async (req, res) => {
  try {
    const funcoes = await Funcao.find().lean();

    res.json(funcoes);
  } catch (error) {
    console.error("Erro ao buscar funções:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todas as formas de remuneração

app.get("/api/formasRemuneracao", async (req, res) => {
  try {
    const formasRemuneracao = await FormaRemuneracao.find().lean();

    res.json(formasRemuneracao);
  } catch (error) {
    console.error("Erro ao buscar formas de remuneração:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar um novo insumo

app.post("/api/insumos", async (req, res) => {
  try {
    const insumo = req.body;

    const novoInsumo = new Insumo(insumo);

    await novoInsumo.save();

    res.status(201).json(novoInsumo);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao adicionar insumo:", error);

    res.status(500).json({ message: "Erro ao adicionar insumo" });
  }
});

// Rota para listar todos os insumos

app.get("/api/insumos", async (req, res) => {
  try {
    const insumos = await Insumo.find().lean();

    res.json(insumos);
  } catch (error) {
    console.error("Erro ao buscar insumos:", error);

    res.status(500).json({ message: "Erro ao buscar insumos" });
  }
});

// Função para obter o endereço MAC do servidor

const getServerMacAddress = () => {
  const networkInterfaces = os.networkInterfaces();

  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];

    for (const alias of networkInterface) {
      if (alias.mac && alias.mac !== "00:00:00:00:00:00") {
        return alias.mac;
      }
    }
  }

  return null;
};

// Função para substituir valores em uma string

const safeReplace = (str, searchValue, replaceValue) => {
  if (typeof str === "string") {
    return str.replace(searchValue, replaceValue);
  }

  console.warn(`safeReplace: esperado string, mas recebeu ${typeof str}`);

  return str;
};

// Exemplo de uso da função safeReplace

const exampleString = "Hello, World!";

const replacedString = safeReplace(exampleString, "World", "JavaScript");

console.log(replacedString); // Output: Hello, JavaScript!

// Rota para obter a localização e o endereço MAC do servidor

app.get("/server/info", async (req, res) => {
  try {
    // Obtendo IP e localização diretamente do ipinfo.io

    const ipResponse = await axios.get(
      "https://ipinfo.io/json?token=c42ec638ad1e91"
    );

    const macAddress = getServerMacAddress();

    if (!macAddress) throw new Error("Endereço MAC não encontrado");

    console.log("IP do servidor:", ipResponse.data.ip);

    console.log("Localização do servidor:", ipResponse.data);

    console.log("Endereço MAC do servidor:", macAddress);

    res.json({
      ip: ipResponse.data.ip,

      location: ipResponse.data, // Já contém cidade, região, país e coordenadas

      macAddress: macAddress,
    });
  } catch (error) {
    console.error("Erro ao obter informações do servidor:", error);

    if (error.response && error.response.status === 429) {
      return res.status(429).json({
        message: "Muitas solicitações. Tente novamente mais tarde.",

        error: error.message,
      });
    }

    res.status(500).json({
      message: "Erro ao obter informações do servidor",

      error: error.message,
    });
  }
});

// Rota para listar todos os fornecedores

app.get("/api/fornecedores", async (req, res) => {
  try {
    const fornecedores = await Fornecedor.find().lean();

    res.json(fornecedores);
  } catch (error) {
    console.error("Erro ao buscar fornecedores:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para cadastrar um novo fornecedor

app.post("/api/fornecedores", async (req, res) => {
  try {
    const fornecedor = new Fornecedor({
      ...req.body,
    });

    const savedFornecedor = await fornecedor.save();

    res.status(201).json(savedFornecedor);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao cadastrar fornecedor:", error);

    res.status(500).json({ message: error.message, error });
  }
});

// Rota para atualizar um fornecedor

app.put("/api/fornecedores/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const fornecedor = req.body;

    const updatedFornecedor = await Fornecedor.findByIdAndUpdate(
      id,

      fornecedor,

      { new: true }
    );

    if (!updatedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }

    res.json(updatedFornecedor);

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um fornecedor

app.delete("/api/fornecedores/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFornecedor = await Fornecedor.findByIdAndDelete(id);

    if (!deletedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }

    res.status(200).json({ message: "Fornecedor excluído com sucesso" });

    await emitirAtualizacaoRecibos();
  } catch (error) {
    console.error("Erro ao excluir o fornecedor:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para verificar a duplicidade de CNPJ ou CPF para fornecedores

app.get("/api/fornecedores/check/:documento", async (req, res) => {
  try {
    const { documento } = req.params; // Remover formatação do documento

    const formattedDocumento = documento.replace(/[^\d]/g, "");

    console.log("Documento formatado:", formattedDocumento);

    const fornecedorExistente = await Fornecedor.findOne({
      $or: [{ cnpj: formattedDocumento }, { cpf: formattedDocumento }],
    });

    if (fornecedorExistente) {
      console.log("Documento já cadastrado:", fornecedorExistente);

      return res.json({ exists: true });
    } else {
      console.log("Documento não cadastrado");

      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Erro ao verificar duplicidade de documento:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para verificar a duplicidade de CNPJ ou CPF para clientes

app.get("/api/clientes/check/:documento", async (req, res) => {
  try {
    const { documento } = req.params;

    console.log("Verificando duplicidade para o documento:", documento); // Remover formatação do documento

    const formattedDocumento = documento.replace(/[^\d]/g, "");

    console.log("Documento formatado:", formattedDocumento);

    const clienteExistente = await Cliente.findOne({
      $or: [{ cnpj: formattedDocumento }, { cpf: formattedDocumento }],
    });

    if (clienteExistente) {
      console.log("Documento já cadastrado:", clienteExistente);

      return res.json({ exists: true });
    } else {
      console.log("Documento não cadastrado");

      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Erro ao verificar duplicidade de documento:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para consultar CNPJ

app.get("/consulta/:cnpj", async (req, res) => {
  try {
    const { cnpj } = req.params;

    const response = await axios.get(
      `https://www.receitaws.com.br/v1/cnpj/${cnpj}`
    );

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
    } = response.data;

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
    console.error(`Erro ao consultar CNPJ ${req.params.cnpj}:`, error);

    if (error.response) {
      res

        .status(error.response.status)

        .json({ message: "Erro ao consultar CNPJ", error: error.message });
    } else {
      res

        .status(500)

        .json({ message: "Erro ao consultar CNPJ", error: error.message });
    }
  }
});

// Função para enviar o e-mail de redefinição de senha

app.post("/api/users/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    const subject = "Redefinição de senha";

    const text = `Olá,



Você solicitou a redefinição de sua senha. Por favor, clique no link abaixo para redefinir sua senha:



[Redefinir Senha](https://www.i9systemas.com.br/reset-password?email=${email})



Se você não solicitou essa redefinição, por favor, ignore este e-mail.



Atenciosamente,

Equipe i9Systemas`;

    await sendEmail(email, subject, text);

    res.status(200).json({ message: "Email de redefinição de senha enviado" });
  } catch (error) {
    console.error("Erro ao enviar email:", error);

    res.status(500).json({ message: "Erro ao enviar email" });
  }
});

app.use("/api/beneficiarios", beneficiariosRouter);

app.use("/api/fornecedores", fornecedoresRouter);

app.use("/api/clientes", clientesRouter);

app.use("/api/funcionarios", funcionariosRouter);

app.use("/api/segmentos", segmentosRouter);

app.use("/api/insumos", insumosRouter);

app.use("/api/composicoes", composicoesRouter);

app.use("/api/users", usersRouter);

app.use("/api/tipos", typesRouter);

app.use("/api/unidades", unitsRouter);

app.use("/api/obras", obrasRouter);

app.use("/api/profissionais", profissionaisRouter);

app.use("/api/diarios", diariosRouter);

app.use("/api/orcamentos", orcamentosRouter);

app.use("/api/cotacoes", cotacoesRouter);

app.use("/api/ordens-compra", ordensCompraRouter);

app.use("/api/transacoes", transacoesIndependentesRoutes);

app.use("/api/duplicatas", transacoesBrutasRoutes);

app.use("/api/solicitacoes", solicitacoesRouter);

app.use("/api/obras/:obraId/solicitacoes", solicitacoesRouter);

app.use("/api/nfe", nfeRouter);

app.use("/api/inventario", inventarioRouter);

app.use("/api/medicoes", medicoesRouter);

// Rota para servir arquivos de upload

app.get("/api/files/:filename", (req, res) => {
  try {
    const { filename } = req.params;

    const filePath = `public/uploads/documentos/${filename}`; // Verificar se o arquivo existe

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    } // Determinar o tipo MIME baseado na extensão

    const ext = path.extname(filename).toLowerCase();

    let contentType = "application/octet-stream";

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf";

        break;

      case ".jpg":

      case ".jpeg":
        contentType = "image/jpeg";

        break;

      case ".png":
        contentType = "image/png";

        break;

      case ".doc":
        contentType = "application/msword";

        break;

      case ".docx":
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        break;

      case ".xls":
        contentType = "application/vnd.ms-excel";

        break;

      case ".xlsx":
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        break;
    }

    res.setHeader("Content-Type", contentType);

    res.setHeader("Content-Disposition", `inline; filename="${filename}"`); // Enviar o arquivo

    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);
  } catch (error) {
    console.error("Erro ao servir arquivo:", error);

    res.status(500).json({ message: "Erro ao carregar arquivo" });
  }
});

// Rota para listar arquivos disponíveis

app.get("/api/files", (req, res) => {
  try {
    const documentosPath = "public/uploads/documentos";

    if (!fs.existsSync(documentosPath)) {
      return res.json({ files: [] });
    }

    const files = fs

      .readdirSync(documentosPath)

      .filter((file) => {
        const ext = path.extname(file).toLowerCase();

        return [
          ".pdf",

          ".jpg",

          ".jpeg",

          ".png",

          ".doc",

          ".docx",

          ".xls",

          ".xlsx",
        ].includes(ext);
      })

      .map((file) => {
        const filePath = path.join(documentosPath, file);

        const stats = fs.statSync(filePath);

        return {
          filename: file,

          size: stats.size,

          created: stats.birthtime,

          modified: stats.mtime,

          url: `/api/files/${file}`,
        };
      });

    res.json({ files });
  } catch (error) {
    console.error("Erro ao listar arquivos:", error);

    res.status(500).json({ message: "Erro ao listar arquivos" });
  }
});

// Emitir evento de atualização de recibos

const emitirAtualizacaoRecibos = async () => {
  try {
    const recusados = await Record.find({ status: "recusado" }).lean();

    const pendentes = await Record.find({ status: "pendente" }).lean();

    const aprovados = await Record.find({ status: "aprovado" }).lean();

    io.emit("recibosAtualizados", { recusados, pendentes, aprovados });
  } catch (error) {
    console.error("Erro ao emitir atualização de recibos:", error);
  }
};

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`); // Inicializar scheduler após o servidor estar rodando

  initScheduler();
});

// Rota para testar o scheduler manualmente

app.post("/api/scheduler/test", async (req, res) => {
  try {
    console.log("🔄 Teste manual do scheduler solicitado...");

    await runDailyReminders();

    res.json({ message: "Lembrete diário executado com sucesso!" });
  } catch (error) {
    console.error("❌ Erro no teste do scheduler:", error);

    res.status(500).json({ message: "Erro ao executar lembrete diário" });
  }
});

// Rota para verificar status do scheduler

app.get("/api/scheduler/status", async (req, res) => {
  try {
    const status = {
      mongoConnected: mongoose.connection.readyState === 1,

      mongoState: mongoose.connection.readyState,

      emailConfigured: !!(
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS &&
        process.env.EMAIL_FROM
      ),

      emailUser: process.env.EMAIL_USER ? "Configurado" : "Não configurado",

      emailFrom: process.env.EMAIL_FROM || "Não configurado",

      serverTime: new Date().toLocaleString("pt-BR"),

      timezone: "America/Sao_Paulo",
    };

    res.json(status);
  } catch (error) {
    console.error("❌ Erro ao verificar status do scheduler:", error);

    res.status(500).json({ message: "Erro ao verificar status" });
  }
});

// Rota para listar recibos recusados

app.get("/api/records", async (req, res) => {
  try {
    const { status } = req.query;

    if (!status) {
      return res.status(400).json({ message: "Status é obrigatório" });
    }

    const records = await Record.find({ status }).lean();

    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos:", error);

    res.status(500).json({ message: error.message });
  }
});

app.post("/api/obras", async (req, res) => {
  try {
    // ...existing code...

    const savedObra = await obra.save();

    await inserirEtapasPadrao(savedObra._id); // Adicionado

    res.status(201).json(savedObra);
  } catch (error) {
    console.error("Erro ao criar obra:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova solicitação

app.post("/api/obras/:obraId/solicitacoes", async (req, res) => {
  try {
    const { obraId } = req.params;

    const solicitacaoData = req.body;

    const numeroSequencial =
      (await Solicitacao.countDocuments({ obra: obraId })) + 1;

    const novaSolicitacao = new Solicitacao({
      ...solicitacaoData,

      obra: obraId,

      solicitante: solicitacaoData.solicitante,

      obraNome: solicitacaoData.obraNome,

      numeroSequencial,
    });

    const savedSolicitacao = await novaSolicitacao.save();

    res.status(201).json(savedSolicitacao);
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);

    res.status(500).json({ message: "Erro ao criar solicitação" });
  }
});

// Rota para obter todas as solicitações

app.get("/api/solicitacoes", async (req, res) => {
  try {
    const solicitacoes = await Solicitacao.find().lean();

    res.json(solicitacoes);
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);

    res.status(500).json({ message: "Erro ao buscar solicitações" });
  }
});

// Rota para obter todas as solicitações de uma obra

app.get("/api/obras/:obraId/solicitacoes", async (req, res) => {
  try {
    const { obraId } = req.params;

    const solicitacoes = await Solicitacao.find({ obra: obraId }).lean();

    res.json(solicitacoes);
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);

    res.status(500).json({ message: "Erro ao buscar solicitações" });
  }
});

// Rota para obter uma solicitação específica

app.get("/api/solicitacoes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const solicitacao = await Solicitacao.findById(id).lean();

    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    res.json(solicitacao);
  } catch (error) {
    console.error("Erro ao buscar solicitação:", error);

    res.status(500).json({ message: "Erro ao buscar solicitação" });
  }
});

// Rota para atualizar uma solicitação

app.put("/api/solicitacoes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const solicitacaoData = req.body;

    const updatedSolicitacao = await Solicitacao.findByIdAndUpdate(
      id,

      solicitacaoData,

      { new: true }
    );

    if (!updatedSolicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    res.json(updatedSolicitacao);
  } catch (error) {
    console.error("Erro ao atualizar solicitação:", error);

    res.status(500).json({ message: "Erro ao atualizar solicitação" });
  }
});

// Rota para atualizar o status de uma solicitação

app.patch("/api/solicitacoes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    const solicitacao = await Solicitacao.findById(id);

    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    solicitacao.status = status;

    const updatedSolicitacao = await solicitacao.save();

    res.json(updatedSolicitacao);
  } catch (error) {
    console.error("Erro ao atualizar status da solicitação:", error);

    res

      .status(500)

      .json({ message: "Erro ao atualizar status da solicitação" });
  }
});

// Rota para excluir uma solicitação

app.delete("/api/solicitacoes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSolicitacao = await Solicitacao.findByIdAndDelete(id);

    if (!deletedSolicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    res.status(200).json({ message: "Solicitação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir solicitação:", error);

    res.status(500).json({ message: "Erro ao excluir solicitação" });
  }
});

// Rota para obter fornecedores selecionados para uma solicitação

app.get("/api/cotacoes/:solicitacaoId/fornecedores", async (req, res) => {
  try {
    const { solicitacaoId } = req.params;

    if (!solicitacaoId) {
      return res

        .status(400)

        .json({ message: "ID da solicitação é obrigatório" });
    }

    const solicitacao = await Solicitacao.findById(solicitacaoId).populate(
      "fornecedores"
    );

    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    res.json(solicitacao.fornecedores);
  } catch (error) {
    console.error("Erro ao buscar fornecedores selecionados:", error);

    res

      .status(500)

      .json({ message: "Erro ao buscar fornecedores selecionados" });
  }
});

// Rota para adicionar fornecedores a uma solicitação

app.post("/api/cotacoes/:solicitacaoId/fornecedores", async (req, res) => {
  try {
    const { solicitacaoId } = req.params;

    const { fornecedores } = req.body;

    const solicitacao = await Solicitacao.findById(solicitacaoId);

    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    solicitacao.fornecedores = fornecedores;

    await solicitacao.save();

    res.status(200).json(solicitacao.fornecedores);
  } catch (error) {
    console.error("Erro ao salvar fornecedores selecionados:", error);

    res

      .status(500)

      .json({ message: "Erro ao salvar fornecedores selecionados" });
  }
});

// Rota para remover um fornecedor de uma solicitação

app.delete(
  "/api/cotacoes/:solicitacaoId/fornecedores/:fornecedorId",

  async (req, res) => {
    try {
      const { solicitacaoId, fornecedorId } = req.params;

      const solicitacao = await Solicitacao.findById(solicitacaoId);

      if (!solicitacao) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }

      solicitacao.fornecedores = solicitacao.fornecedores.filter(
        (fornecedor) => fornecedor.toString() !== fornecedorId
      );

      await solicitacao.save();

      res.status(200).json(solicitacao.fornecedores);
    } catch (error) {
      console.error("Erro ao remover fornecedor:", error);

      res.status(500).json({ message: "Erro ao remover fornecedor" });
    }
  }
);

// Rota para listar receitas de uma obra

app.get("/api/obras/:id/receitas", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("receitas");

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.receitas);
  } catch (error) {
    console.error("Erro ao buscar receitas:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para listar pagamentos de uma obra

app.get("/api/obras/:id/pagamentos", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("pagamentos");

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.pagamentos);
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova receita

app.post("/api/obras/:id/receitas", async (req, res) => {
  try {
    const { id } = req.params;

    const novaReceita = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,

      { $push: { receitas: novaReceita } },

      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(201).json(novaReceita);
  } catch (error) {
    console.error("Erro ao criar receita:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo pagamento

app.post("/api/obras/:id/pagamentos", async (req, res) => {
  try {
    const { id } = req.params;

    const novoPagamento = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,

      { $push: { pagamentos: novoPagamento } },

      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(201).json(novoPagamento);
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para editar uma receita

app.put("/api/obras/:id/receitas/:receitaId", async (req, res) => {
  try {
    const { id, receitaId } = req.params;

    const receitaAtualizada = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(receitaId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findOneAndUpdate(
      { _id: id, "receitas._id": receitaId },

      { $set: { "receitas.$": receitaAtualizada } },

      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Receita não encontrada" });
    }

    res.status(200).json(receitaAtualizada);
  } catch (error) {
    console.error("Erro ao editar receita:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para editar um pagamento

app.put("/api/obras/:id/pagamentos/:pagamentoId", async (req, res) => {
  try {
    const { id, pagamentoId } = req.params;

    const pagamentoAtualizado = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(pagamentoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findOneAndUpdate(
      { _id: id, "pagamentos._id": pagamentoId },

      { $set: { "pagamentos.$": pagamentoAtualizado } },

      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    res.status(200).json(pagamentoAtualizado);
  } catch (error) {
    console.error("Erro ao editar pagamento:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma receita

app.delete("/api/obras/:id/receitas/:receitaId", async (req, res) => {
  try {
    const { id, receitaId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(receitaId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,

      { $pull: { receitas: { _id: receitaId } } },

      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Receita não encontrada" });
    }

    res.status(200).json({ message: "Receita excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir receita:", error);

    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um pagamento

app.delete("/api/obras/:id/pagamentos/:pagamentoId", async (req, res) => {
  try {
    const { id, pagamentoId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(pagamentoId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,

      { $pull: { pagamentos: { _id: pagamentoId } } },

      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Pagamento não encontrado" });
    }

    res.status(200).json({ message: "Pagamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);

    res.status(500).json({ message: error.message });
  }
});
