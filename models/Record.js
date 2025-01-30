import mongoose from "mongoose";
import Counter from "./Counter.js";

// Definindo o esquema
const RecordSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  beneficiario: {
    name: { type: String, required: true },
    document: { type: String, required: true },
    phone: { type: String, default: "" },
    endereco: {
      logradouro: { type: String, default: "" },
      numero: { type: String, default: "" },
      bairro: { type: String, default: "" },
      cidade: { type: String, default: "" },
      cep: { type: String, default: "" },
      complemento: { type: String, default: "" },
      uf: { type: String, default: "" }
    },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  fornecedor: {
    name: { type: String, required: true, default: "MODERNA EDIFICAÇÕES & EMPREENDIMENTOS" },
    cnpj: { type: String, required: true, default: "22.484.557/0001-88" },
    phone: { type: String, default: "(00) 0 0000-0000" },
    email: { type: String, default: "" },
    endereco: {
      logradouro: { type: String, required: true, default: "Rua Dona Lidinha Falcâo, WestFlat, Loja 02" },
      numero: { type: String, required: true, default: "2221" },
      bairro: { type: String, required: true, default: "Bela Vista" },
      cidade: { type: String, required: true, default: "Mossoro/RN" },
      cep: { type: String, required: true, default: "59612-045" },
      uf: { type: String, required: true }
    },
  },
  endereco: {
    rua: { type: String, default: "" },
    numero: { type: String, default: "" },
    bairro: { type: String, default: "" },
    cidade: { type: String, default: "" },
    cep: { type: String, default: "" },
    complemento: { type: String, default: "" },
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
  locationDetails: { type: Object },
  signature: { type: String },
  signatureURL: { type: String },
  ipAddress: { type: String },
  macAddress: { type: String }
});

// Middleware para gerar ID sequencial
RecordSchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    console.log("Gerando ID sequencial para o novo registro");
    const counter = await Counter.findByIdAndUpdate(
      { _id: "recordId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.id = counter.seq;
    console.log("ID sequencial gerado:", this.id);
    next();
  } catch (error) {
    console.error("Erro ao gerar ID sequencial:", error);
    next(error);
  }
});

// Exportando o modelo
const Record = mongoose.model("Record", RecordSchema);

export default Record;
