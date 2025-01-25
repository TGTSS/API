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

const app = express();

// Middlewares
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://nexustecnologia.modernaedificacoes.com.br" // Corrigir para https
];
app.use(
  cors({
    origin: allowedOrigins, // Usar allowedOrigins
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (ip === '::1') {
    ip = '127.0.0.1'; // Tratar o caso de localhost IPv6
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
    console.log("Rota POST /api/beneficiarios/exemplo chamada"); // Log para depuração
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
    console.log("Rota POST /api/beneficiarios chamada"); // Log para depuração
    const beneficiario = new Beneficiario(req.body);
    const savedBeneficiario = await beneficiario.save();
    res.status(201).json(savedBeneficiario);
  } catch (error) {
    console.error("Erro ao cadastrar beneficiário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um registro
app.post("/records", async (req, res) => {
  try {
    console.log("Rota POST /records chamada"); // Log para depuração
    console.log("Dados recebidos:", req.body); // Adicione este log para depuração
    const { beneficiario, fornecedor, date, services, totalValue } = req.body;

    // Verifique se todos os campos necessários estão presentes
    if (!beneficiario || !fornecedor || !date || !services || !totalValue) {
      console.log("Campos obrigatórios ausentes"); // Log para depuração
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios" });
    }

    // Verifique se o campo date é um objeto Date válido
    if (isNaN(Date.parse(date))) {
      console.log("Data inválida:", date); // Log para depuração
      return res.status(400).json({ message: "Data inválida" });
    }

    const record = new Record({
      ...req.body,
      status: req.body.status || "pendente", // Adicionar o campo status
      ipAddress: req.clientIp // Adicionar o endereço IP do cliente
    });
    const savedRecord = await record.save();
    res.status(201).json({ _id: savedRecord._id }); // Retornar o _id gerado
  } catch (error) {
    console.error("Erro ao salvar o registro:", error); // Adicione este log para depuração
    res.status(400).json({ message: error.message });
  }
});

// Rota para listar todos os registros
app.get("/records", async (req, res) => {
  try {
    console.log("Rota GET /records chamada"); // Log para depuração
    const records = await Record.find();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um registro específico
app.get("/records/:id", async (req, res) => {
  try {
    console.log(`Rota GET /records/${req.params.id} chamada`); // Log para depuração
    const { id } = req.params;
    const record = await Record.findById(id); // Buscar pelo campo _id
    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    res.json(record);
  } catch (error) {
    console.error("Erro ao buscar o registro:", error); // Adicionar log para depuração
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um registro com assinatura
app.put("/records/:id", async (req, res) => {
  try {
    console.log(`Rota PUT /records/${req.params.id} chamada`); // Log para depuração
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
    console.log(`Rota PUT /records/${req.params.id}/location chamada`); // Log para depuração
    const { id } = req.params;
    const { location } = req.body; // Receber o objeto location diretamente
    console.log("Atualizando localização para o registro:", id); // Log para depuração
    console.log("Nova localização:", location); // Log para depuração

    // Verifique se os dados de localização estão presentes
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
app.put("/records/:id/status", async (req, res) => {
  try {
    console.log(`Rota PUT /records/${req.params.id}/status chamada`); // Log para depuração
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
    console.log(`Rota GET /records/location/${req.params.location} chamada`); // Log para depuração
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
    console.log(`Rota DELETE /records/${req.params.id} chamada`); // Log para depuração
    const { id } = req.params;
    const deletedRecord = await Record.findByIdAndDelete(id); // Excluir pelo campo _id
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
    console.log("Rota DELETE /records chamada"); // Log para depuração
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
    console.log("Rota DELETE /api/beneficiarios chamada"); // Log para depuração
    await Beneficiario.deleteMany({});
    res
      .status(200)
      .json({ message: "Todos os beneficiários foram excluídos com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir todos os beneficiários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os beneficiários
app.get("/api/beneficiarios", async (req, res) => {
  try {
    console.log("Rota GET /api/beneficiarios chamada"); // Log para depuração
    const beneficiarios = await Beneficiario.find();
    console.log("Beneficiários carregados:", JSON.stringify(beneficiarios, null, 2)); // Modificar log para exibir beneficiários no formato solicitado
    res.setHeader("Content-Type", "application/json"); // Adicionar cabeçalho Content-Type
    res.json(beneficiarios);
  } catch (error) {
    console.error("Erro ao buscar beneficiários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar recibos recusados
app.get("/records/recusados", async (req, res) => {
  try {
    console.log("Rota GET /records/recusados chamada"); // Log para depuração
    const records = await Record.find({ status: "recusado" });
    console.log("Recibos recusados encontrados:", records); // Log para depuração
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos recusados:", error); // Log para depuração
    res.status(500).json({
      message: "Erro ao buscar recibos recusados",
      error: error.message,
    });
  }
});

// Rota para listar recibos pendentes
app.get("/records/pendentes", async (req, res) => {
  try {
    console.log("Rota GET /records/pendentes chamada"); // Log para depuração
    const records = await Record.find({ status: "pendente" });
    console.log("Recibos pendentes encontrados:", records); // Log para depuração
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos pendentes:", error); // Log para depuração
    res.status(500).json({
      message: "Erro ao buscar recibos pendentes",
      error: error.message,
    });
  }
});

// Rota para listar recibos aprovados
app.get("/records/aprovados", async (req, res) => {
  try {
    console.log("Rota GET /records/aprovados chamada"); // Log para depuração
    const records = await Record.find({ status: "aprovado" });
    console.log("Recibos aprovados encontrados:", records); // Log para depuração
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos aprovados:", error); // Log para depuração
    res.status(500).json({
      message: "Erro ao buscar recibos aprovados",
      error: error.message,
    });
  }
});

// Rota para obter o próximo ID disponível
app.get("/records/nextId", async (req, res) => {
  try {
    console.log("Rota GET /records/nextId chamada"); // Log para depuração
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
    res.status(500).json({ message: "Erro ao obter a localização do banco de dados" });
  }
});

// Rota para obter todos os recibos categorizados
app.get("/api/recibos", async (req, res) => {
  try {
    console.log("Rota GET /api/recibos chamada"); // Log para depuração
    const recusados = await Record.find({ status: "recusado" }).sort({ _id: -1 }).limit(0);
    const pendentes = await Record.find({ status: "pendente" }).sort({ _id: -1 }).limit(0);
    const aprovados = await Record.find({ status: "aprovado" }).sort({ _id: -1 }).limit(0);
    res.json({ recusados, pendentes, aprovados });
  } catch (error) {
    console.error("Erro ao buscar recibos:", error); // Log para depuração
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
    record.location = location; // Atualizar a localização diretamente
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    console.error("Erro ao assinar o registro:", error);
    res.status(500).json({ message: error.message });
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

// Rota para obter a localização e o endereço MAC do servidor
app.get("/server/info", async (req, res) => {
  try {
    const ipResponse = await axios.get("https://api.ipify.org?format=json");
    const locationResponse = await axios.get(`https://ipapi.co/${ipResponse.data.ip}/json/`);
    const macAddress = getServerMacAddress();

    console.log("IP do servidor:", ipResponse.data.ip); // Log do IP
    console.log("Localização do servidor:", locationResponse.data); // Log da localização
    console.log("Endereço MAC do servidor:", macAddress); // Log do endereço MAC

    res.json({
      ip: ipResponse.data.ip,
      location: locationResponse.data,
      macAddress: macAddress,
    });
  } catch (error) {
    console.error("Erro ao obter informações do servidor:", error);
    res.status(500).json({ message: "Erro ao obter informações do servidor" });
  }
});

app.use("/api/beneficiarios", beneficiariosRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
