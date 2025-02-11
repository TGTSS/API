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
import Funcionario from "./models/Funcionario.js"; // Adicionei esta linha
import Segmento from "./models/Segmento.js"; // Adicionei esta linha
import segmentosRouter from "./routes/segmentos.js"; // Adicionei esta linha
import Funcao from "./models/Funcao.js"; // Adicionei esta linha
import FormaRemuneracao from "./models/FormaRemuneracao.js"; // Adicionei esta linha
import insumosRouter from "./routes/insumos.js"; // Adicionei esta linha
import Insumo from "./models/Insumo.js"; // Adicionei esta linha
import composicoesRouter from "./routes/composicoes.js"; // Adicionei esta linha
import usersRouter from "./routes/users.js"; // Adicione esta linha
import typesRouter from "./routes/types.js"; // Adicione esta linha
import unitsRouter from "./routes/units.js"; // Adicione esta linha

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
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
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

// Conexão ao MongoDB
mongoose
  .connect(
    "mongodb://Nexus_wayfallpan:84e7091321e8c8bbdd74986f5dadd8abf919018e@5f7qa.h.filess.io:27018/Nexus_wayfallpan",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Conectado ao MongoDB"))
  .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

// Adicionar um beneficiário de exemplo ao banco de dados
app.post("/api/beneficiarios/exemplo", async (req, res) => {
  try {
    console.log("Rota POST /api/beneficiarios/exemplo chamada");
    const exemploBeneficiario = new Beneficiario({
      name: "Beneficiário Exemplo",
    });
    const savedBeneficiario = await exemploBeneficiario.save();
    res.status(201).json(savedBeneficiario);
  } catch (error) {
    console.error("Erro ao adicionar beneficiário de exemplo:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para cadastrar um novo beneficiário
app.post("/api/beneficiarios", async (req, res) => {
  try {
    console.log("Rota POST /api/beneficiarios chamada");
    const beneficiario = new Beneficiario({
      ...req.body,
      endereco: req.body.endereco,
    });
    const savedBeneficiario = await beneficiario.save();
    res.status(201).json(savedBeneficiario);
  } catch (error) {
    console.error("Erro ao cadastrar beneficiário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para cadastrar um novo cliente
app.post("/api/clientes", async (req, res) => {
  try {
    console.log("Rota POST /api/clientes chamada");
    console.log("Dados recebidos:", req.body);

    const cliente = new Cliente({
      ...req.body,
    });

    console.log("Objeto Cliente a ser salvo:", cliente.toObject());

    const savedCliente = await cliente.save();
    console.log("Cliente salvo:", savedCliente);
    res.status(201).json(savedCliente);
  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para importar clientes a partir de um arquivo JSON
app.post("/api/clientes/import", async (req, res) => {
  try {
    console.log("Rota POST /api/clientes/import chamada");
    const clientes = req.body;
    if (!Array.isArray(clientes)) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const clientesToSave = clientes.map((cliente) => ({
      ...cliente,
    }));

    console.log(
      "Clientes a serem salvos:",
      JSON.stringify(clientesToSave, null, 2)
    );

    const savedClientes = await Cliente.insertMany(clientesToSave);
    console.log("Clientes salvos:", JSON.stringify(savedClientes, null, 2));
    res.status(201).json(savedClientes);
  } catch (error) {
    console.error("Erro ao importar clientes:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um registro
app.post("/records", async (req, res) => {
  try {
    console.log("Rota POST /records chamada");
    console.log("Dados recebidos:", req.body);
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
  } catch (error) {
    console.error("Erro ao salvar o registro:", error);
    res.status(400).json({ message: error.message });
  }
});

// Rota para listar todos os registros
app.get("/records", async (req, res) => {
  try {
    console.log("Rota GET /records chamada");
    const records = await Record.find().lean();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um registro específico
app.get("/records/:id", async (req, res) => {
  try {
    console.log(`Rota GET /records/${req.params.id} chamada`);
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
    console.log(`Rota PUT /records/${req.params.id} chamada`);
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
  } catch (error) {
    console.error("Erro ao atualizar o registro:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar a localização de um registro
app.put("/records/:id/location", async (req, res) => {
  try {
    console.log(`Rota PUT /records/${req.params.id}/location chamada`);
    const { id } = req.params;
    const { location } = req.body;
    console.log("Atualizando localização para o registro:", id);
    console.log("Nova localização:", location);

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
  } catch (error) {
    console.error("Erro ao atualizar a localização do registro:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o status de um registro
app.patch("/records/:id/status", async (req, res) => {
  try {
    console.log(`Rota PATCH /records/${req.params.id}/status chamada`);
    const { id } = req.params;
    const { status } = req.body;
    const record = await Record.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    record.status = status;
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    console.error("Erro ao atualizar o status do registro:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar registros por localização
app.get("/records/location/:location", async (req, res) => {
  try {
    console.log(`Rota GET /records/location/${req.params.location} chamada`);
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
    console.log(`Rota DELETE /records/${req.params.id} chamada`);
    const { id } = req.params;
    const deletedRecord = await Record.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    res.status(200).json({ message: "Registro excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir o registro:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir todos os registros
app.delete("/records", async (req, res) => {
  try {
    console.log("Rota DELETE /records chamada");
    await Record.deleteMany({});
    res
      .status(200)
      .json({ message: "Todos os registros foram excluídos com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir todos os registros:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir todos os beneficiários
app.delete("/api/beneficiarios", async (req, res) => {
  try {
    console.log("Rota DELETE /api/beneficiarios chamada");
    await Beneficiario.deleteMany({});
    res
      .status(200)
      .json({ message: "Todos os beneficiários foram excluídos com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir todos os beneficiários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um cliente
app.delete("/api/clientes/:id", async (req, res) => {
  try {
    console.log(`Rota DELETE /api/clientes/${req.params.id} chamada`);
    const { id } = req.params;
    const deletedCliente = await Cliente.findByIdAndDelete(id);
    if (!deletedCliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.status(200).json({ message: "Cliente excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir o cliente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um fornecedor
app.delete("/api/fornecedores/:id", async (req, res) => {
  try {
    console.log(`Rota DELETE /api/fornecedores/${req.params.id} chamada`);
    const { id } = req.params;
    const deletedFornecedor = await Fornecedor.findByIdAndDelete(id);
    if (!deletedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }
    res.status(200).json({ message: "Fornecedor excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir o fornecedor:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os beneficiários
app.get("/api/beneficiarios", async (req, res) => {
  try {
    console.log("Rota GET /api/beneficiarios chamada");
    const beneficiarios = await Beneficiario.find().lean();
    console.log(
      "Beneficiários carregados:",
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
    console.log("Rota GET /records/recusados chamada");
    const records = await Record.find({ status: "recusado" }).lean();
    console.log("Recibos recusados encontrados:", records);
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos recusados:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar recibos pendentes
app.get("/records/pendentes", async (req, res) => {
  try {
    console.log("Rota GET /records/pendentes chamada");
    const records = await Record.find({ status: "pendente" }).lean();
    console.log("Recibos pendentes encontrados:", records);
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos pendentes:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar recibos aprovados
app.get("/records/aprovados", async (req, res) => {
  try {
    console.log("Rota GET /records/aprovados chamada");
    const records = await Record.find({ status: "aprovado" }).lean();
    console.log("Recibos aprovados encontrados:", records);
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos aprovados:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter o próximo ID disponível
app.get("/records/nextId", async (req, res) => {
  try {
    console.log("Rota GET /records/nextId chamada");
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
    res
      .status(500)
      .json({ message: "Erro ao obter a localização do banco de dados" });
  }
});

// Rota para obter todos os recibos categorizados
app.get("/api/recibos", async (req, res) => {
  try {
    console.log("Rota GET /api/recibos chamada");
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
    record.status = "assinado";
    record.location = location;
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    console.error("Erro ao assinar o registro:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para receber dados do site e salvar no banco de dados
app.post("/api/recibos", async (req, res) => {
  try {
    console.log("Rota POST /api/recibos chamada");
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
  } catch (error) {
    console.error("Erro ao salvar o recibo:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para importar funcionários a partir de um arquivo JSON
app.post("/api/funcionarios/import", async (req, res) => {
  try {
    console.log("Rota POST /api/funcionarios/import chamada");
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
  } catch (error) {
    console.error("Erro ao adicionar segmento:", error);
    res.status(500).json({ message: "Erro ao adicionar segmento" });
  }
});

// Rota para listar todos os segmentos
app.get("/api/segmentos", async (req, res) => {
  try {
    console.log("Rota GET /api/segmentos chamada");
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
  } catch (error) {
    console.error("Erro ao adicionar forma de remuneração:", error);
    res.status(500).json({ message: "Erro ao adicionar forma de remuneração" });
  }
});

// Rota para listar todas as funções
app.get("/api/funcoes", async (req, res) => {
  try {
    console.log("Rota GET /api/funcoes chamada");
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
    console.log("Rota GET /api/formasRemuneracao chamada");
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
    const ipResponse = await axios.get("https://api.ipify.org?format=json");
    const locationResponse = await axios.get(
      `https://ipapi.co/${ipResponse.data.ip}/json/`
    );
    const macAddress = getServerMacAddress();

    if (!macAddress) {
      throw new Error("Endereço MAC não encontrado");
    }

    console.log("IP do servidor:", ipResponse.data.ip);
    console.log("Localização do servidor:", locationResponse.data);
    console.log("Endereço MAC do servidor:", macAddress);

    res.json({
      ip: ipResponse.data.ip,
      location: locationResponse.data,
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
    console.log("Rota GET /api/fornecedores chamada");
    const fornecedores = await Fornecedor.find().lean();
    res.json(fornecedores);
  } catch (error) {
    console.error("Erro ao buscar fornecedores:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um fornecedor
app.put("/api/fornecedores/:id", async (req, res) => {
  try {
    console.log(`Rota PUT /api/fornecedores/${req.params.id} chamada`);
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
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um fornecedor
app.delete("/api/fornecedores/:id", async (req, res) => {
  try {
    console.log(`Rota DELETE /api/fornecedores/${req.params.id} chamada`);
    const { id } = req.params;
    const deletedFornecedor = await Fornecedor.findByIdAndDelete(id);
    if (!deletedFornecedor) {
      return res.status(404).json({ message: "Fornecedor não encontrado" });
    }
    res.status(200).json({ message: "Fornecedor excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir o fornecedor:", error);
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

app.use("/api/beneficiarios", beneficiariosRouter);
app.use("/api/fornecedores", fornecedoresRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/funcionarios", funcionariosRouter);
app.use("/api/segmentos", segmentosRouter); // Adicionei esta linha
app.use("/api/insumos", insumosRouter); // Adicionei esta linha
app.use("/api/composicoes", composicoesRouter); // Adicionei esta linha
app.use("/api/users", usersRouter); // Adicione esta linha
app.use("/api/tipos", typesRouter); // Adicione esta linha
app.use("/api/unidades", unitsRouter); // Adicione esta linha

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Allowed Origins: ${allowedOrigins.join(", ")}`);
});
