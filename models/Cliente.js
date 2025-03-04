import mongoose from "mongoose";

const ClienteSchema = new mongoose.Schema({
  tipo: { type: String },
  tambemFornecedor: { type: Boolean },
  status: { type: String },
  nome: { type: String },
  nomeFantasia: { type: String },
  razaoSocial: { type: String },
  cnpj: { type: String, unique: true },
  cpf: { type: String, unique: true },
  inscricaoEstadual: { type: String },
  inscricaoMunicipal: { type: String },
  telefone1: { type: String },
  email: { type: String },
  logradouro: { type: String },
  numero: { type: String },
  complemento: { type: String },
  bairro: { type: String },
  cidade: { type: String },
  estado: { type: String },
  cep: { type: String },
  contatos: [
    {
      nome: { type: String },
      telefone: { type: String },
      cargo: { type: String },
      email: { type: String },
    },
  ],
  informacoesComplementares: { type: String },
  documentos: [{ type: String }],
  segmento: { type: String }, // Adicionado campo segmento
});

const Cliente = mongoose.model("Cliente", ClienteSchema);

export default Cliente;
