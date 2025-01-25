import mongoose from "mongoose";
import Counter from "./Counter.js";

// Definindo o esquema
const RecordSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  beneficiario: {
    name: { type: String, required: true },
    document: { type: String, required: true },
    phone: { type: String, default: "" },
    latitude: { type: Number }, // Adicionar campo latitude
    longitude: { type: Number } // Adicionar campo longitude
  },
  fornecedor: {
    name: { type: String, required: true, default: "MODERNA EDIFICAÇÕES & EMPREENDIMENTOS" },
    cnpj: { type: String, required: true, default: "22.484.557/0001-88" },
    phone: { type: String, default: "(00) 0 0000-0000" },
    endereco: {
      rua: { type: String, required: true, default: "Rua Dona Lidinha Falcâo, WestFlat, Loja 02" },
      numero: { type: String, required: true, default: "2221" },
      bairro: { type: String, required: true, default: "Bela Vista" },
      cidade: { type: String, required: true, default: "Mossoro/RN" },
      cep: { type: String, required: true, default: "59612-045" },
    },
  },
  endereco: {
    rua: { type: String, default: "" },
    numero: { type: String, default: "" },
    bairro: { type: String, default: "" },
    cidade: { type: String, default: "" },
    cep: { type: String, default: "" },
    complemento: { type: String, default: "" }, // Adicionar campo complemento
  },
  description: { type: String },
  date: { type: Date, required: true },
  services: [
    {
      description: { type: String, default: "" },
      value: { type: String, required: true },
    },
  ],
  totalValue: { type: String, required: true },
  status: { type: String, required: true, enum: ['recusado', 'pendente', 'aprovado', 'assinado'], default: 'pendente' },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    rua: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },
    pais: { type: String }
  },
  locationDetails: { type: Object }, // Certifique-se de que o tipo está correto
  signature: { type: String }, // Remover a obrigatoriedade do campo signature
  signatureURL: { type: String }, // Adicionar campo para armazenar a URL da imagem da assinatura
  ipAddress: { type: String }, // Adicionar campo para armazenar o endereço IP
  macAddress: { type: String } // Adicionar campo para armazenar o endereço MAC
});

// Middleware para gerar ID sequencial
RecordSchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    console.log("Gerando ID sequencial para o novo registro"); // Log para depuração
    const counter = await Counter.findByIdAndUpdate(
      { _id: "recordId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.id = counter.seq;
    console.log("ID sequencial gerado:", this.id); // Log para depuração
    next();
  } catch (error) {
    console.error("Erro ao gerar ID sequencial:", error); // Log para depuração
    next(error);
  }
});

// Exportando o modelo
const Record = mongoose.model("Record", RecordSchema);

export default Record;
