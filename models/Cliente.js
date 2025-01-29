import mongoose from "mongoose";

const contatoSchema = new mongoose.Schema({
  nome: String,
  telefone: String,
  cargo: String,
  email: String,
});

const clienteSchema = new mongoose.Schema({
  tipo: { type: String },
  tambemFornecedor: { type: Boolean },
  status: { type: String },
  nomeFantasia: String,
  razaoSocial: String,
  cnpj: String,
  inscricaoEstadual: String,
  inscricaoMunicipal: String,
  cpf: String,
  nome: String,
  telefone1: { type: String },
  email: { type: String },
  logradouro: { type: String },
  numero: { type: String },
  complemento: String,
  bairro: { type: String },
  cidade: { type: String },
  estado: { type: String },
  cep: { type: String },
  contatos: [contatoSchema],
  selectedPhone: String,
  informacoesComplementares: String,
  documentos: [String],
  segmento: String,
});

const Cliente = mongoose.model("Cliente", clienteSchema);

export default Cliente;
